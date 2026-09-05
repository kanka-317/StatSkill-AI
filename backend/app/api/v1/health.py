from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.config import settings
from app.schemas.health import HealthResponse

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Detailed system health check.
    Validates API runtime, database connectivity, and free-tier service configurations.
    """
    db_connected = False
    try:
        # Check DB with low-overhead ping
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            db_connected = True
    except Exception:
        db_connected = False

    return HealthResponse(
        status="healthy" if db_connected else "degraded",
        app_name=settings.APP_NAME,
        app_env=settings.APP_ENV,
        database_connected=db_connected,
        version="0.1.0",
        free_tier_status={
            "database": "Supabase / PostgreSQL (pgvector ready)",
            "api_host": "Render (Free Web Service)",
            "frontend_host": "Vercel (Free Hobby)",
            "llm_provider": "Gemini 1.5/2.0 Flash / Groq (Zero cost tier)",
            "auth_service": "Self-rolled JWT (Zero paid vendor)",
            "storage": "Supabase Storage (1GB Free tier)"
        },
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
