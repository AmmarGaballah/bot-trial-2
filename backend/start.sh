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

# Run database migrations
echo "🗄️  Running database migrations..."
alembic upgrade head || echo "⚠️  Migration warning (continuing...)"

# Start uvicorn with proper port
echo "🌐 Starting server on port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2
