"""
Application configuration using Pydantic Settings.
Loads environment variables and provides type-safe configuration access.
"""

from typing import List, Optional
from pydantic import Field, validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="allow"
    )
    
    # Application
    APP_NAME: str = "AI Sales Commander"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_VERSION: str = "v1"
    TESTING_MODE: bool = False  # Disable authentication for testing
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Security
    SECRET_KEY: str = Field(..., min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database - Dual Database Architecture
    # Auth Database (for users, authentication)
    AUTH_DATABASE_URL: str
    # Application Database (for projects, orders, messages, etc.)
    APP_DATABASE_URL: str
    # Legacy support (defaults to app database if not specified)
    DATABASE_URL: Optional[str] = None
    
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 0
    DB_ECHO: bool = False
    
    @validator("DATABASE_URL", pre=True)
    def convert_database_url(cls, v):
        """Convert postgres:// to postgresql+asyncpg:// for SQLAlchemy async support."""
        if not v:
            return v
        
        # Handle Railway/Render postgres:// URLs
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        # Handle standard postgresql:// URLs
        elif v.startswith("postgresql://") and "postgresql+asyncpg://" not in v:
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        # Handle malformed URLs with double protocol
        elif "postgresql+asyncpg:postgresql://" in v:
            v = v.replace("postgresql+asyncpg:postgresql://", "postgresql+asyncpg://", 1)
        
        return v
    
    @validator("AUTH_DATABASE_URL", pre=True, always=True)
    def set_auth_database_url(cls, v, values):
        """Set AUTH_DATABASE_URL from DATABASE_URL if not provided, with asyncpg driver."""
        if v is None and "DATABASE_URL" in values:
            v = values.get("DATABASE_URL")
        
        if not v:
            return "postgresql+asyncpg://aisales:changeme@postgres:5432/aisales_auth"
        
        # Apply same conversion as DATABASE_URL
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://") and "postgresql+asyncpg://" not in v:
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif "postgresql+asyncpg:postgresql://" in v:
            v = v.replace("postgresql+asyncpg:postgresql://", "postgresql+asyncpg://", 1)
        
        return v
    
    @validator("APP_DATABASE_URL", pre=True, always=True)
    def set_app_database_url(cls, v, values):
        """Set APP_DATABASE_URL from DATABASE_URL if not provided, with asyncpg driver."""
        if v is None and "DATABASE_URL" in values:
            v = values.get("DATABASE_URL")
        
        if not v:
            return "postgresql+asyncpg://aisales:changeme@postgres:5432/aisales_app"
        
        # Apply same conversion as DATABASE_URL
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://") and "postgresql+asyncpg://" not in v:
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif "postgresql+asyncpg:postgresql://" in v:
            v = v.replace("postgresql+asyncpg:postgresql://", "postgresql+asyncpg://", 1)
        
        return v
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: Optional[str] = None
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    # Google Gemini AI - Multiple API Keys for load balancing (up to 100 keys!)
    GEMINI_API_KEY: Optional[str] = None
    # Additional API Keys 1-100 (add as many as you need to .env)
    GEMINI_API_KEY_1: Optional[str] = None
    GEMINI_API_KEY_2: Optional[str] = None
    GEMINI_API_KEY_3: Optional[str] = None
    GEMINI_API_KEY_4: Optional[str] = None
    GEMINI_API_KEY_5: Optional[str] = None
    GEMINI_API_KEY_6: Optional[str] = None
    GEMINI_API_KEY_7: Optional[str] = None
    GEMINI_API_KEY_8: Optional[str] = None
    GEMINI_API_KEY_9: Optional[str] = None
    GEMINI_API_KEY_10: Optional[str] = None
    GEMINI_API_KEY_11: Optional[str] = None
    GEMINI_API_KEY_12: Optional[str] = None
    GEMINI_API_KEY_13: Optional[str] = None
    GEMINI_API_KEY_14: Optional[str] = None
    GEMINI_API_KEY_15: Optional[str] = None
    GEMINI_API_KEY_16: Optional[str] = None
    GEMINI_API_KEY_17: Optional[str] = None
    GEMINI_API_KEY_18: Optional[str] = None
    GEMINI_API_KEY_19: Optional[str] = None
    GEMINI_API_KEY_20: Optional[str] = None
    GEMINI_API_KEY_21: Optional[str] = None
    GEMINI_API_KEY_22: Optional[str] = None
    GEMINI_API_KEY_23: Optional[str] = None
    GEMINI_API_KEY_24: Optional[str] = None
    GEMINI_API_KEY_25: Optional[str] = None
    GEMINI_API_KEY_26: Optional[str] = None
    GEMINI_API_KEY_27: Optional[str] = None
    GEMINI_API_KEY_28: Optional[str] = None
    GEMINI_API_KEY_29: Optional[str] = None
    GEMINI_API_KEY_30: Optional[str] = None
    GEMINI_API_KEY_31: Optional[str] = None
    GEMINI_API_KEY_32: Optional[str] = None
    GEMINI_API_KEY_33: Optional[str] = None
    GEMINI_API_KEY_34: Optional[str] = None
    GEMINI_API_KEY_35: Optional[str] = None
    GEMINI_API_KEY_36: Optional[str] = None
    GEMINI_API_KEY_37: Optional[str] = None
    GEMINI_API_KEY_38: Optional[str] = None
    GEMINI_API_KEY_39: Optional[str] = None
    GEMINI_API_KEY_40: Optional[str] = None
    GEMINI_API_KEY_41: Optional[str] = None
    GEMINI_API_KEY_42: Optional[str] = None
    GEMINI_API_KEY_43: Optional[str] = None
    GEMINI_API_KEY_44: Optional[str] = None
    GEMINI_API_KEY_45: Optional[str] = None
    GEMINI_API_KEY_46: Optional[str] = None
    GEMINI_API_KEY_47: Optional[str] = None
    GEMINI_API_KEY_48: Optional[str] = None
    GEMINI_API_KEY_49: Optional[str] = None
    GEMINI_API_KEY_50: Optional[str] = None
    GEMINI_API_KEY_51: Optional[str] = None
    GEMINI_API_KEY_52: Optional[str] = None
    GEMINI_API_KEY_53: Optional[str] = None
    GEMINI_API_KEY_54: Optional[str] = None
    GEMINI_API_KEY_55: Optional[str] = None
    GEMINI_API_KEY_56: Optional[str] = None
    GEMINI_API_KEY_57: Optional[str] = None
    GEMINI_API_KEY_58: Optional[str] = None
    GEMINI_API_KEY_59: Optional[str] = None
    GEMINI_API_KEY_60: Optional[str] = None
    GEMINI_API_KEY_61: Optional[str] = None
    GEMINI_API_KEY_62: Optional[str] = None
    GEMINI_API_KEY_63: Optional[str] = None
    GEMINI_API_KEY_64: Optional[str] = None
    GEMINI_API_KEY_65: Optional[str] = None
    GEMINI_API_KEY_66: Optional[str] = None
    GEMINI_API_KEY_67: Optional[str] = None
    GEMINI_API_KEY_68: Optional[str] = None
    GEMINI_API_KEY_69: Optional[str] = None
    GEMINI_API_KEY_70: Optional[str] = None
    GEMINI_API_KEY_71: Optional[str] = None
    GEMINI_API_KEY_72: Optional[str] = None
    GEMINI_API_KEY_73: Optional[str] = None
    GEMINI_API_KEY_74: Optional[str] = None
    GEMINI_API_KEY_75: Optional[str] = None
    GEMINI_API_KEY_76: Optional[str] = None
    GEMINI_API_KEY_77: Optional[str] = None
    GEMINI_API_KEY_78: Optional[str] = None
    GEMINI_API_KEY_79: Optional[str] = None
    GEMINI_API_KEY_80: Optional[str] = None
    GEMINI_API_KEY_81: Optional[str] = None
    GEMINI_API_KEY_82: Optional[str] = None
    GEMINI_API_KEY_83: Optional[str] = None
    GEMINI_API_KEY_84: Optional[str] = None
    GEMINI_API_KEY_85: Optional[str] = None
    GEMINI_API_KEY_86: Optional[str] = None
    GEMINI_API_KEY_87: Optional[str] = None
    GEMINI_API_KEY_88: Optional[str] = None
    GEMINI_API_KEY_89: Optional[str] = None
    GEMINI_API_KEY_90: Optional[str] = None
    GEMINI_API_KEY_91: Optional[str] = None
    GEMINI_API_KEY_92: Optional[str] = None
    GEMINI_API_KEY_93: Optional[str] = None
    GEMINI_API_KEY_94: Optional[str] = None
    GEMINI_API_KEY_95: Optional[str] = None
    GEMINI_API_KEY_96: Optional[str] = None
    GEMINI_API_KEY_97: Optional[str] = None
    GEMINI_API_KEY_98: Optional[str] = None
    GEMINI_API_KEY_99: Optional[str] = None
    GEMINI_API_KEY_100: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-pro-latest"
    GEMINI_MAX_TOKENS: int = 8192
    GEMINI_TEMPERATURE: float = 0.7
    
    # Google Cloud / Vertex AI (Optional - if not using direct API key)
    GOOGLE_CLOUD_PROJECT: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    VERTEX_AI_LOCATION: str = "us-central1"
    
    # Integrations
    SHOPIFY_API_KEY: Optional[str] = None
    SHOPIFY_API_SECRET: Optional[str] = None
    
    WHATSAPP_BUSINESS_ID: Optional[str] = None
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None
    
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    
    FACEBOOK_APP_ID: Optional[str] = None
    FACEBOOK_APP_SECRET: Optional[str] = None
    
    # Twilio
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"]
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v) -> List[str]:
        """Parse CORS origins from JSON array or comma-separated string."""
        import json
        
        if isinstance(v, str):
            # Try to parse as JSON array first
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, ValueError):
                pass
            
            # Fall back to comma-separated parsing
            return [origin.strip() for origin in v.split(",")]
        
        if isinstance(v, list):
            return v
        
        return ["http://localhost:3000"]
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    
    # Storage
    S3_BUCKET_NAME: Optional[str] = None
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    
    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    FROM_EMAIL: str = "noreply@aisalescommander.com"
    
    # Billing
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT.lower() == "development"
    
    @property
    def database_url_sync(self) -> str:
        """Get synchronous database URL (for Alembic migrations)."""
        return self.DATABASE_URL.replace("+asyncpg", "")


@lru_cache()
def get_settings() -> Settings:
    """
    Create and cache settings instance.
    Use this function to get settings throughout the application.
    """
    return Settings()


# Global settings instance
settings = get_settings()
