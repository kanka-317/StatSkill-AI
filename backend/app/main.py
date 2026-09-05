from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.api.v1.router import api_router
from app.api.v1.auth import router as auth_router
from app.api.v1.onboarding import router as onboarding_router
from app.api.v1.skill_gap import router as skill_gap_router
from app.api.v1.recommendations import router as recommendations_router, seed_courses_if_empty
from app.api.v1.quiz import router as quiz_router
from app.api.v1.admin import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    print(f"[{settings.APP_NAME}] Starting up in {settings.APP_ENV} mode...")
    # Initialize database tables automatically if engine is connectable
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Safe schema evolution (adds language column to quizzes if missing in existing DB)
            try:
                from sqlalchemy import text
                await conn.execute(text("ALTER TABLE quizzes ADD COLUMN language VARCHAR(50) DEFAULT 'English'"))
            except Exception:
                pass
        print(f"[{settings.APP_NAME}] Database tables verified/initialized.")
        
        # Seed initial course catalog
        async with AsyncSessionLocal() as session:
            await seed_courses_if_empty(session)
        print(f"[{settings.APP_NAME}] Course catalog verified/seeded.")
    except Exception as e:
        print(f"[{settings.APP_NAME}] Note: DB initialization skipped during startup: {e}")
    yield
    # Shutdown actions
    print(f"[{settings.APP_NAME}] Shutting down...")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "StatSkill AI API (SIH PS 26101): AI-Powered Competency & Learning-Intelligence "
        "Platform for Government Officials. 100% Free-Tier Architecture."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Also mount routers directly at root for convenience
app.include_router(auth_router, prefix="/auth")
app.include_router(onboarding_router)
app.include_router(skill_gap_router)
app.include_router(recommendations_router)
app.include_router(quiz_router, prefix="/quiz")
app.include_router(admin_router, prefix="/admin")


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to StatSkill AI API",
        "problem_statement": "SIH PS 26101 - Competency & Learning Intelligence",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "endpoints": {
            "signup": "/auth/signup",
            "login": "/auth/login",
            "onboarding": "/onboarding",
            "competency_framework": "/competency-framework/{role}",
            "skill_gap": "/skill-gap/{user_id}",
            "recommendations": "/recommendations/{user_id}",
            "courses": "/courses"
        },
        "deployment_tier": "100% Free Tier (Render + Supabase + Gemini/Groq)"
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)
