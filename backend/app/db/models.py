"""
SQLAlchemy database models for all entities.
"""

from datetime import datetime
from uuid import uuid4
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, 
    ForeignKey, Index, JSON, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base, AuthBase
import enum


class UserRole(str, enum.Enum):
    """User role enum."""
    ADMIN = "admin"
    USER = "user"
    

class IntegrationStatus(str, enum.Enum):
    """Integration connection status."""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    PENDING = "pending"


class IntegrationProvider(str, enum.Enum):
    """Supported integration providers."""
    SHOPIFY = "shopify"
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    DISCORD = "discord"
    TIKTOK = "tiktok"


class MessageDirection(str, enum.Enum):
    """Message direction enum."""
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class ModelTrainingStatus(str, enum.Enum):
    """Model training job status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class OrderStatus(str, enum.Enum):
    """Order status enum."""
    PENDING = "pending"
    PROCESSING = "processing"
    FULFILLED = "fulfilled"
    SHIPPED = "shipped"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class User(AuthBase):
    """User account model."""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255))
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.email}>"


class RefreshToken(AuthBase):
    """Refresh token storage for secure token rotation."""
    __tablename__ = "refresh_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(500), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="refresh_tokens")


class Project(Base):
    """Project/Brand model - multi-tenant support."""
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    timezone = Column(String(50), default="UTC")
    settings = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="projects")
    integrations = relationship("Integration", back_populates="project", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="project", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="project", cascade="all, delete-orphan")
    model_trainings = relationship("ModelTraining", back_populates="project", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="project", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Project {self.name}>"


class Integration(Base):
    """External platform integration configuration."""
    __tablename__ = "integrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # shopify, whatsapp, instagram, telegram, facebook
    status = Column(SQLEnum(IntegrationStatus), default=IntegrationStatus.DISCONNECTED)
    config = Column(JSONB, nullable=False, default={})  # API keys, tokens, etc.
    extra_data = Column(JSONB, default={})  # Additional provider-specific data
    last_sync = Column(DateTime(timezone=True))
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="integrations")
    
    # Indexes
    __table_args__ = (
        Index("idx_integration_project_provider", "project_id", "provider"),
    )
    
    def __repr__(self):
        return f"<Integration {self.provider} - {self.status}>"


class Order(Base):
    """Unified order model from all platforms."""
    __tablename__ = "orders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    external_id = Column(String(255), nullable=False)  # Platform-specific order ID
    provider = Column(String(50), nullable=False)  # shopify, custom, etc.
    status = Column(String(50))  # pending, fulfilled, cancelled, etc.
    
    # Customer information
    customer = Column(JSONB, default={})  # name, email, phone, address
    
    # Order details
    items = Column(JSONB, default=[])  # line items
    total = Column(Float)
    currency = Column(String(3), default="USD")
    
    # Extra data
    extra_data = Column(JSONB, default={})
    tags = Column(JSONB, default=[])
    
    # Timestamps
    order_date = Column(DateTime(timezone=True))
    fulfilled_date = Column(DateTime(timezone=True))
    last_updated = Column(DateTime(timezone=True), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="orders")
    messages = relationship("Message", back_populates="order", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_order_external_provider", "external_id", "provider"),
        Index("idx_order_project_status", "project_id", "status"),
        Index("idx_order_date", "order_date"),
    )
    
    def __repr__(self):
        return f"<Order {self.external_id} - {self.status}>"


class Message(Base):
    """Unified message model across all channels."""
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    
    direction = Column(SQLEnum(MessageDirection), nullable=False)
    platform = Column(String(50), nullable=False)  # whatsapp, telegram, instagram, sms, facebook, tiktok
    provider = Column(String(50), nullable=False)  # whatsapp, telegram, instagram, sms
    external_id = Column(String(255))  # Provider message ID
    
    # Message content
    content = Column(Text, nullable=False)
    content_type = Column(String(50), default="text")  # text, image, video, audio, file
    attachments = Column(JSONB, default=[])
    
    # Sender/Recipient info
    sender = Column(JSONB, default={})
    recipient = Column(JSONB, default={})
    
    # AI interaction
    ai_generated = Column(Boolean, default=False)
    ai_model = Column(String(100))
    ai_prompt_tokens = Column(Integer)
    ai_completion_tokens = Column(Integer)
    ai_cost = Column(Float)
    
    # Extra data
    extra_data = Column(JSONB, default={})
    is_read = Column(Boolean, default=False)
    
    # Status tracking
    status = Column(String(50), default="sent")  # sent, delivered, read, failed
    error_message = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="messages")
    order = relationship("Order", back_populates="messages")
    
    # Indexes
    __table_args__ = (
        Index("idx_message_project_created", "project_id", "created_at"),
        Index("idx_message_order", "order_id"),
        Index("idx_message_direction", "direction"),
    )
    
    def __repr__(self):
        return f"<Message {self.direction} - {self.provider}>"


class ModelTraining(Base):
    """AI model training job tracking."""
    __tablename__ = "model_trainings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(ModelTrainingStatus), default=ModelTrainingStatus.PENDING)
    
    # Training configuration
    gemini_model = Column(String(100))
    dataset_location = Column(String(500))
    training_params = Column(JSONB, default={})
    
    # Results
    model_version = Column(String(100))
    metrics = Column(JSONB, default={})
    error_message = Column(Text)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="model_trainings")
    
    def __repr__(self):
        return f"<ModelTraining {self.id} - {self.status}>"


class Report(Base):
    """Generated analytics reports."""
    __tablename__ = "reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String(50), nullable=False)  # sales, messages, performance
    
    # Report data
    payload = Column(JSONB, nullable=False, default={})
    summary = Column(Text)
    
    # Time range
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    
    # Storage
    file_url = Column(String(500))
    
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="reports")
    
    # Indexes
    __table_args__ = (
        Index("idx_report_project_type", "project_id", "report_type"),
        Index("idx_report_generated", "generated_at"),
    )
    
    def __repr__(self):
        return f"<Report {self.report_type} - {self.generated_at}>"


class APILog(Base):
    """API usage logging for billing and monitoring."""
    __tablename__ = "api_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    
    # Request info
    endpoint = Column(String(255))
    method = Column(String(10))
    request = Column(JSONB)
    response = Column(JSONB)
    status_code = Column(Integer)
    
    # Performance
    duration_ms = Column(Float)
    
    # Cost tracking
    ai_tokens_used = Column(Integer)
    cost_estimate = Column(Float)
    
    # User info
    user_id = Column(UUID(as_uuid=True))
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Indexes for efficient queries
    __table_args__ = (
        Index("idx_api_log_project_created", "project_id", "created_at"),
        Index("idx_api_log_endpoint", "endpoint"),
    )


class Product(Base):
    """Product catalog for AI-powered social media responses."""
    __tablename__ = "products"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    # Product information
    name = Column(String(255), nullable=False)
    description = Column(Text)
    sku = Column(String(100))
    price = Column(Float)
    currency = Column(String(3), default="USD")
    
    # Inventory
    stock_quantity = Column(Integer, default=0)
    in_stock = Column(Boolean, default=True)
    
    # Media
    images = Column(JSONB, default=[])  # Array of image URLs
    
    # Categories and tags
    category = Column(String(100))
    tags = Column(JSONB, default=[])
    
    # Specifications
    specifications = Column(JSONB, default={})  # Size, color, material, etc.
    
    # FAQ and common questions
    faq = Column(JSONB, default=[])  # [{question: "", answer: ""}]
    
    # SEO and marketing
    keywords = Column(JSONB, default=[])  # Keywords for AI matching
    
    # Extra data
    extra_data = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", backref="products")
    
    # Indexes
    __table_args__ = (
        Index("idx_product_project", "project_id"),
        Index("idx_product_sku", "sku"),
        Index("idx_product_name", "name"),
    )
    
    def __repr__(self):
        return f"<Product {self.name}>"


class BotInstruction(Base):
    """Custom bot instructions/training per project."""
    __tablename__ = "bot_instructions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    # Instruction details
    title = Column(String(255), nullable=False)
    instruction = Column(Text, nullable=False)  # The actual instruction/rule
    category = Column(String(100))  # tone, product_knowledge, response_style, etc.
    priority = Column(Integer, default=0)  # Higher priority = more important
    
    # Conditional activation
    active_for_platforms = Column(JSONB, default=[])  # ["instagram", "facebook"] or [] for all
    active_for_topics = Column(JSONB, default=[])  # ["pricing", "shipping"] or [] for all
    
    # Examples
    examples = Column(JSONB, default=[])  # Example conversations showing the instruction
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", backref="bot_instructions")
    
    # Indexes
    __table_args__ = (
        Index("idx_bot_instruction_project", "project_id"),
        Index("idx_bot_instruction_priority", "priority"),
    )
    
    def __repr__(self):
        return f"<BotInstruction {self.title}>"


class SocialMediaComment(Base):
    """Social media comments/posts to respond to."""
    __tablename__ = "social_media_comments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    # Platform info
    platform = Column(String(50), nullable=False)  # instagram, facebook, tiktok
    external_id = Column(String(255), nullable=False)  # Platform comment ID
    post_id = Column(String(255))  # Parent post ID
    
    # Comment details
    content = Column(Text, nullable=False)
    author_username = Column(String(255))
    author_id = Column(String(255))
    
    # Response tracking
    responded = Column(Boolean, default=False)
    response_content = Column(Text)
    response_sent_at = Column(DateTime(timezone=True))
    auto_generated = Column(Boolean, default=False)
    
    # AI analysis
    sentiment = Column(String(50))  # positive, negative, neutral, question
    intent = Column(String(100))  # product_inquiry, complaint, praise, etc.
    requires_human = Column(Boolean, default=False)  # Escalate to human
    
    # Priority
    priority = Column(Integer, default=0)  # 0=normal, 1=high, 2=urgent
    
    extra_data = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", backref="social_comments")
    
    # Indexes
    __table_args__ = (
        Index("idx_social_comment_project", "project_id"),
        Index("idx_social_comment_platform_external", "platform", "external_id"),
        Index("idx_social_comment_responded", "responded"),
    )
    
    def __repr__(self):
        return f"<SocialMediaComment {self.platform} - {self.external_id}>"


class AutoResponseTemplate(Base):
    """Templates for automated responses to common scenarios."""
    __tablename__ = "auto_response_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    # Template details
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Trigger conditions
    trigger_keywords = Column(JSONB, default=[])  # Keywords that activate this template
    trigger_platforms = Column(JSONB, default=[])  # Which platforms to use on
    trigger_intent = Column(String(100))  # product_inquiry, shipping_question, etc.
    
    # Response template
    response_template = Column(Text, nullable=False)  # Can include {{product_name}} etc.
    variations = Column(JSONB, default=[])  # Alternative phrasings
    
    # Settings
    use_ai_enhancement = Column(Boolean, default=True)  # Let AI personalize the response
    requires_approval = Column(Boolean, default=False)  # Human approval before sending
    
    # Statistics
    times_used = Column(Integer, default=0)
    success_rate = Column(Float)  # Based on follow-up interactions
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", backref="auto_response_templates")
    
    # Indexes
    __table_args__ = (
        Index("idx_auto_response_project", "project_id"),
        Index("idx_auto_response_active", "is_active"),
    )
    
    def __repr__(self):
        return f"<AutoResponseTemplate {self.name}>"
