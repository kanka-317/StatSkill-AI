from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "StatSkill AI Backend"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/statskill"

    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_connection(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip().strip("'").strip('"')
            # Normalize URL for asyncpg if standard postgresql:// or postgres:// is passed
            if v.startswith("postgresql://"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            return v
        return v

    # Security & Auth
    JWT_SECRET: str = "supersecret_statskill_jwt_key_hackathon_demo_2026_change_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Free Tier LLM Providers
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # Supabase (Free Tier 1GB Storage + 500MB DB)
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
