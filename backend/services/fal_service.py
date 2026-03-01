import fal_client
import httpx
from models.job import JobStatus
from services.storage_service import StorageService
from utils.env import settings

MAX_RETRIES = 2


class FalService:
    def __init__(self, storage_service: StorageService):
        self.storage_service = storage_service
        # Set FAL_KEY environment variable for fal_client
        import os
        os.environ["FAL_KEY"] = settings.FAL_KEY

    async def _upload_image_bytes(self, image_data: bytes) -> str:
        """Upload image bytes to fal CDN and return URL"""
        url = await fal_client.upload_async(
            data=image_data,
            content_type="image/png"
        )
        return url

    async def _download_and_store_video(self, video_url: str, job_id: str) -> str:
        """Download video from fal CDN and store in GCS for longer lifespan"""
        print(f"[Fal] Downloading video from: {video_url}")
        
        # Use longer timeout for video downloads (videos can be large)
        async with httpx.AsyncClient(timeout=httpx.Timeout(300.0)) as client:
            response = await client.get(video_url)
            response.raise_for_status()
            video_data = response.content
        
        print(f"[Fal] Downloaded video, size: {len(video_data)} bytes")
        
        # Upload to GCS
        gcs_path = f"videos/{job_id}.mp4"
        print(f"[Fal] Uploading to GCS path: {gcs_path}")
        gcs_url = self.storage_service.upload_bytes(video_data, gcs_path, "video/mp4")
        print(f"[Fal] Video stored at GCS URL: {gcs_url}")
        return gcs_url

    async def generate_video_content(
        self, 
        prompt: str, 
        image_data: bytes, 
        ending_image_data: bytes = None, 
        duration_seconds: int = 6,
        job_id: str = None
    ) -> dict:
        """
        Generate video from image using fal.ai Veo 3.1 Fast
        - Uses first-last-frame-to-video if ending_image_data provided
        - Uses image-to-video otherwise
        - Audio disabled by default
        - Downloads and stores to GCS for longer lifespan
        """
        print(f"[Fal] generate_video_content called, image size: {len(image_data)} bytes, job_id: {job_id}")
        
        # Upload starting image to fal CDN
        image_url = await self._upload_image_bytes(image_data)
        print(f"[Fal] Uploaded starting image to: {image_url}")
        
        # Map duration to fal format
        duration_map = {4: "4s", 5: "4s", 6: "6s", 7: "6s", 8: "8s"}
        duration = duration_map.get(duration_seconds, "6s")
        
        ending_image_url = None
        if ending_image_data:
            ending_image_url = await self._upload_image_bytes(ending_image_data)
            print(f"[Fal] Uploaded ending image to: {ending_image_url}")

        # Retry loop: first attempt with full prompt, fallback with simplified prompt
        last_error = None
        for attempt in range(1, MAX_RETRIES + 1):
            current_prompt = prompt if attempt == 1 else self._simplify_prompt(prompt)
            print(f"[Fal] Attempt {attempt}/{MAX_RETRIES}, prompt length: {len(current_prompt)}")

            try:
                if ending_image_url:
                    print(f"[Fal] Calling fal-ai/veo3.1/fast/first-last-frame-to-video...")
                    result = await fal_client.subscribe_async(
                        "fal-ai/veo3.1/fast/first-last-frame-to-video",
                        arguments={
                            "prompt": current_prompt,
                            "first_frame_url": image_url,
                            "last_frame_url": ending_image_url,
                            "duration": duration,
                            "aspect_ratio": "16:9",
                            "resolution": "720p",
                            "generate_audio": False,
                            "safety_tolerance": "6",
                        },
                        with_logs=True,
                    )
                else:
                    print(f"[Fal] Calling fal-ai/veo3.1/fast/image-to-video...")
                    result = await fal_client.subscribe_async(
                        "fal-ai/veo3.1/fast/image-to-video",
                        arguments={
                            "prompt": current_prompt,
                            "image_url": image_url,
                            "duration": duration,
                            "aspect_ratio": "16:9",
                            "resolution": "720p",
                            "generate_audio": False,
                            "safety_tolerance": "6",
                        },
                        with_logs=True,
                    )
                # Success — break out of retry loop
                break
            except fal_client.client.FalClientHTTPError as e:
                last_error = e
                error_str = str(e)
                if "no_media_generated" in error_str and attempt < MAX_RETRIES:
                    print(f"[Fal] no_media_generated on attempt {attempt}, retrying with simplified prompt...")
                    continue
                raise  # Re-raise on final attempt or non-retryable errors
        
        print(f"[Fal] Video generation complete, result: {result}")
        
        # Download video and store to GCS for longer lifespan
        video_url = result["video"]["url"]
        print(f"[Fal] Fal CDN video URL: {video_url}")
        
        if job_id:
            try:
                gcs_url = await self._download_and_store_video(video_url, job_id)
                result["video"]["gcs_url"] = gcs_url
                print(f"[Fal] Successfully stored video to GCS: {gcs_url}")
            except Exception as e:
                print(f"[Fal] ERROR storing to GCS: {e}")
                import traceback
                traceback.print_exc()
                # Fallback to fal CDN URL if GCS fails
                result["video"]["gcs_url"] = video_url
        
        return result

    @staticmethod
    def _simplify_prompt(prompt: str) -> str:
        """Create a shorter, safer version of the prompt for retry attempts.
        Strips annotation details and keeps only the core user instruction."""
        import re
        # Extract the core user prompt between 'following input:' and 'Here are the animation'
        match = re.search(r'following input:\s*(.+?)\s*(?:Here are the animation|The image will have|$)', prompt, re.DOTALL)
        if match:
            core = match.group(1).strip()
        else:
            # Fallback: take first 300 chars
            core = prompt[:300]
        # Remove potentially problematic words
        simplified = f"Generate a creative video based on this scene. {core}"
        # Truncate to a reasonable length
        if len(simplified) > 500:
            simplified = simplified[:500].rsplit(' ', 1)[0]
        print(f"[Fal] Simplified prompt ({len(simplified)} chars): {simplified[:100]}...")
        return simplified

    async def generate_image_content(self, prompt: str, image: bytes) -> bytes:
        """
        Edit image using fal.ai Nano Banana Pro (Gemini 3 Pro Image architecture)
        Used for removing annotations/text from images
        Returns the edited image as bytes
        """
        print(f"[Fal] generate_image_content called, image size: {len(image)} bytes")
        
        # Upload image to fal CDN
        image_url = await self._upload_image_bytes(image)
        print(f"[Fal] Uploaded image to: {image_url}")
        print(f"[Fal] Calling fal-ai/nano-banana-pro/edit...")
        
        result = await fal_client.subscribe_async(
            "fal-ai/nano-banana-pro/edit",
            arguments={
                "prompt": prompt,
                "image_urls": [image_url],
                "aspect_ratio": "16:9",
                "resolution": "1K",
                "output_format": "png",
                "num_images": 1,
            },
            with_logs=True,
        )
        
        print(f"[Fal] Got response: {result}")
        
        # Download the edited image and return as bytes
        edited_image_url = result["images"][0]["url"]
        print(f"[Fal] Downloading edited image from: {edited_image_url}")
        
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
            response = await client.get(edited_image_url)
            response.raise_for_status()
            image_bytes = response.content
        
        print(f"[Fal] Success! Returning image data, size: {len(image_bytes)} bytes")
        return image_bytes

    async def test_service(self) -> str:
        """Test if fal.ai service is working"""
        return "Fal.ai service is configured"
