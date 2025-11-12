"""
Pydantic schemas for request/response validation and serialization.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, validator
from enum import Enum


# ============================================================================
# Enums
# ============================================================================

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class IntegrationStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    PENDING = "pending"


class MessageDirection(str, Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class Provider(str, Enum):
    SHOPIFY = "shopify"
    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    TELEGRAM = "telegram"
    SMS = "sms"


# ============================================================================
# Authentication Schemas
# ============================================================================

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    name: Optional[str] = None
    
    @validator("password")
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    email: str  # Allow any string format for login (including .local domains)
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: UUID
    email: str  # Allow any email format (including .local domains)
    name: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Project Schemas
# ============================================================================

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    timezone: str = "UTC"
    settings: Dict[str, Any] = {}


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    timezone: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class ProjectResponse(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    description: Optional[str]
    timezone: str
    settings: Dict[str, Any]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# ============================================================================
# Integration Schemas
# ============================================================================

class IntegrationConnect(BaseModel):
    provider: Provider
    config: Dict[str, Any]  # API keys, tokens, etc.


class IntegrationUpdate(BaseModel):
    config: Optional[Dict[str, Any]] = None
    status: Optional[IntegrationStatus] = None


class IntegrationResponse(BaseModel):
    id: UUID
    project_id: UUID
    provider: str
    status: IntegrationStatus
    config: Dict[str, Any]  # Sensitive data should be masked
    metadata: Dict[str, Any]
    last_sync: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# ============================================================================
# Order Schemas
# ============================================================================

class OrderCreate(BaseModel):
    external_id: str
    provider: str
    status: Optional[str] = "pending"
    customer: Dict[str, Any] = {}
    items: List[Dict[str, Any]] = []
    total: Optional[float] = None
    currency: str = "USD"
    metadata: Dict[str, Any] = {}
    tags: List[str] = []
    order_date: Optional[datetime] = None


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    customer: Optional[Dict[str, Any]] = None
    items: Optional[List[Dict[str, Any]]] = None
    total: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    fulfilled_date: Optional[datetime] = None


class OrderResponse(BaseModel):
    id: UUID
    project_id: UUID
    external_id: str
    provider: str
    status: Optional[str]
    customer: Dict[str, Any]
    items: List[Dict[str, Any]]
    total: Optional[float]
    currency: str
    metadata: Dict[str, Any]
    tags: List[str]
    order_date: Optional[datetime]
    fulfilled_date: Optional[datetime]
    last_updated: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Message Schemas
# ============================================================================

class MessageSend(BaseModel):
    recipient: Dict[str, Any]  # phone, username, etc.
    content: str
    provider: Provider
    content_type: str = "text"
    attachments: List[Dict[str, Any]] = []
    order_id: Optional[UUID] = None


class MessageResponse(BaseModel):
    id: UUID
    project_id: UUID
    order_id: Optional[UUID]
    direction: MessageDirection
    provider: str
    external_id: Optional[str]
    content: str
    content_type: str
    attachments: List[Dict[str, Any]]
    sender: Dict[str, Any]
    recipient: Dict[str, Any]
    ai_generated: bool
    ai_model: Optional[str]
    ai_prompt_tokens: Optional[int]
    ai_completion_tokens: Optional[int]
    ai_cost: Optional[float]
    metadata: Dict[str, Any]
    is_read: bool
    status: str
    error_message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# AI Assistant Schemas
# ============================================================================

class AssistantQuery(BaseModel):
    project_id: UUID
    message: str
    context: Optional[Dict[str, Any]] = {}
    order_id: Optional[UUID] = None
    use_function_calling: bool = True


class FunctionCall(BaseModel):
    name: str
    parameters: Dict[str, Any]


class AssistantResponse(BaseModel):
    reply: str
    function_calls: Optional[List[FunctionCall]] = []
    tokens_used: int
    cost: float
    model: str
    confidence: Optional[float] = None


class ModelTrainRequest(BaseModel):
    project_id: UUID
    dataset_location: Optional[str] = None
    training_params: Dict[str, Any] = {}


class ModelTrainResponse(BaseModel):
    id: UUID
    project_id: UUID
    status: str
    gemini_model: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Report Schemas
# ============================================================================

class ReportGenerate(BaseModel):
    report_type: str  # sales, messages, performance
    start_date: datetime
    end_date: datetime
    filters: Optional[Dict[str, Any]] = {}


class ReportResponse(BaseModel):
    id: UUID
    project_id: UUID
    report_type: str
    payload: Dict[str, Any]
    summary: Optional[str]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    file_url: Optional[str]
    generated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Webhook Schemas
# ============================================================================

class ShopifyWebhook(BaseModel):
    id: int
    email: Optional[str]
    created_at: str
    updated_at: str
    total_price: str
    currency: str
    financial_status: str
    fulfillment_status: Optional[str]
    customer: Dict[str, Any]
    line_items: List[Dict[str, Any]]


class WhatsAppWebhook(BaseModel):
    object: str
    entry: List[Dict[str, Any]]


# ============================================================================
# Analytics Schemas
# ============================================================================

class DashboardStats(BaseModel):
    total_orders: int
    total_revenue: float
    total_messages: int
    ai_messages: int
    active_integrations: int
    response_rate: float
    avg_response_time: float
    period_start: datetime
    period_end: datetime


class UsageStats(BaseModel):
    project_id: UUID
    ai_tokens_used: int
    estimated_cost: float
    messages_sent: int
    orders_processed: int
    period_start: datetime
    period_end: datetime


# ============================================================================
# Pagination
# ============================================================================

class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=100)


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    pages: int
    
    @validator("pages", pre=True, always=True)
    def calculate_pages(cls, v, values):
        if "total" in values and "page_size" in values:
            return (values["total"] + values["page_size"] - 1) // values["page_size"]
        return v


# ============================================================================
# Error Response
# ============================================================================

class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
