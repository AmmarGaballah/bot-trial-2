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
from app.core.database import init_db, close_db, AuthSessionLocal, AppSessionLocal
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
    social_media
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
    logger.info("Application starting", environment=settings.ENVIRONMENT)
    
    # Initialize database (for dev only, use Alembic in production)
    # TEMPORARILY DISABLED: Database init skipped to allow server to start
    # Database connection will happen when endpoints are called
    # if settings.is_development:
    #     await init_db()
    #     logger.info("Database initialized")
    #     
    #     # Seed database with test account
    #     async with AuthSessionLocal() as auth_db, AppSessionLocal() as app_db:
    #         try:
    #             await seed_database(auth_db, app_db)
    #         except Exception as e:
    #             logger.error("Failed to seed database", error=str(e))
    
    logger.info("⚠️  Database init skipped - will connect on first request")
    
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
if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*.aisalescommander.com", "aisalescommander.com"]
    )


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add request processing time header and logging."""
    start_time = time.time()
    
    # Generate request ID
    request_id = str(time.time_ns())
    
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


# ============================================================================
# Exception Handlers
# ============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed messages."""
    
    # Clean up errors to make them JSON serializable
    errors = []
    for error in exc.errors():
        clean_error = dict(error)
        # Convert bytes to string in the input field
        if 'input' in clean_error and isinstance(clean_error['input'], bytes):
            clean_error['input'] = clean_error['input'].decode('utf-8', errors='replace')
        errors.append(clean_error)
    
    logger.warning("Validation error", errors=errors, path=request.url.path)
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",  
            "errors": errors
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors."""
    logger.error(
        "Unexpected error",
        error=str(exc),
        path=request.url.path,
        exc_info=True
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )


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
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: Add actual DB health check
        "redis": "connected",     # TODO: Add actual Redis health check
        "timestamp": time.time()
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


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
