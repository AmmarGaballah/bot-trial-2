"""Add usage_tracking table

Revision ID: add_usage_tracking
Revises: add_product_catalog
Create Date: 2025-11-14 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_usage_tracking'
down_revision = 'add_product_catalog'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create usage_tracking table
    op.create_table(
        'usage_tracking',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('subscription_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('messages_sent', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('messages_received', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('orders_created', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('ai_requests', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('ai_tokens_used', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('storage_used_gb', sa.Float(), nullable=True, server_default='0'),
        sa.Column('ai_cost', sa.Float(), nullable=True, server_default='0'),
        sa.Column('storage_cost', sa.Float(), nullable=True, server_default='0'),
        sa.Column('total_cost', sa.Float(), nullable=True, server_default='0'),
        sa.Column('limits_exceeded', postgresql.JSON(), nullable=True),
        sa.Column('overage_charges', sa.Float(), nullable=True, server_default='0'),
        sa.Column('extra_data', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_usage_tracking_subscription_id'), 'usage_tracking', ['subscription_id'], unique=False)
    op.create_index(op.f('ix_usage_tracking_user_id'), 'usage_tracking', ['user_id'], unique=False)
    op.create_index(op.f('ix_usage_tracking_period_start'), 'usage_tracking', ['period_start'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_usage_tracking_period_start'), table_name='usage_tracking')
    op.drop_index(op.f('ix_usage_tracking_user_id'), table_name='usage_tracking')
    op.drop_index(op.f('ix_usage_tracking_subscription_id'), table_name='usage_tracking')
    op.drop_table('usage_tracking')
