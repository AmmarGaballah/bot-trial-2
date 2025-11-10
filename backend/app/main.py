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
