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

# TEMPORARILY DISABLED - Testing if route imports are blocking
# from app.api.v1 import (
#     auth,
#     projects,
#     integrations,
#     orders,
#     messages,
#     assistant,
#     reports,
#     chat_bot,
#     products,
#     bot_training,
#     social_media,
#     enhanced_bot,
#     order_management,
#     subscriptions
# )

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
    # Startup - absolutely minimal
    print("LIFESPAN: Starting up")
    
    yield
    
    # Shutdown - no database cleanup for now
    print("LIFESPAN: Shutting down")


# Create FastAPI application - ULTRA MINIMAL
app = FastAPI(
    title="Test App",
    description="Minimal test",
    version="1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Setup global error handlers
# TEMPORARILY DISABLED - Testing
# setup_error_handlers(app)


# ============================================================================
# Middleware Configuration
# ============================================================================

# CORS middleware
# TEMPORARILY DISABLED - Testing
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"] if settings.is_development else settings.CORS_ORIGINS,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
#     expose_headers=["X-Request-ID", "X-Process-Time"]
# )

# Trusted host middleware (security)
# TEMPORARILY DISABLED - causing 502 errors on Railway
# if settings.is_production:
#     app.add_middleware(
#         TrustedHostMiddleware,
#         allowed_hosts=[
#             "*.aisalescommander.com",
#             "aisalescommander.com",
#             "*.railway.app",  # Railway deployments
#             "*.up.railway.app"  # Railway public URLs
#         ]
#     )


# TEMPORARILY DISABLED - Testing
# @app.middleware("http")
# async def add_process_time_header(request: Request, call_next):
#     """Add request processing time header and logging."""
#     start_time = time.time()
#     request_id = str(time.time_ns())
#     
#     try:
#         # Process request
#         response = await call_next(request)
#         
#         # Calculate processing time
#         process_time = time.time() - start_time
#         response.headers["X-Process-Time"] = str(process_time)
#         response.headers["X-Request-ID"] = request_id
#         
#         # Log request
#         logger.info(
#             "Request processed",
#             method=request.method,
#             path=request.url.path,
#             status_code=response.status_code,
#             process_time=f"{process_time:.3f}s",
#             request_id=request_id
#         )
#         
#         return response
#     
#     except Exception as e:
#         logger.error(
#             "Request processing failed",
#             error=str(e),
#             path=request.url.path,
#             method=request.method,
#             request_id=request_id,
#             exc_info=True
#         )
#         # Return error response instead of crashing
#         return JSONResponse(
#             status_code=500,
#             content={"detail": f"Internal server error: {str(e)}"}
#         )


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
    """Root endpoint - ultra minimal test."""
    return {
        "status": "online",
        "message": "Ultra minimal FastAPI test",
        "timestamp": time.time()
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Simple health check - no database test."""
    return {
        "status": "healthy",
        "message": "App is running",
        "timestamp": time.time()
    }


@app.get("/test", tags=["Test"])
async def test_endpoint():
    """Test endpoint to verify routing works."""
    return {
        "test": "success",
        "message": "If you see this, the app is working!"
    }


# Include API routers
# TEMPORARILY DISABLED - Testing if routes are causing issues
# app.include_router(
#     auth.router,
#     prefix=f"/api/{settings.API_VERSION}/auth",
#     tags=["Authentication"]
# )
# 
# app.include_router(
#     projects.router,
#     prefix=f"/api/{settings.API_VERSION}/projects",
#     tags=["Projects"]
# )
# 
# app.include_router(
#     integrations.router,
#     prefix=f"/api/{settings.API_VERSION}/integrations",
#     tags=["Integrations"]
# )
# 
# app.include_router(
#     orders.router,
#     prefix=f"/api/{settings.API_VERSION}/orders",
#     tags=["Orders"]
# )
# 
# app.include_router(
#     messages.router,
#     prefix=f"/api/{settings.API_VERSION}/messages",
#     tags=["Messages"]
# )
# 
# app.include_router(
#     assistant.router,
#     prefix=f"/api/{settings.API_VERSION}/assistant",
#     tags=["AI Assistant"]
# )
# 
# app.include_router(
#     reports.router,
#     prefix=f"/api/{settings.API_VERSION}/reports",
#     tags=["Reports"]
# )
# 
# app.include_router(
#     chat_bot.router,
#     prefix=f"/api/{settings.API_VERSION}/chat-bot",
#     tags=["AI Chat Bot"]
# )
# 
# app.include_router(
#     products.router,
#     prefix=f"/api/{settings.API_VERSION}/products",
#     tags=["Products"]
# )
# 
# app.include_router(
#     bot_training.router,
#     prefix=f"/api/{settings.API_VERSION}/bot-training",
#     tags=["Bot Training"]
# )
# 
# app.include_router(
#     social_media.router,
#     prefix=f"/api/{settings.API_VERSION}/social-media",
#     tags=["Social Media"]
# )

# app.include_router(
#     enhanced_bot.router,
#     prefix=f"/api/{settings.API_VERSION}/enhanced-bot",
#     tags=["Enhanced AI Bot"]
# )
# 
# app.include_router(
#     order_management.router,
#     prefix=f"/api/{settings.API_VERSION}/order-management",
#     tags=["Order Management & Automation"]
# )

# app.include_router(
#     subscriptions.router,
#     prefix=f"/api/{settings.API_VERSION}/subscriptions",
#     tags=["Subscriptions & Billing"]
# )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
