# 🏢 Post-Sales Management System

A comprehensive event-driven system for managing post-sales operations including handover readiness, owner onboarding, and defect tracking with external team integrations via Kafka and REST APIs.

## 📚 Tech Stack

**Backend:** Node.js 18+ + Express + Supabase PostgreSQL + Kafka (Confluent Cloud)  
**Frontend:** React 18 + TypeScript 5+ + Vite + Material-UI  
**Message Broker:** Kafka (Event-Driven Architecture)  
**Deployment:** Render (Backend) + Vercel (Frontend)

## 🚀 Quick Links

- **[📖 Complete System Overview](./POSTSALES_SERVICES_OVERVIEW.md)** - Detailed architecture and workflows
- **[📖 Deployment Guide](./DEPLOYMENT.md)** - Complete guide for deploying to Render + Vercel
- **[🔑 Environment Variables](./ENVIRONMENT_VARIABLES.md)** - All environment variable configurations
- **[📝 Changes Log](./CHANGES.md)** - Recent updates and improvements
- **[🔌 Marketing API Integration](./docs/MARKETING_API_INTEGRATION.md)** - REST API for closed defects
- **[📊 Swagger API Docs](http://localhost:3001/api-docs)** - Interactive API documentation (when running)

## 🏗️ Project Structure

```
├── ccloud-nodejs-client/
│   ├── backend-bridge/          # Backend API service (Node.js + Express)
│   │   ├── config/              # Swagger API documentation config
│   │   ├── db/                  # Supabase queries and schema
│   │   │   ├── defectQueries.js
│   │   │   ├── onboardingQueries.js
│   │   │   ├── queries.js       # Handover queries
│   │   │   └── migrations/      # Database migrations
│   │   ├── kafka/               # Kafka producer/consumer
│   │   │   ├── consumer.js      # Event consumer (4 topics)
│   │   │   ├── producer.js      # Event producer (5 topics)
│   │   │   └── config.js        # Kafka configuration
│   │   ├── routes/              # REST API routes
│   │   │   ├── defects.routes.js
│   │   │   ├── handover.routes.js
│   │   │   └── onboarding.routes.js
│   │   ├── services/            # Business logic
│   │   │   ├── eventHandlers.js # Kafka event handlers
│   │   │   └── externalApi.js   # External service calls
│   │   ├── scripts/             # Setup scripts
│   │   │   ├── create-kafka-topics.js
│   │   │   └── check-subscribe-topics.js
│   │   ├── examples/            # Simulation scripts
│   │   │   ├── simulate-external-teams.js
│   │   │   └── simulate-via-api.js
│   │   └── server.js            # Entry point
│   │
│   └── client.properties        # Kafka client configuration
│
├── Front-end/                   # React frontend application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── CompleteHandoverDialog.tsx
│   │   │   ├── CompleteOnboardingDialog.tsx
│   │   │   ├── RegisterMemberDialog.tsx
│   │   │   └── StatusChip.tsx
│   │   ├── layouts/             # Page layouts
│   │   │   └── DashboardLayout.tsx
│   │   ├── lib/                 # API and Supabase clients
│   │   │   ├── api.ts           # Axios client
│   │   │   └── supabase.ts      # Supabase client
│   │   ├── pages/               # Page components
│   │   │   ├── DefectDashboard.tsx
│   │   │   ├── DefectDetail.tsx
│   │   │   ├── HandoverDashboard.tsx
│   │   │   ├── HandoverDetail.tsx
│   │   │   ├── OnboardingDashboard.tsx
│   │   │   └── OnboardingDetail.tsx
│   │   ├── services/            # API service layer
│   │   │   ├── defectApi.ts
│   │   │   ├── handoverApi.ts
│   │   │   └── onboardingApi.ts
│   │   ├── store/               # Zustand state management
│   │   │   ├── defectStore.ts
│   │   │   ├── handoverStore.ts
│   │   │   └── onboardingStore.ts
│   │   └── types/               # TypeScript types
│   │       ├── defect.types.ts
│   │       ├── handover.types.ts
│   │       └── onboarding.types.ts
│   └── vite.config.ts           # Vite configuration
│
├── docs/                        # Documentation
│   └── MARKETING_API_INTEGRATION.md
│
└── IO/                          # Architecture diagrams (.drawio)
    ├── DEFECT_MANAGEMENT_WORKFLOW.drawio
    ├── HANDOVER_READINESS_WORKFLOW.drawio
    ├── ONBOARDING_WORKFLOW.drawio
    └── POSTSALES_COMPLETE_ARCHITECTURE.drawio
```

## 🎯 Features

### 1. Handover Readiness Management 📋
- **2-Condition Status Calculation**: Contract (DRAFT/PENDING_SIGN/SIGNED) + Payment (completed) = Ready
- **ถ้าสัญญาเป็น DRAFT ไม่จำเป็นต้องรอ SIGNED**
- Track contract and payment status from external teams
- Manage handover dates and assignments
- Complete handover workflow with Kafka event publishing
- Real-time status updates via event-driven architecture

### 2. Owner Onboarding 👥
- Register new members with billing setup
- Track onboarding progress through multiple states
- Document upload and management
- Integration with Payment team for billing activation
- Profile activation after payment completion

### 3. Snagging & Defect Management 🔧
- Report and track defects with warranty verification
- **Warranty Integration**: Legal team verifies coverage automatically
- Schedule repairs and assign contractors
- Photo attachments (before/after)
- **Marketing API**: REST endpoint for closed cases analytics
- 4-state workflow: Reported → In Progress → Resolved → Closed

## 🔄 External Team Integrations

### Kafka Topics We Subscribe To (4 topics)
| Topic | Source | Purpose |
|-------|--------|---------|
| `contract.drafted` | Legal Team | Contract ready (DRAFT/PENDING_SIGN/SIGNED all valid) |
| `payment.secondpayment.completed` | Payment Team | Payment completed |
| `payment.invoice.commonfees.completed` | Payment Team | Common fee payment |
| `warranty.coverage.verified` | Legal Team | **Response:** Warranty verification result (COVERED/REJECTED) |

**Note:** `warranty.coverage.verified` is the response event after we publish `warranty.defect.reported`

### Kafka Topics We Publish (5 topics)
| Topic | Target | Purpose |
|-------|--------|---------|
| `postsales.handover.completed` | Sales/Marketing | Handover completion notification |
| `postsales.onboarding.started` | Internal | Onboarding initiated |
| `postsales.member.registered` | Payment Team | Setup billing for new member |
| `postsales.profile.activated` | CRM/Marketing | Profile activated after payment |
| `warranty.defect.reported` | Legal Team | Request warranty verification |

### REST APIs We Provide
| Endpoint | Consumer | Purpose |
|----------|----------|---------|
| `GET /api/defects/closed-cases` | Marketing Team | Retrieve closed defects for analytics |

See [docs/MARKETING_API_INTEGRATION.md](./docs/MARKETING_API_INTEGRATION.md) for details.

## 🔧 Local Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Supabase account with project created
- Confluent Cloud Kafka cluster (optional for local testing)

### Backend Setup

```bash
cd ccloud-nodejs-client/backend-bridge

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# Required: SUPABASE_URL, SUPABASE_SECRET_KEY
# Optional: Kafka credentials (can be disabled with KAFKA_ENABLED=false)
nano .env

# Test Supabase connection
npm test

# Expected output: ✅ All tests passed! Supabase is ready to use.

# Start development server with hot reload
npm run dev

# Server runs on http://localhost:3001
# Swagger docs: http://localhost:3001/api-docs
```

**Environment Variables:**
```env
# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key

# Server
PORT=3001
NODE_ENV=development

# Kafka (Optional - set KAFKA_ENABLED=false to disable)
KAFKA_ENABLED=true
KAFKA_BOOTSTRAP_SERVERS=your-kafka-bootstrap.confluent.cloud:9092
KAFKA_SASL_USERNAME=your-api-key
KAFKA_SASL_PASSWORD=your-api-secret
```

### Frontend Setup

```bash
cd Front-end

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials
nano .env.local

# Start development server
npm run dev

# Frontend runs on http://localhost:5173
```

**Frontend Environment Variables:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BACKEND_API=http://localhost:3001
```

## 📡 API Endpoints

### Handover Management
```
GET    /api/handover/cases              # List all cases with filters
GET    /api/handover/cases/:id          # Get single case
GET    /api/handover/cases/:id/events   # Get case events timeline
PUT    /api/handover/cases/:id/complete # Complete handover
GET    /api/handover/stats              # Dashboard statistics
```

**Query Parameters:**
- `status` - Filter by overall_status (pending, ready, completed, blocked)
- `unitId` - Search by unit ID (partial match)
- `customerId` - Search by customer ID (partial match)

### Onboarding Management
```
GET    /api/onboarding/cases            # List all onboarding cases
GET    /api/onboarding/cases/:id        # Get single case
POST   /api/onboarding/cases            # Create new onboarding
PUT    /api/onboarding/cases/:id/register-member  # Register member
PUT    /api/onboarding/cases/:id/upload-documents # Upload documents
PUT    /api/onboarding/cases/:id/complete         # Complete onboarding
```

### Defect Management
```
GET    /api/defects/cases               # List all defects with filters
GET    /api/defects/cases/:id           # Get single defect
POST   /api/defects/cases               # Report new defect
PUT    /api/defects/cases/:id/schedule  # Schedule repair
PUT    /api/defects/cases/:id/complete-repair  # Mark as resolved
PUT    /api/defects/cases/:id/close     # Close defect case
GET    /api/defects/closed-cases        # Marketing API (closed cases)
```

**Marketing API Query Parameters:**
- `from` - Start date (YYYY-MM-DD)
- `to` - End date (YYYY-MM-DD)
- `limit` - Max records (default: 100)
- `offset` - Pagination offset (default: 0)

## 🧪 Testing & Simulation

### Test Supabase Connection
```bash
cd ccloud-nodejs-client/backend-bridge
npm test
```

### Simulate External Team Events
```bash
# Simulate all external teams at once
npm run simulate:all

# Simulate specific scenarios
npm run simulate:quick      # Quick test with 1 case
npm run simulate:api all    # Test via REST API
```

**Available Simulations:**
- Contract events from Legal team
- Payment events from Payment team
- Warranty verification responses
- Complete end-to-end workflows

## 📊 Database Schema

### Core Tables
- `handover_cases` - Handover readiness tracking (2 conditions)
- `handover_events` - Event audit trail
- `onboarding_cases` - Owner onboarding tracking
- `onboarding_events` - Onboarding event log
- `defect_cases` - Defect and snagging items
- `defect_events` - Defect lifecycle events

### Database Migrations
Located in `ccloud-nodejs-client/backend-bridge/db/migrations/`
- `001_add_missing_columns.sql` - Initial schema updates
- `002_add_defect_scheduling_columns.sql` - Defect scheduling fields
- `003_add_warranty_columns.sql` - Warranty tracking
- `004_remove_kyc_columns.sql` - Remove deprecated KYC fields

**Run migrations:**
```sql
-- Connect to Supabase SQL Editor
\i db/migrations/001_add_missing_columns.sql
\i db/migrations/002_add_defect_scheduling_columns.sql
\i db/migrations/003_add_warranty_columns.sql
\i db/migrations/004_remove_kyc_columns.sql
```

## 🚀 Deployment

### Backend (Render)
1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repository
4. Set environment variables (see ENVIRONMENT_VARIABLES.md)
5. Deploy

**Build Command:** `cd ccloud-nodejs-client/backend-bridge && npm install`  
**Start Command:** `cd ccloud-nodejs-client/backend-bridge && npm start`

### Frontend (Vercel)
1. Push code to GitHub
2. Import project to Vercel
3. Set Root Directory: `Front-end`
4. Set environment variables
5. Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 🔍 Troubleshooting

### Kafka Connection Issues
- Verify credentials in `.env`
- Check topic names match configuration
- Enable Kafka logging: Set `NODE_ENV=development`
- Disable Kafka for local testing: `KAFKA_ENABLED=false`

### Supabase Connection Issues
- Verify URL and secret key
- Check service role key (not anon key)
- Test connection: `npm test`
- Check Supabase project status

### Payment Event Logging Issues
- Check console for `util.inspect()` output with full nested details
- Verify payment events contain all required fields
- Use colored output in development for better readability

## 📝 Recent Changes (v1.2)

### ✅ Completed Updates
1. **KYC Removal**: Removed managing.kyc.complete event - handover now uses 2 conditions (contract + payment)
2. **Topic Rename**: purchase.contract.drafted → contract.drafted
3. **Enhanced Logging**: Payment events now use util.inspect() for full nested object visibility
4. **Marketing API**: Added REST endpoint `GET /api/defects/closed-cases` replacing Kafka event
5. **Warranty Flow Documentation**: Complete schema documentation for warranty.defect.reported workflow
6. **Database Migration**: Created migration script for KYC column removal

### 🔄 Migration Guide
If upgrading from v1.1:
1. Run database migration: `004_remove_kyc_columns.sql`
2. Update frontend dependencies: `npm install` (both backend and frontend)
3. Notify Legal Team of contract topic rename
4. Notify Marketing Team to switch from Kafka to REST API (see docs/MARKETING_API_INTEGRATION.md)
5. Test with simulation scripts: `npm run simulate:api all`

## 📞 Support & Contributing

### Documentation
- **Architecture Overview**: [POSTSALES_SERVICES_OVERVIEW.md](./POSTSALES_SERVICES_OVERVIEW.md)
- **Marketing Integration**: [docs/MARKETING_API_INTEGRATION.md](./docs/MARKETING_API_INTEGRATION.md)
- **API Documentation**: http://localhost:3001/api-docs (Swagger UI when running)

### Team Contacts
- **Post-Sales Backend Team**: [Your contact info]
- **External Team Integration**: See POSTSALES_SERVICES_OVERVIEW.md for team matrix

## 📄 License

[Your License Here]

---

**Built with ❤️ by Post-Sales Engineering Team**
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
