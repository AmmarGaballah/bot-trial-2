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
    
    logger.info(
        "Connecting integration",
        provider=integration_data.provider.value,
        config_keys=list(integration_data.config.keys()) if integration_data.config else [],
        config_has_api_key="api_key" in integration_data.config if integration_data.config else False,
        config_api_key_length=len(integration_data.config.get("api_key", "")) if integration_data.config else 0,
        project_id=str(project_id)
    )
    
    # Validate required config
    if not integration_data.config or not integration_data.config.get("api_key"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key is required in config"
        )
    
    integration_id = None
    
    try:
        # Check if integration already exists
        result = await db.execute(
            select(Integration)
            .where(Integration.project_id == project_id)
            .where(Integration.provider == integration_data.provider.value)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            # Update existing integration
            existing.config = integration_data.config
            existing.status = IntegrationStatus.PENDING
            existing.updated_at = func.now()
            integration_id = existing.id
            
            logger.info("Updating existing integration", integration_id=str(integration_id))
        else:
            # Create new integration
            new_integration = Integration(
                project_id=project_id,
                provider=integration_data.provider.value,
                config=integration_data.config,
                status=IntegrationStatus.PENDING
            )
            db.add(new_integration)
            integration_id = new_integration.id
            
            logger.info("Creating new integration", integration_id=str(integration_id))
        
        # Commit the changes
        await db.commit()
        
        # Fresh query to get the integration with committed data
        result = await db.execute(
            select(Integration)
            .where(Integration.id == integration_id)
        )
        integration = result.scalar_one()
        
        logger.info(
            "Integration saved, starting verification",
            integration_id=str(integration.id),
            config_keys=list(integration.config.keys()) if integration.config else [],
            has_api_key="api_key" in integration.config if integration.config else False
        )
        
        # Verify and setup integration
        try:
            await _verify_and_setup_integration(integration, db)
            logger.info("Integration verification successful", integration_id=str(integration.id))
        except Exception as e:
            logger.error("Integration verification failed", error=str(e), integration_id=str(integration.id))
            # Keep as pending - user can retry verification
        
        # Final fresh query to return the integration
        result = await db.execute(
            select(Integration)
            .where(Integration.id == integration_id)
        )
        final_integration = result.scalar_one()
        
        return final_integration
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error("Failed to connect integration", error=str(e), project_id=str(project_id))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect integration: {str(e)}"
        )


@router.post("/{project_id}/test-data")
async def test_integration_data(
    project_id: UUID,
    integration_data: IntegrationConnect,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Test endpoint to see what data is being received.
    """
    return {
        "received_provider": integration_data.provider.value,
        "received_config": integration_data.config,
        "config_keys": list(integration_data.config.keys()) if integration_data.config else [],
        "has_api_key": "api_key" in integration_data.config if integration_data.config else False,
        "api_key_length": len(integration_data.config.get("api_key", "")) if integration_data.config else 0,
        "project_id": str(project_id)
    }


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

        # Serialize with masked config without mutating DB records
        return [_serialize_integration(integration) for integration in integrations]
        
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
    return _serialize_integration(integration)


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
    
    logger.info(
        "Starting manual verification",
        integration_id=str(integration_id),
        provider=integration.provider,
        config_keys=list(integration.config.keys()) if integration.config else []
    )
    
    try:
        await _verify_and_setup_integration(integration, db)
        logger.info("Manual verification successful", integration_id=str(integration_id))
        return {
            "status": "success",
            "message": f"{integration.provider} integration verified successfully",
            "integration_status": integration.status.value
        }
    except Exception as e:
        logger.error("Manual verification failed", error=str(e), integration_id=str(integration_id))
        return {
            "status": "error", 
            "message": str(e),
            "integration_status": integration.status.value
        }


@router.get("/{project_id}/{integration_id}/debug")
async def debug_integration(
    project_id: UUID,
    integration_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Debug endpoint to check integration data.
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
    
    return {
        "id": str(integration.id),
        "provider": integration.provider,
        "status": integration.status.value,
        "config_keys": list(integration.config.keys()) if integration.config else [],
        "config_values": {k: "***" if "key" in k.lower() or "token" in k.lower() or "secret" in k.lower() 
                         else v for k, v in integration.config.items()} if integration.config else {},
        "created_at": integration.created_at.isoformat() if integration.created_at else None,
        "updated_at": integration.updated_at.isoformat() if integration.updated_at else None
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


def _serialize_integration(integration: Integration) -> IntegrationResponse:
    """Return an integration response with masked config without mutating the model."""
    response = IntegrationResponse.model_validate(integration)
    masked_config = _mask_sensitive_config(response.config, integration.provider)
    return response.model_copy(update={"config": masked_config})


async def _verify_and_setup_integration(integration: Integration, db: AsyncSession):
    """Verify integration connection and setup webhooks."""
    if integration.provider == "telegram":
        await _setup_telegram_integration(integration, db)
    elif integration.provider == "whatsapp":
        await _setup_whatsapp_integration(integration, db)
    elif integration.provider == "shopify":
        await _setup_shopify_integration(integration, db)
    elif integration.provider == "instagram":
        await _setup_instagram_integration(integration, db)
    elif integration.provider == "facebook":
        await _setup_facebook_integration(integration, db)
    else:
        # For unsupported providers, just mark as connected for now
        integration.status = IntegrationStatus.CONNECTED
        await db.commit()
        logger.info(f"Integration {integration.provider} marked as connected (no verification implemented)")


async def _setup_telegram_integration(integration: Integration, db: AsyncSession):
    """Setup Telegram bot webhook and verify connection."""
    import httpx
    from app.core.config import settings
    
    logger.info(
        "Setting up Telegram integration", 
        integration_id=str(integration.id),
        config_keys=list(integration.config.keys()) if integration.config else [],
        config_type=type(integration.config).__name__,
        config_is_none=integration.config is None
    )
    
    # Log the actual config content (with sensitive data masked)
    if integration.config:
        masked_config = {k: "***" if "key" in k.lower() or "token" in k.lower() else v 
                        for k, v in integration.config.items()}
        logger.info("Config content", masked_config=masked_config)
    
    bot_token = integration.config.get("api_key") if integration.config else None
    if not bot_token:
        logger.error(
            "No bot token found in config", 
            config=integration.config,
            config_keys=list(integration.config.keys()) if integration.config else [],
            api_key_exists="api_key" in integration.config if integration.config else False
        )
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
    """Setup WhatsApp integration."""
    access_token = integration.config.get("api_key")
    if not access_token:
        raise ValueError("WhatsApp access token is required")
    
    # TODO: Verify WhatsApp Business API token
    # For now, just mark as connected
    integration.status = IntegrationStatus.CONNECTED
    integration.extra_data = {"setup_method": "manual"}
    await db.commit()


async def _setup_shopify_integration(integration: Integration, db: AsyncSession):
    """Setup Shopify integration."""
    import httpx
    
    api_key = integration.config.get("api_key")
    api_secret = integration.config.get("api_secret")
    shop_domain = integration.config.get("shop_domain", "").replace(".myshopify.com", "")
    
    if not api_key:
        raise ValueError("Shopify API key is required")
    
    if not shop_domain:
        raise ValueError("Shopify shop domain is required")
    
    # Verify Shopify API credentials
    try:
        async with httpx.AsyncClient() as client:
            auth = httpx.BasicAuth(api_key, api_secret or "")
            response = await client.get(
                f"https://{shop_domain}.myshopify.com/admin/api/2023-10/shop.json",
                auth=auth
            )
            response.raise_for_status()
            shop_info = response.json()
            
            integration.status = IntegrationStatus.CONNECTED
            integration.extra_data = {
                "shop_info": shop_info.get("shop", {}),
                "shop_domain": shop_domain
            }
            await db.commit()
            
            logger.info(
                "Shopify integration verified",
                integration_id=str(integration.id),
                shop_name=shop_info.get("shop", {}).get("name")
            )
            
    except httpx.HTTPError as e:
        logger.error("Failed to verify Shopify credentials", error=str(e))
        raise ValueError(f"Invalid Shopify credentials: {str(e)}")


async def _setup_instagram_integration(integration: Integration, db: AsyncSession):
    """Setup Instagram integration."""
    access_token = integration.config.get("api_key")
    if not access_token:
        raise ValueError("Instagram access token is required")
    
    # TODO: Verify Instagram Basic Display API token
    # For now, just mark as connected
    integration.status = IntegrationStatus.CONNECTED
    integration.extra_data = {"setup_method": "manual"}
    await db.commit()


async def _setup_facebook_integration(integration: Integration, db: AsyncSession):
    """Setup Facebook integration."""
    access_token = integration.config.get("api_key")
    if not access_token:
        raise ValueError("Facebook access token is required")
    
    # TODO: Verify Facebook Graph API token
    # For now, just mark as connected
    integration.status = IntegrationStatus.CONNECTED
    integration.extra_data = {"setup_method": "manual"}
    await db.commit()
