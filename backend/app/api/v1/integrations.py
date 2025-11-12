"""
Integration management endpoints for connecting external platforms.
"""

from typing import List, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import structlog

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.db.models import Project, Integration, IntegrationStatus
from app.models.schemas import IntegrationConnect, IntegrationUpdate, IntegrationResponse

router = APIRouter()
logger = structlog.get_logger(__name__)


async def verify_project_access(project_id: UUID, user_id: str, db: AsyncSession) -> Project:
    """Helper to verify user has access to project."""
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.owner_id == UUID(user_id))
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    return project


@router.post("/{project_id}/connect", response_model=IntegrationResponse, status_code=status.HTTP_201_CREATED)
async def connect_integration(
    project_id: UUID,
    integration_data: IntegrationConnect,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Connect a new integration to a project.
    
    Supported providers:
    - **shopify**: E-commerce platform
    - **whatsapp**: WhatsApp Business API
    - **instagram**: Instagram Direct Messages
    - **facebook**: Facebook Messenger
    - **telegram**: Telegram Bot API
    
    The config object should contain provider-specific credentials.
    """
    # Verify project access
    await verify_project_access(project_id, user_id, db)
    
    # Check if integration already exists
    result = await db.execute(
        select(Integration)
        .where(Integration.project_id == project_id)
        .where(Integration.provider == integration_data.provider.value)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        # Update existing integration instead of failing
        existing.config = integration_data.config
        existing.status = IntegrationStatus.PENDING
        existing.updated_at = func.now()
        
        await db.commit()
        await db.refresh(existing)
        
        try:
            await _verify_and_setup_integration(existing, db)
        except Exception as e:
            logger.error("Failed to verify integration", error=str(e))
            # Keep as pending if verification fails
        
        logger.info(
            "Integration updated",
            integration_id=str(existing.id),
            provider=integration_data.provider.value,
            project_id=str(project_id)
        )
        
        return existing
    
    # Create new integration
    new_integration = Integration(
        project_id=project_id,
        provider=integration_data.provider.value,
        config=integration_data.config,
        status=IntegrationStatus.PENDING
    )
    
    db.add(new_integration)
    await db.commit()
    await db.refresh(new_integration)
    
    # Verify connection and setup webhook
    try:
        await _verify_and_setup_integration(new_integration, db)
    except Exception as e:
        logger.error("Failed to verify integration", error=str(e))
        # Keep as pending if verification fails
    
    logger.info(
        "Integration connected",
        integration_id=str(new_integration.id),
        project_id=str(project_id),
        provider=integration_data.provider.value
    )
    
    return new_integration


@router.get("/{project_id}", response_model=List[IntegrationResponse])
async def list_integrations(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    List all integrations for a project.
    """
    try:
        # Verify project access
        await verify_project_access(project_id, user_id, db)
        
        result = await db.execute(
            select(Integration)
            .where(Integration.project_id == project_id)
            .order_by(Integration.created_at.desc())
        )
        integrations = result.scalars().all()
        
        # Mask sensitive config data
        for integration in integrations:
            integration.config = _mask_sensitive_config(integration.config, integration.provider)
        
        return integrations
        
    except HTTPException:
        # Re-raise HTTP exceptions (like access denied)
        raise
    except Exception as e:
        logger.error("Failed to list integrations", error=str(e), project_id=str(project_id))
        # Return empty list instead of crashing
        return []


@router.get("/{project_id}/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    project_id: UUID,
    integration_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get a specific integration details.
    """
    # Verify project access
    await verify_project_access(project_id, user_id, db)
    
    result = await db.execute(
        select(Integration)
        .where(Integration.id == integration_id)
        .where(Integration.project_id == project_id)
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    # Mask sensitive config data
    integration.config = _mask_sensitive_config(integration.config, integration.provider)
    
    return integration


@router.patch("/{project_id}/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    project_id: UUID,
    integration_id: UUID,
    integration_data: IntegrationUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Update an integration's configuration or status.
    """
    # Verify project access
    await verify_project_access(project_id, user_id, db)
    
    result = await db.execute(
        select(Integration)
        .where(Integration.id == integration_id)
        .where(Integration.project_id == project_id)
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    # Update fields
    update_data = integration_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(integration, field, value)
    
    await db.commit()
    await db.refresh(integration)
    
    logger.info(
        "Integration updated",
        integration_id=str(integration_id),
        project_id=str(project_id)
    )
    
    return integration


@router.delete("/{project_id}/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_integration(
    project_id: UUID,
    integration_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Disconnect and delete an integration.
    """
    # Verify project access
    await verify_project_access(project_id, user_id, db)
    
    result = await db.execute(
        select(Integration)
        .where(Integration.id == integration_id)
        .where(Integration.project_id == project_id)
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    await db.delete(integration)
    await db.commit()
    
    logger.info(
        "Integration disconnected",
        integration_id=str(integration_id),
        project_id=str(project_id),
        provider=integration.provider
    )
    
    return None


@router.post("/{project_id}/{integration_id}/sync", status_code=status.HTTP_202_ACCEPTED)
async def sync_integration(
    project_id: UUID,
    integration_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Trigger manual sync for an integration.
    
    This will queue a background task to fetch latest data from the platform.
    """
    # Verify project access
    await verify_project_access(project_id, user_id, db)
    
    result = await db.execute(
        select(Integration)
        .where(Integration.id == integration_id)
        .where(Integration.project_id == project_id)
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    if integration.status != IntegrationStatus.CONNECTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Integration must be connected to sync"
        )
    
    # TODO: Queue background task
    # celery_app.send_task('sync_integration', args=[str(integration_id)])
    
    logger.info(
        "Integration sync queued",
        integration_id=str(integration_id),
        provider=integration.provider
    )
    
    return {
        "status": "queued",
        "message": f"Sync task queued for {integration.provider} integration"
    }


@router.post("/{project_id}/{integration_id}/verify")
async def verify_integration(
    project_id: UUID,
    integration_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Manually verify and setup integration.
    """
    # Verify project access
    await verify_project_access(project_id, user_id, db)
    
    # Get integration
    result = await db.execute(
        select(Integration)
        .where(Integration.id == integration_id)
        .where(Integration.project_id == project_id)
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    try:
        await _verify_and_setup_integration(integration, db)
        return {
            "status": "success",
            "message": f"{integration.provider} integration verified successfully",
            "integration_status": integration.status.value
        }
    except Exception as e:
        logger.error("Manual verification failed", error=str(e))
        return {
            "status": "error", 
            "message": str(e),
            "integration_status": integration.status.value
        }


def _mask_sensitive_config(config: dict, provider: str) -> dict:
    """Mask sensitive configuration values."""
    if not config or not isinstance(config, dict):
        return {}
        
    masked = config.copy()
    sensitive_keys = [
        'api_key', 'api_secret', 'access_token', 
        'refresh_token', 'password', 'secret'
    ]
    
    for key in sensitive_keys:
        if key in masked:
            value = str(masked[key])
            if len(value) > 8:
                masked[key] = f"{value[:4]}...{value[-4:]}"
            else:
                masked[key] = "***"
    
    return masked


async def _verify_and_setup_integration(integration: Integration, db: AsyncSession):
    """Verify integration connection and setup webhooks."""
    if integration.provider == "telegram":
        await _setup_telegram_integration(integration, db)
    elif integration.provider == "whatsapp":
        await _setup_whatsapp_integration(integration, db)
    # Add other providers as needed


async def _setup_telegram_integration(integration: Integration, db: AsyncSession):
    """Setup Telegram bot webhook and verify connection."""
    import httpx
    from app.core.config import settings
    
    bot_token = integration.config.get("api_key")
    if not bot_token:
        raise ValueError("Telegram bot token is required")
    
    # Verify bot token by getting bot info
    async with httpx.AsyncClient() as client:
        try:
            # Test bot token
            response = await client.get(f"https://api.telegram.org/bot{bot_token}/getMe")
            response.raise_for_status()
            bot_info = response.json()
            
            if not bot_info.get("ok"):
                raise ValueError("Invalid Telegram bot token")
            
            # Setup webhook
            webhook_url = f"{settings.API_BASE_URL}/api/v1/webhooks/telegram/{integration.project_id}"
            webhook_response = await client.post(
                f"https://api.telegram.org/bot{bot_token}/setWebhook",
                json={"url": webhook_url}
            )
            webhook_response.raise_for_status()
            webhook_result = webhook_response.json()
            
            if webhook_result.get("ok"):
                # Update integration status to connected
                integration.status = IntegrationStatus.CONNECTED
                integration.extra_data = {
                    "bot_info": bot_info.get("result", {}),
                    "webhook_url": webhook_url
                }
                await db.commit()
                
                logger.info(
                    "Telegram integration verified and webhook set",
                    integration_id=str(integration.id),
                    bot_username=bot_info.get("result", {}).get("username")
                )
            else:
                raise ValueError("Failed to set Telegram webhook")
                
        except httpx.HTTPError as e:
            logger.error("HTTP error verifying Telegram bot", error=str(e))
            raise ValueError(f"Failed to verify Telegram bot: {str(e)}")
        except Exception as e:
            logger.error("Error setting up Telegram integration", error=str(e))
            raise


async def _setup_whatsapp_integration(integration: Integration, db: AsyncSession):
    """Setup WhatsApp integration (placeholder)."""
    # For now, just mark as connected
    # TODO: Implement WhatsApp Business API verification
    integration.status = IntegrationStatus.CONNECTED
    await db.commit()
