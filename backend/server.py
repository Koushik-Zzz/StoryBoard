import logging
from blacksheep import Application, Request, Request
from services.storage_service import StorageService
from services.vertex_service import VertexService
from services.fal_service import FalService
from services.job_service import JobService
from services.supabase_service import SupabaseService
from services.video_merge_service import VideoMergeService
from rodi import Container

# Import controllers for auto-discovery
from controllers import jobs, files, supabase, gemini

services = Container()

storage_service = StorageService()
vertex_service = VertexService()
fal_service = FalService(storage_service)
job_service = JobService(fal_service, vertex_service)
supabase_service = SupabaseService()
video_merge_service = VideoMergeService(storage_service)

services.add_instance(storage_service, StorageService)
services.add_instance(vertex_service, VertexService)
services.add_instance(fal_service, FalService)
services.add_instance(job_service, JobService)
services.add_instance(supabase_service, SupabaseService)
services.add_instance(video_merge_service, VideoMergeService)

app = Application(services=services)

# TODO: REMOVE IN PRODUCTION, FOR DEV ONLY
app.use_cors(
    allow_methods="*",
    allow_origins="*",
    allow_headers="*",
)

async def attach_user(request: Request):
    try:
        uid = supabase_service.get_user_id_from_request(request)
        if uid:
            request.scope["user_id"] = uid
    except Exception:
        # Do not block request processing on auth parsing errors
        pass

app.middlewares.append(attach_user)

# random test routes
@app.router.get("/")
def hello_world():
    return "Hello World"

@app.router.get("/test")
async def test_route():
    return await fal_service.test_service()
