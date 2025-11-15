"""
Message management and communication endpoints.
"""

from typing import List, Any, Optional, Dict
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
import structlog

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.db.models import Project, Message, Order, MessageDirection
from app.models.schemas import (
    MessageSend,
    MessageResponse,
    ConversationSummary,
    ConversationMessage,
)

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


def _resolve_customer_payload(msg: Message) -> Dict[str, Any]:
    if msg.direction == MessageDirection.INBOUND:
        return msg.sender or {}
    return msg.recipient or {}


def _resolve_conversation_id(msg: Message, customer_payload: Dict[str, Any]) -> str:
    candidate_fields = [
        str(msg.order_id) if msg.order_id else None,
        customer_payload.get("conversation_id"),
        customer_payload.get("profile_id"),
        customer_payload.get("id"),
        customer_payload.get("phone"),
        customer_payload.get("email"),
        customer_payload.get("username"),
    ]

    for candidate in candidate_fields:
        if candidate:
            return str(candidate)

    # Fallback to message id to ensure uniqueness
    return f"message-{msg.id}"


@router.post("/{project_id}/send", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    project_id: UUID,
    message_data: MessageSend,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Send a message to a customer via specified provider.
    
    Supported providers: whatsapp, telegram, sms, instagram, facebook
    
    This creates a database record and queues the actual sending via background worker.
    """
    # Verify project access
    await verify_project_access(project_id, user_id, db)
    
    # Verify order exists if provided
    if message_data.order_id:
        result = await db.execute(
            select(Order)
            .where(Order.id == message_data.order_id)
            .where(Order.project_id == project_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
    
    # Create message record
    new_message = Message(
        project_id=project_id,
        order_id=message_data.order_id,
        direction=MessageDirection.OUTBOUND,
        provider=message_data.provider.value,
        content=message_data.content,
        content_type=message_data.content_type,
        attachments=message_data.attachments,
        sender={"type": "system", "user_id": user_id},
        recipient=message_data.recipient,
        status="queued"
    )
    
    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)
    
    # TODO: Queue message sending via Celery
    # celery_app.send_task('send_message_task', args=[str(new_message.id)])
    
    logger.info(
        "Message queued",
        message_id=str(new_message.id),
        project_id=str(project_id),
        provider=message_data.provider.value
    )
    
    return new_message


@router.get("/{project_id}/inbox", response_model=List[MessageResponse])
async def get_inbox(
    project_id: UUID,
    direction: Optional[str] = Query(None, description="Filter by direction: inbound or outbound"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    order_id: Optional[UUID] = Query(None, description="Filter by order ID"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    days: int = Query(7, description="Number of days to look back", ge=1, le=90),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get unified inbox with messages from all channels.
    """
    # Verify project access
    await verify_project_access(project_id, user_id, db)
    
    # Build query
    query = select(Message).where(Message.project_id == project_id)
    
    # Apply filters
    if direction:
        query = query.where(Message.direction == direction)
    if provider:
        query = query.where(Message.provider == provider)
    if order_id:
        query = query.where(Message.order_id == order_id)
    if is_read is not None:
        query = query.where(Message.is_read == is_read)
    
    # Date filter
    start_date = datetime.utcnow() - timedelta(days=days)
    query = query.where(Message.created_at >= start_date)
    
    # Order and pagination
    query = query.order_by(Message.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    messages = result.scalars().all()
    
    return messages


@router.get("/{project_id}/conversations", response_model=List[ConversationSummary])
async def get_conversations(
    project_id: UUID,
    provider: Optional[str] = Query(None, description="Filter by provider/channel"),
    days: int = Query(30, description="Number of days to look back", ge=1, le=180),
    limit: int = Query(50, description="Maximum conversations to return", ge=1, le=200),
    search: Optional[str] = Query(None, description="Search by customer name, email, phone, or message"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Return aggregated conversation summaries for messaging inbox."""

    await verify_project_access(project_id, user_id, db)

    query = select(Message).where(Message.project_id == project_id)

    if provider and provider.lower() != "all":
        query = query.where(Message.provider == provider)

    start_date = datetime.utcnow() - timedelta(days=days)
    query = query.where(Message.created_at >= start_date)

    # Pull recent messages (over-fetch to build summaries reliably)
    query = query.order_by(Message.created_at.desc()).limit(limit * 10)

    result = await db.execute(query)
    messages = result.scalars().all()

    conversations: dict[str, dict[str, Any]] = {}

    for msg in messages:
        customer_payload = _resolve_customer_payload(msg)
        conversation_id = _resolve_conversation_id(msg, customer_payload)

        convo = conversations.get(conversation_id)
        if not convo:
            convo = {
                "channel": msg.provider or msg.platform or "unknown",
                "customer_name": customer_payload.get("name")
                or customer_payload.get("customer_name"),
                "customer_email": customer_payload.get("email"),
                "customer_phone": customer_payload.get("phone"),
                "customer_id": customer_payload.get("customer_id")
                or customer_payload.get("id")
                or customer_payload.get("phone")
                or customer_payload.get("email"),
                "order_id": str(msg.order_id) if msg.order_id else None,
                "last_message": None,
                "last_message_at": None,
                "unread_count": 0,
                "total_messages": 0,
                "ai_messages": 0,
                "ai_enabled": False,
                "recipient": customer_payload or {},
                "profile_id": customer_payload.get("profile_id"),
            }
            conversations[conversation_id] = convo

        convo["total_messages"] += 1
        if msg.ai_generated:
            convo["ai_messages"] += 1
            convo["ai_enabled"] = True

        if msg.direction == MessageDirection.INBOUND and not msg.is_read:
            convo["unread_count"] += 1

        created_at = msg.created_at
        if created_at and (
            convo["last_message_at"] is None or created_at > convo["last_message_at"]
        ):
            convo["last_message_at"] = created_at
            convo["last_message"] = msg.content
            convo["channel"] = msg.provider or msg.platform or convo["channel"]
            convo["customer_name"] = (
                customer_payload.get("name")
                or customer_payload.get("customer_name")
                or convo["customer_name"]
            )
            convo["customer_email"] = (
                customer_payload.get("email") or convo["customer_email"]
            )
            convo["customer_phone"] = (
                customer_payload.get("phone") or convo["customer_phone"]
            )
            convo["customer_id"] = (
                customer_payload.get("customer_id")
                or customer_payload.get("id")
                or convo["customer_id"]
            )
            if msg.order_id:
                convo["order_id"] = str(msg.order_id)
            convo["profile_id"] = (
                customer_payload.get("profile_id") or convo["profile_id"]
            )
            convo["recipient"] = customer_payload or {}

    summaries: List[ConversationSummary] = []
    search_term = search.lower() if search else None

    for convo_id, data in conversations.items():
        if not data["last_message_at"]:
            continue

        if search_term:
            haystack = " ".join(
                filter(
                    None,
                    [
                        data.get("customer_name"),
                        data.get("customer_email"),
                        data.get("customer_phone"),
                        data.get("last_message"),
                    ],
                )
            ).lower()

            if search_term not in haystack:
                continue

        summaries.append(
            ConversationSummary(
                id=convo_id,
                channel=data["channel"],
                customer_name=data["customer_name"],
                customer_email=data["customer_email"],
                customer_phone=data["customer_phone"],
                customer_id=data["customer_id"],
                order_id=data["order_id"],
                last_message=data["last_message"],
                last_message_at=data["last_message_at"],
                unread_count=data["unread_count"],
                total_messages=data["total_messages"],
                ai_messages=data["ai_messages"],
                ai_enabled=data["ai_enabled"],
                recipient=data["recipient"],
                profile_id=data["profile_id"],
            )
        )

    summaries.sort(key=lambda item: item.last_message_at, reverse=True)

    return summaries[:limit]


@router.get(
    "/{project_id}/conversations/{conversation_id}/messages",
    response_model=List[ConversationMessage],
)
async def get_conversation_messages(
    project_id: UUID,
    conversation_id: str,
    provider: Optional[str] = Query(None, description="Filter by provider/channel"),
    days: int = Query(30, description="Number of days to look back", ge=1, le=180),
    limit: int = Query(200, description="Maximum messages to inspect", ge=50, le=500),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Return messages belonging to the resolved conversation identifier."""

    await verify_project_access(project_id, user_id, db)

    query = select(Message).where(Message.project_id == project_id)

    if provider and provider.lower() != "all":
        query = query.where(Message.provider == provider)

    start_date = datetime.utcnow() - timedelta(days=days)
    query = query.where(Message.created_at >= start_date)

    query = query.order_by(Message.created_at.desc()).limit(limit)

    result = await db.execute(query)
    messages = result.scalars().all()

    matched: List[Message] = []
    for msg in messages:
        payload = _resolve_customer_payload(msg)
        if _resolve_conversation_id(msg, payload) == conversation_id:
            matched.append(msg)

    matched.sort(key=lambda item: item.created_at or datetime.min)

    return [
        ConversationMessage(
            id=message.id,
            direction=message.direction,
            provider=message.provider,
            content=message.content,
            content_type=message.content_type,
            created_at=message.created_at,
            ai_generated=message.ai_generated,
            status=message.status,
            sender=message.sender or {},
            recipient=message.recipient or {},
            metadata=message.extra_data or {},
        )
        for message in matched
    ]


@router.get("/{project_id}/{message_id}", response_model=MessageResponse)
async def get_message(
    project_id: UUID,
    message_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get a specific message by ID.
    """
    # Verify project access
    await verify_project_access(project_id, user_id, db)
    
    result = await db.execute(
        select(Message)
        .where(Message.id == message_id)
        .where(Message.project_id == project_id)
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    return message


@router.patch("/{project_id}/{message_id}/read", response_model=MessageResponse)
async def mark_message_read(
    project_id: UUID,
    message_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Mark a message as read.
    """
    # Verify project access
    await verify_project_access(project_id, user_id, db)
    
    result = await db.execute(
        select(Message)
        .where(Message.id == message_id)
        .where(Message.project_id == project_id)
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    message.is_read = True
    await db.commit()
    await db.refresh(message)
    
    return message


@router.get("/{project_id}/conversation/{order_id}", response_model=List[MessageResponse])
async def get_conversation(
    project_id: UUID,
    order_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get full conversation thread for an order.
    """
    # Verify project access
    await verify_project_access(project_id, user_id, db)
    
    # Verify order exists
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .where(Order.project_id == project_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Get all messages for this order
    result = await db.execute(
        select(Message)
        .where(Message.order_id == order_id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    
    return messages


@router.get("/{project_id}/stats/summary")
async def get_message_stats(
    project_id: UUID,
    days: int = Query(30, description="Number of days to analyze", ge=1, le=365),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get message statistics for a project.
    """
    # Verify project access
    await verify_project_access(project_id, user_id, db)
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Total messages
    result = await db.execute(
        select(Message)
        .where(Message.project_id == project_id)
        .where(Message.created_at >= start_date)
    )
    messages = result.scalars().all()
    
    total_messages = len(messages)
    inbound_count = sum(1 for m in messages if m.direction == MessageDirection.INBOUND)
    outbound_count = sum(1 for m in messages if m.direction == MessageDirection.OUTBOUND)
    ai_generated_count = sum(1 for m in messages if m.ai_generated)
    unread_count = sum(1 for m in messages if not m.is_read and m.direction == MessageDirection.INBOUND)
    
    # Messages by provider
    messages_by_provider = {}
    for message in messages:
        provider = message.provider
        messages_by_provider[provider] = messages_by_provider.get(provider, 0) + 1
    
    # Total AI cost
    total_ai_cost = sum(m.ai_cost or 0 for m in messages)
    
    return {
        "period_days": days,
        "start_date": start_date.isoformat(),
        "end_date": datetime.utcnow().isoformat(),
        "total_messages": total_messages,
        "inbound_messages": inbound_count,
        "outbound_messages": outbound_count,
        "ai_generated_messages": ai_generated_count,
        "unread_messages": unread_count,
        "messages_by_provider": messages_by_provider,
        "total_ai_cost": float(total_ai_cost),
        "automation_rate": (ai_generated_count / outbound_count * 100) if outbound_count > 0 else 0.0
    }
