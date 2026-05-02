# Post-Sales Backend Bridge

Backend service ที่เชื่อมต่อ Kafka events กับ REST API และ Supabase PostgreSQL

## 🏗️ Architecture

```
Kafka Topics → Consumer → Event Handlers → Supabase Database
                                              ↓
Frontend ← REST API ← Express Server ← Queries
                         ↓
                    Producer → Kafka Topics
```

## 📋 Prerequisites

- Node.js 18+ 
- Supabase account with project created
- Confluent Cloud Kafka cluster (from parent folder)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-secret-key-here
PORT=3001
NODE_ENV=development
```

### 3. Test Supabase Connection

```bash
npm test
```

Expected output:
```
✅ All tests passed! Supabase is ready to use.
```

### 4. Start Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Handover Cases
```
GET    /api/handover/cases              # List all cases
GET    /api/handover/cases/:id          # Get single case
GET    /api/handover/cases/:id/events   # Get case events
PUT    /api/handover/cases/:id/complete # Complete handover
GET    /api/handover/stats              # Get statistics
```

### Query Parameters (for list)
- `status` - Filter by overall_status (pending, ready, completed, blocked)
- `unitId` - Search by unit ID (partial match)
- `customerId` - Search by customer ID (partial match)

## 🔄 Kafka Integration

### Subscribed Topics (Consumer) - 4 topics
- `contract.drafted` - From Legal team (Team 5) - Contract drafted notification
- `payment.secondpayment.completed` - From Payment team (Team 6) - Payment confirmation
- `payment.invoice.commonfees.completed` - From Payment team (Team 6) - Common fees paid
- `warranty.coverage.verified` - **Response** from Legal team (Team 5) - Warranty verification result (COVERED/REJECTED)

### Published Topics (Producer) - 5 topics
- `postsales.handover.completed` - To Sale team - Handover completion
- `postsales.onboarding.started` - Internal - Onboarding initiated
- `postsales.member.registered` - To Payment team - Member registration for billing
- `postsales.profile.activated` - To CRM/Marketing - Profile activated
- `warranty.defect.reported` - **Request** to Legal team - Warranty verification request

### Warranty 2-Way Communication
```
Request:  warranty.defect.reported (เรา → Legal)
Response: warranty.coverage.verified (Legal → เรา)
```

## 📁 Project Structure

```
backend-bridge/
├── db/
│   ├── supabase.js         # Supabase client
│   └── queries.js          # Database queries
├── kafka/
│   ├── config.js           # Kafka config reader
│   ├── consumer.js         # Event consumer
│   └── producer.js         # Event publisher
├── routes/
│   └── handover.routes.js  # API routes
├── services/
│   └── eventHandlers.js    # Event processing logic
├── server.js               # Express app entry point
├── test-supabase-connection.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🧪 Testing

### Test Supabase Connection
```bash
npm test
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Get all cases
curl http://localhost:3001/api/handover/cases

# Get stats
curl http://localhost:3001/api/handover/stats
```

### Publish Test Events

Use the test-producer.js from parent folder to simulate events:

```bash
cd ..
node test-producer.js
```

## 🔧 Troubleshooting

### Error: Missing Supabase environment variables
- Make sure `.env` file exists
- Check that SUPABASE_URL and SUPABASE_SECRET_KEY are set

### Error: client.properties not found
- Run from backend-bridge folder
- Make sure parent folder has client.properties

### Kafka connection failed
- Check Kafka credentials in `../client.properties`
- Verify Confluent Cloud cluster is running

### Database errors
- Verify tables are created in Supabase (run SQL from plan)
- Check API keys are correct
- Ensure RLS policies allow service_role access

## 📊 Event Flow Examples

### Contract Event → Database
```javascript
// Incoming event from contract.drafted topic
{
  "contractId": "CONTRACT-001",
  "unitId": "UNIT-001",
  "customerId": "CUST-001",
  "status": "SIGNED",
  "draftedAt": "2026-04-29T10:00:00Z"
}

// Stored in handover_cases table
{
  "unit_id": "UNIT-001",
  "customer_id": "CUST-001",
  "contract_status": "SIGNED",
  "contract_received_at": "2026-04-29T10:00:00Z",
  "overall_status": "pending"
}
```

### Complete Handover → Kafka Event
```javascript
// API request
PUT /api/handover/cases/:id/complete
{
  "handoverDate": "2026-04-29",
  "handoverBy": "staff-123",
  "notes": "All documents signed"
}

// Published to postsales.handover.completed
{
  "eventId": "uuid",
  "eventType": "postsales.handover.completed",
  "timestamp": "2026-04-29T15:30:00Z",
  "data": {
    "unitId": "UNIT-001",
    "customerId": "CUST-001",
    "handoverDate": "2026-04-29",
    "handoverBy": "staff-123",
    "notes": "All documents signed"
  }
}
```

## 🔐 Security Notes

- **Never commit `.env` file**
- Use `SUPABASE_SECRET_KEY` for backend only
- Enable CORS only for trusted origins
- Validate all API inputs

## 📝 License

ISC
