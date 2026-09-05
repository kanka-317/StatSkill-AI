from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr
from uuid import UUID


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "Statistical Analyst"
    department: Optional[str] = "MoSPI"
    experience_years: Optional[int] = 1


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user_id: str
    role: str
    name: str


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    department: str
    experience_years: int
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
