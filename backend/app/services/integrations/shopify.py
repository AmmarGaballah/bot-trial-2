"""
Shopify integration service.
"""

import hmac
import hashlib
from typing import Dict, Any, List
import structlog
from app.core.config import settings

logger = structlog.get_logger(__name__)


class ShopifyService:
    """Service for Shopify API integration."""
    
    def __init__(self, shop_url: str, api_key: str, api_secret: str):
        """Initialize Shopify service with credentials."""
        self.shop_url = shop_url
        self.api_key = api_key
        self.api_secret = api_secret
        self.api_version = "2024-01"
    
    def verify_webhook(self, data: bytes, hmac_header: str) -> bool:
        """
        Verify Shopify webhook HMAC signature.
        
        Args:
            data: Raw request body bytes
            hmac_header: HMAC signature from X-Shopify-Hmac-Sha256 header
            
        Returns:
            True if signature is valid, False otherwise
        """
        computed_hmac = hmac.new(
            self.api_secret.encode('utf-8'),
            data,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(computed_hmac, hmac_header)
    
    async def fetch_orders(
        self, 
        limit: int = 50, 
        status: str = "any",
        since_id: str = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch orders from Shopify.
        
        Args:
            limit: Maximum number of orders to fetch
            status: Order status filter (any, open, closed, cancelled)
            since_id: Fetch orders after this ID
            
        Returns:
            List of order dictionaries
        """
        # TODO: Implement actual Shopify API call
        # Example using shopify-python-api:
        # import shopify
        # shopify.ShopifyResource.set_site(f"https://{self.api_key}:{self.api_secret}@{self.shop_url}/admin/api/{self.api_version}")
        # orders = shopify.Order.find(limit=limit, status=status, since_id=since_id)
        
        logger.info("Fetching Shopify orders", limit=limit, status=status)
        
        return []
    
    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """
        Get a specific order by ID.
        
        Args:
            order_id: Shopify order ID
            
        Returns:
            Order dictionary
        """
        # TODO: Implement
        logger.info("Fetching Shopify order", order_id=order_id)
        return {}
    
    async def update_order(self, order_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an order in Shopify.
        
        Args:
            order_id: Shopify order ID
            data: Update data
            
        Returns:
            Updated order dictionary
        """
        # TODO: Implement
        logger.info("Updating Shopify order", order_id=order_id)
        return {}
    
    def transform_order(self, shopify_order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform Shopify order format to internal format.
        
        Args:
            shopify_order: Order data from Shopify API
            
        Returns:
            Transformed order dictionary
        """
        return {
            "external_id": str(shopify_order.get("id")),
            "provider": "shopify",
            "status": shopify_order.get("financial_status"),
            "customer": {
                "name": shopify_order.get("customer", {}).get("name"),
                "email": shopify_order.get("customer", {}).get("email"),
                "phone": shopify_order.get("customer", {}).get("phone"),
            },
            "items": [
                {
                    "name": item.get("name"),
                    "quantity": item.get("quantity"),
                    "price": float(item.get("price", 0)),
                    "sku": item.get("sku"),
                }
                for item in shopify_order.get("line_items", [])
            ],
            "total": float(shopify_order.get("total_price", 0)),
            "currency": shopify_order.get("currency", "USD"),
            "metadata": {
                "order_number": shopify_order.get("order_number"),
                "fulfillment_status": shopify_order.get("fulfillment_status"),
                "tags": shopify_order.get("tags"),
            },
        }
    
    @staticmethod
    def get_webhook_topics() -> List[str]:
        """
        Get list of webhook topics to subscribe to.
        
        Returns:
            List of Shopify webhook topics
        """
        return [
            "orders/create",
            "orders/updated",
            "orders/fulfilled",
            "orders/cancelled",
        ]
