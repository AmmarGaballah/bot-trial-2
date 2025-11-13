"""
Authentication endpoints: register, login, refresh token, logout.
"""

from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.core.database import get_db
from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token, decode_token,
    get_current_user_id
)
from app.core.config import settings
from app.db.models import User, RefreshToken
from app.models.schemas import (
    UserRegister, UserLogin, TokenResponse, 
    RefreshTokenRequest, UserResponse
)

router = APIRouter()
logger = structlog.get_logger(__name__)


# TEMPORARY TEST ENDPOINT - Remove in production!
@router.post("/test-login", response_model=TokenResponse)
async def test_login(credentials: UserLogin) -> Any:
    """
    TEST ONLY: Login without database connection.
    Use for local testing when Supabase connection fails.
    
    Accepts: test@example.com OR test@aisales.local
    Password: any password works
    """
    # Accept multiple test emails
    if credentials.email in ["test@example.com", "test@aisales.local"]:
        # Create fake user data for token
        token_data = {
            "sub": "00000000-0000-0000-0000-000000000001",  # Fake UUID
            "email": credentials.email,
            "role": "admin"
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token({"sub": token_data["sub"]})
        
        logger.info("TEST login successful", email=credentials.email)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert minutes to seconds
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Test login: use test@example.com or test@aisales.local"
        )


# TEMPORARY TEST ENDPOINT - Remove in production!
@router.get("/test-me", response_model=UserResponse)
async def test_me() -> Any:
    """
    TEST ONLY: Get current user without database connection.
    Returns fake user data for local testing.
    """
    from uuid import UUID
    
    # Return fake user data
    fake_user = UserResponse(
        id=UUID("00000000-0000-0000-0000-000000000001"),
        email="test@example.com",
        name="Test User",
        role="admin",
        is_active=True,
        created_at=datetime.utcnow(),
        last_login=datetime.utcnow()
    )
    
    logger.info("TEST /me endpoint called")
    return fake_user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Register a new user account.
    
    - **email**: Valid email address
    - **password**: Minimum 8 characters with uppercase, lowercase, and digit
    - **name**: Optional display name
    """
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name,
        role="user"
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    logger.info("User registered", user_id=str(new_user.id), email=new_user.email)
    
    return new_user


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Authenticate user and return access + refresh tokens.
    
    - **email**: User's email
    - **password**: User's password
    
    Returns JWT access token (15 min) and refresh token (7 days).
    """
    # Find user by email
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Create tokens
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Store refresh token in database
    refresh_token_expires = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=refresh_token_expires
    )
    
    db.add(db_refresh_token)
    
    # Update last login
    user.last_login = datetime.utcnow()
    
    await db.commit()
    
    logger.info("User logged in", user_id=str(user.id), email=user.email)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    token_request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Refresh access token using refresh token.
    
    - **refresh_token**: Valid refresh token from login
    
    Returns new access token and refresh token.
    """
    # Decode and validate refresh token
    try:
        payload = decode_token(token_request.refresh_token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    user_id = payload.get("sub")
    
    # Check if refresh token exists and is valid
    result = await db.execute(
        select(RefreshToken)
        .where(RefreshToken.token == token_request.refresh_token)
        .where(RefreshToken.user_id == user_id)
    )
    db_token = result.scalar_one_or_none()
    
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found"
        )
    
    if db_token.expires_at < datetime.utcnow():
        # Token expired, delete it
        await db.delete(db_token)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired"
        )
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or disabled"
        )
    
    # Create new tokens
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    }
    
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Delete old refresh token and create new one
    await db.delete(db_token)
    
    refresh_token_expires = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_db_token = RefreshToken(
        user_id=user.id,
        token=new_refresh_token,
        expires_at=refresh_token_expires
    )
    
    db.add(new_db_token)
    await db.commit()
    
    logger.info("Token refreshed", user_id=str(user.id))
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    token_request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Logout user by invalidating refresh token.
    
    - **refresh_token**: User's refresh token to invalidate
    """
    # Find and delete refresh token
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == token_request.refresh_token)
    )
    db_token = result.scalar_one_or_none()
    
    if db_token:
        await db.delete(db_token)
        await db.commit()
        logger.info("User logged out", user_id=str(db_token.user_id))
    
    return None


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get current authenticated user's information.
    
    Requires valid access token in Authorization header.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user
