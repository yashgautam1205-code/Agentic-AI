import json
import secrets
from pathlib import Path
import os
from typing import Annotated
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_or_create_jwt_secret() -> str:
    secret_file = BASE_DIR / ".jwt_secret"
    if secret_file.exists():
        persisted = secret_file.read_text(encoding="utf-8").strip()
        if len(persisted) >= 32:
            return persisted

    persisted = secrets.token_urlsafe(48)
    secret_file.write_text(persisted, encoding="utf-8")
    try:
        os.chmod(secret_file, 0o600)
    except OSError:
        pass
    return persisted

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        extra="ignore",
        case_sensitive=False,
    )

    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "BRANDVERSE AI API"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"
    
    # Database: SQLite default for seamless local running, or PostgreSQL via env var
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'brandverse.db'}"
    
    # Security
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # External AI
    GEMINI_API_KEY: str = ""
    GEMINI_TIMEOUT_SECONDS: int = 60
    OAUTH_STATE_SECRET: str = ""
    SOCIAL_TOKEN_ENCRYPTION_KEY: str = ""
    INSTAGRAM_APP_ID: str = ""
    INSTAGRAM_REDIRECT_URI: str = ""
    YOUTUBE_CLIENT_ID: str = ""
    YOUTUBE_REDIRECT_URI: str = ""
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_REDIRECT_URI: str = ""
    X_CLIENT_ID: str = ""
    X_REDIRECT_URI: str = ""
    
    # Storage
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MAX_FILE_SIZE_MB: int = 500  # 500MB max per upload
    
    # Media processing
    FFMPEG_PATH: str = ""
    FFPROBE_PATH: str = ""
    
    # CORS
    CORS_ORIGINS: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("["):
                return json.loads(value)
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("ENVIRONMENT", mode="before")
    @classmethod
    def normalize_environment(cls, value):
        return value.strip().lower() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_runtime_configuration(self):
        if self.ENVIRONMENT == "production":
            if not self.JWT_SECRET_KEY.strip():
                raise RuntimeError("JWT_SECRET_KEY must be set when ENVIRONMENT=production")
            if len(self.JWT_SECRET_KEY.strip()) < 32:
                raise RuntimeError("JWT_SECRET_KEY must be at least 32 characters in production")
            if not self.CORS_ORIGINS:
                raise RuntimeError("CORS_ORIGINS must be set when ENVIRONMENT=production")
            if "CORS_ORIGINS" not in self.model_fields_set:
                raise RuntimeError("CORS_ORIGINS must be explicitly set in production")
            if not self.DATABASE_URL.strip() or "DATABASE_URL" not in self.model_fields_set:
                raise RuntimeError("DATABASE_URL must be set when ENVIRONMENT=production")
            if "UPLOAD_DIR" not in self.model_fields_set:
                raise RuntimeError("UPLOAD_DIR must be set when ENVIRONMENT=production")
        elif not self.JWT_SECRET_KEY.strip():
            self.JWT_SECRET_KEY = _load_or_create_jwt_secret()
        return self

settings = Settings()

# Ensure uploads directory exists
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
storage_root = settings.UPLOAD_DIR.resolve()
for directory_name in ("media", "audio", "clips", "thumbnails"):
    storage_directory = settings.UPLOAD_DIR / directory_name
    if storage_directory.resolve().parent != storage_root:
        raise RuntimeError(f"Upload storage directory '{directory_name}' must remain under UPLOAD_DIR.")
    storage_directory.mkdir(parents=True, exist_ok=True)
