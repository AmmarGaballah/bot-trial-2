"""
Google Gemini AI client using direct API.
Implements function-calling pattern for autonomous actions.
Supports multiple API keys with automatic rotation for rate limit management.
"""

from typing import List, Dict, Any, Optional
from uuid import UUID
import json
import structlog
import google.generativeai as genai
from app.core.config import settings
import random

logger = structlog.get_logger(__name__)


class GeminiClient:
    """Client for interacting with Google Gemini AI with multi-key support."""
    
    def __init__(self):
        """Initialize Gemini client with multiple API keys."""
        self.model_name = settings.GEMINI_MODEL
        
        # Load multiple API keys
        self.api_keys = self._load_api_keys()
        self.current_key_index = 0
        
        if self.api_keys:
            # Configure with first key initially
            genai.configure(api_key=self.api_keys[0])
            logger.info(f"Gemini API configured with {len(self.api_keys)} API keys")
        else:
            logger.warning("No GEMINI API keys set - AI features will be limited")
        
        # Define available functions for function calling
        self.available_functions = self._define_functions()
        
        # Subscription and optimizer integration (set externally)
        self.subscription_service = None
        self.ai_optimizer = None
    
    def set_subscription_service(self, service):
        """Set subscription service for usage tracking."""
        self.subscription_service = service
    
    def set_ai_optimizer(self, optimizer):
        """Set AI optimizer for caching and optimization."""
        self.ai_optimizer = optimizer
    
    def _estimate_tokens(self, text: str) -> int:
        """Rough estimate of tokens (1 token ≈ 4 characters)."""
        return len(text) // 4
    
    async def _check_usage_limit(self, user_id: Optional[UUID]) -> bool:
        """Check if user can make AI request."""
        if not user_id or not self.subscription_service:
            return True  # No enforcement if not configured
        
        try:
            result = await self.subscription_service.check_and_enforce_limit(
                user_id, "ai_requests"
            )
            return result.get("allowed", True)
        except Exception as e:
            logger.warning(f"Error checking usage limit: {e}")
            return True  # Allow on error to avoid blocking
    
    async def _track_usage(
        self,
        user_id: Optional[UUID],
        prompt: str,
        response: str,
        model: str = "gemini-2.0-flash"
    ):
        """Track AI usage for billing."""
        if not user_id or not self.subscription_service:
            return
        
        try:
            tokens_input = self._estimate_tokens(prompt)
            tokens_output = self._estimate_tokens(response)
            
            await self.subscription_service.track_ai_usage(
                user_id=user_id,
                tokens_input=tokens_input,
                tokens_output=tokens_output,
                model_used=model
            )
            
            logger.debug(
                "AI usage tracked",
                user_id=str(user_id),
                tokens_in=tokens_input,
                tokens_out=tokens_output
            )
        except Exception as e:
            logger.error(f"Error tracking AI usage: {e}")
    
    def _load_api_keys(self) -> List[str]:
        """Load all available API keys from settings (up to 100 keys)."""
        keys = []
        
        # Primary key
        if settings.GEMINI_API_KEY:
            keys.append(settings.GEMINI_API_KEY)
        
        # Additional keys (GEMINI_API_KEY_1 through GEMINI_API_KEY_100)
        for i in range(1, 101):
            key = getattr(settings, f'GEMINI_API_KEY_{i}', None)
            if key:
                keys.append(key)
        
        return keys
    
    def _get_next_api_key(self) -> str:
        """Get next API key using round-robin rotation."""
        if not self.api_keys:
            return None
        
        key = self.api_keys[self.current_key_index]
        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        return key
    
    def _configure_next_key(self):
        """Configure Gemini with next API key in rotation."""
        next_key = self._get_next_api_key()
        if next_key:
            genai.configure(api_key=next_key)
            logger.debug(f"Rotated to API key index {self.current_key_index}")
        return next_key
    
    def _define_functions(self) -> List[Dict[str, Any]]:
        """
        Define functions that Gemini can call.
        These are presented to the model as available actions.
        """
        return [
            {
                "name": "get_message_stats",
                "description": "Get statistics about customer messages (total, unread, by platform)",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "days": {
                            "type": "integer",
                            "description": "Number of days to look back (default: 7)"
                        }
                    }
                }
            },
            {
                "name": "get_order_stats",
                "description": "Get order statistics and sales metrics",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "days": {
                            "type": "integer",
                            "description": "Number of days to analyze (1 for today, 7 for week, 30 for month)"
                        }
                    }
                }
            },
            {
                "name": "get_recent_orders",
                "description": "Get list of recent orders with details",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of orders to return (default: 10)"
                        },
                        "status": {
                            "type": "string",
                            "enum": ["pending", "processing", "fulfilled", "cancelled"],
                            "description": "Filter by order status (optional)"
                        }
                    }
                }
            },
            {
                "name": "get_recent_messages",
                "description": "Get list of recent customer messages",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of messages to return (default: 20)"
                        },
                        "platform": {
                            "type": "string",
                            "enum": ["whatsapp", "instagram", "facebook", "telegram"],
                            "description": "Filter by platform (optional)"
                        }
                    }
                }
            },
            {
                "name": "get_unread_messages",
                "description": "Get all unread customer messages",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "get_urgent_messages",
                "description": "Get urgent/high-priority messages that need immediate attention",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "generate_sales_report",
                "description": "Generate a comprehensive sales report",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "period": {
                            "type": "string",
                            "enum": ["day", "week", "month"],
                            "description": "Time period for the report"
                        },
                        "days": {
                            "type": "integer",
                            "description": "Custom number of days (optional, overrides period)"
                        }
                    },
                    "required": ["period"]
                }
            },
            {
                "name": "generate_customer_report",
                "description": "Generate customer analytics report",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "days": {
                            "type": "integer",
                            "description": "Number of days to analyze (default: 30)"
                        }
                    }
                }
            },
            {
                "name": "get_top_products",
                "description": "Get top selling products",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "days": {
                            "type": "integer",
                            "description": "Period to analyze (default: 30)"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Number of products to return (default: 10)"
                        }
                    }
                }
            },
            {
                "name": "compare_periods",
                "description": "Compare current period with previous period (sales, orders, etc.)",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "period_days": {
                            "type": "integer",
                            "description": "Number of days in each period to compare (default: 7)"
                        }
                    }
                }
            },
            {
                "name": "sync_integration",
                "description": "Trigger manual sync for an integration (Shopify, WhatsApp, etc.)",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "integration": {
                            "type": "string",
                            "enum": ["shopify", "whatsapp", "instagram", "facebook", "telegram"],
                            "description": "Which integration to sync"
                        }
                    },
                    "required": ["integration"]
                }
            },
            {
                "name": "get_integration_status",
                "description": "Get status of all connected integrations",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "analyze_message_sentiment",
                "description": "Analyze sentiment and urgency of a specific message",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "message_id": {
                            "type": "string",
                            "description": "ID of the message to analyze"
                        }
                    },
                    "required": ["message_id"]
                }
            },
            {
                "name": "send_message",
                "description": "Send a message to a customer via their preferred channel",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "customer_id": {
                            "type": "string",
                            "description": "The customer's unique identifier"
                        },
                        "message": {
                            "type": "string",
                            "description": "The message content to send"
                        },
                        "channel": {
                            "type": "string",
                            "enum": ["whatsapp", "telegram", "sms", "instagram"],
                            "description": "Communication channel to use"
                        }
                    },
                    "required": ["customer_id", "message", "channel"]
                }
            },
            {
                "name": "update_order_status",
                "description": "Update the status of an order",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {
                            "type": "string",
                            "description": "The order's unique identifier"
                        },
                        "status": {
                            "type": "string",
                            "enum": ["pending", "processing", "fulfilled", "cancelled", "refunded"],
                            "description": "New status for the order"
                        },
                        "note": {
                            "type": "string",
                            "description": "Optional note about the status change"
                        }
                    },
                    "required": ["order_id", "status"]
                }
            },
            {
                "name": "fetch_order_details",
                "description": "Retrieve detailed information about an order",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {
                            "type": "string",
                            "description": "The order's unique identifier"
                        }
                    },
                    "required": ["order_id"]
                }
            },
            {
                "name": "create_support_ticket",
                "description": "Create a support ticket for complex issues",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "customer_id": {
                            "type": "string",
                            "description": "The customer's unique identifier"
                        },
                        "subject": {
                            "type": "string",
                            "description": "Ticket subject/title"
                        },
                        "description": {
                            "type": "string",
                            "description": "Detailed description of the issue"
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["low", "medium", "high", "urgent"],
                            "description": "Ticket priority level"
                        }
                    },
                    "required": ["customer_id", "subject", "description"]
                }
            },
            {
                "name": "schedule_followup",
                "description": "Schedule an automated follow-up message",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "customer_id": {
                            "type": "string",
                            "description": "The customer's unique identifier"
                        },
                        "message": {
                            "type": "string",
                            "description": "The follow-up message content"
                        },
                        "delay_hours": {
                            "type": "integer",
                            "description": "Hours to wait before sending follow-up"
                        },
                        "channel": {
                            "type": "string",
                            "enum": ["whatsapp", "telegram", "sms", "instagram", "facebook"],
                            "description": "Communication channel to use"
                        }
                    },
                    "required": ["customer_id", "message", "delay_hours", "channel"]
                }
            },
            {
                "name": "generate_report",
                "description": "Generate analytics report for sales, orders, or customer data",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "report_type": {
                            "type": "string",
                            "enum": ["sales", "orders", "customers", "performance", "roi"],
                            "description": "Type of report to generate"
                        },
                        "date_range": {
                            "type": "string",
                            "description": "Date range for the report (e.g., 'last_7_days', 'last_month')"
                        },
                        "metrics": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Specific metrics to include"
                        }
                    },
                    "required": ["report_type", "date_range"]
                }
            },
            {
                "name": "track_order",
                "description": "Get real-time tracking information for an order",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {
                            "type": "string",
                            "description": "The order's unique identifier"
                        }
                    },
                    "required": ["order_id"]
                }
            },
            {
                "name": "sync_social_media",
                "description": "Sync and fetch messages from social media platforms",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "platforms": {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "enum": ["instagram", "facebook", "whatsapp", "telegram"]
                            },
                            "description": "Social media platforms to sync"
                        }
                    },
                    "required": ["platforms"]
                }
            },
            {
                "name": "analyze_customer_sentiment",
                "description": "Analyze customer sentiment from conversations",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "customer_id": {
                            "type": "string",
                            "description": "The customer's unique identifier"
                        },
                        "messages": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Recent messages to analyze"
                        }
                    },
                    "required": ["customer_id", "messages"]
                }
            }
        ]
    
    async def generate_response(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        use_functions: bool = True,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        user_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Generate a response from Gemini with optional function calling.
        
        Args:
            prompt: The input prompt/question
            context: Additional context (conversation history, order details, etc.)
            use_functions: Whether to enable function calling
            temperature: Sampling temperature (0.0 - 1.0)
            max_tokens: Maximum tokens to generate
            user_id: User ID for usage tracking (optional)
            
        Returns:
            Dictionary containing response text, function calls, and metadata
        """
        # Check usage limit before generating
        if user_id:
            can_use = await self._check_usage_limit(user_id)
            if not can_use:
                return {
                    "text": "You've reached your AI request limit for this month. Please upgrade your plan to continue using AI features.",
                    "error": "limit_exceeded",
                    "upgrade_required": True
                }
        
        try:
            # Build the full prompt with context
            full_prompt = self._build_prompt(prompt, context)
            
            # Prepare generation config
            generation_config = {
                "temperature": temperature or settings.GEMINI_TEMPERATURE,
                "max_output_tokens": max_tokens or settings.GEMINI_MAX_TOKENS,
                "top_p": 0.95,
                "top_k": 40
            }
            
            # Use gemini-2.0-flash (FREE and actually available!)
            model_name = "gemini-2.0-flash"
            
            # Initialize model without functions first
            if use_functions:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    generation_config=generation_config
                )
            else:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    generation_config=generation_config
                )
            
            # Generate response with automatic key rotation on rate limit
            max_retries = len(self.api_keys) if self.api_keys else 1
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    logger.info(
                        "Generating Gemini response", 
                        prompt_length=len(full_prompt), 
                        model=model_name,
                        attempt=attempt + 1,
                        total_keys=len(self.api_keys)
                    )
                    
                    response = model.generate_content(full_prompt)
                    
                    # Parse response
                    result = self._parse_response(response)
                    
                    # Track usage for billing
                    if user_id:
                        await self._track_usage(
                            user_id=user_id,
                            prompt=full_prompt,
                            response=result.get("text", ""),
                            model=model_name
                        )
                    
                    logger.info(
                        "Gemini response generated successfully",
                        tokens_used=result.get("tokens_used"),
                        has_function_calls=bool(result.get("function_calls")),
                        key_index=self.current_key_index
                    )
                    
                    return result
                    
                except Exception as attempt_error:
                    last_error = attempt_error
                    error_msg = str(attempt_error).lower()
                    
                    # Check if it's a rate limit error
                    if "rate limit" in error_msg or "quota" in error_msg or "429" in error_msg:
                        logger.warning(
                            f"Rate limit hit on key {self.current_key_index}, rotating to next key",
                            attempt=attempt + 1,
                            max_retries=max_retries
                        )
                        
                        # Rotate to next API key
                        if attempt < max_retries - 1:
                            self._configure_next_key()
                            # Recreate model with new key
                            if use_functions:
                                model = genai.GenerativeModel(
                                    model_name=model_name,
                                    generation_config=generation_config
                                )
                            else:
                                model = genai.GenerativeModel(
                                    model_name=model_name,
                                    generation_config=generation_config
                                )
                            continue
                    else:
                        # Not a rate limit error, raise immediately
                        raise
            
            # All retries exhausted
            import traceback
            error_details = traceback.format_exc()
            logger.error(
                "All API keys exhausted or Gemini generation failed", 
                error=str(last_error), 
                error_type=type(last_error).__name__,
                attempts=max_retries,
                traceback=error_details
            )
            raise Exception(f"Gemini API error (tried {max_retries} keys): {str(last_error)}")
            
        except Exception as e:
            # Catch any other unexpected errors
            import traceback
            error_details = traceback.format_exc()
            logger.error("Unexpected error in generate_response", error=str(e), traceback=error_details)
            raise
    
    def _build_prompt(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Build complete prompt with context and system instructions."""
        
        system_instructions = """You are an AI Sales Assistant for AI Sales Commander - a comprehensive e-commerce management platform.

**CRITICAL BEHAVIOR RULES:**

1. **JUST DO IT - NO EXPLANATIONS NEEDED**
   - User asks "show me sales" → IMMEDIATELY call get_order_stats() - don't explain, just do it
   - User asks "how to" → Give 3-5 simple steps, no fluff
   - NEVER apologize for missing functions - just use what works
   - NEVER explain what you're "about to do" - JUST DO IT

2. **BE EXTREMELY SIMPLE**
   - Use 1-2 sentence responses when possible
   - No technical jargon
   - No "I apologize" or "It seems" or "I attempted"
   - Format: Action → Result → Done

3. **USE CONVERSATION HISTORY**
   - Remember context
   - Don't repeat yourself

4. **TAKE ACTION IMMEDIATELY**
   - See request → Call function → Show results
   - No permission asking, no explaining
   - If something doesn't work, try another way silently

**Your capabilities:**
- Help users manage business across all sales channels and messaging platforms
- Provide data-driven insights using REAL data from functions
- Perform actions when requested (fetch data, generate reports, manage messages)
- Guide users through platform features with COMPLETE instructions

**AVAILABLE FUNCTIONS (USE THESE!):**
- get_message_stats(days) - Get message statistics
- get_order_stats(days) - Get sales and order metrics  
- get_recent_orders(limit, status) - List recent orders
- get_recent_messages(limit, platform) - List messages
- get_unread_messages() - Get all unread messages
- get_urgent_messages() - Get high-priority messages
- generate_sales_report(period) - Create sales report
- generate_customer_report(days) - Customer analytics
- get_top_products(days, limit) - Best selling products
- compare_periods(period_days) - Compare time periods
- sync_integration(integration) - Trigger data sync
- get_integration_status() - Check integration health

**Response format:**
- For data requests: Just show the data (no "Here's what I found" or "Let me show you")
- For how-to: 3-5 numbered steps, nothing more
- For problems: Try alternative, don't explain failure

**EXAMPLES OF CORRECT BEHAVIOR:**

❌ BAD: "I apologize, but I couldn't retrieve the data. It seems the function is not implemented. Would you like me to try another approach?"

✅ GOOD: "📊 Today's Sales:
• 23 orders
• $3,450 revenue  
• $150 avg order
↑ 15% from yesterday"

---

❌ BAD: "To generate a report, first you need to navigate to the Reports page. Then you'll see several options including Sales Report, Customer Report..."

✅ GOOD: "Generate a report:
1. Click Reports
2. Pick type (Sales/Customer/Product)
3. Select time period
4. Hit Generate"

---

❌ BAD: "I attempted to use the show_sales function but it's not available. Let me try get_order_stats instead. Would that work for you?"

✅ GOOD: [Just calls get_order_stats silently and shows results]

**NEVER:**
- Apologize
- Explain technical issues
- Ask permission to try things
- Use phrases like "It seems", "I attempted", "Unfortunately", "I apologize"

**ALWAYS:**
- Be direct
- Show results immediately  
- Keep it simple
- Take action without asking
"""
        
        context_str = ""
        if context:
            context_str = "\n\nContext:\n"
            
            # Add custom instructions first (highest priority)
            if "custom_instructions" in context:
                context_str += "\n**CUSTOM BRAND INSTRUCTIONS (FOLLOW THESE!):**\n"
                for instruction in context["custom_instructions"]:
                    context_str += f"- [{instruction.get('category', 'general')}] {instruction.get('instruction')}\n"
            
            # Add product catalog
            if "product_catalog" in context:
                context_str += "\n**AVAILABLE PRODUCTS:**\n"
                for product in context["product_catalog"][:10]:  # Top 10
                    context_str += f"- **{product.get('name')}**: {product.get('description')} "
                    context_str += f"(${product.get('price')} {product.get('currency')}, "
                    context_str += f"{'In Stock' if product.get('in_stock') else 'Out of Stock'})\n"
                    if product.get('faq'):
                        context_str += f"  FAQ: {len(product.get('faq'))} common questions\n"
            
            if "conversation_history" in context:
                context_str += "\nRecent conversation:\n"
                for msg in context["conversation_history"][-5:]:  # Last 5 messages
                    context_str += f"- {msg.get('role', 'user')}: {msg.get('content', '')}\n"
            
            if "order" in context:
                order = context["order"]
                context_str += f"\nOrder Information:\n"
                context_str += f"- Order ID: {order.get('id')}\n"
                context_str += f"- Status: {order.get('status')}\n"
                context_str += f"- Customer: {order.get('customer', {}).get('name')}\n"
                context_str += f"- Total: {order.get('currency', 'USD')} {order.get('total')}\n"
            
            if "customer" in context:
                customer = context["customer"]
                context_str += f"\nCustomer Information:\n"
                context_str += f"- Name: {customer.get('name')}\n"
                context_str += f"- Email: {customer.get('email')}\n"
                context_str += f"- Phone: {customer.get('phone')}\n"
        
        full_prompt = f"{system_instructions}{context_str}\n\nUser Query: {prompt}\n\nResponse:"
        return full_prompt
    
    def _parse_response(self, response) -> Dict[str, Any]:
        """Parse Gemini response including function calls."""
        
        result = {
            "text": "",
            "function_calls": [],
            "tokens_used": 0,
            "cost": 0.0,
            "model": self.model_name
        }
        
        # Extract text response
        if hasattr(response, 'text') and response.text:
            result["text"] = response.text
        elif hasattr(response, 'candidates') and response.candidates:
            # Try to extract text from candidates if direct text fails
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                for part in candidate.content.parts:
                    if hasattr(part, 'text') and part.text:
                        result["text"] = part.text
                        break
        
        # Extract function calls
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            
            if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                for part in candidate.content.parts:
                    if hasattr(part, 'function_call'):
                        func_call = part.function_call
                        # Handle None args properly
                        params = {}
                        if func_call.args:
                            try:
                                params = dict(func_call.args)
                            except (TypeError, ValueError):
                                params = {}
                        
                        result["function_calls"].append({
                            "name": func_call.name if hasattr(func_call, 'name') else 'unknown',
                            "parameters": params
                        })
        
        # Calculate token usage (approximate)
        if hasattr(response, 'usage_metadata'):
            usage = response.usage_metadata
            result["tokens_used"] = usage.total_token_count
            
            # Rough cost estimation (update with actual Gemini pricing)
            # Example: $0.00025 per 1K tokens for Pro model
            result["cost"] = (result["tokens_used"] / 1000) * 0.00025
        
        return result
    
    async def generate_content(
        self,
        prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Simplified method to generate text content from Gemini.
        
        Args:
            prompt: The input prompt
            temperature: Sampling temperature (0.0 - 1.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text response as string
        """
        result = await self.generate_response(
            prompt=prompt,
            context=None,
            use_functions=False,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return result.get("text", "")
    
    async def generate_sales_reply(
        self,
        customer_message: str,
        order_context: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Specialized method for generating sales replies.
        
        Args:
            customer_message: The customer's message
            order_context: Related order information
            conversation_history: Previous messages in the conversation
            
        Returns:
            Generated reply with optional function calls
        """
        context = {
            "conversation_history": conversation_history or [],
            "order": order_context
        }
        
        return await self.generate_response(
            prompt=customer_message,
            context=context,
            use_functions=True
        )
    
    async def analyze_sentiment(self, message: str) -> Dict[str, Any]:
        """
        Analyze sentiment of a customer message.
        
        Args:
            message: The message to analyze
            
        Returns:
            Sentiment analysis results
        """
        prompt = f"""Analyze the sentiment of this customer message and provide:
1. Overall sentiment (positive, neutral, negative)
2. Urgency level (low, medium, high, urgent)
3. Key concerns or topics
4. Recommended response tone

Message: {message}

Respond in JSON format."""
        
        response = await self.generate_response(
            prompt=prompt,
            use_functions=False,
            temperature=0.3  # Lower temperature for analysis
        )
        
        try:
            # Attempt to parse JSON response
            analysis = json.loads(response["text"])
            return analysis
        except json.JSONDecodeError:
            return {
                "sentiment": "neutral",
                "urgency": "medium",
                "concerns": [],
                "raw_analysis": response["text"]
            }
    
    async def generate_product_recommendation(
        self,
        customer_profile: Dict[str, Any],
        purchase_history: List[Dict[str, Any]],
        available_products: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate personalized product recommendations.
        
        Args:
            customer_profile: Customer information and preferences
            purchase_history: Previous purchases
            available_products: Current product catalog
            
        Returns:
            List of recommended products with explanations
        """
        prompt = f"""Generate product recommendations based on:

Customer Profile:
{json.dumps(customer_profile, indent=2)}

Purchase History:
{json.dumps(purchase_history[-10:], indent=2)}

Available Products:
{json.dumps(available_products[:20], indent=2)}

Provide top 5 recommendations with:
1. Product name and ID
2. Reason for recommendation
3. Confidence score (0-1)

Respond in JSON format as array of recommendations."""
        
        response = await self.generate_response(
            prompt=prompt,
            use_functions=False,
            temperature=0.6
        )
        
        try:
            recommendations = json.loads(response["text"])
            return recommendations
        except json.JSONDecodeError:
            logger.warning("Failed to parse recommendations", response=response["text"])
            return []


# Global client instance
gemini_client = GeminiClient()
