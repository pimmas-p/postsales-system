# 📋 Post-Sales Services Overview

> เอกสารรวมทั้ง 3 บริการหลักของ Post-Sales พร้อมรายละเอียด API, แหล่งข้อมูล, Events ที่ Publish และ Workflows

**สร้างเมื่อ:** May 2, 2026  
**Version:** 2.0  
**Last Updated:** May 2, 2026 - แก้ไขให้ตรงกับ Implementation จริง

---

## 📑 สารบัญ

1. [Service 1: Handover Service](#1-handover-service)
2. [Service 2: Onboarding Service](#2-onboarding-service)
3. [Service 3: Defect Management Service](#3-defect-management-service)
4. [Integration Summary](#4-integration-summary)
5. [Kafka Events Summary](#5-kafka-events-summary)

---

## 1. Handover Service

### 🎯 วัตถุประสงค์
จัดการการส่งมอบห้อง (Handover) ให้เจ้าของ โดยติดตาม 2 เงื่อนไขหลัก:
1. ✅ Contract valid (DRAFT/PENDING_SIGN/SIGNED จาก Legal Team) - **ถ้าเป็น DRAFT ไม่จำเป็นต้องรอ SIGNED**
2. ✅ Second payment completed (จาก Payment Team)

### 📥 ข้อมูลที่ใช้จากทีมอื่น (Subscribe Events)

| Topic | Producer Team | ข้อมูลที่ได้รับ | การใช้งาน |
|-------|---------------|----------------|-----------|
| `contract.drafted` | Legal (Team 5) | contractId, unitId, status, fileUrl | อัพเดท contract_status ใน handover_cases |
| `payment.secondpayment.completed` | Payment (Team 6) | paymentId, propertyId (=unitId), amount, status, paidAt | อัพเดท payment_status → status mapping: **CONFIRMED → completed** |

> **⚠️ สำคัญ:** Payment Team ส่ง `status: "CONFIRMED"` แต่เราแปลงเป็น `"completed"` ก่อนบันทึกเพื่อให้ตรงกับ business logic

### 🔌 REST API Endpoints

#### GET APIs
- **GET `/api/handover/cases`** - ดึงรายการ handover cases ทั้งหมด
- **GET `/api/handover/cases/:id`** - ดึงข้อมูล case เดียว

#### PUT APIs
- **PUT `/api/handover/cases/:id/complete`** - ทำการส่งมอบห้องเสร็จสมบูรณ์
  - Body: `{ handoverDate, handoverBy, notes }`
  - Action: บันทึกข้อมูล + **Publish: postsales.handover.completed**

#### POST APIs
- **POST `/api/handover/migrate-to-onboarding`** - สร้าง Onboarding case จาก Handover case
  - Body: `{ handoverCaseId }`

### 📤 Events ที่ Publish

#### 1. `postsales.handover.completed`
**ส่งให้:** Sales Team, Marketing Team  
**เมื่อไร:** เมื่อกด Complete Handover สำเร็จ  
**Payload:**
```json
{
  "unitId": "UNIT-001",
  "customerId": "CUST-001",
  "handoverDate": "2026-05-02",
  "handoverBy": "John Doe",
  "notes": "Handover completed successfully"
}
```

### 🔄 Handover Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    HANDOVER SERVICE WORKFLOW                     │
└─────────────────────────────────────────────────────────────────┘

Phase 1: รอข้อมูลจาก 2 ทีม (Kafka Consumer)
═══════════════════════════════════════════════════════════════════

    ┌──────────────┐
    │  Legal Team  │ ──→ contract.drafted
    └──────────────┘         │
                             ↓
                    [eventHandlers.js]
                    handleContractEvent()
                             │
                             ↓
                    UPDATE handover_cases
                    SET contract_status = 'drafted'
                             │
                             ↓
                    ┌─────────────────────┐
                    │ contract_status: ✅ │
                    └─────────────────────┘

    ┌──────────────┐
    │ Payment Team │ ──→ payment.secondpayment.completed
    └──────────────┘         │
                             ↓
                    [eventHandlers.js]
                    handlePaymentEvent()
                             │
                             ↓
                    ⚙️  Status Mapping:
                    CONFIRMED → completed
                             │
                             ↓
                    UPDATE handover_cases
                    SET payment_status = 'completed'
                             │
                             ↓
                    ┌─────────────────────┐
                    │ payment_status: ✅  │
                    └─────────────────────┘

─────────────────────────────────────────────────────────────────

Phase 2: ตรวจสอบเงื่อนไข (Auto Calculation)
═══════════════════════════════════════════════════════════════════

    [calculateOverallStatus()] ใน queries.js
         │
         ↓
    IF (contract_status IN ['DRAFT', 'PENDING_SIGN', 'SIGNED'] AND 
        payment_status = 'completed')
    THEN
        overall_status = 'ready'
    ELSE IF (contract_status = 'CANCELLED' OR payment_status = 'failed')
    THEN
        overall_status = 'blocked'
    ELSE
        overall_status = 'pending'
    END IF

    ┌──────────────────────────────────────┐
    │  🎉 Ready for Handover!              │
    │  overall_status: ready               │
    │                                      │
    │  ✅ DRAFT ก็ส่งมอบได้เลย            │
    │  ไม่ต้องรอเซ็นสัญญา                 │
    └──────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Phase 3: Staff ดำเนินการส่งมอบ (Manual Action)
═══════════════════════════════════════════════════════════════════

    [Frontend] Handover Detail Page
         │
         └─→ Staff กด "Complete Handover"
                   │
                   ↓
         PUT /api/handover/cases/:id/complete
         {
           "handoverDate": "2026-05-02",
           "handoverBy": "John Doe",
           "notes": "Handover completed successfully"
         }
                   │
                   ↓
         [Backend] handover.routes.js
                   │
                   ├─→ UPDATE handover_cases
                   │   SET overall_status = 'completed',
                   │       handover_date = ...,
                   │       handover_by = ...
                   │
                   └─→ [Kafka Producer]
                       publishHandoverCompleted()
                             │
                             ↓
         📤 Publish: postsales.handover.completed
                             │
                             ↓
         ┌─────────────────────────────────────┐
         │  Sales Team (Subscribe)             │
         │  Marketing Team (Subscribe)         │
         └─────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Phase 4: เชื่อมต่อ Onboarding (Optional)
═══════════════════════════════════════════════════════════════════

         [Frontend] สามารถสร้าง Onboarding Case จาก Handover Case
                   │
                   ↓
         POST /api/onboarding/cases
         {
           "unitId": "UNIT-001",
           "customerId": "CUST-001",
           "handoverCaseId": 1
         }
                   │
                   ↓
         ┌─────────────────────────────────────┐
         │  🎯 เริ่ม Onboarding Process         │
         └─────────────────────────────────────┘
```

---

## 2. Onboarding Service

### 🎯 วัตถุประสงค์
ดูแลกระบวนการ Onboarding เจ้าของใหม่ หลังจากส่งมอบห้องเสร็จ โดยประสานงานกับ **Payment Team เท่านั้น** ประกอบด้วย **2 ขั้นตอน**

### 📊 Onboarding 2-Step Workflow (Payment-Only Integration)

```
┌─────────────────────────────────────────────────────────────────┐
│       ONBOARDING 2-STEP WORKFLOW (Payment-Only)              │
└─────────────────────────────────────────────────────────────────┘

📤 Event: postsales.onboarding.started
════════════════════════════════════════════════════════════════
POST /api/onboarding/cases
{ unitId, customerId, handoverCaseId }
    │
    ├─→ INSERT onboarding_cases (overall_status = 'pending')
    │
    └─→ 📤 Publish: postsales.onboarding.started
         Payload: {
           caseId: "uuid",
           unitId: "UNIT-001", 
           customerId: "CUST-001"
         }

─────────────────────────────────────────────────────────────────

Step 1: Member Registration (ลงทะเบียน + ส่งข้อมูลให้ Payment)
═════════════════════════════════════════════════════════════════
[Frontend] Register Member Dialog
    │
    ↓
PUT /api/onboarding/cases/:id/register
{
  customerId, unitId, areaSize, feeRatePerSqm, 
  effectiveDate, billingCycle, propertyId
}
    │
    ├─→ UPDATE onboarding_cases
    │   SET registration_status = 'completed',
    │       overall_status = 'in_progress'
    │
    └─→ 📤 Publish: postsales.member.registered (→ Payment Team)
         Payload: {
           customerId, unitId, propertyId,
           areaSize, feeRatePerSqm,
           effectiveDate, billingCycle
         }
         │
         ↓
    ┌─────────────────────────────────────────┐
    │  Payment Team รับ Event:               │
    │  • ตั้งค่า Account Receivable          │
    │  • คำนวณค่าส่วนกลาง                     │
    │    (areaSize × feeRatePerSqm)          │
    │  • ออกใบแจ้งหนี้ค่าส่วนกลางก้อนแรก      │
    └─────────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Step 2: Payment Verification & Profile Activation
═════════════════════════════════════════════════════════════════
    ⏳ รอ Payment Team ส่ง Event มา (Gatekeeper)
    │
    ├─→ 📥 Subscribe: payment.invoice.commonfees.completed
    │   Wrapper Format: {
    │     success: true,
    │     data: {
    │       invoiceId, refId, customerId, 
    │       unitId, propertyId, amount,
    │       type: "COMMON_FEE",
    │       status: "PAID",
    │       issuedAt, paidAt
    │     },
    │     timestamp
    │   }
    │
    └─→ [Backend Consumer] handleCommonFeesEvent()
            │
            ↓
        UPDATE onboarding_cases
        SET payment_status = 'paid',
            payment_verified_at = NOW()
            │
            ↓
        ✅ Payment Verified! พร้อม Activate
            │
            ↓
    [Frontend] "Complete Onboarding" Button ENABLED
            │
            ↓
    PUT /api/onboarding/cases/:id/complete
    { activatedBy, notes }
            │
            ├─→ UPDATE onboarding_cases
            │   SET overall_status = 'completed',
            │       activated_at = NOW()
            │
            └─→ 📤 Publish: postsales.profile.activated
                 Payload: {
                   caseId, unitId, 
                   customerId, completedBy
                 }
                 │
                 ↓
            🎉 Onboarding Complete!
            ลูกบ้านพร้อมใช้งาน Application
```

### 📥 ข้อมูลที่ใช้จาก Payment Team

#### Subscribe Events (Kafka) - เท่านั้น!

| Topic | Producer Team | ข้อมูลที่ได้รับ | การใช้งาน |
|-------|---------------|----------------|-----------|
| `payment.invoice.commonfees.completed` | Payment (Team 6) | {success, data: {invoiceId, refId, customerId, unitId, propertyId, amount, type, status: "PAID", issuedAt, paidAt}, timestamp} | **⭐ Gatekeeper สำหรับ Step 2** - ยืนยันว่าลูกค้าชำระค่าส่วนกลางเรียบร้อยแล้ว ถึงจะ Activate โปรไฟล์ได้ |

> **🔥 สำคัญ:** Onboarding Service **ไม่มี REST API calls** ไปหา Payment Service - ใช้ Kafka events เท่านั้น!

### 🔌 REST API Endpoints

#### GET APIs
- **GET `/api/onboarding/cases`** - ดึงรายการ onboarding cases
- **GET `/api/onboarding/cases/:id`** - ดึงข้อมูล case เดียว

#### POST APIs
- **POST `/api/onboarding/cases`** - สร้าง onboarding case ใหม่ + Publish `postsales.onboarding.started`

#### PUT APIs (Onboarding Steps)
- **PUT `/api/onboarding/cases/:id/register`** - **Step 1:** ลงทะเบียนสมาฌิก + Publish `postsales.member.registered`
- **PUT `/api/onboarding/cases/:id/complete`** - **Step 2:** Activate โปรไฟล์ + Publish `postsales.profile.activated` (requires payment_status = 'paid')

### 📤 Events ที่ Publish

#### 1. `postsales.onboarding.started`
**เมื่อไร:** เมื่อสร้าง onboarding case ใหม่ (POST /api/onboarding/cases)  
**Payload:**
```json
{
  "caseId": "550e8400-e29b-41d4-a716-446655440000",
  "unitId": "UNIT-001",
  "customerId": "CUST-001"
}
```

#### 2. `postsales.member.registered` ⭐ **สำคัญ**
**ส่งให้:** Payment Team (Team 6)  
**เมื่อไร:** เมื่อลงทะเบียนสมาชิกสำเร็จ (Step 1 - PUT /api/onboarding/cases/:id/register)  
**เป้าหมาย:** Payment Team จะนำข้อมูลไปตั้งค่า Account Receivable และออกใบแจ้งหนี้  
**Payload:**
```json
{
  "customerId": "CUST-001",
  "unitId": "UNIT-001",
  "propertyId": "UNIT-001",
  "areaSize": 35.5,
  "feeRatePerSqm": 45.0,
  "effectiveDate": "2026-05-01",
  "billingCycle": "MONTHLY"
}
```

#### 3. `postsales.profile.activated`
**เมื่อไร:** เมื่อ Activate โปรไฟล์สำเร็จ (Step 2 - PUT /api/onboarding/cases/:id/complete)  
**ความหมาย:** ลูกบ้านคนนี้พร้อมใช้งาน Application แล้ว  
**Payload:**
```json
{
  "caseId": "550e8400-e29b-41d4-a716-446655440000",
  "unitId": "UNIT-001",
  "customerId": "CUST-001",
  "completedBy": "Admin Name"
}
```

### 🔄 Event Flow Summary

```
1. Create Case
   ↓
   📤 postsales.onboarding.started {caseId, unitId, customerId}
   
2. Register Member (Step 1)
   ↓
   📤 postsales.member.registered {customerId, unitId, areaSize, ...} → Payment Team
   
3. Payment Team processes
   ↓
   📥 payment.invoice.commonfees.completed {success, data: {...}} ← Payment Team
   
4. Activate Profile (Step 2)
   ↓
   📤 postsales.profile.activated {caseId, unitId, customerId, completedBy}
```  

---

## 3. Defect Management Service

### 🎯 วัตถุประสงค์
จัดการข้อบกพร่อง (Defects/Snagging) หลังส่งมอบ ตรวจสอบ Warranty และประสานงานการแก้ไข

### 📊 Defect Management 4-State Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              DEFECT MANAGEMENT 4-STATE WORKFLOW                  │
└─────────────────────────────────────────────────────────────────┘

State 1: REPORTED (แจ้งข้อบกพร่อง)
═════════════════════════════════════════════════════════════════
POST /api/defects/cases
{
  unitId, title, description, category,
  priority, location, photoBeforeUrl
}
    │
    ├─→ INSERT defect_cases (status = 'reported')
    │
    └─→ 📤 Publish: warranty.defect.reported (→ Legal Team)
         │
         │  **Event Schema:**
         │  {
         │    "eventId": "uuid-v4",
         │    "eventType": "warranty.defect.reported",
         │    "timestamp": "2026-05-02T14:00:00.000Z",
         │    "data": {
         │      "defectId": "550e8400-e29b-41d4-a716-446655440000",
         │      "contractId": "CONTRACT-001" or null,
         │      "unitId": "A-101",
         │      "customerId": "CUST-12345" or null,
         │      "defectCategory": "cosmetic",
         │      "description": "รอยแตกฝ้าเพดาน",
         │      "reportedAt": "2026-05-02T14:00:00.000Z"
         │    },
         │    "metadata": {
         │      "source": "postsales-backend-bridge",
         │      "version": "1.0"
         │    }
         │  }
         ↓
    ┌─────────────────────────────────────────────────────────────┐
    │  Legal Team ตรวจสอบ Warranty Coverage                      │
    │  • ดึงข้อมูล contract และ warranty terms                   │
    │  • ตรวจสอบว่าข้อบกพร่องอยู่ในขอบเขต warranty หรือไม่        │
    │  • ตรวจสอบระยะเวลา warranty ยังไม่หมดอายุ                  │
    │                                                             │
    │  ส่งกลับมาทาง Kafka (RESPONSE):                            │
    │  Topic: warranty.coverage.verified                         │
    │                                                             │
    │  Response Schema (camelCase - Team 5 format):               │
    │  {                                                          │
    │    "claimId": "<UUID>",                                    │
    │    "warrantyId": "<UUID>",                                 │
    │    "defectId": "<UUID>",                                   │
    │    "contractId": "<UUID>",                                 │
    │    "unitId": "<UUID>",                                     │
    │    "customerId": "<UUID>",                                 │
    │    "coverageStatus": "COVERED|REJECTED",                   │
    │    "coverageReason": "อยู่ในขอบเขต warranty โครงสร้าง 5 ปี", │
    │    "verifiedAt": "2026-05-03T10:30:00.000Z",              │
    │    "expiresAt": "2028-12-31T23:59:59.000Z"                │
    │  }                                                          │
    └─────────────────────────────────────────────────────────────┘
         │
         ↓
    [Backend Consumer] handleWarrantyVerifiedEvent()
    UPDATE defect_cases
    SET warranty_coverage_status = coverageStatus,
        warranty_id = warrantyId,
        claim_id = claimId,
        coverage_reason = coverageReason,
        verified_at = verifiedAt,
        expires_at = expiresAt

    **Key Points:**
    • Legal Team เป็นผู้ตรวจสอบ warranty coverage
    • Post-Sales รอรับ verification result ก่อนดำเนินการต่อ
    • ถ้า coverageStatus = REJECTED, ต้องเก็บค่าใช้จ่ายจากลูกบ้าน
    • ทุกข้อบกพร่องต้องผ่าน warranty check ก่อน
    • Schema ใช้ camelCase ตาม Team 5 format

─────────────────────────────────────────────────────────────────

State 2: IN_PROGRESS (กำลังดำเนินการ)
═════════════════════════════════════════════════════════════════
PUT /api/defects/cases/:id/schedule
{
  scheduledDate, technicianName, 
  estimatedDuration
}
    │
    ↓
UPDATE defect_cases
SET status = 'in_progress',
    scheduled_date = ...,
    technician_name = ...

─────────────────────────────────────────────────────────────────

State 3: RESOLVED (แก้ไขเสร็จสิ้น)
═════════════════════════════════════════════════════════════════
PUT /api/defects/cases/:id/complete-repair
{
  completedBy, 
  completionNotes,
  photoAfterUrl
}
    │
    ↓
UPDATE defect_cases
SET status = 'resolved',
    completed_by = ...,
    photo_after_url = ...

─────────────────────────────────────────────────────────────────

State 4: CLOSED (ปิดเคส)
═════════════════════════════════════════════════════════════════
PUT /api/defects/cases/:id/close
{
  closedBy,
  closingNotes
}
    │
    ├─→ UPDATE defect_cases
    │   SET status = 'closed',
    │       closed_by = ...,
    │       closed_at = NOW()
    │
    └─→ 📤 Publish: postsales.caseclosed.completed
         │
         ↓
    🎉 Defect Case Closed!
```

### 📥 ข้อมูลที่ใช้จากทีมอื่น

#### REST API Requests (External Services)

| External Service | API Call | ข้อมูลที่ดึง | การใช้งาน |
|------------------|----------|--------------|-----------|
| Inventory Catalog Service | GET `/api/v1/properties/:id` | ข้อมูลห้อง (propertyId, unitNumber, area, etc.) | แสดงใน Defect Detail Page |

> **Retry Logic:** เรียก 2 ครั้ง, timeout 30s, graceful degradation (แสดง "Data temporarily unavailable" แทน error)

#### Subscribe Events (Kafka)

| Topic | Producer Team | ข้อมูลที่ได้รับ | การใช้งาน |
|-------|---------------|----------------|-----------|
| `warranty.coverage.verified` | Legal (Team 5) | `{claimId, warrantyId, defectId, contractId, unitId, customerId, coverageStatus: "COVERED\|REJECTED", coverageReason, verifiedAt, expiresAt}` | อัพเดท warranty_coverage_status, warranty_id, claim_id ใน defect_cases |

**Response Event Schema (camelCase - Team 5):**
```json
{
  "claimId": "<UUID>",
  "warrantyId": "<UUID>", 
  "defectId": "<UUID>",
  "coverageStatus": "COVERED|REJECTED",
  "coverageReason": "string",
  "verifiedAt": "<ISO8601>",
  "expiresAt": "<ISO8601>"
}
```

### 🔌 REST API Endpoints

#### GET APIs
- **GET `/api/defects/cases`** - ดึงรายการ defect cases
- **GET `/api/defects/cases/:id`** - ดึงข้อมูล defect case เดียว
- **GET `/api/defects/:id/unit-history`** - Proxy to Inventory Service (ข้อมูลห้อง)
- **GET `/api/defects/:id/warranty`** - ข้อมูล Warranty จาก database (ที่ได้จาก Legal event)

#### PUT APIs
- **PUT `/api/defects/cases/:id/schedule`** - นัดหมายแก้ไข (→ in_progress)
- **PUT `/api/defects/cases/:id/complete-repair`** - แก้ไขเสร็จ (→ resolved)
- **PUT `/api/defects/cases/:id/close`** - ปิดเคส (→ closed)

### 📤 Events ที่ Publish

#### 1. `warranty.defect.reported` ⭐ **สำคัญ**
**ส่งให้:** Legal Team (Team 5) - ตรวจสอบ Warranty Coverage  
**เมื่อไร:** เมื่อแจ้งข้อบกพร่องใหม่ (POST /api/defects/cases)  
**Workflow:**
1. Post-Sales รับรายงานข้อบกพร่องจากลูกบ้าน
2. Publish `warranty.defect.reported` ไปยัง Legal Team
3. Legal Team ตรวจสอบ warranty coverage และส่งกลับมา
4. Post-Sales รับ `warranty.coverage.verified` และอัพเดทสถานะ

**Request Payload (Post-Sales → Legal):**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "warranty.defect.reported",
  "timestamp": "2026-05-02T14:00:00.000Z",
  "data": {
    "defectId": "<UUID>",
    "contractId": "<UUID>",
    "unitId": "<UUID>",
    "customerId": "<UUID>",
    "defectCategory": "STRUCTURAL|ELECTRICAL|PLUMBING|FINISHING|APPLIANCE|OTHER",
    "description": "รอยแตกฝ้าเพดาน",
    "reportedAt": "2026-05-02T14:00:00.000Z"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

**Response Event (Legal → Post-Sales):**  
**Topic:** `warranty.coverage.verified` ⚠️ **ต่างจาก request topic**

```json
{
  "claimId": "<UUID>",
  "warrantyId": "<UUID>",
  "defectId": "<UUID>",
  "contractId": "<UUID>",
  "unitId": "<UUID>",
  "customerId": "<UUID>",
  "coverageStatus": "COVERED|REJECTED",
  "coverageReason": "อยู่ในขอบเขต warranty โครงสร้าง 5 ปี",
  "verifiedAt": "2026-05-03T10:30:00.000Z",
  "expiresAt": "2028-12-31T23:59:59.000Z"
}
```

**Field Descriptions:**
- `coverageStatus`: `COVERED` = อยู่ในประกัน, `REJECTED` = นอกประกัน
- `coverageReason`: เหตุผลจาก Legal Team
- `verifiedAt`: เวลาที่ Legal ตรวจสอบเสร็จ
- `expiresAt`: วันหมดอายุ warranty (ถ้า COVERED)

#### 2. ~`postsales.caseclosed.completed`~ ❌ **DEPRECATED**
**สถานะ:** Deprecated - ใช้ REST API แทน  
**ส่งให้:** ~~Marketing Team (Quality Tracking)~~  
**เปลี่ยนเป็น:** Marketing Team เรียก REST API `GET /api/defects/closed-cases`  
**เหตุผล:** Pull model ง่ายกว่า push model สำหรับการดึงข้อมูลเป็นระยะ  
**เอกสาร:** ดูที่ `docs/MARKETING_API_INTEGRATION.md`  

---

## 4. Integration Summary

### 🔗 Team Integration Matrix

| External Team | ที่เรา Subscribe | ที่เรา Publish | REST API Calls |
|---------------|------------------|----------------|----------------|
| **Legal Team (5)** | `contract.drafted`<br>`warranty.coverage.verified` | `warranty.defect.reported` | ✅ Defect Service only:<br>GET Property Warranty |
| **Marketing Team (6)** | - | - | ✅ **REST API**:<br>GET /api/defects/closed-cases |
| **Payment Team (6)** | `payment.secondpayment.completed`<br>`payment.invoice.commonfees.completed` | `postsales.member.registered` | - |
| **Inventory Team** | - | - | ✅ Defect Service:<br>GET Property Details |

### 📊 Service-Specific Integration Details

#### Service 1: Handover Service
**External Dependencies:**
- 📥 Subscribe: `contract.drafted`, `payment.secondpayment.completed`
- 📤 Publish: `postsales.handover.completed`
- 🔌 REST API: None

#### Service 2: Onboarding Service ⭐ **Payment Team Only - 2 Steps**
**Business Flow:**
1. Create case → Publish `postsales.onboarding.started`
2. Register member (Step 1) → Publish `postsales.member.registered` → Payment Team
3. Wait for Payment confirmation (Step 2 Gatekeeper) → Activate profile → Publish `postsales.profile.activated`

**External Dependencies:**
- 📥 Subscribe: `payment.invoice.commonfees.completed` (Gatekeeper for Step 2)
- 📤 Publish: `postsales.onboarding.started`, `postsales.member.registered`, `postsales.profile.activated`
- 🔌 REST API: **None** (ไม่มี REST API calls - Kafka events only)

**Key Points:**
- ✅ ไม่มีการอัพโหลดเอกสาร (removed)
- ✅ ไม่เรียก Legal APIs (removed)
- ✅ ไม่เรียก Payment APIs (Kafka only)
- ✅ Step 2 รอ Payment Team ส่ง event มาก่อนถึงจะ Activate ได้

#### Service 3: Defect Management Service
**External Dependencies:**
- 📥 Subscribe: `warranty.coverage.verified`
- 📤 Publish: `warranty.defect.reported`
- 🌐 REST API Provides: `GET /api/defects/closed-cases` (for Marketing Team)
- 🔌 REST API Calls: **Inventory Service** - GET Property Details, **Legal Service** - GET Warranty Info

### 📊 Payment Team Integration Details

#### เราส่งให้ Payment Team:
- **Topic:** `postsales.member.registered`
- **Trigger:** Onboarding Step 1 - Register Member
- **Payload:** `{ customerId, unitId, propertyId, areaSize, feeRatePerSqm, effectiveDate, billingCycle }`
- **Purpose:** Payment Team ใช้ข้อมูลนี้ตั้งค่า Account Receivable และออกใบแจ้งหนี้ค่าส่วนกลาง

#### เรารับจาก Payment Team:

| Topic | Event Data | Status Mapping | การใช้งาน |
|-------|-----------|----------------|-----------|
| `payment.secondpayment.completed` | `{ propertyId, customerId, amount, status: "CONFIRMED", paidAt }` | **CONFIRMED → completed** | Handover: payment_status = 'completed' |
| `payment.invoice.commonfees.completed` | `{ unitId, customerId, amount, status: "PAID", paidAt }` | **PAID → paid** | Onboarding: payment_status = 'paid' (Gatekeeper) |

> **⚠️ สำคัญ:** Payment Team wrapper format: `{ success: true, data: {...}, timestamp: ... }`  
> Backend ต้อง unwrap: `const eventData = event.success ? event.data : event`

---

## 5. Kafka Events Summary

### 📤 Events ที่เรา Publish (5 Events)

| # | Topic | Target Team | Purpose |
|---|-------|-------------|---------|
| 1 | `postsales.handover.completed` | Sales, Marketing | แจ้งว่าส่งมอบห้องเสร็จแล้ว |
| 2 | `postsales.onboarding.started` | Internal | เริ่มกระบวนการ Onboarding |
| 3 | `postsales.member.registered` | Payment Team | ตั้งค่า Account Receivable |
| 4 | `postsales.profile.activated` | CRM/Marketing | ลูกบ้านพร้อมใช้งาน |
| 5 | `warranty.defect.reported` | Legal Team | **ส่ง request** ตรวจสอบ Warranty Coverage |

**Note:** ~`postsales.caseclosed.completed`~ (Deprecated) - Marketing Team ใช้ REST API `GET /api/defects/closed-cases` แทน

### 📥 Events ที่เรา Subscribe (4 Events)

| # | Topic | Producer | Purpose | Workflow |
|---|-------|----------|---------|----------|
| 1 | `contract.drafted` | Legal Team | Update Handover contract status | Handover Phase 1 |
| 2 | `payment.secondpayment.completed` | Payment Team | Update Handover payment (CONFIRMED → completed) | Handover Phase 1 |
| 3 | `payment.invoice.commonfees.completed` | Payment Team | Update Onboarding payment (PAID → paid) - Gatekeeper | Onboarding Step 2 |
| 4 | `warranty.coverage.verified` | Legal Team | **รับ response** Warranty verification result | Defect State 1 → Update warranty status |

### 🔄 Warranty 2-Way Communication Flow

```
Post-Sales → warranty.defect.reported → Legal Team
             (ขอตรวจสอบ warranty)
             
Legal Team → warranty.coverage.verified → Post-Sales
             (ส่งผลการตรวจสอบกลับมา)
```

**Key Points:**
- `warranty.defect.reported` = **Request** (เราส่งไป)
- `warranty.coverage.verified` = **Response** (เรารับกลับมา)
- เป็น 2-way communication ผ่าน Kafka topics คนละ topic

---

## 📝 Implementation Notes

### ✅ Completed Features
- ✅ Handover **2-condition** flow with Payment status mapping
- ✅ Onboarding **2-step** workflow with Payment gatekeeper (Kafka events only - no REST API calls)
- ✅ Defect Management 4-state flow with event-driven warranty
- ✅ Kafka event standardization (6 publish + 5 subscribe)
- ✅ Graceful degradation for external service calls
- ✅ Frontend 2-step UI for Onboarding (removed document upload)
- ✅ Frontend 4-state UI for Defect Management

### 🔧 Technical Implementation
- **Backend:** Node.js + Express + Supabase (PostgreSQL)
- **Frontend:** React 18 + TypeScript + Material-UI v5
- **Message Broker:** Kafka (@confluentinc/kafka-javascript)
- **External Services:** Backend-as-Proxy pattern with retry logic

### 📊 Database Schema
- `handover_cases` - Handover tracking
- `onboarding_cases` - Onboarding with payment tracking columns
- `defect_cases` - Defect management with warranty columns

---

**Documentation Version:** 2.0  
**Last Updated:** May 2, 2026  
**Status:** ✅ ตรงกับ Implementation จริง
