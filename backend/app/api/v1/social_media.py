"""
Social Media Comment Management API
"""

from typing import Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import structlog

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.db.models import SocialMediaComment, Project, Product, BotInstruction, AutoResponseTemplate
from app.services.gemini_client import gemini_client
from pydantic import BaseModel

router = APIRouter()
logger = structlog.get_logger(__name__)


class CommentCreate(BaseModel):
    platform: str  # instagram, facebook, tiktok
    external_id: str
    post_id: str | None = None
    content: str
    author_username: str | None = None
    author_id: str | None = None


class ResponseGenerate(BaseModel):
    comment_id: UUID
    custom_context: str | None = None


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


@router.get("/{project_id}/comments")
async def list_comments(
    project_id: UUID,
    platform: str | None = None,
    responded: bool | None = None,
    skip: int = 0,
    limit: int = 50,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """List social media comments."""
    await verify_project_access(project_id, user_id, db)
    
    query = select(SocialMediaComment).where(SocialMediaComment.project_id == project_id)
    
    if platform:
        query = query.where(SocialMediaComment.platform == platform)
    
    if responded is not None:
        query = query.where(SocialMediaComment.responded == responded)
    
    query = query.order_by(SocialMediaComment.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    comments = result.scalars().all()
    
    return {
        "comments": [
            {
                "id": str(c.id),
                "platform": c.platform,
                "external_id": c.external_id,
                "post_id": c.post_id,
                "content": c.content,
                "author_username": c.author_username,
                "responded": c.responded,
                "response_content": c.response_content,
                "response_sent_at": c.response_sent_at.isoformat() if c.response_sent_at else None,
                "auto_generated": c.auto_generated,
                "sentiment": c.sentiment,
                "intent": c.intent,
                "requires_human": c.requires_human,
                "priority": c.priority,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in comments
        ],
        "total": len(comments)
    }


@router.post("/{project_id}/comments")
async def create_comment(
    project_id: UUID,
    comment: CommentCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Create a new comment (usually from webhook)."""
    await verify_project_access(project_id, user_id, db)
    
    # Check if comment already exists
    existing = await db.execute(
        select(SocialMediaComment)
        .where(
            and_(
                SocialMediaComment.project_id == project_id,
                SocialMediaComment.platform == comment.platform,
                SocialMediaComment.external_id == comment.external_id
            )
        )
    )
    
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment already exists"
        )
    
    # Analyze sentiment
    try:
        sentiment_analysis = await gemini_client.analyze_sentiment(comment.content)
        sentiment = sentiment_analysis.get("sentiment", "neutral")
        
        # Detect intent from content
        content_lower = comment.content.lower()
        if any(word in content_lower for word in ["price", "cost", "how much"]):
            intent = "pricing_inquiry"
        elif any(word in content_lower for word in ["shipping", "deliver", "ship"]):
            intent = "shipping_inquiry"
        elif any(word in content_lower for word in ["available", "stock", "buy"]):
            intent = "product_inquiry"
        else:
            intent = "general"
            
    except Exception as e:
        logger.warning("Sentiment analysis failed", error=str(e))
        sentiment = "neutral"
        intent = "general"
    
    new_comment = SocialMediaComment(
        project_id=project_id,
        platform=comment.platform,
        external_id=comment.external_id,
        post_id=comment.post_id,
        content=comment.content,
        author_username=comment.author_username,
        author_id=comment.author_id,
        sentiment=sentiment,
        intent=intent,
    )
    
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)
    
    logger.info(
        "Social media comment created",
        comment_id=str(new_comment.id),
        platform=comment.platform
    )
    
    return {
        "id": str(new_comment.id),
        "sentiment": sentiment,
        "intent": intent,
        "message": "Comment created successfully"
    }


@router.post("/{project_id}/comments/{comment_id}/generate-response")
async def generate_comment_response(
    project_id: UUID,
    comment_id: UUID,
    request: ResponseGenerate | None = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Generate AI response for a comment."""
    await verify_project_access(project_id, user_id, db)
    
    # Get comment
    result = await db.execute(
        select(SocialMediaComment)
        .where(
            and_(
                SocialMediaComment.id == comment_id,
                SocialMediaComment.project_id == project_id
            )
        )
    )
    comment = result.scalar_one_or_none()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Get project products for context
    products_result = await db.execute(
        select(Product)
        .where(Product.project_id == project_id)
        .where(Product.is_active == True)
    )
    products = products_result.scalars().all()
    
    # Get bot instructions
    instructions_result = await db.execute(
        select(BotInstruction)
        .where(BotInstruction.project_id == project_id)
        .where(BotInstruction.is_active == True)
        .order_by(BotInstruction.priority.desc())
    )
    instructions = instructions_result.scalars().all()
    
    # Build context for AI
    product_info = "\n".join([
        f"- {p.name}: {p.description} (${p.price}, {'In Stock' if p.in_stock else 'Out of Stock'})"
        for p in products[:10]  # Top 10 products
    ])
    
    custom_instructions = "\n".join([
        f"- {i.instruction}"
        for i in instructions
        if not i.active_for_platforms or comment.platform in i.active_for_platforms
    ])
    
    # Generate response
    prompt = f"""Generate a professional, helpful response to this {comment.platform} comment.

Comment: {comment.content}
Author: {comment.author_username}
Sentiment: {comment.sentiment}
Intent: {comment.intent}

Available Products:
{product_info}

Brand Guidelines:
{custom_instructions}

{f'Additional Context: {request.custom_context}' if request and request.custom_context else ''}

Generate a friendly, on-brand response that:
1. Addresses the comment directly
2. Provides helpful information about products if relevant
3. Encourages engagement
4. Matches the platform's tone ({comment.platform})
5. Is concise (max 280 characters for Twitter-like platforms)

Response:"""
    
    try:
        ai_response = await gemini_client.generate_response(
            prompt=prompt,
            use_functions=False,
            temperature=0.7
        )
        
        generated_response = ai_response.get("text", "").strip()
        
        logger.info(
            "Response generated for comment",
            comment_id=str(comment_id),
            response_length=len(generated_response)
        )
        
        return {
            "comment_id": str(comment_id),
            "generated_response": generated_response,
            "tokens_used": ai_response.get("tokens_used", 0),
            "cost": ai_response.get("cost", 0.0)
        }
        
    except Exception as e:
        logger.error("Response generation failed", error=str(e), comment_id=str(comment_id))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(e)}"
        )


@router.post("/{project_id}/comments/{comment_id}/send-response")
async def send_comment_response(
    project_id: UUID,
    comment_id: UUID,
    response_text: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Send a response to a comment."""
    await verify_project_access(project_id, user_id, db)
    
    # Get comment
    result = await db.execute(
        select(SocialMediaComment)
        .where(
            and_(
                SocialMediaComment.id == comment_id,
                SocialMediaComment.project_id == project_id
            )
        )
    )
    comment = result.scalar_one_or_none()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # TODO: Actually send via platform API (Instagram, Facebook, TikTok)
    # For now, just mark as responded
    
    from datetime import datetime
    comment.responded = True
    comment.response_content = response_text
    comment.response_sent_at = datetime.utcnow()
    comment.auto_generated = True
    
    await db.commit()
    
    logger.info(
        "Response sent to comment",
        comment_id=str(comment_id),
        platform=comment.platform
    )
    
    return {
        "message": "Response sent successfully",
        "comment_id": str(comment_id)
    }


@router.get("/{project_id}/stats")
async def get_comment_stats(
    project_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get social media comment statistics."""
    await verify_project_access(project_id, user_id, db)
    
    from sqlalchemy import func
    
    # Total comments
    total_result = await db.execute(
        select(func.count(SocialMediaComment.id))
        .where(SocialMediaComment.project_id == project_id)
    )
    total = total_result.scalar() or 0
    
    # Pending (not responded)
    pending_result = await db.execute(
        select(func.count(SocialMediaComment.id))
        .where(
            and_(
                SocialMediaComment.project_id == project_id,
                SocialMediaComment.responded == False
            )
        )
    )
    pending = pending_result.scalar() or 0
    
    # By platform
    platform_result = await db.execute(
        select(
            SocialMediaComment.platform,
            func.count(SocialMediaComment.id).label("count")
        )
        .where(SocialMediaComment.project_id == project_id)
        .group_by(SocialMediaComment.platform)
    )
    
    by_platform = {row.platform: row.count for row in platform_result}
    
    return {
        "total_comments": total,
        "pending_responses": pending,
        "responded": total - pending,
        "by_platform": by_platform,
        "response_rate": round(((total - pending) / total * 100), 1) if total > 0 else 0
    }
