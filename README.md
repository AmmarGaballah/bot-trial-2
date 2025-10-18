# 🚀 AI Sales Commander

A cutting-edge AI-powered sales automation platform that unifies e-commerce integrations, intelligent customer communication, and autonomous sales assistance using Google Gemini AI.

## ✨ Features

- 🤖 **AI Sales Assistant** - Powered by Google Gemini with function-calling capabilities
- 🛍️ **Multi-Platform Integration** - Shopify, WhatsApp, Instagram, Facebook, Telegram
- 📊 **Advanced Analytics** - Real-time sales reports and KPI dashboards
- 💬 **Unified Inbox** - Centralized customer communication across all channels
- 🔄 **Background Workers** - Automated order sync, message processing, and report generation
- 🔐 **Enterprise Security** - JWT authentication, role-based access control, API key management
- 🎨 **Modern Dark UI** - Glass-morphism design with smooth animations

## 🏗️ Architecture

```
Frontend (React + Vite + Tailwind)
        ↓
Backend (FastAPI + WebSocket)
        ↓
Database (PostgreSQL) + Cache (Redis)
        ↓
Workers (Celery) + AI (Gemini via Vertex AI)
        ↓
External Integrations (Shopify, Meta, Telegram, etc.)
```

## 🛠️ Tech Stack

### Backend
- **FastAPI** - High-performance async Python framework
- **PostgreSQL 15** - Primary database
- **Redis 7** - Caching and message broker
- **Celery** - Distributed task queue
- **SQLAlchemy 2.0** - ORM with async support
- **Alembic** - Database migrations
- **Google Vertex AI** - Gemini AI integration

### Frontend
- **React 18** - UI library
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Recharts** - Data visualization
- **Lucide React** - Modern icon library
- **TanStack Query** - Data fetching and caching

### DevOps
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy
- **GitHub Actions** - CI/CD

## 🚦 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+
- Google Cloud account (for Vertex AI)

### Local Development

1. **Clone and setup environment**
```bash
# Clone repository
git clone <your-repo>
cd ai-sales-commander

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. **Configure secrets**
Edit `backend/.env` and add:
- Google Cloud service account credentials
- JWT secret key
- Integration API keys (Shopify, WhatsApp, etc.)

3. **Start services with Docker Compose**
```bash
docker-compose up -d
```

4. **Run database migrations**
```bash
docker-compose exec backend alembic upgrade head
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Workers:**
```bash
cd backend
celery -A app.workers.celery_app worker --loglevel=info
celery -A app.workers.celery_app beat --loglevel=info
```

## 📁 Project Structure

```
ai-sales-commander/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application entry
│   │   ├── core/
│   │   │   ├── config.py          # Configuration management
│   │   │   ├── security.py        # JWT & password hashing
│   │   │   └── database.py        # Database connection
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth.py        # Authentication endpoints
│   │   │       ├── projects.py    # Project management
│   │   │       ├── integrations.py
│   │   │       ├── orders.py
│   │   │       ├── messages.py
│   │   │       ├── assistant.py   # Gemini AI endpoints
│   │   │       └── reports.py
│   │   ├── services/
│   │   │   ├── gemini_client.py   # Vertex AI integration
│   │   │   └── integrations/
│   │   │       ├── shopify.py
│   │   │       ├── whatsapp.py
│   │   │       ├── telegram.py
│   │   │       └── facebook.py
│   │   ├── models/                # Pydantic schemas
│   │   ├── db/
│   │   │   └── models.py          # SQLAlchemy models
│   │   └── workers/
│   │       └── tasks.py           # Celery tasks
│   ├── alembic/                   # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Integrations.jsx
│   │   │   ├── Assistant.jsx
│   │   │   ├── Orders.jsx
│   │   │   ├── Inbox.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── Auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── main.jsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🔐 Security Best Practices

1. **Secrets Management**
   - Never commit `.env` files
   - Use Google Secret Manager for production
   - Rotate API keys regularly

2. **Authentication**
   - JWT tokens with short expiry (15 min access, 7 day refresh)
   - Secure password hashing with bcrypt
   - Role-based access control (RBAC)

3. **API Security**
   - Rate limiting on all endpoints
   - CORS configuration for production domains
   - Request validation with Pydantic
   - SQL injection prevention via SQLAlchemy

4. **Data Privacy**
   - PII redaction in AI prompts
   - Audit logs for sensitive operations
   - GDPR compliance utilities

## 🤖 AI Integration (Gemini)

### Function Calling Pattern

The AI assistant uses Gemini's function-calling capability to execute structured actions:

```python
# Example: Gemini suggests action
{
  "function_call": {
    "name": "send_message",
    "parameters": {
      "customer_id": "cust_123",
      "message": "Your order has shipped!",
      "channel": "whatsapp"
    }
  }
}
```

Backend validates and executes the function safely.

### Available Functions
- `send_message` - Send message to customer
- `update_order_status` - Update order status
- `create_ticket` - Create support ticket
- `schedule_followup` - Schedule automated follow-up
- `fetch_order_details` - Get order information

## 📊 Database Schema

See `backend/alembic/versions/` for detailed schema migrations.

**Core Tables:**
- `users` - User accounts and authentication
- `projects` - Multi-tenant brands/stores
- `integrations` - External platform connections
- `orders` - Unified order data
- `messages` - Multi-channel communications
- `model_trainings` - AI training jobs
- `reports` - Generated analytics
- `api_logs` - Usage tracking and billing

## 🔄 Background Workers

Celery tasks handle:
- **Order sync** - Poll and sync orders from integrated platforms
- **Message processing** - Handle webhooks and send messages
- **Report generation** - Automated daily/weekly reports
- **Model training** - Fine-tune Gemini models (future)
- **Retry logic** - Failed message delivery

## 📈 Monitoring & Observability

- API request logging with cost tracking
- Gemini token usage per project
- Redis performance metrics
- Celery task monitoring
- WebSocket connection health

## 💰 Cost Management

- Token usage tracking per project
- Usage-based billing integration (Stripe)
- Automated quota enforcement
- Cost estimation before AI calls

## 🚀 Deployment

### Production Checklist
- [ ] Configure production environment variables
- [ ] Set up Google Cloud service account
- [ ] Enable Cloud SQL (PostgreSQL)
- [ ] Configure Redis instance
- [ ] Set up Cloud Storage for assets
- [ ] Configure domain and SSL certificates
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy
- [ ] Enable rate limiting
- [ ] Test disaster recovery

### Recommended Infrastructure
- **Compute**: Google Cloud Run or GKE
- **Database**: Cloud SQL (PostgreSQL)
- **Cache**: Cloud Memorystore (Redis)
- **Storage**: Cloud Storage
- **AI**: Vertex AI (Gemini)
- **Secrets**: Secret Manager
- **CDN**: Cloud CDN

## 📝 API Documentation

Interactive API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm run test

# E2E tests
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Documentation: [Link to docs]
- Issues: [GitHub Issues]
- Discord: [Community link]

---

Built with ❤️ using cutting-edge AI technology
