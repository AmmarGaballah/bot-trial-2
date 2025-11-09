#!/bin/bash
# Railway/Render deployment start script
# Properly handles PORT environment variable

set -e

echo "🚀 Starting AI Sales Commander Backend..."

# Get PORT from environment, default to 8000
PORT=${PORT:-8000}

echo "📊 Configuration:"
echo "  - Environment: ${ENVIRONMENT:-development}"
echo "  - Port: $PORT"
echo "  - Debug: ${DEBUG:-false}"

# Fix DATABASE_URL for Railway PostgreSQL SSL
if [[ "$ENVIRONMENT" == "production" || "$DATABASE_URL" == *"railway"* ]]; then
    # Add SSL parameter if not present
    if [[ "$DATABASE_URL" != *"sslmode"* && "$DATABASE_URL" != *"ssl="* ]]; then
        # Add sslmode=require to connection string
        if [[ "$DATABASE_URL" == *"?"* ]]; then
            export DATABASE_URL="${DATABASE_URL}&sslmode=require"
        else
            export DATABASE_URL="${DATABASE_URL}?sslmode=require"
        fi
        echo "  - SSL: enabled (Railway PostgreSQL)"
    fi
    
    # Same for AUTH_DATABASE_URL
    if [[ -n "$AUTH_DATABASE_URL" && "$AUTH_DATABASE_URL" != *"sslmode"* && "$AUTH_DATABASE_URL" != *"ssl="* ]]; then
        if [[ "$AUTH_DATABASE_URL" == *"?"* ]]; then
            export AUTH_DATABASE_URL="${AUTH_DATABASE_URL}&sslmode=require"
        else
            export AUTH_DATABASE_URL="${AUTH_DATABASE_URL}?sslmode=require"
        fi
    fi
    
    # Same for APP_DATABASE_URL
    if [[ -n "$APP_DATABASE_URL" && "$APP_DATABASE_URL" != *"sslmode"* && "$APP_DATABASE_URL" != *"ssl="* ]]; then
        if [[ "$APP_DATABASE_URL" == *"?"* ]]; then
            export APP_DATABASE_URL="${APP_DATABASE_URL}&sslmode=require"
        else
            export APP_DATABASE_URL="${APP_DATABASE_URL}?sslmode=require"
        fi
    fi
fi

# Run database migrations
echo "🗄️  Running database migrations..."
alembic upgrade head || echo "⚠️  Migration warning (continuing...)"

# Start uvicorn with proper port
echo "🌐 Starting server on port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2
