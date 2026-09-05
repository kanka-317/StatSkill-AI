from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.onboarding import router as onboarding_router
from app.api.v1.skill_gap import router as skill_gap_router
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.quiz import router as quiz_router
from app.api.v1.admin import router as admin_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router, prefix="/auth")
api_router.include_router(onboarding_router)
api_router.include_router(skill_gap_router)
api_router.include_router(recommendations_router)
api_router.include_router(quiz_router, prefix="/quiz")
api_router.include_router(admin_router, prefix="/admin")
