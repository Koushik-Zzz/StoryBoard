from datetime import datetime
from typing import Optional, Any
from models.job import JobStatus, VideoJobRequest, VideoJob
from services.fal_service import FalService
from services.vertex_service import VertexService
from utils.prompt_builder import create_video_prompt
from utils.env import settings
import uuid
import redis
import pickle
import lzma
import asyncio
import traceback
import time


class _MemoryStore:
    """In-memory store with TTL for local dev when Redis is unavailable."""

    def __init__(self):
        self._data: dict[str, tuple[float, bytes]] = {}

    def setex(self, name: str, time_sec: int, value: bytes) -> None:
        self._data[name] = (time.time() + time_sec, value)

    def get(self, name: str) -> Optional[bytes]:
        if name not in self._data:
            return None
        expiry, val = self._data[name]
        if time.time() > expiry:
            del self._data[name]
            return None
        return val

    def delete(self, *names: str) -> None:
        for name in names:
            self._data.pop(name, None)

    def ping(self) -> bool:
        return True


class JobService:
    def __init__(self, fal_service: FalService, vertex_service: VertexService):
        self.fal_service = fal_service
        self.vertex_service = vertex_service  # Keep for image analysis (Gemini)
        self.redis_client = self._make_store()

    def _make_store(self) -> Any:
        if not settings.REDIS_URL:
            return _MemoryStore()
        try:
            client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=False, socket_connect_timeout=3)
            client.ping()
            return client
        except (redis.RedisError, OSError):
            return _MemoryStore()

    def _serialize(self, data: dict) -> bytes:
        """Serialize + compress any data to bytes for Redis storage"""
        return lzma.compress(pickle.dumps(data))
    
    def _deserialize(self, data: bytes) -> Optional[dict]:
        """Deserialize + decompress bytes from Redis storage"""
        if not data:
            return None
        return pickle.loads(lzma.decompress(data))

    async def create_video_job(self, request: VideoJobRequest) -> str:
        """Create a video job and return job_id immediately, processing happens in background"""
        job_id = str(uuid.uuid4())
        
        pending_job = {
            "status": "pending",
            "job_start_time": datetime.now().isoformat()
        }
        # Store pending job BEFORE starting background task to avoid 404 race condition
        self.redis_client.setex(f"job:{job_id}:pending", 600, self._serialize(pending_job))
        
        # start background task
        asyncio.create_task(self._process_video_job(job_id, request))
        
        return job_id
    
    async def _process_video_job(self, job_id: str, request: VideoJobRequest):
        """Background task that processes the video generation using fal.ai"""
        try:
            # Step 1: Analyze annotations using Gemini (vertex_service)
            # and clean images using fal.ai FLUX Kontext in parallel
            tasks = [
                self.vertex_service.analyze_image_content(
                    prompt="Describe any animation annotations you see. Use this description to inform a video director. Be descriptive about location and purpose of the annotations.",
                    image_data=request.starting_image
                ),
                self.fal_service.generate_image_content(
                    prompt="Remove all text, captions, subtitles, annotations from this image. Generate a clean version of the image with no text. Keep everything else the exact same.",
                    image=request.starting_image
                )
            ]
            
            if request.ending_image:
                tasks.append(
                    self.fal_service.generate_image_content(
                        prompt="Remove all text, captions, subtitles, annotations from this image. Generate a clean version of the image with no text. Keep the art/image style the exact same.",
                        image=request.ending_image
                    )
                )
            
            results = await asyncio.gather(*tasks)
            annotation_description = results[0]
            starting_frame = results[1]  # bytes from fal
            ending_frame = results[2] if len(results) > 2 else None

            # Step 2: Generate video using fal.ai Veo 3.1
            # This call waits for completion (subscribe_async) and stores to GCS
            video_result = await self.fal_service.generate_video_content(
                prompt=create_video_prompt(request.custom_prompt, request.global_context, annotation_description),
                image_data=starting_frame,
                ending_image_data=ending_frame,
                duration_seconds=request.duration_seconds,
                job_id=job_id  # Used for GCS storage path
            )
            
            # Get the GCS URL (stored for longevity) or fallback to fal CDN URL
            video_url = video_result["video"].get("gcs_url") or video_result["video"]["url"]
            
            # Store completed job with video URL directly
            job = {
                "job_id": job_id,
                "status": "done",
                "video_url": video_url,
                "job_start_time": datetime.now().isoformat(),
                "job_end_time": datetime.now().isoformat(),
                "metadata": {
                    "annotation_description": annotation_description
                }
            }
            
            self.redis_client.delete(f"job:{job_id}:pending")
            self.redis_client.setex(f"job:{job_id}", 3600, self._serialize(job))  # Keep for 1 hour
            
        except Exception as e:
            # debug stuff
            print(f"Error processing video job {job_id}: {e}")
            traceback.print_exc()
            error_job = {
                "status": "error",
                "error": str(e),
                "job_start_time": datetime.now().isoformat()
            }
            self.redis_client.delete(f"job:{job_id}:pending")
            self.redis_client.setex(f"job:{job_id}:error", 600, self._serialize(error_job))

    async def get_video_job_status(self, job_id: str) -> JobStatus:
        # Check if job is still pending (processing with fal.ai)
        pending_data = self.redis_client.get(f"job:{job_id}:pending")
        if pending_data:
            pending_job = self._deserialize(pending_data)
            return JobStatus(
                status="waiting",
                job_start_time=datetime.fromisoformat(pending_job["job_start_time"]),
                job_end_time=None,
                video_url=None,
            )
        
        # Check if job failed
        error_data = self.redis_client.get(f"job:{job_id}:error")
        if error_data:
            error_job = self._deserialize(error_data)
            return JobStatus(
                status="error",
                job_start_time=datetime.fromisoformat(error_job["job_start_time"]),
                job_end_time=None,
                video_url=None,
                error=error_job.get("error")
            )
        
        # Retrieve completed job from Redis
        job_data = self.redis_client.get(f"job:{job_id}")

        if job_data is None:  # if job not found
            return None

        job = self._deserialize(job_data)

        # Job is complete - return the stored video URL directly
        ret = JobStatus(
            status="done",
            job_start_time=datetime.fromisoformat(job["job_start_time"]),
            job_end_time=datetime.fromisoformat(job["job_end_time"]) if job.get("job_end_time") else datetime.now(),
            video_url=job["video_url"],
            metadata=job.get("metadata")
        )

        # Don't delete completed jobs immediately - let them expire naturally
        return ret

    async def redis_health_check(self) -> bool:
        try:
            self.redis_client.ping()
            return True
        except redis.RedisError:
            return False
        