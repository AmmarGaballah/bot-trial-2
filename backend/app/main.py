"""
Main FastAPI application entry point.
Configures middleware, routes, and lifecycle events.
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import time
import structlog

from app.core.config import settings
from app.core.database import init_db, close_db, AsyncSessionLocal
from app.core.seed import seed_database
from app.core.error_handlers import setup_error_handlers
from app.api.v1 import (
    auth,
    projects,
    integrations,
    orders,
    messages,
    assistant,
    reports,
    chat_bot,
    products,
    bot_training,
    social_media,
    enhanced_bot,
    order_management,
    subscriptions
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("🚀 Application starting", environment=settings.ENVIRONMENT)
    logger.info("✅ Database ready - migrations run by start.sh")
    
    yield
    
    # Shutdown
    logger.info("Application shutting down")
    await close_db()


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered sales automation and customer communication platform",
    version=settings.API_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# Setup global error handlers
setup_error_handlers(app)


# ============================================================================
# Middleware Configuration
# ============================================================================

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.is_development else settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"]
)

# Trusted host middleware (security)
# DISABLED: Not compatible with Railway's dynamic host routing
# Railway handles host validation at the proxy level
# Uncomment and configure if deploying to custom domain:
# if settings.is_production:
#     app.add_middleware(
#         TrustedHostMiddleware,
#         allowed_hosts=[
#             "*.aisalescommander.com",
#             "aisalescommander.com",
#             "yourdomain.com"
#         ]
#     )


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add request processing time header and logging."""
    start_time = time.time()
    request_id = str(time.time_ns())
    
    try:
        # Process request
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Request-ID"] = request_id
        
        # Log request
        logger.info(
            "Request processed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            process_time=f"{process_time:.3f}s",
            request_id=request_id
        )
        
        return response
    
    except Exception as e:
        logger.error(
            "Request processing failed",
            error=str(e),
            path=request.url.path,
            method=request.method,
            request_id=request_id,
            exc_info=True
        )
        # Return error response instead of crashing
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(e)}"}
        )


# ============================================================================
# Exception Handlers
# ============================================================================
# Note: All exception handlers are registered in setup_error_handlers(app) above
# See app/core/error_handlers.py for the actual handler implementations


# ============================================================================
# Routes
# ============================================================================

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - health check."""
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check endpoint with database test."""
    from sqlalchemy import text
    
    db_status = "unknown"
    db_error = None
    
    # Test database connection
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = "error"
        db_error = str(e)
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "database_error": db_error,
        "timestamp": time.time(),
        "environment": settings.ENVIRONMENT
    }


@app.get("/debug/config", tags=["Debug"])
async def debug_config():
    """Debug endpoint to check configuration."""
    db_host = "unknown"
    if settings.DATABASE_URL and "@" in settings.DATABASE_URL:
        try:
            db_host = settings.DATABASE_URL.split("@")[1].split("/")[0]
        except:
            db_host = "parse_error"
    
    return {
        "environment": settings.ENVIRONMENT,
        "cors_origins": settings.CORS_ORIGINS,
        "testing_mode": settings.TESTING_MODE,
        "has_secret_key": bool(settings.SECRET_KEY),
        "has_database_url": bool(settings.DATABASE_URL),
        "db_host": db_host,
        "db_driver": "asyncpg" if "asyncpg" in settings.DATABASE_URL else "unknown"
    }


@app.get("/check-enums", tags=["Debug"])
async def check_enums():
    """
    Check valid ENUM values for role and subscription fields.
    Shows what values are actually allowed in the database.
    """
    from sqlalchemy import text
    try:
        async with AsyncSessionLocal() as session:
            # Get ENUM types and their values
            result = await session.execute(text("""
                SELECT t.typname, e.enumlabel
                FROM pg_type t 
                JOIN pg_enum e ON t.oid = e.enumtypid  
                WHERE t.typname IN ('userrole', 'subscriptiontier', 'subscriptionstatus')
                ORDER BY t.typname, e.enumsortorder
            """))
            enums = result.fetchall()
            
            # Group by type
            enum_dict = {}
            for type_name, value in enums:
                if type_name not in enum_dict:
                    enum_dict[type_name] = []
                enum_dict[type_name].append(value)
            
            return {
                "success": True,
                "enums": enum_dict,
                "valid_roles": enum_dict.get('userrole', ['ADMIN', 'USER', 'MANAGER']),
                "valid_subscription_tiers": enum_dict.get('subscriptiontier', ['FREE', 'BASIC', 'PRO']),
                "valid_subscription_statuses": enum_dict.get('subscriptionstatus', ['ACTIVE', 'INACTIVE'])
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Could not fetch ENUM values. Using defaults.",
            "defaults": {
                "valid_roles": ["ADMIN", "USER", "MANAGER"],
                "valid_subscription_tiers": ["FREE", "BASIC", "PRO", "ENTERPRISE"],
                "valid_subscription_statuses": ["ACTIVE", "INACTIVE", "CANCELLED"]
            }
        }


@app.get("/hash-password", tags=["Debug"])
async def hash_password(password: str):
    """
    Generate a bcrypt hash for a password.
    Use this to manually create users in the database.
    
    Example: /hash-password?password=MyPassword123
    """
    from app.core.security import get_password_hash
    
    if not password or len(password) < 8:
        return {
            "error": "Password must be at least 8 characters"
        }
    
    password_hash = get_password_hash(password)
    
    return {
        "password": password,
        "password_hash": password_hash,
        "instructions": "Use the SQL below in Railway Database → Data tab",
        "sql_example": f"""
-- Copy and modify this SQL to insert user:
INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'your@email.com',
    '{password_hash}',
    'Your Name',
    'ADMIN',
    true,
    NOW(),
    NOW()
);
        """
    }


@app.get("/check-schema", tags=["Debug"])
async def check_schema():
    """
    Check if users table has the required columns.
    """
    from sqlalchemy import text
    try:
        async with AsyncSessionLocal() as session:
            # Get column names from users table
            result = await session.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            """))
            columns = result.fetchall()
            
            column_list = [{"name": col[0], "type": col[1]} for col in columns]
            has_subscription_tier = any(col[0] == 'subscription_tier' for col in columns)
            
            return {
                "success": True,
                "total_columns": len(columns),
                "has_subscription_tier": has_subscription_tier,
                "columns": column_list
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/migrate", tags=["Debug"])
async def run_migrations():
    """
    Manually trigger database migrations.
    Use this if migrations didn't run automatically.
    """
    import subprocess
    import os
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.returncode,
            "current_dir": os.getcwd(),
            "message": "Migrations completed" if result.returncode == 0 else "Migrations failed"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "current_dir": os.getcwd()
        }


@app.get("/seed-direct", tags=["Debug"])
async def seed_direct():
    """
    Seed database using direct SQL (bypasses ORM).
    Creates: test@aisales.local / AiSales2024!Demo
    """
    from sqlalchemy import text
    from app.core.security import get_password_hash
    import uuid
    from datetime import datetime
    
    try:
        async with AsyncSessionLocal() as session:
            # Check if user exists
            check = await session.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": "test@aisales.local"}
            )
            existing = check.fetchone()
            
            if existing:
                return {
                    "success": True,
                    "message": "Account already exists",
                    "credentials": {
                        "email": "test@aisales.local",
                        "password": "AiSales2024!Demo"
                    }
                }
            
            # Create user with direct SQL
            user_id = str(uuid.uuid4())
            password_hash = get_password_hash("AiSales2024!Demo")
            now = datetime.utcnow()
            
            await session.execute(text("""
                INSERT INTO users (
                    id, email, password_hash, name, role, is_active, 
                    created_at, updated_at
                )
                VALUES (
                    :id, :email, :password_hash, :name, :role, :is_active,
                    :created_at, :updated_at
                )
            """), {
                "id": user_id,
                "email": "test@aisales.local",
                "password_hash": password_hash,
                "name": "Test User",
                "role": "admin",
                "is_active": True,
                "created_at": now,
                "updated_at": now
            })
            
            await session.commit()
            
            return {
                "success": True,
                "message": "Test account created successfully (direct SQL)",
                "credentials": {
                    "email": "test@aisales.local",
                    "password": "AiSales2024!Demo"
                }
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/seed", tags=["Debug"])
async def seed_test_account():
    """
    Seed database with test account.
    Creates: test@aisales.local / AiSales2024!Demo
    Can be called by simply visiting the URL in browser.
    
    IMPORTANT: Run /migrate endpoint first if you get schema errors!
    """
    try:
        async with AsyncSessionLocal() as session:
            await seed_database(session)
        return {
            "success": True,
            "message": "Test account created successfully",
            "credentials": {
                "email": "test@aisales.local",
                "password": "AiSales2024!Demo"
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Database schema error - try /seed-direct endpoint instead"
        }


# Include API routers
app.include_router(
    auth.router,
    prefix=f"/api/{settings.API_VERSION}/auth",
    tags=["Authentication"]
)

app.include_router(
    projects.router,
    prefix=f"/api/{settings.API_VERSION}/projects",
    tags=["Projects"]
)

app.include_router(
    integrations.router,
    prefix=f"/api/{settings.API_VERSION}/integrations",
    tags=["Integrations"]
)

app.include_router(
    orders.router,
    prefix=f"/api/{settings.API_VERSION}/orders",
    tags=["Orders"]
)

app.include_router(
    messages.router,
    prefix=f"/api/{settings.API_VERSION}/messages",
    tags=["Messages"]
)

app.include_router(
    assistant.router,
    prefix=f"/api/{settings.API_VERSION}/assistant",
    tags=["AI Assistant"]
)

app.include_router(
    reports.router,
    prefix=f"/api/{settings.API_VERSION}/reports",
    tags=["Reports"]
)

app.include_router(
    chat_bot.router,
    prefix=f"/api/{settings.API_VERSION}/chat-bot",
    tags=["AI Chat Bot"]
)

app.include_router(
    products.router,
    prefix=f"/api/{settings.API_VERSION}/products",
    tags=["Products"]
)

app.include_router(
    bot_training.router,
    prefix=f"/api/{settings.API_VERSION}/bot-training",
    tags=["Bot Training"]
)

app.include_router(
    social_media.router,
    prefix=f"/api/{settings.API_VERSION}/social-media",
    tags=["Social Media"]
)

app.include_router(
    enhanced_bot.router,
    prefix=f"/api/{settings.API_VERSION}/enhanced-bot",
    tags=["Enhanced AI Bot"]
)

app.include_router(
    order_management.router,
    prefix=f"/api/{settings.API_VERSION}/order-management",
    tags=["Order Management & Automation"]
)

app.include_router(
    subscriptions.router,
    prefix=f"/api/{settings.API_VERSION}/subscriptions",
    tags=["Subscriptions & Billing"]
)


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
