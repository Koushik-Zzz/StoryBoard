import boto3
from botocore.client import Config
from utils.env import settings
import io

class StorageService:
    def __init__(self):
        self.client = None
        self.bucket_name = None
        self.public_url = None
        
        # Only initialize if R2 bucket name is configured
        if settings.R2_BUCKET_NAME:
            try:
                # Configure S3 client for Cloudflare R2
                self.client = boto3.client(
                    's3',
                    endpoint_url=f'https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
                    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                    region_name='auto',
                    config=Config(signature_version='s3v4')
                )
                self.bucket_name = settings.R2_BUCKET_NAME
                # Use public URL if configured (for permanent public access)
                self.public_url = settings.R2_PUBLIC_URL.rstrip('/') if settings.R2_PUBLIC_URL else None
                print(f"Successfully initialized Cloudflare R2 Storage with bucket: {settings.R2_BUCKET_NAME}")
                if self.public_url:
                    print(f"Using public URL: {self.public_url}")
            except Exception as e:
                import traceback
                print(f"Warning: Could not initialize Cloudflare R2 Storage: {e}")
                traceback.print_exc()
                self.client = None
                self.bucket_name = None
        else:
            print("Warning: R2_BUCKET_NAME not set in environment")
            self.client = None
            self.bucket_name = None

    def _get_url(self, path: str) -> str:
        """Get URL for an uploaded object - uses public URL if available, otherwise presigned"""
        if self.public_url:
            return f"{self.public_url}/{path}"
        # Fallback to presigned URL (7-day expiry)
        return self.client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': path},
            ExpiresIn=7 * 24 * 60 * 60
        )

    async def upload_file(self, item_name: str, file_data: bytes):
        if not self.client:
            raise ValueError("Cloudflare R2 Storage not configured. Set R2_BUCKET_NAME in .env")
        
        self.client.upload_fileobj(
            io.BytesIO(file_data),
            self.bucket_name,
            item_name
        )
        
        return self._get_url(item_name)

    def upload_bytes(self, data: bytes, path: str, content_type: str = "application/octet-stream") -> str:
        """Upload bytes to R2 and return URL for access"""
        if not self.client:
            raise ValueError("Cloudflare R2 Storage not configured. Set R2_BUCKET_NAME in .env")
        
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=path,
            Body=data,
            ContentType=content_type
        )
        
        return self._get_url(path)
