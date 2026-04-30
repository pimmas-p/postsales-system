# 📘 Post-Sales Service - API & Event Documentation

**Version:** 1.0.0  
**Last Updated:** April 30, 2026  
**Team:** Post-Sales (Team 7)  
**Base URL:** `https://your-postsales-service.onrender.com` (to be deployed)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Events Published (Outbound)](#events-published-outbound)
3. [Events Subscribed (Inbound)](#events-subscribed-inbound)
4. [REST APIs Called](#rest-apis-called)
5. [Integration Examples](#integration-examples)
6. [Error Handling](#error-handling)
7. [Contact Information](#contact-information)

---

## 1. Overview

Post-Sales Service จัดการ 3 กระบวนการหลัก:
- **Handover Readiness** — ตรวจสอบความพร้อมส่งมอบหน่วย
- **Owner Onboarding** — ลงทะเบียนเจ้าของใหม่
- **Defect Management** — จัดการข้อบกพร่องและการซ่อมแซม

### Architecture Pattern
- **Event-Driven**: ใช้ Kafka (Confluent Cloud) สำหรับ async communication
- **Request-Response**: REST APIs สำหรับ sync data retrieval
- **Database**: Supabase (PostgreSQL)

---

## 2. Events Published (Outbound)

Post-Sales publish events ทั้งหมด 7 topics เพื่อแจ้งข้อมูลให้ทีมอื่น

### 2.1 postsales.handover.completed

**Description:** แจ้งว่าส่งมอบหน่วยเสร็จแล้ว  
**Consumers:** Sales Team  
**Trigger:** Staff กด "Mark as Completed" ใน Handover Dashboard

**Topic:** `postsales.handover.completed`

**Payload Schema:**
```json
{
  "eventId": "uuid",
  "eventType": "postsales.handover.completed",
  "timestamp": "2026-04-30T10:00:00.000Z",
  "data": {
    "unitId": "string (required)",
    "customerId": "string (required)",
    "handoverDate": "string ISO8601 (required)",
    "handoverBy": "string (required)",
    "notes": "string (optional)"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

**Example:**
```json
{
  "eventId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "eventType": "postsales.handover.completed",
  "timestamp": "2026-04-30T14:30:00.000Z",
  "data": {
    "unitId": "A-101",
    "customerId": "CUST-12345",
    "handoverDate": "2026-04-30",
    "handoverBy": "Staff Name",
    "notes": "All keys and documents delivered"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

**Consumer Actions:**
- Sales Team: Update CRM, send follow-up survey
- Trigger next process: Owner Onboarding (internal)

---

### 2.2 postsales.onboarding.started

**Description:** แจ้งว่าเริ่มกระบวนการ onboarding แล้ว (internal tracking)  
**Consumers:** Internal (audit log)  
**Trigger:** Auto-created after handover completion

**Topic:** `postsales.onboarding.started`

**Payload Schema:**
```json
{
  "eventId": "uuid",
  "eventType": "postsales.onboarding.started",
  "timestamp": "2026-04-30T10:00:00.000Z",
  "data": {
    "caseId": "uuid (required)",
    "unitId": "string (required)",
    "customerId": "string (required)"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

**Example:**
```json
{
  "eventId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "eventType": "postsales.onboarding.started",
  "timestamp": "2026-04-30T14:30:05.000Z",
  "data": {
    "caseId": "onb-uuid-1234",
    "unitId": "A-101",
    "customerId": "CUST-12345"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

---

### 2.3 postsales.member.registered

**Description:** แจ้ง Payment Team ให้สร้างบัญชีเก็บค่าส่วนกลาง  
**Consumers:** Payment Team  
**Trigger:** Staff กด "Register Member" พร้อมกรอกข้อมูลครบ

**Topic:** `postsales.member.registered`

**Payload Schema:**
```json
{
  "eventId": "uuid",
  "eventType": "postsales.member.registered",
  "timestamp": "2026-04-30T10:00:00.000Z",
  "data": {
    "memberId": "string (required)",
    "customerId": "string (required)",
    "unitId": "string (required)",
    "areaSize": "number (required) - square meters",
    "effectiveDate": "string ISO8601 (required)",
    "billingCycle": "enum: 'monthly' | 'quarterly' (default: 'monthly')",
    "email": "string email (required)",
    "phone": "string (required)"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

**Example:**
```json
{
  "eventId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "eventType": "postsales.member.registered",
  "timestamp": "2026-04-30T15:00:00.000Z",
  "data": {
    "memberId": "onb-uuid-1234",
    "customerId": "CUST-12345",
    "unitId": "A-101",
    "areaSize": 45.5,
    "effectiveDate": "2026-05-01T00:00:00.000Z",
    "billingCycle": "monthly",
    "email": "owner@example.com",
    "phone": "081-234-5678"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

**Consumer Actions:**
- Payment Team: Create billing account
- Calculate monthly common fees = `areaSize × rate per sqm`
- Generate first invoice based on `effectiveDate`

---

### 2.4 postsales.profile.activated

**Description:** แจ้งว่าโปรไฟล์สมาชิกถูกเปิดใช้งานแล้ว  
**Consumers:** Internal (audit log)  
**Trigger:** Staff complete onboarding process

**Topic:** `postsales.profile.activated`

**Payload Schema:**
```json
{
  "eventId": "uuid",
  "eventType": "postsales.profile.activated",
  "timestamp": "2026-04-30T10:00:00.000Z",
  "data": {
    "caseId": "uuid (required)",
    "unitId": "string (required)",
    "customerId": "string (required)",
    "completedBy": "string (required)"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

**Example:**
```json
{
  "eventId": "d4e5f6a7-b8c9-0123-def0-234567890123",
  "eventType": "postsales.profile.activated",
  "timestamp": "2026-04-30T16:00:00.000Z",
  "data": {
    "caseId": "onb-uuid-1234",
    "unitId": "A-101",
    "customerId": "CUST-12345",
    "completedBy": "Admin Name"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

---

### 2.5 postsales.warranty.defect.reported

**Description:** ส่ง request ให้ Legal Team ตรวจสอบ warranty coverage  
**Consumers:** Legal Team  
**Trigger:** Customer reports defect → Staff creates defect case

**Topic:** `postsales.warranty.defect.reported`

**Payload Schema:**
```json
{
  "eventId": "uuid",
  "eventType": "postsales.warranty.defect.reported",
  "timestamp": "2026-04-30T10:00:00.000Z",
  "data": {
    "defectId": "uuid (required)",
    "defectNumber": "string (required)",
    "contractId": "string (optional)",
    "unitId": "string (required)",
    "customerId": "string (required)",
    "defectCategory": "enum: 'structural' | 'plumbing' | 'electrical' | 'other' (required)",
    "description": "string (required)",
    "reportedAt": "string ISO8601 (required)",
    "priority": "enum: 'high' | 'medium' | 'low' (required)"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0",
    "requestType": "warranty_coverage_check"
  }
}
```

**Example:**
```json
{
  "eventId": "e5f6a7b8-c9d0-1234-ef01-345678901234",
  "eventType": "postsales.warranty.defect.reported",
  "timestamp": "2026-04-30T10:30:00.000Z",
  "data": {
    "defectId": "def-uuid-5678",
    "defectNumber": "DEF-2026-001",
    "contractId": "contract-uuid-9012",
    "unitId": "A-101",
    "customerId": "CUST-12345",
    "defectCategory": "plumbing",
    "description": "Water leaking from bathroom sink",
    "reportedAt": "2026-04-30T10:00:00.000Z",
    "priority": "high"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0",
    "requestType": "warranty_coverage_check"
  }
}
```

**Expected Response Event:** `warranty.coverage.verified` (see section 3.6)

---

### 2.6 postsales.defect.scheduled

**Description:** แจ้งว่านัดหมายซ่อมแล้ว (internal tracking)  
**Consumers:** Internal (optional: Notification service)  
**Trigger:** Staff กด "Schedule Repair"

**Topic:** `postsales.defect.scheduled`

**Payload Schema:**
```json
{
  "eventId": "uuid",
  "eventType": "postsales.defect.scheduled",
  "timestamp": "2026-04-30T10:00:00.000Z",
  "data": {
    "defectId": "uuid (required)",
    "defectNumber": "string (required)",
    "unitId": "string (required)",
    "assignedTo": "string (required)",
    "scheduledDate": "string ISO8601 (required)"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

**Example:**
```json
{
  "eventId": "f6a7b8c9-d0e1-2345-f012-456789012345",
  "eventType": "postsales.defect.scheduled",
  "timestamp": "2026-04-30T11:00:00.000Z",
  "data": {
    "defectId": "def-uuid-5678",
    "defectNumber": "DEF-2026-001",
    "unitId": "A-101",
    "assignedTo": "ABC Contractor Co.",
    "scheduledDate": "2026-05-02T09:00:00.000Z"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

---

### 2.7 defect.caseclosed.completed

**Description:** แจ้งว่าปิด defect case แล้ว  
**Consumers:** Marketing Team, Legal Team  
**Trigger:** Staff กด "Close Case" หลังซ่อมเสร็จ

**Topic:** `defect.caseclosed.completed`

**Payload Schema:**
```json
{
  "eventId": "uuid",
  "eventType": "defect.caseclosed.completed",
  "timestamp": "2026-04-30T10:00:00.000Z",
  "data": {
    "defectId": "uuid (required)",
    "defectNumber": "string (required)",
    "unitId": "string (required)",
    "closedBy": "string (required)"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

**Example:**
```json
{
  "eventId": "a7b8c9d0-e1f2-3456-0123-567890123456",
  "eventType": "defect.caseclosed.completed",
  "timestamp": "2026-05-03T14:00:00.000Z",
  "data": {
    "defectId": "def-uuid-5678",
    "defectNumber": "DEF-2026-001",
    "unitId": "A-101",
    "closedBy": "Staff Name"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

**Consumer Actions:**
- **Marketing Team:** Send customer satisfaction survey, analyze defect trends
- **Legal Team:** Archive warranty claim (if applicable), update statistics

---

## 3. Events Subscribed (Inbound)

Post-Sales subscribe to events จาก 3 teams เพื่อรับข้อมูล

### 3.1 kyc.completed

**Description:** KYC verification เสร็จแล้ว  
**Producer:** KYC Team  
**Action:** Update handover case `kyc_status`

**Topic:** `kyc.completed`

**Expected Payload:**
```json
{
  "unitId": "string",
  "customerId": "string",
  "kycStatus": "enum: 'approved' | 'rejected'",
  "timestamp": "string ISO8601"
}
```

**Post-Sales Processing:**
- Upsert `handover_cases` SET `kyc_status` = `approved` or `rejected`
- Calculate `overall_status` (pending → ready when all 3 approved)
- Store event in `handover_events` table

---

### 3.2 legal.contract.drafted

**Description:** สัญญาซื้อขายร่างเสร็จแล้ว  
**Producer:** Legal Team  
**Action:** Update handover case `contract_status`

**Topic:** `legal.contract.drafted`

**Expected Payload:**
```json
{
  "unitId": "string",
  "customerId": "string",
  "contractStatus": "enum: 'drafted' | 'rejected'",
  "timestamp": "string ISO8601"
}
```

**Post-Sales Processing:**
- Upsert `handover_cases` SET `contract_status` = `drafted` or `rejected`
- Calculate `overall_status`
- Store event in `handover_events` table

---

### 3.3 payment.secondpayment.completed

**Description:** ลูกค้าชำระเงินงวดที่ 2 เสร็จแล้ว  
**Producer:** Payment Team  
**Action:** Update handover case `payment_status` → trigger ready for handover

**Topic:** `payment.secondpayment.completed`

**Expected Payload (from Team 6):**
```json
{
  "success": true,
  "data": {
    "paymentId": "string",
    "propertyId": "string (used as unitId)",
    "customerId": "string",
    "type": "Second",
    "amount": "number",
    "status": "CONFIRMED",
    "approvedBy": "string | null",
    "approvedAt": "string ISO8601 | null",
    "createdAt": "string ISO8601",
    "updatedAt": "string ISO8601"
  },
  "timestamp": "string ISO8601"
}
```

**Note:** Payment team uses `propertyId` which Post-Sales maps to `unitId` internally.

**Post-Sales Processing:**
- Upsert `handover_cases` SET `payment_status` = `completed`, `payment_amount` = amount
- Calculate `overall_status` → if all 3 complete, set to `ready`
- Store event in `handover_events` table
- **Ready for handover:** Staff can now mark as completed

---

### 3.4 payment.invoice.commonfees.completed

**Description:** เจ้าของชำระค่าส่วนกลางแล้ว (optional tracking)  
**Producer:** Payment Team  
**Action:** Log for tracking (no UI yet)

**Topic:** `payment.invoice.commonfees.completed`

**Expected Payload:**
```json
{
  "success": true,
  "data": {
    "invoiceId": "string",
    "customerId": "string",
    "unitId": "string",
    "amount": "number",
    "type": "COMMON_FEE",
    "status": "PAID",
    "paidAt": "string ISO8601"
  },
  "timestamp": "string ISO8601"
}
```

**Post-Sales Processing:**
- Currently: Log to console only
- Future: Store in `common_fees_payments` table

---

### 3.5 warranty.coverage.registered

**Description:** Legal Team ลงทะเบียน warranty coverage สำหรับ unit  
**Producer:** Legal Team  
**Action:** Store warranty info for future defect verification

**Topic:** `warranty.coverage.registered`

**Expected Payload:**
```json
{
  "contractId": "string",
  "unitId": "string",
  "customerId": "string",
  "startsAt": "string ISO8601",
  "endsAt": "string ISO8601",
  "coveredCategories": ["structural", "plumbing", "electrical"]
}
```

**Post-Sales Processing:**
- Store warranty coverage in database
- Use for future defect verification

---

### 3.6 warranty.coverage.verified

**Description:** Legal Team ตอบกลับผลการตรวจสอบ warranty coverage  
**Producer:** Legal Team  
**Action:** Update defect case with warranty status

**Topic:** `warranty.coverage.verified`

**Expected Payload:**
```json
{
  "claimId": "string",
  "warrantyId": "string",
  "defectId": "string",
  "unitId": "string",
  "coverageStatus": "enum: 'covered' | 'rejected' | 'partial'",
  "coverageReason": "string (optional)",
  "verifiedAt": "string ISO8601"
}
```

**Post-Sales Processing:**
- Update defect case with warranty verification result
- Store in `defect_events` table
- Display result in UI for staff decision

---

## 4. REST APIs Called

Post-Sales เรียกใช้ REST APIs จาก 3 teams

### 4.1 Inventory API: Get Property History

**Purpose:** ดึงประวัติ unit สำหรับประเมิน defect  
**When:** Staff reports defect

**Endpoint:** `GET /api/v1/properties/{id}/history`  
**Base URL:** `https://inventory-service.onrender.com`  
**Timeout:** 10 seconds

**Request:**
```http
GET /api/v1/properties/A-101/history HTTP/1.1
Host: inventory-service.onrender.com
Content-Type: application/json
```

**Response 200 OK:**
```json
{
  "propertyId": "A-101",
  "events": [
    {
      "event": "property.registered",
      "date": "2025-01-15T00:00:00.000Z",
      "status": "REGISTERED"
    },
    {
      "event": "sale.booked.complete",
      "date": "2025-06-01T00:00:00.000Z",
      "status": "BOOKED"
    }
  ]
}
```

**Usage in Code:**
```javascript
const propertyHistory = await externalApi.getPropertyHistory(unitId);
// Store for context, display in UI
```

---

### 4.2 Legal API: Get Contract Details

**Purpose:** ดึงรายละเอียดสัญญาซื้อขาย  
**When:** Staff views handover case details

**Endpoint:** `GET /api/contracts/{id}`  
**Base URL:** `https://contract-service-h5fs.onrender.com`  
**Timeout:** 10 seconds

**Request:**
```http
GET /api/contracts/contract-uuid-9012 HTTP/1.1
Host: contract-service-h5fs.onrender.com
Content-Type: application/json
```

**Response 200 OK:**
```json
{
  "contractId": "contract-uuid-9012",
  "bookingId": "booking-uuid",
  "unitId": "A-101",
  "customerId": "CUST-12345",
  "status": "DRAFT",
  "fileUrl": "https://...",
  "createdAt": "2026-04-15T00:00:00.000Z"
}
```

---

### 4.3 Legal API: Get Warranty Coverage

**Purpose:** ดึงข้อมูล warranty coverage และ claims  
**When:** Staff views defect details

**Endpoint:** `GET /api/warranties/{contractId}`  
**Base URL:** `https://warranty-service-gtv0.onrender.com`  
**Timeout:** 10 seconds

**Request:**
```http
GET /api/warranties/contract-uuid-9012 HTTP/1.1
Host: warranty-service-gtv0.onrender.com
Content-Type: application/json
```

**Response 200 OK:**
```json
{
  "warrantyId": "warranty-uuid",
  "contractId": "contract-uuid-9012",
  "unitId": "A-101",
  "startsAt": "2026-05-01T00:00:00.000Z",
  "endsAt": "2028-05-01T00:00:00.000Z",
  "coveredCategories": ["structural", "plumbing"],
  "claims": [
    {
      "claimId": "claim-uuid",
      "defectId": "def-uuid-5678",
      "status": "approved",
      "claimedAt": "2026-04-30T00:00:00.000Z"
    }
  ]
}
```

---

### 4.4 Payment API: Get Payment Details

**Purpose:** ดึงข้อมูลการชำระเงิน  
**When:** Staff views handover case details

**Endpoint:** `GET /api/payments/{customerId}/{unitId}` (assumed)  
**Base URL:** `https://cstu-payment-team.onrender.com`  
**Timeout:** 10 seconds

**Note:** Endpoint format needs confirmation with Payment team

**Expected Response 200 OK:**
```json
{
  "customerId": "CUST-12345",
  "unitId": "A-101",
  "payments": [
    {
      "paymentId": "payment-uuid",
      "type": "First",
      "amount": 500000,
      "status": "CONFIRMED",
      "paidAt": "2026-03-15T00:00:00.000Z"
    },
    {
      "paymentId": "payment-uuid-2",
      "type": "Second",
      "amount": 5000000,
      "status": "CONFIRMED",
      "paidAt": "2026-04-10T00:00:00.000Z"
    }
  ]
}
```

---

## 5. Integration Examples

### 5.1 Complete Handover Flow

```javascript
// Step 1: Subscribe to 3 events
// - kyc.completed (KYC Team)
// - legal.contract.drafted (Legal Team)
// - payment.secondpayment.completed (Payment Team)

// Step 2: Auto-create/update handover_cases
// Overall status calculation:
if (kyc_status === 'approved' && 
    contract_status === 'drafted' && 
    payment_status === 'completed') {
  overall_status = 'ready';
}

// Step 3: Staff marks as completed
PUT /api/handover/cases/{id}/complete
{
  "handoverDate": "2026-04-30",
  "handoverBy": "Staff Name",
  "notes": "All documents delivered"
}

// Step 4: Publish event
Topic: postsales.handover.completed
Consumers: Sales Team

// Step 5: Auto-trigger onboarding (internal)
Topic: postsales.handover.completed
→ Create onboarding_case
→ Publish: postsales.onboarding.started
```

---

### 5.2 Owner Registration Flow

```javascript
// Step 1: Staff opens onboarding case
GET /api/onboarding/cases

// Step 2: Staff clicks "Register Member"
PUT /api/onboarding/cases/{id}/register
{
  "email": "owner@example.com",
  "phone": "081-234-5678",
  "password": "hashed_password",
  "areaSize": 45.5,
  "billingCycle": "monthly"
}

// Step 3: Publish to Payment team
Topic: postsales.member.registered
Consumer: Payment Team

// Step 4: Payment creates billing account
// - Calculate monthly fee = areaSize × rate
// - Generate first invoice
```

---

### 5.3 Defect Management Flow

```javascript
// Step 1: Customer calls → Staff reports defect
POST /api/defects/cases
{
  "unitId": "A-101",
  "title": "Water leaking",
  "category": "plumbing",
  "priority": "high",
  "description": "Bathroom sink leaking",
  "reportedBy": "Staff Name"
}

// Step 2: Request warranty check (async)
Topic: postsales.warranty.defect.reported
Consumer: Legal Team

// Step 3: Get unit history (sync)
GET https://inventory-service.onrender.com/api/v1/properties/A-101/history

// Step 4: Wait for warranty response
Topic: warranty.coverage.verified
Handler: Update defect with coverage status

// Step 5: Staff schedules repair
PUT /api/defects/cases/{id}/schedule
{
  "assignedTo": "ABC Contractor",
  "scheduledDate": "2026-05-02",
  "repairNotes": "Schedule confirmed"
}

// Step 6: Contractor repairs (external)

// Step 7: Staff closes case
PUT /api/defects/cases/{id}/close
{
  "closedBy": "Staff Name",
  "closingNotes": "Repair completed",
  "photoAfterUrl": "https://..."
}

// Step 8: Notify Marketing + Legal
Topic: defect.caseclosed.completed
Consumers: Marketing Team, Legal Team
```

---

## 6. Error Handling

### 6.1 Kafka Event Publishing Failures

**Strategy:** Graceful degradation — don't fail API if Kafka is down

```javascript
try {
  await producer.publishHandoverCompleted(data);
} catch (error) {
  console.error('Failed to publish event:', error);
  // Continue - API still returns success
  // Manual retry or DLQ handling needed
}
```

### 6.2 REST API Call Failures

**Strategy:** Return null, allow graceful degradation

```javascript
try {
  const history = await externalApi.getPropertyHistory(unitId);
  return history;
} catch (error) {
  console.error('Failed to get property history:', error);
  return null; // UI displays "History unavailable"
}
```

### 6.3 Event Consumer Errors

**Strategy:** Log error, acknowledge message (prevent infinite retry)

```javascript
try {
  await handleKycEvent(event);
} catch (error) {
  console.error('Failed to process KYC event:', error);
  // Event is acknowledged - logged for manual investigation
}
```

---

## 7. Contact Information

### Post-Sales Team

**Service URL:** `https://your-postsales-service.onrender.com` (TBD)

**REST API Base:** `/api`
- Handover: `/api/handover`
- Onboarding: `/api/onboarding`
- Defects: `/api/defects`

**Kafka Topics Published:**
- `postsales.handover.completed`
- `postsales.onboarding.started`
- `postsales.member.registered`
- `postsales.profile.activated`
- `postsales.warranty.defect.reported`
- `postsales.defect.scheduled`
- `defect.caseclosed.completed`

**Kafka Topics Subscribed:**
- `kyc.completed`
- `legal.contract.drafted`
- `payment.secondpayment.completed`
- `payment.invoice.commonfees.completed`
- `warranty.coverage.registered`
- `warranty.coverage.verified`

**Kafka Infrastructure:**
- **Platform:** Confluent Cloud
- **Cluster:** pkc-619z3.us-east1.gcp.confluent.cloud:9092
- **Region:** us-east1 (GCP)

---

## 8. Testing & Validation

### 8.1 Event Publishing Test

```bash
# Test handover completed event
curl -X PUT http://localhost:3000/api/handover/cases/{id}/complete \
  -H "Content-Type: application/json" \
  -d '{
    "handoverDate": "2026-04-30",
    "handoverBy": "Test Staff",
    "notes": "Test handover"
  }'

# Check Kafka topic
kafka-console-consumer --bootstrap-server pkc-619z3.us-east1.gcp.confluent.cloud:9092 \
  --topic postsales.handover.completed \
  --from-beginning
```

### 8.2 Event Consumption Test

```bash
# Publish test event to KYC topic
kafka-console-producer --bootstrap-server ... \
  --topic kyc.completed

# Input:
{"unitId":"A-101","customerId":"CUST-12345","kycStatus":"approved","timestamp":"2026-04-30T10:00:00Z"}

# Check database
SELECT * FROM handover_cases WHERE unit_id = 'A-101';
SELECT * FROM handover_events WHERE case_id = '...';
```

### 8.3 REST API Integration Test

```bash
# Test Inventory API call
curl -X POST http://localhost:3000/api/defects/cases \
  -H "Content-Type: application/json" \
  -d '{
    "unitId": "A-101",
    "title": "Test defect",
    "category": "other",
    "priority": "low",
    "reportedBy": "Test Staff"
  }'

# Check logs for Inventory API call
# Expected: "📞 Calling Inventory API: GET /api/v1/properties/A-101/history"
```

---

## 9. Monitoring & Observability

### 9.1 Key Metrics to Monitor

- **Event Publishing Rate:** Events published per minute
- **Event Consumption Lag:** Time between event published and consumed
- **API Response Time:** P95, P99 for REST API calls
- **Error Rate:** Failed events, failed API calls
- **Database Query Time:** Slow queries alert

### 9.2 Alerts to Setup

- 🚨 Kafka connection down
- 🚨 Event publishing failures > 5 in 5 minutes
- 🚨 External API timeout rate > 20%
- 🚨 Database connection pool exhausted

---

## 10. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-04-30 | Initial documentation | Post-Sales Team |

---

**📝 Document Maintained By:** Post-Sales Team (Team 7)  
**📧 Contact:** post-sales-team@example.com  
**🔗 Related Docs:** ARCHITECTURE.md, TEAM_INTEGRATION.md, DEPLOYMENT.md
