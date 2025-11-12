"""
AI Orchestrator - Connects Gemini AI with integrations and executes actions.
"""

from typing import Dict, Any, Optional
import structlog
from uuid import UUID

from app.services.gemini_client import GeminiClient
from app.services.integrations.shopify import ShopifyClient
from app.services.integrations.telegram import TelegramClient
from app.services.integrations.whatsapp import WhatsAppClient
from app.services.integrations.instagram import InstagramClient
from app.services.integrations.facebook import FacebookClient
from app.core.database import AsyncSession
from app.db.models import Integration, Message, Order
from sqlalchemy import select

logger = structlog.get_logger(__name__)


class AIOrchestrator:
    """
    Orchestrates AI-driven customer interactions and automation.
    Connects Gemini AI with various platform integrations.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.gemini = GeminiClient()
        self.integration_clients = {}
    
    async def initialize_integrations(self, project_id: UUID):
        """Load and initialize all active integrations for a project."""
        result = await self.db.execute(
            select(Integration)
            .where(Integration.project_id == project_id)
            .where(Integration.status == "connected")
        )
        integrations = result.scalars().all()
        
        for integration in integrations:
            client = self._get_integration_client(integration)
            if client:
                self.integration_clients[integration.provider] = client
        
        logger.info(
            "Integrations initialized",
            project_id=str(project_id),
            count=len(self.integration_clients)
        )
    
    def _get_integration_client(self, integration: Integration):
        """Create appropriate client for integration provider."""
        clients = {
            "shopify": ShopifyClient,
            "telegram": TelegramClient,
            "whatsapp": WhatsAppClient,
            "instagram": InstagramClient,
            "facebook": FacebookClient
        }
        
        client_class = clients.get(integration.provider)
        if client_class:
            return client_class(integration.config)
        return None
    
    async def process_customer_message(
        self,
        customer_id: UUID,
        message_content: str,
        channel: str,
        project_id: UUID
    ) -> Dict[str, Any]:
        """
        Process incoming customer message with AI and generate response.
        
        Args:
            customer_id: Customer UUID
            message_content: Message text
            channel: Communication channel (whatsapp, telegram, etc.)
            project_id: Project UUID
        
        Returns:
            Dict with AI response and actions taken
        """
        # Get customer context
        customer = await self._get_customer(customer_id)
        conversation_history = await self._get_conversation_history(customer_id, limit=10)
        
        # Build context for AI
        context = self._build_context(customer, conversation_history, channel)
        
        # Get AI response with function calling
        ai_response = await self.gemini.chat_with_functions(
            message=message_content,
            context=context,
            functions=self.gemini.available_functions
        )
        
        # Execute any function calls the AI requested
        actions_taken = []
        if ai_response.get("function_calls"):
            for func_call in ai_response["function_calls"]:
                result = await self._execute_function(func_call, customer_id, project_id)
                actions_taken.append(result)
        
        # Send AI response to customer
        if ai_response.get("text_response"):
            await self._send_message(
                customer_id=customer_id,
                message=ai_response["text_response"],
                channel=channel,
                project_id=project_id
            )
        
        return {
            "response": ai_response.get("text_response"),
            "actions": actions_taken,
            "function_calls": ai_response.get("function_calls", [])
        }
    
    async def _execute_function(
        self,
        function_call: Dict[str, Any],
        customer_id: UUID,
        project_id: UUID
    ) -> Dict[str, Any]:
        """Execute a function called by AI."""
        func_name = function_call.get("name")
        params = function_call.get("parameters", {})
        
        try:
            if func_name == "send_message":
                result = await self._send_message(
                    customer_id=params["customer_id"],
                    message=params["message"],
                    channel=params["channel"]
                )
            elif func_name == "update_order_status":
                result = await self._update_order(
                    order_id=params["order_id"],
                    status=params["status"],
                    note=params.get("note")
                )
            elif func_name == "fetch_order_details":
                result = await self._fetch_order(params["order_id"])
            elif func_name == "create_support_ticket":
                result = await self._create_ticket(
                    customer_id=customer_id,
                    issue=params["issue"],
                    priority=params.get("priority", "normal")
                )
            else:
                result = {"status": "error", "message": f"Unknown function: {func_name}"}
            
            logger.info(
                "AI function executed",
                function=func_name,
                customer_id=str(customer_id),
                result=result
            )
            
            return {
                "function": func_name,
                "parameters": params,
                "result": result
            }
            
        except Exception as e:
            logger.error(
                "Function execution failed",
                function=func_name,
                error=str(e)
            )
            return {
                "function": func_name,
                "parameters": params,
                "result": {"status": "error", "message": str(e)}
            }
    
    async def _send_message(
        self,
        customer_id: UUID,
        message: str,
        channel: str,
        project_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Send message via appropriate integration."""
        client = self.integration_clients.get(channel)
        if not client:
            logger.error("No integration client found for channel", channel=channel)
            return {"status": "error", "message": f"No client for channel: {channel}"}
        
        try:
            # Get customer to find their platform-specific ID
            from app.db.models import Customer
            result = await self.db.execute(
                select(Customer).where(Customer.id == customer_id)
            )
            customer = result.scalar_one_or_none()
            
            if not customer:
                logger.error("Customer not found", customer_id=str(customer_id))
                return {"status": "error", "message": "Customer not found"}
            
            # Get platform-specific ID
            platform_id = None
            if channel == "telegram":
                platform_id = customer.telegram_id
            elif channel == "whatsapp":
                platform_id = customer.phone
            elif channel == "instagram":
                platform_id = customer.instagram_id
            elif channel == "facebook":
                platform_id = customer.facebook_id
            
            if not platform_id:
                logger.error("No platform ID found for customer", 
                           customer_id=str(customer_id), channel=channel)
                return {"status": "error", "message": f"No {channel} ID for customer"}
            
            # Send message via client
            result = await client.send_message(platform_id, message)
            
            # Save message to database
            new_message = Message(
                customer_id=customer_id,
                project_id=project_id or customer.project_id,
                content=message,
                direction="outbound",
                channel=channel,
                status="sent",
                external_id=result.get("id")
            )
            self.db.add(new_message)
            await self.db.commit()
            
            logger.info("Message sent successfully", 
                       customer_id=str(customer_id), 
                       channel=channel,
                       message_id=result.get("id"))
            
            return {"status": "success", "message_id": result.get("id")}
            
        except Exception as e:
            logger.error("Failed to send message", 
                        customer_id=str(customer_id),
                        channel=channel,
                        error=str(e))
            return {"status": "error", "message": str(e)}
    
    async def _update_order(
        self,
        order_id: str,
        status: str,
        note: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update order status in Shopify."""
        shopify_client = self.integration_clients.get("shopify")
        if not shopify_client:
            return {"status": "error", "message": "Shopify not connected"}
        
        try:
            result = await shopify_client.update_order(order_id, status, note)
            return {"status": "success", "order_id": order_id}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def _fetch_order(self, order_id: str) -> Dict[str, Any]:
        """Fetch order details from Shopify."""
        shopify_client = self.integration_clients.get("shopify")
        if not shopify_client:
            return {"status": "error", "message": "Shopify not connected"}
        
        try:
            order = await shopify_client.get_order(order_id)
            return {"status": "success", "order": order}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def _create_ticket(
        self,
        customer_id: UUID,
        issue: str,
        priority: str
    ) -> Dict[str, Any]:
        """Create support ticket for escalation."""
        # TODO: Implement ticket system
        logger.info(
            "Support ticket created",
            customer_id=str(customer_id),
            issue=issue,
            priority=priority
        )
        return {
            "status": "success",
            "ticket_id": "TKT-" + str(customer_id)[:8],
            "priority": priority
        }
    
    async def _get_customer(self, customer_id: UUID) -> Optional[dict]:
        """Fetch customer from database (placeholder - returns None for now)."""
        # TODO: Implement customer model and fetching
        return None
    
    async def _get_conversation_history(
        self,
        customer_id: UUID,
        limit: int = 10
    ) -> list:
        """Fetch recent conversation history."""
        result = await self.db.execute(
            select(Message)
            .where(Message.customer_id == customer_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        messages = result.scalars().all()
        return [
            {
                "role": "user" if msg.direction == "inbound" else "assistant",
                "content": msg.content,
                "timestamp": msg.created_at.isoformat()
            }
            for msg in reversed(messages)
        ]
    
    def _build_context(
        self,
        customer: Optional[dict],
        history: list,
        channel: str
    ) -> Dict[str, Any]:
        """Build context object for AI."""
        return {
            "customer": {
                "id": str(customer.get("id")) if customer else None,
                "name": customer.get("name") if customer else "Unknown",
                "email": customer.get("email") if customer else None,
                "phone": customer.get("phone") if customer else None
            },
            "conversation_history": history,
            "channel": channel,
            "available_integrations": list(self.integration_clients.keys())
        }
    
    async def sync_social_media_messages(
        self,
        project_id: UUID,
        platforms: list[str]
    ) -> Dict[str, Any]:
        """
        Sync messages from multiple social media platforms.
        
        Args:
            project_id: Project UUID
            platforms: List of platforms to sync (instagram, facebook, whatsapp, telegram)
            
        Returns:
            Sync results for each platform
        """
        logger.info("Syncing social media messages", platforms=platforms)
        
        results = {}
        
        for platform in platforms:
            client = self.integration_clients.get(platform)
            if not client:
                results[platform] = {"status": "error", "message": "Not connected"}
                continue
            
            try:
                # Fetch messages from platform
                if platform == "instagram":
                    messages = await client.get_messages(limit=50)
                elif platform == "facebook":
                    messages = await client.get_messages(limit=50)
                elif platform == "whatsapp":
                    messages = await client.get_messages(limit=50)
                elif platform == "telegram":
                    messages = await client.get_updates()
                else:
                    messages = []
                
                # Process and save messages
                saved_count = 0
                for msg in messages:
                    await self._save_platform_message(msg, platform, project_id)
                    saved_count += 1
                    
                    # Auto-respond if AI is enabled
                    if msg.get('from_customer', True):
                        await self.auto_respond_to_message(msg, platform, project_id)
                
                results[platform] = {
                    "status": "success",
                    "messages_synced": saved_count
                }
                
            except Exception as e:
                logger.error(f"Failed to sync {platform}", error=str(e))
                results[platform] = {"status": "error", "message": str(e)}
        
        return results
    
    async def auto_respond_to_message(
        self,
        message_data: Dict[str, Any],
        platform: str,
        project_id: UUID
    ):
        """
        Automatically generate and send AI response to a message.
        
        Args:
            message_data: Message data from platform
            platform: Platform name
            project_id: Project UUID
        """
        try:
            customer_id = message_data.get('customer_id')
            message_content = message_data.get('text', message_data.get('content', ''))
            
            if not message_content:
                return
            
            # Process with AI
            response = await self.process_customer_message(
                customer_id=customer_id,
                message_content=message_content,
                channel=platform,
                project_id=project_id
            )
            
            logger.info(
                "Auto-responded to message",
                platform=platform,
                response_sent=bool(response.get('response'))
            )
            
        except Exception as e:
            logger.error("Auto-response failed", error=str(e), platform=platform)
    
    async def _save_platform_message(
        self,
        message_data: Dict[str, Any],
        platform: str,
        project_id: UUID
    ):
        """Save a message from a social media platform to database."""
        try:
            new_message = Message(
                project_id=project_id,
                customer_id=message_data.get('customer_id'),
                content=message_data.get('text', message_data.get('content', '')),
                direction=message_data.get('direction', 'inbound'),
                channel=platform,
                status='received',
                extra_data={
                    'platform_message_id': message_data.get('id'),
                    'sender': message_data.get('from', {}),
                    'timestamp': message_data.get('timestamp')
                }
            )
            self.db.add(new_message)
            await self.db.commit()
            
        except Exception as e:
            logger.error("Failed to save message", error=str(e), platform=platform)
    
    async def analyze_sentiment_all_channels(
        self,
        project_id: UUID,
        days: int = 7
    ) -> Dict[str, Any]:
        """
        Analyze customer sentiment across all communication channels.
        
        Args:
            project_id: Project UUID
            days: Number of days to analyze
            
        Returns:
            Sentiment analysis results
        """
        from datetime import datetime, timedelta
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Fetch recent messages
        result = await self.db.execute(
            select(Message).where(
                Message.project_id == project_id,
                Message.created_at >= start_date,
                Message.direction == 'inbound'
            ).limit(100)
        )
        messages = result.scalars().all()
        
        if not messages:
            return {"status": "no_data", "message": "No messages to analyze"}
        
        # Analyze with AI
        message_texts = [msg.content for msg in messages[:20]]  # Sample 20 messages
        
        prompt = f"""Analyze the sentiment and tone of these customer messages:

{chr(10).join(f'{i+1}. {text}' for i, text in enumerate(message_texts))}

Provide:
1. Overall sentiment (positive, neutral, negative) with percentage
2. Common concerns or themes
3. Urgency level
4. Recommendations for improving customer satisfaction

Respond in JSON format."""
        
        try:
            response = await self.gemini.generate_response(
                prompt=prompt,
                use_functions=False,
                temperature=0.3
            )
            
            import json
            analysis = json.loads(response.get('text', '{}'))
            
            return {
                "status": "success",
                "analysis": analysis,
                "messages_analyzed": len(message_texts),
                "period_days": days
            }
            
        except Exception as e:
            logger.error("Sentiment analysis failed", error=str(e))
            return {"status": "error", "message": str(e)}
    
    async def generate_social_media_post(
        self,
        topic: str,
        platform: str,
        tone: str = "professional"
    ) -> Dict[str, Any]:
        """
        Generate social media post content using AI.
        
        Args:
            topic: Post topic or product to promote
            platform: Target platform (instagram, facebook, twitter)
            tone: Desired tone (professional, casual, friendly, promotional)
            
        Returns:
            Generated post content
        """
        # Platform-specific guidelines
        guidelines = {
            "instagram": "Use emojis, hashtags, visual language. Max 2200 chars.",
            "facebook": "Engaging, conversational. Can be longer. Include call-to-action.",
            "twitter": "Concise, witty. Max 280 characters. Use relevant hashtags.",
            "linkedin": "Professional, informative. Industry insights."
        }
        
        guideline = guidelines.get(platform, "General social media post")
        
        prompt = f"""Create a {tone} social media post for {platform} about: {topic}

Guidelines: {guideline}

Include:
1. Engaging main text
2. Relevant hashtags (3-5)
3. Call-to-action
4. Emoji suggestions (if appropriate for platform)

Format as JSON with keys: text, hashtags, cta, emojis"""
        
        try:
            response = await self.gemini.generate_response(
                prompt=prompt,
                use_functions=False,
                temperature=0.8  # Higher for creativity
            )
            
            import json
            post_content = json.loads(response.get('text', '{}'))
            
            return {
                "status": "success",
                "platform": platform,
                "content": post_content
            }
            
        except Exception as e:
            logger.error("Post generation failed", error=str(e))
            return {"status": "error", "message": str(e)}
