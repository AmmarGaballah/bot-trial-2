"""Add product catalog, bot training, and social media tables

Revision ID: add_product_catalog
Revises: add_subscription_fields
Create Date: 2025-10-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_product_catalog'
down_revision = 'add_subscription_fields'  # Links to subscription fields migration
branch_labels = None
depends_on = None


def upgrade():
    # Create products table
    op.create_table('products',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('sku', sa.String(length=100), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('image_url', sa.String(length=500), nullable=True),
        sa.Column('stock_quantity', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('extra_data', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_project_id'), 'products', ['project_id'], unique=False)
    op.create_index(op.f('ix_products_sku'), 'products', ['sku'], unique=False)
    
    # Create bot_training table
    op.create_table('bot_training',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('training_data', postgresql.JSON(), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.Column('accuracy_score', sa.Float(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='draft'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bot_training_project_id'), 'bot_training', ['project_id'], unique=False)
    
    # Create social_media_accounts table
    op.create_table('social_media_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('account_id', sa.String(length=255), nullable=False),
        sa.Column('account_name', sa.String(length=255), nullable=True),
        sa.Column('access_token', sa.String(length=500), nullable=True),
        sa.Column('refresh_token', sa.String(length=500), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_connected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('extra_data', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'platform', 'account_id', name='uq_social_account')
    )
    op.create_index(op.f('ix_social_media_accounts_project_id'), 'social_media_accounts', ['project_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_social_media_accounts_project_id'), table_name='social_media_accounts')
    op.drop_table('social_media_accounts')
    op.drop_index(op.f('ix_bot_training_project_id'), table_name='bot_training')
    op.drop_table('bot_training')
    op.drop_index(op.f('ix_products_sku'), table_name='products')
    op.drop_index(op.f('ix_products_project_id'), table_name='products')
    op.drop_table('products')
