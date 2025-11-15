"""
Webhook endpoints for receiving messages from integrations.
"""

from typing import Any
from fastapi import APIRouter, Request, HTTPException, status, BackgroundTasks
from uuid import UUID
import structlog

from app.db.models import Message, CustomerProfile, Integration
from app.core.database import get_db, AsyncSessionLocal
from app.workers.tasks import process_incoming_message
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.post("/whatsapp/{project_id}")
async def whatsapp_webhook(
    project_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Receive WhatsApp messages from Twilio/WhatsApp Business API.
    """
    try:
        payload = await request.json()
        
        # Extract message details
        from_number = payload.get("from", "").replace("whatsapp:", "")
        message_text = payload.get("body", "")
        message_sid = payload.get("MessageSid")
        
        # Save message
        new_message = Message(
            project_id=project_id,
            content=message_text,
            direction="inbound",
            platform="whatsapp",
            provider="whatsapp",
            external_id=message_sid,
            sender={
                "phone": from_number,
                "platform": "whatsapp"
            },
            status="received"
        )
        db.add(new_message)
        await db.commit()
        await db.refresh(new_message)
        
        # Queue AI processing
        background_tasks.add_task(
            process_incoming_message.delay,
            str(new_message.id),
            str(project_id)
        )
        
        logger.info(
            "WhatsApp message received",
            project_id=str(project_id),
            customer_id=str(customer.id),
            message_id=str(new_message.id)
        )
        
        return {"status": "received"}
        
    except Exception as e:
        logger.error("WhatsApp webhook error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/telegram/{project_id}")
async def telegram_webhook(
    project_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Receive Telegram messages from Telegram Bot API.
    """
    try:
        payload = await request.json()
        
        # Extract message details
        message = payload.get("message", {})
        if not message:
            return {"status": "ok"}
        
        chat = message.get("chat", {})
        from_user = message.get("from", {})
        
        telegram_id = str(from_user.get("id"))
        username = from_user.get("username", "")
        message_text = message.get("text", "")
        message_id = message.get("message_id")
        
        # Save message
        new_message = Message(
            project_id=project_id,
            content=message_text,
            direction="inbound",
            platform="telegram",
            provider="telegram",
            external_id=str(message_id),
            sender={
                "telegram_id": telegram_id,
                "name": from_user.get("first_name", "") + " " + from_user.get("last_name", ""),
                "username": username
            },
            status="received"
        )
        db.add(new_message)
        await db.commit()
        await db.refresh(new_message)
        
        # Process message asynchronously (no Celery worker available on Railway)
        try:
            import asyncio
            asyncio.create_task(_process_telegram_message_with_ai(str(new_message.id), str(project_id)))
            logger.info(
                "Telegram message queued for processing",
                project_id=str(project_id),
                telegram_id=telegram_id,
                message_id=str(new_message.id)
            )
        except Exception as e:
            logger.error("Failed to queue message processing", error=str(e))
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error("Telegram webhook error", error=str(e))
        # Always return 200 OK to Telegram
        return {"status": "ok"}


@router.post("/instagram/{project_id}")
async def instagram_webhook(
    project_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Receive Instagram Direct Messages from Graph API.
    """
    try:
        payload = await request.json()
        
        # Extract message details from Instagram webhook format
        entry = payload.get("entry", [])[0]
        messaging = entry.get("messaging", [])[0]
        
        sender_id = messaging.get("sender", {}).get("id")
        message = messaging.get("message", {})
        message_text = message.get("text", "")
        message_id = message.get("mid")
        
        # Save message
        new_message = Message(
            project_id=project_id,
            content=message_text,
            direction="inbound",
            platform="instagram",
            provider="instagram",
            external_id=message_id,
            sender={
                "instagram_id": sender_id,
                "platform": "instagram"
            },
            status="received"
        )
        db.add(new_message)
        await db.commit()
        await db.refresh(new_message)
        
        # Process message asynchronously
        try:
            import asyncio
            asyncio.create_task(_process_incoming_message_with_ai(str(new_message.id), str(project_id), "instagram"))
            logger.info("Instagram message queued for processing", project_id=str(project_id))
        except Exception as e:
            logger.error("Failed to queue Instagram message", error=str(e))
        
        return {"status": "received"}
        
    except Exception as e:
        logger.error("Instagram webhook error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/instagram/{project_id}")
async def instagram_verify(project_id: UUID, request: Request) -> Any:
    """Verify Instagram webhook."""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    # TODO: Verify token against stored value
    if mode == "subscribe" and token:
        return int(challenge)
    
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)


@router.post("/facebook/{project_id}")
async def facebook_webhook(
    project_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Receive Facebook Messenger messages from Graph API.
    """
    try:
        payload = await request.json()
        
        # Extract message details from Facebook webhook format
        for entry in payload.get("entry", []):
            for messaging_event in entry.get("messaging", []):
                sender_id = messaging_event.get("sender", {}).get("id")
                
                # Handle message
                if "message" in messaging_event:
                    message = messaging_event["message"]
                    message_text = message.get("text", "")
                    message_id = message.get("mid")
                    
                    # Save message
                    new_message = Message(
                        project_id=project_id,
                        content=message_text,
                        direction="inbound",
                        platform="facebook",
                        provider="facebook",
                        external_id=message_id,
                        sender={
                            "facebook_id": sender_id,
                            "platform": "facebook"
                        },
                        status="received"
                    )
                    db.add(new_message)
                    await db.commit()
                    await db.refresh(new_message)
                    
                    # Process message asynchronously
                    try:
                        import asyncio
                        asyncio.create_task(_process_incoming_message_with_ai(str(new_message.id), str(project_id), "facebook"))
                    except Exception as e:
                        logger.error("Failed to queue Facebook message", error=str(e))
        
        logger.info("Facebook message received", project_id=str(project_id))
        
        return {"status": "received"}
        
    except Exception as e:
        logger.error("Facebook webhook error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/facebook/{project_id}")
async def facebook_verify(project_id: UUID, request: Request) -> Any:
    """Verify Facebook webhook."""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    # TODO: Verify token against stored value
    if mode == "subscribe" and token:
        return int(challenge)
    
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)


# Customer model removed - using CustomerProfile instead
# Webhooks now store sender info directly in Message.sender JSONB field


async def _process_telegram_message_with_ai(message_id: str, project_id: str):
    """Process Telegram message with AI and send response."""
    from app.services.integrations.telegram import TelegramService
    from app.services.telegram_commands import process_telegram_command
    from app.core.database import AsyncSessionLocal
    from app.db.models import Message, Integration, IntegrationStatus
    from sqlalchemy import select
    from uuid import UUID
    
    try:
        async with AsyncSessionLocal() as db:
            # Fetch message
            result = await db.execute(
                select(Message).where(Message.id == UUID(message_id))
            )
            message = result.scalar_one_or_none()
            
            if not message:
                logger.error("Message not found for AI processing", message_id=message_id)
                return
            
            # Get sender info from message
            sender_info = message.sender or {}
            telegram_id = sender_info.get("telegram_id")
            
            if not telegram_id:
                logger.error("No telegram_id in message sender info", message_id=message_id)
                return
            
            # Get Telegram integration
            result = await db.execute(
                select(Integration)
                .where(Integration.project_id == UUID(project_id))
                .where(Integration.provider == "telegram")
                .where(Integration.status == IntegrationStatus.CONNECTED)
            )
            integration = result.scalar_one_or_none()
            
            if not integration:
                logger.error("No connected Telegram integration found", project_id=project_id)
                return
            
            # Get bot token
            bot_token = integration.config.get("api_key")
            if not bot_token:
                logger.error("No bot token in integration config", integration_id=str(integration.id))
                return
            
            # Validate bot token format (should be numbers:string)
            if ":" not in bot_token:
                logger.error("Invalid bot token format - missing colon separator", token_length=len(bot_token))
                return
            
            # Create Telegram service
            telegram_service = TelegramService(bot_token)
            
            # Check if message is a command
            if message.content and message.content.startswith("/"):
                is_command = await process_telegram_command(
                    text=message.content,
                    chat_id=telegram_id,
                    project_id=UUID(project_id),
                    telegram_service=telegram_service,
                    db=db
                )
                
                if is_command:
                    logger.info("Command processed", command=message.content, chat_id=telegram_id)
                    return
            
            # Generate AI response
            try:
                from app.services.gemini_client import GeminiClient
                gemini = GeminiClient()
                
                # Build context for AI
                context = f"""You are a helpful AI sales assistant for a business. 
                Customer message: {message.content}
                
                Please provide a helpful, friendly response. Keep it concise and professional.
                If they're asking about products, orders, or need help, offer assistance.
                """
                
                ai_response = await gemini.generate_response(
                    prompt=context,
                    use_functions=False,
                    max_tokens=200,
                    temperature=0.7
                )
                
                response_text = ai_response.get("text", "Hello! I'm your AI assistant. How can I help you today?")
                
            except Exception as e:
                logger.error("Failed to generate AI response", error=str(e))
                # Fallback to simple response
                response_text = f"🤖 Hello! I'm your AI sales assistant. How can I help you today?\n\nYou said: '{message.content}'"
            
            # Send response
            await telegram_service.send_message(
                chat_id=telegram_id,
                text=response_text
            )
            
            # Save outbound message
            outbound_message = Message(
                project_id=UUID(project_id),
                content=response_text,
                direction="outbound",
                platform="telegram",
                provider="telegram",
                recipient={
                    "telegram_id": telegram_id,
                    "name": sender_info.get("name", "")
                },
                status="sent"
            )
            db.add(outbound_message)
            await db.commit()
            
            logger.info(
                "Telegram AI response sent",
                message_id=message_id,
                telegram_id=telegram_id
            )
            
    except Exception as e:
        logger.error(
            "Failed to process Telegram message",
            message_id=message_id,
            error=str(e)
        )


async def _process_incoming_message_with_ai(message_id: str, project_id: str, platform: str):
    """Process incoming message from any platform with AI and send response."""
    from app.core.database import AsyncSessionLocal
    from app.db.models import Message
    from sqlalchemy import select
    from uuid import UUID
    
    try:
        async with AsyncSessionLocal() as db:
            # Fetch message
            result = await db.execute(
                select(Message).where(Message.id == UUID(message_id))
            )
            message = result.scalar_one_or_none()
            
            if not message:
                logger.error("Message not found for AI processing", message_id=message_id)
                return
            
            # Generate AI response
            try:
                from app.services.gemini_client import GeminiClient
                gemini = GeminiClient()
                
                # Build context for AI
                context = f"""You are a helpful AI sales assistant for a business. 
                Customer message: {message.content}
                
                Please provide a helpful, friendly response. Keep it concise and professional.
                If they're asking about products, orders, or need help, offer assistance.
                """
                
                ai_response = await gemini.generate_response(
                    prompt=context,
                    use_functions=False,
                    max_tokens=200,
                    temperature=0.7
                )
                
                response_text = ai_response.get("text", "Hello! I'm your AI assistant. How can I help you today?")
                
            except Exception as e:
                logger.error("Failed to generate AI response", error=str(e))
                # Fallback to simple response
                response_text = f"Hello! I'm your AI assistant. How can I help you today?\n\nYou said: '{message.content}'"
            
            # Save outbound message
            outbound_message = Message(
                project_id=UUID(project_id),
                content=response_text,
                direction="outbound",
                platform=platform,
                provider=platform,
                status="sent"
            )
            db.add(outbound_message)
            await db.commit()
            
            logger.info(
                "AI response processed",
                message_id=message_id,
                platform=platform
            )
            
    except Exception as e:
        logger.error(
            "Failed to process message",
            message_id=message_id,
            platform=platform,
            error=str(e)
        )
