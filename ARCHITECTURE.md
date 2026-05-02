# 🏗️ Post-Sales Management System - Architecture Documentation

**Project:** Post-Sales Management System  
**Version:** 1.0.0  
**Last Updated:** April 29, 2026  
**Teams:** Handover, Onboarding, Defects

> **📚 Complete Team Integration:** For integration details with all 7 teams (Inventory, Marketing, Sales, Legal, Payment, CEO, Post-Sales), see [TEAM_INTEGRATION.md](TEAM_INTEGRATION.md)

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [High-Level Architecture](#high-level-architecture)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Database Schema](#database-schema)
6. [API Architecture](#api-architecture)
7. [Kafka Event Integration](#kafka-event-integration)
8. [Frontend Architecture](#frontend-architecture)
9. [Error Handling](#error-handling)
10. [Security Architecture](#security-architecture)
11. [Deployment Architecture](#deployment-architecture)
12. [Scalability Considerations](#scalability-considerations)

---

## 1. System Overview

### 1.1 Purpose
ระบบ Post-Sales Management สำหรับจัดการงาน After-Sale ของโครงการอสังหาริมทรัพย์ ประกอบด้วย 3 บริการหลัก:

1. **Handover Readiness** - ตรวจสอบความพร้อมส่งมอบ
2. **Owner Onboarding** - ดำเนินการต้อนรับเจ้าของใหม่
3. **Defect Management** - จัดการงานซ่อมและข้อบกพร่อง

### 1.2 Key Features
- ✅ Event-Driven Architecture (Kafka)
- ✅ Real-time Status Updates
- ✅ Multi-Team Integration (KYC, Legal, Payment, Sale)
- ✅ REST API with Swagger Documentation
- ✅ React + TypeScript Frontend
- ✅ PostgreSQL Database (Supabase)

### 1.3 Business Flow
```
External Teams → Kafka Events → Backend Consumer → Supabase → REST API → Frontend
     ↓                                                              ↓
Completion Events ← Kafka Producer ← Backend ← User Actions ← Dashboard
```

---

## 2. Technology Stack

### 2.1 Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | >= 18.0.0 |
| Framework | Express.js | 4.18.2 |
| Database Client | @supabase/supabase-js | 2.39.0 |
| Message Queue | @confluentinc/kafka-javascript | 1.9.0 |
| API Documentation | swagger-jsdoc, swagger-ui-express | 6.2.8, 5.0.1 |
| Environment Variables | dotenv | 16.3.1 |

### 2.2 Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 19.2.5 |
| Language | TypeScript | 6.0.2 |
| Build Tool | Vite | 8.0.10 |
| UI Library | Material-UI (MUI) | 9.0.0 |
| State Management | Zustand | 5.0.12 |
| Data Fetching | React Query (TanStack Query) | 5.100.6 |
| HTTP Client | Axios | 1.15.2 |
| Routing | React Router | 7.14.2 |
| Date Handling | date-fns | 4.1.0 |

### 2.3 Infrastructure
| Service | Provider | Purpose |
|---------|----------|---------|
| Database | Supabase Cloud | PostgreSQL with real-time |
| Message Queue | Confluent Cloud | Kafka topics |
| Backend Hosting | Render | Node.js deployment |
| Frontend Hosting | Vercel | Static site deployment |

---

## 3. High-Level Architecture

### 3.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL TEAMS                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   KYC    │  │  Legal   │  │ Payment  │  │   Sale   │       │
│  │   Team   │  │   Team   │  │   Team   │  │   Team   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼─────────────┼─────────────┼─────────────┼──────────────┘
        │             │             │             │
        │ kyc.        │ legal.      │ payment.    │ (listens to
        │ completed   │ contract.   │ second      │  postsales.*)
        │             │ drafted     │ payment.    │
        │             │             │ completed   │
        └─────────────┴─────────────┴─────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   CONFLUENT CLOUD KAFKA     │
        │  ┌──────────────────────┐   │
        │  │  Topics:             │   │
        │  │  - kyc.*             │   │
        │  │  - legal.*           │   │
        │  │  - payment.*         │   │
        │  │  - postsales.*       │   │
        │  └──────────────────────┘   │
        └──────────┬──────────────────┘
                   │
                   ▼
        ┌─────────────────────────────┐
        │   BACKEND (Express.js)      │
        │   Render Deployment         │
        │  ┌──────────────────────┐   │
        │  │ Kafka Consumer       │   │
        │  │ - Subscribe Topics   │   │
        │  │ - Process Events     │   │
        │  └──────────────────────┘   │
        │  ┌──────────────────────┐   │
        │  │ REST API Routes      │   │
        │  │ - /api/handover      │   │
        │  │ - /api/onboarding    │   │
        │  │ - /api/defects       │   │
        │  └──────────────────────┘   │
        │  ┌──────────────────────┐   │
        │  │ Kafka Producer       │   │
        │  │ - Publish Events     │   │
        │  └──────────────────────┘   │
        └──────────┬──────────────────┘
                   │
                   ▼
        ┌─────────────────────────────┐
        │   SUPABASE POSTGRESQL       │
        │  ┌──────────────────────┐   │
        │  │ Tables:              │   │
        │  │ - handover_cases     │   │
        │  │ - handover_events    │   │
        │  │ - onboarding_cases   │   │
        │  │ - onboarding_events  │   │
        │  │ - defect_cases       │   │
        │  │ - defect_events      │   │
        │  └──────────────────────┘   │
        └──────────┬──────────────────┘
                   │
                   ▼
        ┌─────────────────────────────┐
        │   FRONTEND (React + TS)     │
        │   Vercel Deployment         │
        │  ┌──────────────────────┐   │
        │  │ Pages:               │   │
        │  │ - HandoverDashboard  │   │
        │  │ - OnboardingDash.    │   │
        │  │ - DefectDashboard    │   │
        │  └──────────────────────┘   │
        │  ┌──────────────────────┐   │
        │  │ State Management:    │   │
        │  │ - Zustand Stores     │   │
        │  │ - React Query Cache  │   │
        │  └──────────────────────┘   │
        └──────────────────────────────┘
```

### 3.2 Architecture Layers

#### Layer 1: External Integration (Kafka Events)
- **Input**: Events from KYC, Legal, Payment teams
- **Output**: Events to Sale, Payment teams
- **Pattern**: Publisher-Subscriber (Pub/Sub)

#### Layer 2: Business Logic (Express.js)
- **Consumer**: Process incoming events → Update database
- **API**: Serve REST endpoints → CRUD operations
- **Producer**: Publish completion events → Notify teams

#### Layer 3: Data Persistence (Supabase)
- **Storage**: PostgreSQL tables with relationships
- **Access**: Service Role Key (backend), Publishable Key (frontend)

#### Layer 4: Presentation (React Frontend)
- **Display**: Real-time data visualization
- **Interaction**: User actions → API calls → Database updates
- **State**: Local caching with React Query

---

## 4. Data Flow Architecture

### 4.1 Handover Readiness Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    HANDOVER READINESS FLOW                      │
└────────────────────────────────────────────────────────────────┘

1. INCOMING EVENTS (from External Teams via Kafka)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Topic: managing.kyc.completed
   ├─ Payload: { customerId, unitId, status: "approved", ... }
   └─ Handler: handleKycEvent() → Update kyc_status = "approved"
   
   Topic: purchase.contract.drafted
   ├─ Payload: { contractId, unitId, status: "ready", ... }
   └─ Handler: handleContractEvent() → Update contract_status = "ready"
   
   Topic: payment.secondpayment.completed
   ├─ Payload: { paymentId, unitId, amount, ... }
   └─ Handler: handlePaymentEvent() → Update payment_status = "completed"

2. STATUS CALCULATION (Backend Logic)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Function: calculateOverallStatus()
   
   IF (kyc_status ≠ "approved" OR 
       contract_status ≠ "ready" OR 
       payment_status ≠ "completed")
   THEN
       overall_status = "pending"
   
   ELSE IF (all 3 completed AND handover_date IS NULL)
   THEN
       overall_status = "ready"
   
   ELSE IF (handover_date IS NOT NULL)
   THEN
       overall_status = "completed"

3. USER INTERACTION (Frontend Dashboard)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   View: HandoverDashboard
   ├─ Display: List of cases with status chips
   ├─ Filter: By status (pending/ready/completed)
   └─ Action: Click "View" → Navigate to detail page
   
   View: HandoverDetail
   ├─ Display: Full case information
   ├─ Show: KYC, Contract, Payment status
   └─ Action: "Complete Handover" button (if status = "ready")

4. HANDOVER COMPLETION (User Action)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   POST /api/handover/:id/complete
   Body: {
     handover_date: "2026-04-29",
     handover_by: "Admin Name",
     handover_notes: "Handover completed successfully"
   }
   
   Backend Processing:
   ├─ Update handover_cases SET handover_date, handover_by, notes
   ├─ Recalculate overall_status → "completed"
   ├─ Insert into handover_events (type: "completed")
   └─ Publish Kafka event → postsales.handover.completed

5. OUTGOING EVENT (to External Teams)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Topic: postsales.handover.completed
   Payload: {
     unitId: "A-101",
     customerId: "CUST001",
     handoverDate: "2026-04-29",
     handoverBy: "Admin Name",
     timestamp: "2026-04-29T10:30:00Z"
   }
   
   Subscribers: Sale Team (for post-handover follow-up)
```

### 4.2 Onboarding Flow

```
┌────────────────────────────────────────────────────────────────┐
│                     ONBOARDING FLOW                             │
└────────────────────────────────────────────────────────────────┘

1. TRIGGER (from Handover Completion)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Topic: postsales.handover.completed
   Handler: Auto-create onboarding_case
   
   Backend Logic:
   ├─ Listen to handover completion event
   ├─ Create onboarding_cases record (status = "pending")
   ├─ Link: handover_case_id (FK to handover_cases)
   └─ Publish: postsales.onboarding.started

2. ONBOARDING STEPS (Manual Updates via API)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Step 1: Member Registration
   POST /api/onboarding/:id/register-member
   ├─ Update: member_registration_status = "completed"
   ├─ Store: member_registration_date, documents
   └─ Publish: postsales.member.registered
   
   Step 2: Facility Tour
   POST /api/onboarding/:id/schedule-tour
   ├─ Update: facility_tour_status = "scheduled"
   └─ Store: facility_tour_date
   
   POST /api/onboarding/:id/complete-tour
   ├─ Update: facility_tour_status = "completed"
   └─ Store: completion_date, notes
   
   Step 3: Manual Handover
   POST /api/onboarding/:id/handover-manual
   ├─ Update: manual_handover_status = "completed"
   ├─ Store: manual_handover_date, documents (Base64)
   └─ Store: notes

3. STATUS CALCULATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   overall_status = "pending"      → Some steps incomplete
   overall_status = "in_progress"  → At least 1 step completed
   overall_status = "completed"    → All 3 steps completed

4. OUTGOING EVENTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Topic: postsales.member.registered
   Payload: { memberId, unitId, registrationDate, ... }
   Subscribers: Payment Team (for membership billing)
   
   Topic: postsales.onboarding.completed
   Payload: { onboardingId, unitId, completionDate, ... }
   Subscribers: (Future use)
```

### 4.3 Defect Management Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    DEFECT MANAGEMENT FLOW                       │
└────────────────────────────────────────────────────────────────┘

1. DEFECT REPORTING (User Action)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   POST /api/defects
   Body: {
     unit_id: "A-101",
     title: "ประตูหลักไม่ปิด",
     description: "ประตูห้องนอนใหญ่ไม่สามารถปิดสนิทได้",
     category: "door_window",
     priority: "high",
     reported_by: "Owner Name",
     photos: ["base64_image_1", "base64_image_2"]
   }
   
   Backend Processing:
   ├─ Generate defect_number (DEF-20260429-0001)
   ├─ Store photos as JSON (Base64 strings)
   ├─ Set initial status = "reported"
   ├─ Insert into defect_cases
   └─ Insert into defect_events (type: "created")

2. DEFECT LIFECYCLE (Status Updates)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Status Flow: reported → acknowledged → in_progress → resolved
   
   PATCH /api/defects/:id
   Body: { status: "acknowledged", resolution_notes: "..." }
   
   Backend Processing:
   ├─ Update defect_cases.status
   ├─ Update timestamps (acknowledged_at, resolved_at, etc.)
   ├─ Insert into defect_events (type: "status_changed")
   └─ Notify owner (future: email/notification)

3. DEFECT CATEGORIES & PRIORITIES
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Categories:
   - electrical      → ระบบไฟฟ้า
   - plumbing        → ระบบประปา
   - air_conditioning → ระบบปรับอากาศ
   - door_window     → ประตู-หน้าต่าง
   - flooring_tiles  → พื้น-กระเบื้อง
   - paint_wall      → สี-ผนัง
   - other           → อื่นๆ
   
   Priorities:
   - critical  → แก้ไขทันที (สีแดง)
   - high      → ด่วน (สีส้ม)
   - medium    → ปานกลาง (สีฟ้า)
   - low       → ไม่เร่งด่วน (สีเขียว)

4. FILTERING & SEARCH (Frontend)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Filters:
   ├─ By Status: reported / acknowledged / in_progress / resolved
   ├─ By Priority: critical / high / medium / low
   ├─ By Category: electrical / plumbing / etc.
   └─ Search: defect_number, unit_id, title
```

---

## 5. Database Schema

### 5.1 Entity Relationship Diagram

```
┌─────────────────────────┐
│   handover_cases        │
│─────────────────────────│
│ id (PK)                 │
│ unit_id                 │
│ customer_id             │
│ kyc_status              │◄──── From KYC Team Event
│ contract_status         │◄──── From Legal Team Event
│ payment_status          │◄──── From Payment Team Event
│ overall_status          │◄──── Calculated
│ handover_date           │
│ handover_by             │
│ handover_notes          │
│ created_at              │
│ updated_at              │
└───────┬─────────────────┘
        │
        │ 1:N
        │
        ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│   handover_events       │       │   onboarding_cases      │
│─────────────────────────│       │─────────────────────────│
│ id (PK)                 │       │ id (PK)                 │
│ handover_case_id (FK)   │       │ handover_case_id (FK)   │◄── Links to handover
│ event_type              │       │ unit_id                 │
│ event_data (JSON)       │       │ customer_id             │
│ created_at              │       │ member_registration_*   │
└─────────────────────────┘       │ facility_tour_*         │
                                  │ manual_handover_*       │
                                  │ overall_status          │
                                  │ created_at              │
                                  │ updated_at              │
                                  └───────┬─────────────────┘
                                          │
                                          │ 1:N
                                          │
                                          ▼
                                  ┌─────────────────────────┐
                                  │  onboarding_events      │
                                  │─────────────────────────│
                                  │ id (PK)                 │
                                  │ onboarding_case_id (FK) │
                                  │ event_type              │
                                  │ event_data (JSON)       │
                                  │ created_at              │
                                  └─────────────────────────┘

┌─────────────────────────┐
│   defect_cases          │
│─────────────────────────│
│ id (PK)                 │
│ defect_number           │◄──── Auto-generated
│ unit_id                 │
│ title                   │
│ description             │
│ category                │
│ priority                │
│ status                  │
│ reported_by             │
│ reported_at             │
│ photos (JSON)           │◄──── Base64 array
│ acknowledged_at         │
│ resolved_at             │
│ resolution_notes        │
│ created_at              │
│ updated_at              │
└───────┬─────────────────┘
        │
        │ 1:N
        │
        ▼
┌─────────────────────────┐
│   defect_events         │
│─────────────────────────│
│ id (PK)                 │
│ defect_case_id (FK)     │
│ event_type              │
│ event_data (JSON)       │
│ created_at              │
└─────────────────────────┘
```

### 5.2 Table Definitions

#### handover_cases
```sql
CREATE TABLE handover_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id VARCHAR(50) NOT NULL,
  customer_id VARCHAR(50) NOT NULL,
  kyc_status VARCHAR(20) DEFAULT 'pending',
  contract_status VARCHAR(20) DEFAULT 'pending',
  payment_status VARCHAR(20) DEFAULT 'pending',
  overall_status VARCHAR(20) DEFAULT 'pending',
  handover_date TIMESTAMP,
  handover_by VARCHAR(100),
  handover_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_handover_unit_id ON handover_cases(unit_id);
CREATE INDEX idx_handover_status ON handover_cases(overall_status);
```

#### onboarding_cases
```sql
CREATE TABLE onboarding_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handover_case_id UUID REFERENCES handover_cases(id),
  unit_id VARCHAR(50) NOT NULL,
  customer_id VARCHAR(50) NOT NULL,
  member_registration_status VARCHAR(20) DEFAULT 'pending',
  member_registration_date TIMESTAMP,
  member_registration_documents JSON,
  facility_tour_status VARCHAR(20) DEFAULT 'pending',
  facility_tour_date TIMESTAMP,
  facility_tour_notes TEXT,
  manual_handover_status VARCHAR(20) DEFAULT 'pending',
  manual_handover_date TIMESTAMP,
  manual_handover_documents JSON,
  manual_handover_notes TEXT,
  overall_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_onboarding_unit_id ON onboarding_cases(unit_id);
CREATE INDEX idx_onboarding_status ON onboarding_cases(overall_status);
CREATE INDEX idx_onboarding_handover_fk ON onboarding_cases(handover_case_id);
```

#### defect_cases
```sql
CREATE TABLE defect_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  defect_number VARCHAR(50) UNIQUE NOT NULL,
  unit_id VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'reported',
  reported_by VARCHAR(100) NOT NULL,
  reported_at TIMESTAMP DEFAULT NOW(),
  photos JSON,
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_defect_number ON defect_cases(defect_number);
CREATE INDEX idx_defect_unit_id ON defect_cases(unit_id);
CREATE INDEX idx_defect_status ON defect_cases(status);
CREATE INDEX idx_defect_priority ON defect_cases(priority);
```

---

## 6. API Architecture

### 6.1 API Endpoints Overview

**Base URL (Local):** `http://localhost:3001`  
**Base URL (Production):** `https://your-app.onrender.com`

#### Handover Endpoints
```
GET    /api/handover/cases              - List all handover cases
GET    /api/handover/cases/:id          - Get specific case
POST   /api/handover/cases/:id/complete - Complete handover
```

#### Onboarding Endpoints
```
GET    /api/onboarding/cases                    - List all onboarding cases
GET    /api/onboarding/cases/:id                - Get specific case
POST   /api/onboarding/cases/:id/register-member - Register member
POST   /api/onboarding/cases/:id/schedule-tour  - Schedule facility tour
POST   /api/onboarding/cases/:id/complete-tour  - Complete facility tour
POST   /api/onboarding/cases/:id/handover-manual - Complete manual handover
```

#### Defect Endpoints
```
GET    /api/defects/cases     - List all defects
GET    /api/defects/cases/:id - Get specific defect
POST   /api/defects/cases     - Create new defect
PATCH  /api/defects/cases/:id - Update defect status
```

### 6.2 Swagger Documentation

**URL:** `http://localhost:3001/api-docs`

Features:
- ✅ Interactive API testing
- ✅ Request/Response examples
- ✅ Schema definitions
- ✅ Authentication docs (future)

### 6.3 API Response Format

#### Success Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "unit_id": "A-101",
    ...
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "ไม่พบข้อมูลที่ต้องการ",
    "path": "/api/handover/invalid-id",
    "timestamp": "2026-04-29T10:30:00.000Z"
  }
}
```

### 6.4 Error Handling Middleware

```javascript
// server.js - Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';
  
  console.error('❌ Server Error:', {
    code: errorCode,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message,
      path: req.path,
      timestamp: new Date().toISOString()
    }
  });
});
```

---

## 7. Kafka Event Integration

### 7.1 Kafka Topics Topology

```
┌──────────────────────────────────────────────────────────────┐
│                    KAFKA TOPICS TOPOLOGY                      │
└──────────────────────────────────────────────────────────────┘

INCOMING TOPICS (Subscribe)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

managing.kyc.completed
├─ Producer: Managing Team (Team 4)
├─ Consumer: Post-Sales Backend
├─ Payload: { customerId, unitId, status, verificationDate, ... }
└─ Action: Update handover_cases.kyc_status

purchase.contract.drafted
├─ Producer: Legal Team
├─ Consumer: Post-Sales Backend
├─ Payload: { contractId, unitId, status, draftDate, ... }
└─ Action: Update handover_cases.contract_status

payment.secondpayment.completed
├─ Producer: Payment Team
├─ Consumer: Post-Sales Backend
├─ Payload: { paymentId, unitId, amount, paymentDate, ... }
└─ Action: Update handover_cases.payment_status

payment.invoice.commonfees.completed
├─ Producer: Payment Team
├─ Consumer: Post-Sales Backend
├─ Payload: { invoiceId, customerId, unitId, amount, type: "COMMON_FEE", status: "PAID", paidAt }
└─ Action: Track common area fees payment (optional)

warranty.coverage.registered
├─ Producer: Legal Team (Warranty Service)
├─ Consumer: Post-Sales Backend
├─ Payload: { contractId, unitId, customerId, startsAt, endsAt, coveredCategories }
└─ Action: Register warranty coverage for defect management

warranty.coverage.verified
├─ Producer: Legal Team (Warranty Service)
├─ Consumer: Post-Sales Backend
├─ Payload: { claimId, warrantyId, defectId, coverageStatus, coverageReason, verifiedAt }
└─ Action: Process warranty verification result (for defect claims)

OUTGOING TOPICS (Publish)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

postsales.handover.completed
├─ Producer: Post-Sales Backend
├─ Consumer: Sale Team
├─ Payload: { unitId, customerId, handoverDate, handoverBy, ... }
└─ Trigger: User completes handover (POST /api/handover/cases/:id/complete)

postsales.onboarding.started
├─ Producer: Post-Sales Backend
├─ Consumer: (Internal tracking)
├─ Payload: { onboardingId, unitId, customerId, startDate, ... }
└─ Trigger: Auto-created after handover completion

postsales.member.registered
├─ Producer: Post-Sales Backend
├─ Consumer: Payment Team (Account Receivable)
├─ Payload: { memberId, customerId, unitId, areaSize, effectiveDate, billingCycle }
└─ Trigger: Member registration completed (for billing setup)

postsales.warranty.defect.reported
├─ Producer: Post-Sales Backend
├─ Consumer: Legal Team (Warranty Service)
├─ Payload: { defectId, contractId, unitId, customerId, defectCategory, description, reportedAt }
└─ Trigger: Customer reports defect (request warranty coverage check)
```

### 7.2 Consumer Configuration

```javascript
// kafka/consumer.js
const consumer = kafka.consumer({
  'group.id': 'postsales-group',
  'auto.offset.reset': 'earliest'
});

await consumer.subscribe({
  topics: [
    'managing.kyc.completed',
    'purchase.contract.drafted',
    'payment.secondpayment.completed'
  ]
});

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());
    
    switch(topic) {
      case 'managing.kyc.completed':
        await handleKycEvent(event);
        break;
      case 'purchase.contract.drafted':
        await handleContractEvent(event);
        break;
      case 'payment.secondpayment.completed':
        await handlePaymentEvent(event);
        break;
    }
  }
});
```

### 7.3 Producer Configuration

```javascript
// kafka/producer.js
export const publishHandoverCompleted = async (data) => {
  if (!kafkaEnabled) return;
  
  const config = readKafkaConfig();
  const producer = kafka.producer(config);
  
  await producer.connect();
  await producer.send({
    topic: 'postsales.handover.completed',
    messages: [{
      key: data.unitId,
      value: JSON.stringify({
        unitId: data.unit_id,
        customerId: data.customer_id,
        handoverDate: data.handover_date,
        handoverBy: data.handover_by,
        timestamp: new Date().toISOString()
      })
    }]
  });
  
  await producer.disconnect();
};
```

### 7.4 Environment-Based Kafka Control

```bash
# .env
KAFKA_ENABLED=false  # Disable for local development
KAFKA_ENABLED=true   # Enable for production

# When disabled:
# - Consumer doesn't start
# - Producer calls return immediately (no-op)
# - System works without Kafka dependency
```

### 7.5 Team Integration Notes

> **📚 Complete Integration Reference:** For detailed integration with all 7 teams including Inventory, Marketing, Sales, Legal, Payment, and CEO/Managing, see [TEAM_INTEGRATION.md](TEAM_INTEGRATION.md)

**Topic Naming Convention:**
- Standard format: `[team].[entity].[action]`
- Example: `postsales.handover.completed`, `legal.warranty.verified`
- **⚠️ Note:** Some teams may use different naming conventions (see TEAM_INTEGRATION.md Section 10)

**Payload Formats:**
- **Payment Team:** Uses wrapper format `{ success: true, data: {...}, timestamp: "..." }`
- **Other Teams:** May use direct payload format
- **Always verify** payload structure when integrating with new teams

**Additional Integrations:**
- **Warranty Management:** Legal team provides 3 services (contract, acquisition, warranty)
- **Property History:** Inventory provides `/api/v1/properties/{id}/history` for defect assessment
- **Common Fees Tracking:** Optional integration with Payment invoicing system

---

## 8. Frontend Architecture

### 8.1 Component Structure

```
Front-end/src/
├── components/
│   ├── StatusChip.tsx           # Reusable status badge
│   ├── ErrorAlert.tsx           # Error display component (NEW)
│   └── CompleteHandoverDialog.tsx
│
├── layouts/
│   └── DashboardLayout.tsx      # Main layout with navigation
│
├── pages/
│   ├── HomePage.tsx             # Landing page with cards
│   ├── HandoverDashboard.tsx    # Handover list view
│   ├── HandoverDetail.tsx       # Handover detail view
│   ├── OnboardingDashboard.tsx  # Onboarding list view
│   └── DefectDashboard.tsx      # Defect list view
│
├── services/
│   ├── handoverApi.ts           # Handover API calls
│   ├── onboardingApi.ts         # Onboarding API calls
│   └── defectApi.ts             # Defect API calls
│
├── store/
│   ├── handoverStore.ts         # Handover state (Zustand)
│   ├── onboardingStore.ts       # Onboarding state (Zustand)
│   └── defectStore.ts           # Defect state (Zustand)
│
├── types/
│   ├── handover.types.ts        # TypeScript interfaces
│   ├── onboarding.types.ts
│   └── defect.types.ts
│
└── lib/
    ├── api.ts                   # Axios instance + interceptors
    └── supabase.ts              # Supabase client (unused currently)
```

### 8.2 State Management Pattern

#### Zustand Store (Client State)
```typescript
// store/handoverStore.ts
export const useHandoverStore = create<HandoverStore>((set) => ({
  filters: {
    status: 'all',
    searchQuery: '',
  },
  setStatusFilter: (status) => set((state) => ({
    filters: { ...state.filters, status }
  })),
  setSearchQuery: (query) => set((state) => ({
    filters: { ...state.filters, searchQuery: query }
  })),
}));
```

#### React Query (Server State)
```typescript
// pages/HandoverDashboard.tsx
const { data: cases, isLoading, error } = useQuery({
  queryKey: ['handover', 'cases', filters],
  queryFn: () => handoverApi.getAllCases({
    status: filters.status !== 'all' ? filters.status : undefined,
  }),
  refetchInterval: 30000,  // Auto-refetch every 30s
  retry: 1,
  staleTime: 20000,        // Consider data stale after 20s
});
```

### 8.3 Error Handling Architecture

#### Axios Interceptor (api.ts)
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server error
      error.userMessage = error.response.data?.error?.message || 
                          'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์';
    } else if (error.request) {
      // Network error
      error.userMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์';
    } else {
      // Request error
      error.userMessage = 'เกิดข้อผิดพลาดในการส่งคำขอ';
    }
    return Promise.reject(error);
  }
);
```

#### ErrorAlert Component (NEW)
```typescript
// components/ErrorAlert.tsx
export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, title }) => {
  const getUserMessage = (err: unknown): string => {
    if (err && typeof err === 'object' && 'userMessage' in err) {
      return err.userMessage as string;
    }
    return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
  };

  return (
    <Alert severity="error">
      <AlertTitle>{title}</AlertTitle>
      <Typography>{getUserMessage(error)}</Typography>
    </Alert>
  );
};
```

#### Usage in Components
```typescript
// pages/HandoverDashboard.tsx
if (error) {
  return (
    <ErrorAlert 
      error={error} 
      title="ไม่สามารถโหลดข้อมูล Handover Readiness" 
    />
  );
}
```

### 8.4 Routing Configuration

```typescript
// main.tsx (React Router setup)
<BrowserRouter>
  <Routes>
    <Route path="/" element={<DashboardLayout />}>
      <Route index element={<HomePage />} />
      <Route path="handover" element={<HandoverDashboard />} />
      <Route path="handover/:id" element={<HandoverDetail />} />
      <Route path="onboarding" element={<OnboardingDashboard />} />
      <Route path="defects" element={<DefectDashboard />} />
    </Route>
  </Routes>
</BrowserRouter>
```

---

## 9. Error Handling

### 9.1 Backend Error Handling

#### Error Types
```javascript
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

// Usage examples
throw new AppError('ไม่พบข้อมูล', 404, 'NOT_FOUND');
throw new AppError('ข้อมูลไม่ครบถ้วน', 400, 'VALIDATION_ERROR');
throw new AppError('เกิดข้อผิดพลาดภายใน', 500, 'INTERNAL_ERROR');
```

#### Database Error Handling
```javascript
// db/queries.js
export const getHandoverCaseById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('handover_cases')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw new AppError('ไม่สามารถดึงข้อมูลจากฐานข้อมูล', 500, 'DB_ERROR');
    }

    if (!data) {
      throw new AppError('ไม่พบข้อมูล Handover Case', 404, 'NOT_FOUND');
    }

    return data;
  } catch (err) {
    throw err;
  }
};
```

### 9.2 Frontend Error Handling

#### Three-Layer Error Handling

**Layer 1: Axios Interceptor**
- Catches all HTTP errors
- Attaches `userMessage` (Thai language)
- Logs details to console

**Layer 2: React Query Error Boundary**
- Automatic retry logic
- Loading/error states
- Refetch on window focus

**Layer 3: ErrorAlert Component**
- Displays user-friendly messages
- Shows error code in dev mode
- Consistent UI across all pages

### 9.3 Error Scenarios & Messages

| Scenario | Backend Code | User Message (Thai) |
|----------|-------------|---------------------|
| Network Error | N/A | ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาตรวจสอบการเชื่อมต่อ |
| Server Error (500+) | INTERNAL_ERROR | เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ |
| Not Found (404) | NOT_FOUND | ไม่พบข้อมูลที่ต้องการ |
| Validation Error (400) | VALIDATION_ERROR | ข้อมูลไม่ถูกต้องหรือไม่ครบถ้วน |
| Unauthorized (401) | UNAUTHORIZED | กรุณาเข้าสู่ระบบ |
| Forbidden (403) | FORBIDDEN | คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ |
| Database Error | DB_ERROR | เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล |

---

## 10. Security Architecture

### 10.1 Environment Variables Security

#### Backend (.env)
```bash
# ✅ SECURE: Service Role Key (backend only)
SUPABASE_SECRET_KEY=your-supabase-secret-key-here

# ✅ SECURE: Kafka credentials in environment
KAFKA_API_KEY=your-kafka-api-key-here
KAFKA_API_SECRET=your-kafka-api-secret-here

# ✅ PROTECTED: Never commit .env files
# (Already in .gitignore)
```

#### Frontend (.env)
```bash
# ✅ SAFE: Publishable Key (client-side safe)
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_kJJn5zpemm98I7AS...

# ✅ RESTRICTED: Only read access
# Cannot perform admin operations
```

### 10.2 CORS Configuration

```javascript
// server.js
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : [
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

### 10.3 Input Validation

```javascript
// Example: Validate defect creation
const validateDefectInput = (data) => {
  const errors = [];
  
  if (!data.unit_id || data.unit_id.trim() === '') {
    errors.push('unit_id is required');
  }
  
  if (!data.title || data.title.trim() === '') {
    errors.push('title is required');
  }
  
  if (!['critical', 'high', 'medium', 'low'].includes(data.priority)) {
    errors.push('Invalid priority value');
  }
  
  if (errors.length > 0) {
    throw new AppError(
      errors.join(', '),
      400,
      'VALIDATION_ERROR'
    );
  }
};
```

### 10.4 Future Security Enhancements

#### Authentication (Not Yet Implemented)
```typescript
// Recommended: JWT + Supabase Auth
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Middleware
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No token provided' }
    });
  }
  
  const { data: user, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
    });
  }
  
  req.user = user;
  next();
};

// Usage
app.get('/api/handover', requireAuth, async (req, res) => {
  // Protected route
});
```

#### Rate Limiting
```javascript
// Recommended: express-rate-limit
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', apiLimiter);
```

---

## 11. Deployment Architecture

### 11.1 Deployment Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   VERCEL         │         │   RENDER         │
│   (Frontend)     │         │   (Backend)      │
│                  │         │                  │
│ • React Build    │────────▶│ • Node.js 18+    │
│ • Static Assets  │  HTTPS  │ • Express Server │
│ • CDN            │ Request │ • Port: 10000    │
│ • Auto SSL       │         │ • Auto Deploy    │
│                  │         │ • Health Check   │
└──────────────────┘         └────────┬─────────┘
         │                            │
         │                            │
         │                            ▼
         │                   ┌──────────────────┐
         │                   │   SUPABASE       │
         │                   │   (Database)     │
         │                   │                  │
         └──────────────────▶│ • PostgreSQL     │
                   Direct    │ • Auto Backup    │
                   Client    │ • Connection     │
                   Access    │   Pooling        │
                             │ • API + Auth     │
                             └──────────────────┘

         ┌──────────────────┐
         │ CONFLUENT CLOUD  │
         │     (Kafka)      │
         │                  │
         │ • Managed Kafka  │
         │ • Multi-Region   │◄────── Backend Consumer
         │ • Auto-Scaling   │◄────── Backend Producer
         │ • Monitoring     │
         └──────────────────┘
```

### 11.2 Backend Deployment (Render)

#### Configuration
```yaml
# render.yaml (auto-detected)
services:
  - type: web
    name: postsales-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: SUPABASE_URL
        sync: false  # Set in Render Dashboard
      - key: SUPABASE_SECRET_KEY
        sync: false
      - key: KAFKA_ENABLED
        value: true
      - key: KAFKA_BOOTSTRAP_SERVERS
        sync: false
      # ... other env vars
```

#### Build Settings
- **Build Command**: `npm install`
- **Start Command**: `npm start` (runs `node server.js`)
- **Node Version**: Automatically detected from `package.json` engines field
- **Health Check**: `GET /health` (returns 200 OK)

#### Environment Variables (Set in Render Dashboard)
```
NODE_ENV=production
PORT=10000
BACKEND_URL=https://your-app.onrender.com
FRONTEND_URL=https://your-app.vercel.app
SUPABASE_URL=https://itksoxfmkppjsqtvlfjc.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
KAFKA_ENABLED=true
KAFKA_BOOTSTRAP_SERVERS=pkc-619z3.us-east1.gcp.confluent.cloud:9092
KAFKA_API_KEY=...
KAFKA_API_SECRET=...
```

### 11.3 Frontend Deployment (Vercel)

#### Configuration
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### Build Settings
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### Environment Variables (Set in Vercel Dashboard)
```
VITE_API_BASE_URL=https://your-app.onrender.com
VITE_SUPABASE_URL=https://itksoxfmkppjsqtvlfjc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

### 11.4 Database Deployment (Supabase)

#### Configuration
- **Region**: Auto-selected closest region
- **Connection Pooling**: Enabled (PgBouncer)
- **Backups**: Automatic daily backups
- **SSL**: Enforced

#### Connection Details
```
Host: db.itksoxfmkppjsqtvlfjc.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [Set in Supabase Dashboard]
```

#### Schema Management
```sql
-- Apply schema via Supabase SQL Editor
-- Files: 
--   - db/onboarding_schema.sql
--   - db/defects_schema.sql
--   - (Export handover_schema.sql from existing tables)
```

### 11.5 Kafka Deployment (Confluent Cloud)

#### Configuration
- **Cluster Type**: Basic (Development) or Standard (Production)
- **Region**: us-east1 (GCP)
- **Topics**: Auto-created on first message
- **Retention**: 7 days (default)

#### Security
- **Protocol**: SASL_SSL
- **Mechanism**: PLAIN
- **Credentials**: Generated API Keys (stored in env vars)

---

## 12. Scalability Considerations

### 12.1 Current Limitations

#### Database
- ❌ No pagination (loads all records)
- ❌ No indexing optimization
- ❌ No connection pooling configuration

#### File Storage
- ❌ Photos stored as Base64 in database (not scalable)
- ❌ No CDN for image delivery
- ⚠️ **Recommendation**: Use Supabase Storage or S3

#### Authentication
- ❌ No authentication implemented
- ❌ No rate limiting
- ❌ No API key validation

### 12.2 Recommended Improvements

#### 1. Implement Pagination
```javascript
// Backend
GET /api/handover?page=1&limit=20&status=ready

// Frontend
const { data } = useInfiniteQuery({
  queryKey: ['handover', filters],
  queryFn: ({ pageParam = 1 }) => 
    handoverApi.getAllCases({ page: pageParam, limit: 20 }),
  getNextPageParam: (lastPage, pages) => 
    lastPage.hasMore ? pages.length + 1 : undefined,
});
```

#### 2. File Storage Migration
```javascript
// Replace Base64 storage with Supabase Storage
import { supabase } from './supabase';

const uploadPhoto = async (file) => {
  const { data, error } = await supabase.storage
    .from('defect-photos')
    .upload(`${Date.now()}_${file.name}`, file);
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('defect-photos')
    .getPublicUrl(data.path);
  
  return publicUrl;  // Store URL instead of Base64
};
```

#### 3. Add Caching Layer
```javascript
// Redis for frequent queries
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

const getCachedHandoverCases = async () => {
  const cached = await redis.get('handover:cases:all');
  if (cached) return JSON.parse(cached);
  
  const cases = await getAllHandoverCases();
  await redis.setex('handover:cases:all', 60, JSON.stringify(cases));
  return cases;
};
```

#### 4. Database Optimization
```sql
-- Add missing indexes
CREATE INDEX idx_handover_created_at ON handover_cases(created_at DESC);
CREATE INDEX idx_defect_reported_at ON defect_cases(reported_at DESC);

-- Partial indexes for common queries
CREATE INDEX idx_handover_ready 
ON handover_cases(overall_status) 
WHERE overall_status = 'ready';

-- Full-text search for defects
CREATE INDEX idx_defect_search 
ON defect_cases USING GIN (to_tsvector('english', title || ' ' || description));
```

#### 5. Monitoring & Observability
```javascript
// Add logging service (e.g., Sentry, LogRocket)
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### 12.3 Performance Metrics

#### Target Metrics (Production)
- **API Response Time**: < 200ms (p95)
- **Page Load Time**: < 2s (FCP)
- **Database Query Time**: < 100ms (p95)
- **Kafka Event Processing**: < 500ms

#### Monitoring Tools
- **Backend**: Render Metrics, Sentry
- **Frontend**: Vercel Analytics, Lighthouse
- **Database**: Supabase Dashboard
- **Kafka**: Confluent Cloud Metrics

---

## 13. Quick Reference

### 13.1 Local Development

```bash
# Backend
cd ccloud-nodejs-client/backend-bridge
npm install
npm run dev
# ➜ http://localhost:3001
# ➜ http://localhost:3001/api-docs (Swagger)

# Frontend
cd Front-end
npm install
npm run dev
# ➜ http://localhost:5173
```

### 13.2 Key URLs

| Service | Local | Production |
|---------|-------|------------|
| Frontend | http://localhost:5173 | https://your-app.vercel.app |
| Backend API | http://localhost:3001 | https://your-app.onrender.com |
| Swagger Docs | http://localhost:3001/api-docs | https://your-app.onrender.com/api-docs |
| Health Check | http://localhost:3001/health | https://your-app.onrender.com/health |
| Supabase Dashboard | - | https://app.supabase.com |
| Confluent Cloud | - | https://confluent.cloud |

### 13.3 Important Files

#### Backend
- `server.js` - Express server entry point
- `kafka/config.js` - Kafka configuration
- `kafka/consumer.js` - Event consumer
- `kafka/producer.js` - Event publisher
- `db/queries.js` - Database queries
- `routes/*.routes.js` - API route handlers
- `.env` - Environment variables (DO NOT COMMIT)

#### Frontend
- `src/main.tsx` - App entry point
- `src/App.tsx` - Main app component
- `src/pages/*.tsx` - Page components
- `src/components/*.tsx` - Reusable components
- `src/lib/api.ts` - Axios configuration
- `src/store/*.ts` - Zustand stores
- `.env` - Environment variables (DO NOT COMMIT)

### 13.4 Common Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production server
npm start

# Check for errors
npm run lint

# Build for production (Frontend only)
npm run build

# Preview production build (Frontend only)
npm run preview
```

### 13.5 Troubleshooting

#### Backend won't start
```bash
# Check Node version
node --version  # Should be >= 18.0.0

# Check .env file exists
ls -la ccloud-nodejs-client/backend-bridge/.env

# Check environment variables loaded
npm run dev  # Look for "✅ Environment loaded" message
```

#### Frontend can't connect to backend
```bash
# Check VITE_API_BASE_URL in .env
cat Front-end/.env

# Check CORS configuration in server.js
# Should include http://localhost:5173 in development
```

#### Kafka connection issues
```bash
# Check Kafka is enabled
echo $KAFKA_ENABLED  # Should be "true" for production

# Check Kafka credentials
echo $KAFKA_BOOTSTRAP_SERVERS

# Test connection (backend logs)
# Should see: "✅ Kafka consumer started successfully"
```

#### Database connection issues
```bash
# Check Supabase URL
echo $SUPABASE_URL

# Check Supabase key
echo $SUPABASE_SECRET_KEY  # Backend
echo $VITE_SUPABASE_PUBLISHABLE_KEY  # Frontend

# Test query via Supabase Dashboard
SELECT * FROM handover_cases LIMIT 1;
```

---

## 14. Team Integration Contacts

### 14.1 External Teams

| Team | Contact Point | Events Produced | Events Consumed |
|------|--------------|-----------------|-----------------|
| **Managing Team** | TBD | managing.kyc.completed | - |
| **Legal Team** | TBD | purchase.contract.drafted | - |
| **Payment Team** | TBD | payment.secondpayment.completed | postsales.member.registered |
| **Sale Team** | TBD | - | postsales.handover.completed |

### 14.2 Integration Checklist

**For Testing with External Teams:**

- [ ] Share Kafka topic names
- [ ] Share event payload schemas (JSON examples)
- [ ] Coordinate test environment (dev Kafka cluster)
- [ ] Schedule integration testing sessions
- [ ] Document error handling procedures
- [ ] Set up monitoring for event flows
- [ ] Establish communication channels (Slack, Teams, etc.)

---

## 15. Appendix

### 15.1 Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-04-29 | AI Assistant | Initial architecture documentation |

### 15.2 Related Documents

- **[TEAM_INTEGRATION.md](TEAM_INTEGRATION.md)** - ⭐ Complete integration reference for all 7 teams
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide for Render + Vercel
- [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) - Complete environment variable reference
- [CHANGES.md](CHANGES.md) - Detailed changelog of all modifications
- [SUMMARY_TH.md](SUMMARY_TH.md) - Thai language summary
- [README.md](README.md) - Project overview

### 15.3 Glossary

| Term | Definition |
|------|------------|
| **Handover** | Process of transferring property ownership from developer to buyer |
| **Onboarding** | Process of welcoming and registering new property owners |
| **Snagging** | Process of identifying and fixing defects in new property |
| **KYC** | Know Your Customer - identity verification process |
| **Kafka** | Distributed event streaming platform |
| **Supabase** | Open-source Firebase alternative with PostgreSQL |
| **Zustand** | Lightweight state management library for React |
| **React Query** | Data fetching and caching library for React |
| **Overall Status** | Calculated status based on all prerequisite conditions |

---

**📝 สิ้นสุดเอกสารสถาปัตยกรรม**

For questions or clarifications, please refer to related documentation or contact the development team.
