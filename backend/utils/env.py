from dotenv import load_dotenv
load_dotenv()

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GOOGLE_CLOUD_PROJECT: str
    GOOGLE_CLOUD_LOCATION: str
    GOOGLE_GENAI_USE_VERTEXAI: bool
    # Cloudflare R2 settings
    R2_ACCOUNT_ID: str
    R2_ACCESS_KEY_ID: str
    R2_SECRET_ACCESS_KEY: str
    R2_BUCKET_NAME: str
    R2_PUBLIC_URL: str = ""  # Optional public URL for R2 bucket
    REDIS_URL: str
    SUPABASE_URL: str
    SUPABASE_SECRET_KEY: str
    FAL_KEY: str  # fal.ai API key
    FRONTEND_URL: str = "http://localhost:5173"  # Default for local dev
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra='ignore'  # Ignore extra env vars not defined in the model
    )
settings = Settings()  # type: ignore[call-arg]
