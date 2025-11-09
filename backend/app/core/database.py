"""
Database connection and session management using SQLAlchemy 2.0 async.
Supports dual-database architecture:
- Auth DB: User authentication and authorization
- App DB: Application data (projects, orders, messages, etc.)
"""

from typing import AsyncGenerator
import ssl
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from .config import settings

# ============================================================================
# AUTH DATABASE - For user authentication
# ============================================================================

# SSL configuration for Railway PostgreSQL
def get_connect_args():
    """Get connection arguments with SSL support for Railway PostgreSQL."""
    connect_args = {}
    
    # Railway internal network doesn't need SSL (already secure)
    # Only external Railway connections need SSL
    if settings.ENVIRONMENT in ["production", "staging"]:
        if "railway" in settings.AUTH_DATABASE_URL.lower() and "railway.internal" not in settings.AUTH_DATABASE_URL.lower():
            # External Railway connection - use SSL
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ssl_context
        elif "railway.internal" in settings.AUTH_DATABASE_URL.lower():
            # Internal Railway connection - disable SSL (already secure private network)
            connect_args["ssl"] = False
        
        connect_args["server_settings"] = {
            "application_name": "aisales_backend",
        }
    
    return connect_args

# Create async engine for auth database
auth_engine = create_async_engine(
    settings.AUTH_DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,
    poolclass=NullPool if settings.ENVIRONMENT == "serverless" else None,
    connect_args=get_connect_args(),
)

# Create async session factory for auth database
AuthSessionLocal = async_sessionmaker(
    auth_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for auth models
AuthBase = declarative_base()

# ============================================================================
# APPLICATION DATABASE - For application data
# ============================================================================

# Create async engine for application database
app_engine = create_async_engine(
    settings.APP_DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,
    poolclass=NullPool if settings.ENVIRONMENT == "serverless" else None,
    connect_args=get_connect_args(),
)

# Create async session factory for application database
AppSessionLocal = async_sessionmaker(
    app_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for application models
AppBase = declarative_base()

# ============================================================================
# LEGACY SUPPORT - For backward compatibility
# ============================================================================

# Default to app database for backward compatibility
engine = app_engine
AsyncSessionLocal = AppSessionLocal
Base = AppBase


async def get_auth_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency to get AUTH database session.
    Use for authentication-related operations.
    
    Yields:
        AsyncSession: Auth database session
    """
    async with AuthSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_app_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency to get APPLICATION database session.
    Use for application data operations.
    
    Yields:
        AsyncSession: Application database session
    """
    async with AppSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency to get database session (backward compatibility).
    Defaults to application database.
    
    Yields:
        AsyncSession: Database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """
    Initialize BOTH databases by creating all tables.
    Use Alembic migrations in production instead.
    """
    # Initialize auth database
    async with auth_engine.begin() as conn:
        await conn.run_sync(AuthBase.metadata.create_all)
    
    # Initialize application database
    async with app_engine.begin() as conn:
        await conn.run_sync(AppBase.metadata.create_all)


async def close_db():
    """Close all database connections."""
    await auth_engine.dispose()
    await app_engine.dispose()
