"""
Webhook endpoints for receiving messages from integrations.
"""

from typing import Any
from fastapi import APIRouter, Request, HTTPException, status, BackgroundTasks
from uuid import UUID
import structlog

from app.db.models import Message, Customer
from app.core.database import get_db
from app.workers.tasks.ai_tasks import process_incoming_message
from sqlalchemy.ext.asyncio import AsyncSession
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
        
        # Find or create customer
        customer = await _get_or_create_customer(
            db=db,
            phone=from_number,
            project_id=project_id,
            channel="whatsapp"
        )
        
        # Save message
        new_message = Message(
            customer_id=customer.id,
            content=message_text,
            direction="inbound",
            channel="whatsapp",
            external_id=message_sid,
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
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Receive Telegram messages from Telegram Bot API.
    """
    try:
        payload = await request.json()
        
        # Extract message details
        message = payload.get("message", {})
        chat = message.get("chat", {})
        from_user = message.get("from", {})
        
        telegram_id = str(from_user.get("id"))
        username = from_user.get("username", "")
        message_text = message.get("text", "")
        message_id = message.get("message_id")
        
        # Find or create customer
        customer = await _get_or_create_customer(
            db=db,
            telegram_id=telegram_id,
            name=from_user.get("first_name", "") + " " + from_user.get("last_name", ""),
            project_id=project_id,
            channel="telegram"
        )
        
        # Save message
        new_message = Message(
            customer_id=customer.id,
            content=message_text,
            direction="inbound",
            channel="telegram",
            external_id=str(message_id),
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
            "Telegram message received",
            project_id=str(project_id),
            customer_id=str(customer.id)
        )
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error("Telegram webhook error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


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
        
        # Find or create customer
        customer = await _get_or_create_customer(
            db=db,
            instagram_id=sender_id,
            project_id=project_id,
            channel="instagram"
        )
        
        # Save message
        new_message = Message(
            customer_id=customer.id,
            content=message_text,
            direction="inbound",
            channel="instagram",
            external_id=message_id,
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
        
        logger.info("Instagram message received", project_id=str(project_id))
        
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
                    
                    # Find or create customer
                    customer = await _get_or_create_customer(
                        db=db,
                        facebook_id=sender_id,
                        project_id=project_id,
                        channel="facebook"
                    )
                    
                    # Save message
                    new_message = Message(
                        customer_id=customer.id,
                        content=message_text,
                        direction="inbound",
                        channel="facebook",
                        external_id=message_id,
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


async def _get_or_create_customer(
    db: AsyncSession,
    project_id: UUID,
    channel: str,
    phone: str = None,
    telegram_id: str = None,
    instagram_id: str = None,
    facebook_id: str = None,
    name: str = None
) -> Customer:
    """Helper to find or create a customer."""
    from sqlalchemy import select, or_
    
    # Build query based on available identifiers
    conditions = []
    if phone:
        conditions.append(Customer.phone == phone)
    if telegram_id:
        conditions.append(Customer.telegram_id == telegram_id)
    if instagram_id:
        conditions.append(Customer.instagram_id == instagram_id)
    if facebook_id:
        conditions.append(Customer.facebook_id == facebook_id)
    
    if not conditions:
        raise ValueError("At least one customer identifier required")
    
    result = await db.execute(
        select(Customer)
        .where(Customer.project_id == project_id)
        .where(or_(*conditions))
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        # Create new customer
        customer = Customer(
            project_id=project_id,
            name=name or "Unknown Customer",
            phone=phone,
            telegram_id=telegram_id,
            instagram_id=instagram_id,
            facebook_id=facebook_id,
            channel=channel
        )
        db.add(customer)
        await db.commit()
        await db.refresh(customer)
        
        logger.info(
            "New customer created",
            customer_id=str(customer.id),
            channel=channel
        )
    
    return customer
