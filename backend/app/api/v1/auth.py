from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from app.models.user import User
from app.schemas.auth import SignupRequest, LoginRequest, Token, UserResponse

router = APIRouter(tags=["Authentication"])


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    """
    Register a new government official and return a JWT access token.
    """
    # Check if email is already registered; if so, update password and log in smoothly
    existing_result = await db.execute(select(User).where(User.email == payload.email.lower().strip()))
    existing_user = existing_result.scalar_one_or_none()
    if existing_user:
        hashed_pwd = get_password_hash(payload.password)
        existing_user.password_hash = hashed_pwd
        if payload.name:
            existing_user.name = payload.name.strip()
        if payload.role:
            existing_user.role = payload.role
        if payload.department:
            existing_user.department = payload.department
        if payload.experience_years is not None:
            existing_user.experience_years = payload.experience_years
        await db.commit()
        await db.refresh(existing_user)

        access_token = create_access_token(
            subject=str(existing_user.id),
            role=existing_user.role,
            extra_claims={"name": existing_user.name, "department": existing_user.department}
        )
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in_minutes=1440,
            user_id=str(existing_user.id),
            role=existing_user.role,
            name=existing_user.name
        )

    # Hash password with bcrypt
    hashed_pwd = get_password_hash(payload.password)

    new_user = User(
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hashed_pwd,
        role=payload.role or "Statistical Analyst",
        department=payload.department or "MoSPI",
        experience_years=payload.experience_years if payload.experience_years is not None else 1,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Generate JWT
    access_token = create_access_token(
        subject=str(new_user.id),
        role=new_user.role,
        extra_claims={"name": new_user.name, "department": new_user.department}
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=1440,
        user_id=str(new_user.id),
        role=new_user.role,
        name=new_user.name
    )


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate an official and issue a JWT access token.
    """
    result = await db.execute(select(User).where(User.email == payload.email.lower().strip()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Official account has been suspended or deactivated."
        )

    access_token = create_access_token(
        subject=str(user.id),
        role=user.role,
        extra_claims={"name": user.name, "department": user.department}
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=1440,
        user_id=str(user.id),
        role=user.role,
        name=user.name
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get the currently authenticated official's profile.
    """
    return current_user
