"""
Service Factory - Initialize and wire services together.
Handles dependency injection between services.
"""

from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.services.gemini_client import GeminiClient
from app.services.subscription_service import SubscriptionService
from app.services.ai_optimizer import ai_optimizer

logger = structlog.get_logger(__name__)


class ServiceFactory:
    """Factory for creating and wiring services."""
    
    _gemini_client = None
    
    @classmethod
    def get_gemini_client(cls, db: AsyncSession = None) -> GeminiClient:
        """
        Get or create Gemini client with subscription tracking.
        
        If db session is provided, enables usage tracking and limit enforcement.
        """
        if cls._gemini_client is None:
            cls._gemini_client = GeminiClient()
            cls._gemini_client.set_ai_optimizer(ai_optimizer)
            logger.info("Gemini client initialized with AI optimizer")
        
        # If database session provided, wire up subscription service
        if db is not None:
            subscription_service = SubscriptionService(db)
            cls._gemini_client.set_subscription_service(subscription_service)
        
        return cls._gemini_client
    
    @classmethod
    def get_subscription_service(cls, db: AsyncSession) -> SubscriptionService:
        """Get subscription service instance."""
        return SubscriptionService(db)
    
    @classmethod
    def get_ai_optimizer(cls):
        """Get AI optimizer singleton."""
        return ai_optimizer


# Convenience functions
def get_gemini_with_tracking(db: AsyncSession) -> GeminiClient:
    """Get Gemini client with usage tracking enabled."""
    return ServiceFactory.get_gemini_client(db)


def get_gemini_without_tracking() -> GeminiClient:
    """Get Gemini client without usage tracking (for system tasks)."""
    return ServiceFactory.get_gemini_client(None)
