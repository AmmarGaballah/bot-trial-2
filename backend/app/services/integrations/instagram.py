"""
Instagram integration client for handling Direct Messages.
Uses Instagram Graph API.
"""

from typing import Dict, Any, Optional, List
import aiohttp
import structlog
from uuid import UUID

logger = structlog.get_logger(__name__)


class InstagramClient:
    """Client for Instagram Direct Messages via Graph API."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Instagram client.
        
        Args:
            config: Configuration dict containing:
                - page_id: Instagram business account ID
                - access_token: Instagram Graph API access token
        """
        self.page_id = config.get("page_id")
        self.access_token = config.get("access_token")
        self.api_base = "https://graph.instagram.com/v18.0"
        
        if not self.page_id or not self.access_token:
            raise ValueError("Instagram config must include page_id and access_token")
    
    async def send_message(
        self,
        customer_id: UUID,
        message: str,
        message_type: str = "text"
    ) -> Dict[str, Any]:
        """
        Send a message to a customer via Instagram DM.
        
        Args:
            customer_id: Customer UUID (maps to Instagram user ID)
            message: Message content
            message_type: Type of message (text, image, etc.)
        
        Returns:
            Dict with message_id and status
        """
        url = f"{self.api_base}/{self.page_id}/messages"
        
        payload = {
            "recipient": {"id": str(customer_id)},
            "message": {"text": message},
            "messaging_type": "RESPONSE"
        }
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        logger.info(
                            "Instagram message sent",
                            customer_id=str(customer_id),
                            message_id=data.get("message_id")
                        )
                        return {
                            "status": "success",
                            "id": data.get("message_id"),
                            "platform": "instagram"
                        }
                    else:
                        error_data = await response.text()
                        logger.error(
                            "Instagram send failed",
                            status=response.status,
                            error=error_data
                        )
                        return {
                            "status": "error",
                            "message": f"API error: {response.status}"
                        }
        except Exception as e:
            logger.error("Instagram exception", error=str(e))
            return {"status": "error", "message": str(e)}
    
    async def get_messages(
        self,
        conversation_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Fetch messages from a conversation.
        
        Args:
            conversation_id: Instagram conversation ID
            limit: Max number of messages to fetch
        
        Returns:
            List of message dicts
        """
        url = f"{self.api_base}/{conversation_id}/messages"
        params = {
            "fields": "id,from,to,message,created_time",
            "limit": limit,
            "access_token": self.access_token
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("data", [])
                    return []
        except Exception as e:
            logger.error("Failed to fetch Instagram messages", error=str(e))
            return []
    
    async def verify_webhook(
        self,
        verify_token: str,
        mode: str,
        challenge: str
    ) -> Optional[str]:
        """
        Verify Instagram webhook.
        
        Args:
            verify_token: Expected token
            mode: Verification mode
            challenge: Challenge string to return
        
        Returns:
            Challenge string if verified, None otherwise
        """
        if mode == "subscribe" and verify_token == self.access_token:
            return challenge
        return None
    
    async def handle_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process incoming Instagram webhook event.
        
        Args:
            payload: Webhook payload
        
        Returns:
            Processed event data
        """
        try:
            entry = payload.get("entry", [])[0]
            messaging = entry.get("messaging", [])[0]
            
            sender_id = messaging.get("sender", {}).get("id")
            message = messaging.get("message", {})
            message_text = message.get("text")
            
            return {
                "platform": "instagram",
                "sender_id": sender_id,
                "message": message_text,
                "timestamp": messaging.get("timestamp"),
                "message_id": message.get("mid")
            }
        except (KeyError, IndexError) as e:
            logger.error("Invalid Instagram webhook payload", error=str(e))
            return {"status": "error", "message": "Invalid payload"}
    
    async def get_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Get Instagram user profile information.
        
        Args:
            user_id: Instagram user ID
        
        Returns:
            User profile dict
        """
        url = f"{self.api_base}/{user_id}"
        params = {
            "fields": "id,username,name,profile_picture_url",
            "access_token": self.access_token
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        return await response.json()
                    return {}
        except Exception as e:
            logger.error("Failed to fetch Instagram profile", error=str(e))
            return {}
    
    async def test_connection(self) -> bool:
        """Test if Instagram connection is working."""
        url = f"{self.api_base}/{self.page_id}"
        params = {"access_token": self.access_token}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    return response.status == 200
        except Exception:
            return False
