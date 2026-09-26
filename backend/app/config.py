import os
import secrets

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./shiftly.db"
    jwt_secret: str = secrets.token_urlsafe(32)
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    auto_seed_database: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

if os.getenv("VERCEL"):
    if settings.database_url.startswith("sqlite"):
        raise RuntimeError("DATABASE_URL must point to a persistent database on Vercel.")
    if not os.getenv("JWT_SECRET"):
        raise RuntimeError("JWT_SECRET must be set on Vercel so login tokens remain valid.")
