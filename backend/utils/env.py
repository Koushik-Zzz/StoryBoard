import json
import os
import tempfile

from dotenv import load_dotenv
load_dotenv()

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GOOGLE_CLOUD_PROJECT: str
    GOOGLE_CLOUD_LOCATION: str
    GOOGLE_GENAI_USE_VERTEXAI: bool
    GOOGLE_CREDENTIALS_JSON: str = ""  # Service account JSON as a string (for deployed environments)
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
settings = Settings()

# If GOOGLE_CREDENTIALS_JSON is provided (deployed env), write it to a temp file
# and set GOOGLE_APPLICATION_CREDENTIALS so google-auth can find it.
if settings.GOOGLE_CREDENTIALS_JSON:
    try:
        creds_dict = json.loads(settings.GOOGLE_CREDENTIALS_JSON)
        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(creds_dict, tmp)
        tmp.close()
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = tmp.name
        print(f"Google credentials written to temp file: {tmp.name}")
    except Exception as e:
        print(f"Warning: Failed to write Google credentials from GOOGLE_CREDENTIALS_JSON: {e}")
