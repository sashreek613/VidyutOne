from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = (
        "postgresql+psycopg://vidyutone:vidyutone@localhost:5432/vidyutone"
    )
    SECRET_KEY: str = "dev-only-change-me"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    DATA_DIR: Path = PROJECT_ROOT / "data"

    SUPABASE_URL: str = ""
    SUPABASE_JWT_ISSUER: str = ""
    SUPABASE_JWKS_URL: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [
            origin.strip().strip("'\"").rstrip("/")
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]
        defaults = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        for d in defaults:
            if d not in origins:
                origins.append(d)
        return origins


    @property
    def supabase_url(self) -> str:
        return self.SUPABASE_URL.rstrip("/")

    @property
    def supabase_jwt_issuer(self) -> str:
        if self.SUPABASE_JWT_ISSUER.strip():
            return self.SUPABASE_JWT_ISSUER.rstrip("/")
        if self.supabase_url:
            return f"{self.supabase_url}/auth/v1"
        return ""

    @property
    def supabase_jwks_url(self) -> str:
        if self.SUPABASE_JWKS_URL.strip():
            return self.SUPABASE_JWKS_URL.strip()
        issuer = self.supabase_jwt_issuer
        if issuer:
            return f"{issuer}/.well-known/jwks.json"
        return ""

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and (self.supabase_jwks_url or self.SUPABASE_JWT_SECRET))


@lru_cache
def get_settings() -> Settings:
    return Settings()
