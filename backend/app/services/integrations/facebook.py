"""
Facebook Messenger integration client.
Uses Facebook Graph API for sending/receiving messages.
"""

from typing import Dict, Any, Optional, List
import aiohttp
import structlog
from uuid import UUID

logger = structlog.get_logger(__name__)


class FacebookClient:
    """Client for Facebook Messenger via Graph API."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Facebook Messenger client.
        
        Args:
            config: Configuration dict containing:
                - page_id: Facebook page ID
                - access_token: Page access token
                - app_secret: Facebook app secret (for webhook verification)
        """
        self.page_id = config.get("page_id")
        self.access_token = config.get("access_token")
        self.app_secret = config.get("app_secret")
        self.api_base = "https://graph.facebook.com/v18.0"
        
        if not self.page_id or not self.access_token:
            raise ValueError("Facebook config must include page_id and access_token")
    
    async def send_message(
        self,
        customer_id: UUID,
        message: str,
        quick_replies: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Send a message to a customer via Facebook Messenger.
        
        Args:
            customer_id: Customer UUID (maps to Facebook PSID)
            message: Message content
            quick_replies: Optional quick reply buttons
        
        Returns:
            Dict with message_id and status
        """
        url = f"{self.api_base}/me/messages"
        
        message_data = {"text": message}
        
        # Add quick replies if provided
        if quick_replies:
            message_data["quick_replies"] = [
                {
                    "content_type": "text",
                    "title": reply["title"],
                    "payload": reply["payload"]
                }
                for reply in quick_replies
            ]
        
        payload = {
            "recipient": {"id": str(customer_id)},
            "message": message_data,
            "messaging_type": "RESPONSE"
        }
        
        params = {"access_token": self.access_token}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        logger.info(
                            "Facebook message sent",
                            customer_id=str(customer_id),
                            message_id=data.get("message_id")
                        )
                        return {
                            "status": "success",
                            "id": data.get("message_id"),
                            "platform": "facebook"
                        }
                    else:
                        error_data = await response.text()
                        logger.error(
                            "Facebook send failed",
                            status=response.status,
                            error=error_data
                        )
                        return {
                            "status": "error",
                            "message": f"API error: {response.status}"
                        }
        except Exception as e:
            logger.error("Facebook exception", error=str(e))
            return {"status": "error", "message": str(e)}
    
    async def send_template(
        self,
        customer_id: UUID,
        template_type: str,
        elements: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Send a template message (e.g., generic template, button template).
        
        Args:
            customer_id: Customer UUID
            template_type: Type of template (generic, button, etc.)
            elements: Template elements
        
        Returns:
            Dict with send status
        """
        url = f"{self.api_base}/me/messages"
        
        payload = {
            "recipient": {"id": str(customer_id)},
            "message": {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": template_type,
                        "elements": elements
                    }
                }
            }
        }
        
        params = {"access_token": self.access_token}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "status": "success",
                            "id": data.get("message_id")
                        }
                    return {"status": "error", "message": f"Status {response.status}"}
        except Exception as e:
            logger.error("Failed to send template", error=str(e))
            return {"status": "error", "message": str(e)}
    
    async def get_user_profile(self, psid: str) -> Dict[str, Any]:
        """
        Get Facebook user profile information.
        
        Args:
            psid: Page-scoped ID of the user
        
        Returns:
            User profile dict with name, profile_pic, etc.
        """
        url = f"{self.api_base}/{psid}"
        params = {
            "fields": "first_name,last_name,profile_pic,locale,timezone,gender",
            "access_token": self.access_token
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        return await response.json()
                    return {}
        except Exception as e:
            logger.error("Failed to fetch user profile", error=str(e))
            return {}
    
    async def handle_webhook(self, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Process incoming Facebook webhook event.
        
        Args:
            payload: Webhook payload
        
        Returns:
            List of processed messages
        """
        messages = []
        
        try:
            for entry in payload.get("entry", []):
                for messaging_event in entry.get("messaging", []):
                    sender_id = messaging_event.get("sender", {}).get("id")
                    recipient_id = messaging_event.get("recipient", {}).get("id")
                    timestamp = messaging_event.get("timestamp")
                    
                    # Handle message
                    if "message" in messaging_event:
                        message = messaging_event["message"]
                        messages.append({
                            "platform": "facebook",
                            "sender_id": sender_id,
                            "recipient_id": recipient_id,
                            "message": message.get("text"),
                            "timestamp": timestamp,
                            "message_id": message.get("mid"),
                            "attachments": message.get("attachments", [])
                        })
                    
                    # Handle postback (button clicks)
                    elif "postback" in messaging_event:
                        postback = messaging_event["postback"]
                        messages.append({
                            "platform": "facebook",
                            "sender_id": sender_id,
                            "recipient_id": recipient_id,
                            "postback": postback.get("payload"),
                            "title": postback.get("title"),
                            "timestamp": timestamp,
                            "type": "postback"
                        })
            
            return messages
            
        except (KeyError, IndexError) as e:
            logger.error("Invalid Facebook webhook payload", error=str(e))
            return []
    
    async def set_get_started_button(self, payload: str = "GET_STARTED") -> bool:
        """
        Configure Get Started button for new conversations.
        
        Args:
            payload: Payload to send when button is clicked
        
        Returns:
            True if successful
        """
        url = f"{self.api_base}/me/messenger_profile"
        
        data = {
            "get_started": {"payload": payload}
        }
        
        params = {"access_token": self.access_token}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data, params=params) as response:
                    return response.status == 200
        except Exception as e:
            logger.error("Failed to set get started button", error=str(e))
            return False
    
    async def set_greeting_text(self, greeting: str) -> bool:
        """
        Set greeting text shown before conversation starts.
        
        Args:
            greeting: Greeting text
        
        Returns:
            True if successful
        """
        url = f"{self.api_base}/me/messenger_profile"
        
        data = {
            "greeting": [
                {
                    "locale": "default",
                    "text": greeting
                }
            ]
        }
        
        params = {"access_token": self.access_token}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data, params=params) as response:
                    return response.status == 200
        except Exception as e:
            logger.error("Failed to set greeting", error=str(e))
            return False
    
    async def test_connection(self) -> bool:
        """Test if Facebook connection is working."""
        url = f"{self.api_base}/me"
        params = {"access_token": self.access_token}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    return response.status == 200
        except Exception:
            return False
