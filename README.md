# 🏢 Post-Sales Management System

A comprehensive system for managing post-sales operations including handover readiness, owner onboarding, and defect tracking.

## 📚 Tech Stack

**Backend:** Node.js + Express + Supabase + Kafka (Event-Driven)  
**Frontend:** React + TypeScript + Vite + Material-UI  
**Deployment:** Render (Backend) + Vercel (Frontend)

## 🚀 Quick Links

- **[📖 Deployment Guide](./DEPLOYMENT.md)** - Complete guide for deploying to Render + Vercel
- **[🔑 Environment Variables](./ENVIRONMENT_VARIABLES.md)** - All environment variable configurations
- **[📝 Changes Log](./CHANGES.md)** - Recent updates and improvements

## 🏗️ Project Structure

```
├── ccloud-nodejs-client/
│   └── backend-bridge/          # Backend API service
│       ├── config/              # Swagger configuration
│       ├── db/                  # Supabase queries
│       ├── kafka/               # Kafka producer/consumer
│       ├── routes/              # API routes
│       ├── services/            # Business logic
│       └── server.js            # Entry point
│
└── Front-end/                   # React frontend application
    ├── src/
    │   ├── components/          # Reusable UI components
    │   ├── layouts/             # Page layouts
    │   ├── lib/                 # API and Supabase clients
    │   ├── pages/               # Page components
    │   ├── services/            # API service layer
    │   ├── store/               # Zustand state management
    │   └── types/               # TypeScript types
    └── vite.config.ts           # Vite configuration
```

## 🎯 Features

### 1. Handover Readiness Management
- Track KYC, Legal, and Payment completion status
- Manage handover dates and assignments
- Complete handover workflow

### 2. Owner Onboarding
- Register new members
- Track onboarding status
- Document management

### 3. Snagging & Defect Management
- Create and track defects
- Assign to contractors
- Update resolution status
- Photo attachments support

## 🔧 Local Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Supabase account
- (Optional) Confluent Kafka account

### Backend Setup

```bash
cd ccloud-nodejs-client/backend-bridge

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# See ENVIRONMENT_VARIABLES.md for details

# Run development server
npm run dev

# Server runs on http://localhost:3001
# Swagger docs: http://localhost:3001/api-docs
```

### Frontend Setup

```bash
cd Front-end

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials
# See ENVIRONMENT_VARIABLES.md for details

# Run development server
npm run dev

# App runs on http://localhost:5173
```

## 🚀 Production Deployment

Follow the comprehensive guide in [DEPLOYMENT.md](./DEPLOYMENT.md):

1. **Backend on Render:**
   - Deploy Node.js service
   - Configure environment variables
   - Verify health endpoint

2. **Frontend on Vercel:**
   - Deploy Vite application
   - Configure environment variables
   - Update backend CORS

3. **Verification:**
   - End-to-end testing
   - Monitor logs
   - Performance checks

## 📊 API Endpoints

### Handover API
- `GET /api/handover/items` - List all handover items
- `GET /api/handover/items/:id` - Get specific item
- `PATCH /api/handover/items/:id/complete` - Complete handover

### Onboarding API
- `GET /api/onboarding/members` - List all members
- `POST /api/onboarding/members` - Create new member
- `PATCH /api/onboarding/members/:id` - Update member

### Defect API
- `GET /api/defects` - List all defects
- `POST /api/defects` - Create new defect
- `PATCH /api/defects/:id` - Update defect

**Full API documentation:** Visit `/api-docs` on deployed backend

## 🔐 Security Features

- ✅ Environment-based configuration (no hardcoded credentials)
- ✅ CORS protection with whitelist
- ✅ Separate keys for development/production
- ✅ HTTPS enforced in production
- ✅ Service role key only on server-side
- ✅ Input validation and sanitization

## 🔍 Health Monitoring

**Backend Health Check:**
```bash
curl https://your-backend.onrender.com/health

Response:
{
  "status": "healthy",
  "timestamp": "2026-04-29T...",
  "database": "connected",
  "kafka": "disabled"
}
```

## 🧪 Testing

```bash
# Backend
cd ccloud-nodejs-client/backend-bridge
npm test

# Frontend
cd Front-end
npm run lint
npm run build
```

## 📦 Environment Variables

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for complete reference.

**Backend requires:**
- `SUPABASE_URL` and `SUPABASE_SECRET_KEY`
- `FRONTEND_URL` for CORS
- `NODE_ENV` for environment mode

**Frontend requires:**
- `VITE_API_BASE_URL` for backend connection
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`

## 🛠️ Recent Updates

- ✅ Kafka configuration moved to environment variables (security fix)
- ✅ Dynamic Swagger URLs based on deployment environment
- ✅ Production-ready CORS configuration
- ✅ Enhanced Vite config with path aliases and optimizations
- ✅ Node.js version enforcement in package.json
- ✅ Comprehensive deployment documentation

See [CHANGES.md](./CHANGES.md) for detailed changelog.

## 📞 Support

For issues or questions:
1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
2. Review [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for configuration help
3. Check platform-specific documentation (Render, Vercel, Supabase)

## 📄 License

ISC

---

**Made with ❤️ for CS621 - Post-Sales Management**
