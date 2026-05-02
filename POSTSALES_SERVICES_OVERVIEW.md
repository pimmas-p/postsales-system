# 📋 Post-Sales Services Overview

> เอกสารรวมทั้ง 3 บริการหลักของ Post-Sales พร้อมรายละเอียด API, แหล่งข้อมูล, Events ที่ Publish และ Workflows

**สร้างเมื่อ:** May 2, 2026  
**Version:** 1.0

---

## 📑 สารบัญ

1. [Service 1: Handover Service](#1-handover-service)
2. [Service 2: Onboarding Service](#2-onboarding-service)
3. [Service 3: Defect Management Service](#3-defect-management-service)
4. [Complete Workflow Diagram](#4-complete-workflow-diagram)
5. [Integration Summary](#5-integration-summary)

---

## 1. Handover Service

### 🎯 วัตถุประสงค์
จัดการการส่งมอบห้อง (Handover) ให้เจ้าของ โดยติดตาม 3 เงื่อนไขหลัก:
1. ✅ KYC verified (จาก KYC Team)
2. ✅ Contract drafted (จาก Legal Team)
3. ✅ Second payment completed (จาก Payment Team)

### 📥 ข้อมูลที่ใช้จากทีมอื่น (Subscribe Events)

| Topic | Producer Team | ข้อมูลที่ได้รับ | การใช้งาน |
|-------|---------------|----------------|-----------|
| `managing.kyc.completed` | Managing (Team 4) | KYC status, customerId, unitId | อัพเดท kyc_status ใน handover_cases |
| `purchase.contract.drafted` | Legal (Team 5) | contractId, unitId, status, fileUrl | อัพเดท contract_status ใน handover_cases |
| `payment.secondpayment.completed` | Payment (Team 6) | paymentId, unitId, amount, paidAt | อัพเดท payment_status → เปลี่ยนเป็น ready_for_handover |

### 🔌 REST API Endpoints

#### GET APIs
- **GET `/api/handover/cases`** - ดึงรายการ handover cases ทั้งหมด
  - Query params: `status`, `unitId`, `customerId`
  - Response: Array of handover cases

- **GET `/api/handover/cases/:id`** - ดึงข้อมูล case เดียว
  - Response: Case detail พร้อม events

- **GET `/api/handover/cases/:id/contract`** - ดึงข้อมูลสัญญาจาก Legal Team
  - External API: Legal Contract Service
  - Response: สัญญา PDF URL และ metadata

- **GET `/api/handover/cases/:id/payment`** - ดึงข้อมูลการชำระจาก Payment Team
  - External API: Payment Service
  - Response: Payment history และ invoice details

- **GET `/api/handover/cases/:id/unit`** - ดึงข้อมูลห้องจาก Inventory Team
  - External API: Inventory Service
  - Response: Unit details (size, floor, building)

#### POST APIs
- **POST `/api/handover/cases/:id/complete`** - ทำการส่งมอบห้องเสร็จสมบูรณ์
  - Body: `{ handoverDate, handoverBy, notes }`
  - Action: บันทึกข้อมูล + **Publish Event**

- **POST `/api/handover/migrate-to-onboarding`** - สร้าง Onboarding case อัตโนมัติ
  - Body: `{ handoverCaseId }`
  - Action: ย้ายข้อมูลจาก handover → onboarding

### 📤 Events ที่ Publish

#### 1. `postsales.handover.completed`
**ส่งให้:** Sales Team, Marketing Team  
**เมื่อไร:** เมื่อกด Complete Handover สำเร็จ  
**Payload:**
```json
{
  "eventId": "uuid",
  "eventType": "postsales.handover.completed",
  "timestamp": "2026-05-02T10:30:00Z",
  "data": {
    "unitId": "UNIT-001",
    "customerId": "CUST-001",
    "handoverDate": "2026-05-02",
    "handoverBy": "John Doe",
    "notes": "Handover completed successfully"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

### 🔄 Handover Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    HANDOVER SERVICE WORKFLOW                     │
└─────────────────────────────────────────────────────────────────┘

Phase 1: รอข้อมูลจาก 3 ทีม (Kafka Consumer)
═══════════════════════════════════════════════════════════════════

    ┌──────────────┐
    │ Managing Team│ ──→ managing.kyc.completed
    └──────────────┘         │
                             ↓
                    [eventHandlers.js]
                    handleKycEvent()
                             │
                             ↓
                    UPDATE handover_cases
                    SET kyc_status = 'approved'
                             │
                             ↓
                    ┌─────────────────┐
                    │ kyc_status: ✅  │
                    └─────────────────┘

    ┌──────────────┐
    │  Legal Team  │ ──→ purchase.contract.drafted
    └──────────────┘         │
                             ↓
                    [eventHandlers.js]
                    handleContractEvent()
                             │
                             ↓
                    UPDATE handover_cases
                    SET contract_status = 'ready'
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

    IF (kyc_status = 'approved' AND 
        contract_status = 'ready' AND 
        payment_status = 'completed')
    THEN
        overall_status = 'ready_for_handover'
    END IF

    ┌──────────────────────────────────────┐
    │  🎉 Ready for Handover!              │
    │  overall_status: ready_for_handover  │
    └──────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Phase 3: Staff ดำเนินการส่งมอบ (Manual Action)
═══════════════════════════════════════════════════════════════════

    [Frontend] Handover Detail Page
         │
         ├─→ แสดงข้อมูลจาก External APIs:
         │   • GET /api/handover/:id/contract (Legal)
         │   • GET /api/handover/:id/payment (Payment)
         │   • GET /api/handover/:id/unit (Inventory)
         │
         └─→ Staff กด "Complete Handover"
                   │
                   ↓
         POST /api/handover/cases/:id/complete
         {
           "handoverDate": "2026-05-02",
           "handoverBy": "John Doe",
           "notes": "..."
         }
                   │
                   ↓
         [Backend] handover.routes.js
                   │
                   ├─→ UPDATE handover_cases
                   │   SET status = 'completed',
                   │       handover_date = ...
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

Phase 4: ย้ายไปขั้นตอนถัดไป (Optional Auto-Migration)
═══════════════════════════════════════════════════════════════════

         POST /api/handover/migrate-to-onboarding
         { "handoverCaseId": 1 }
                   │
                   ↓
         [Backend] สร้าง Onboarding Case
                   │
                   ↓
         INSERT INTO onboarding_cases
         (unit_id, customer_id, status = 'pending')
                   │
                   ↓
         📤 Publish: postsales.onboarding.started
                   │
                   ↓
         ┌─────────────────────────────────────┐
         │  🎯 เริ่ม Onboarding Process         │
         └─────────────────────────────────────┘
```

---

## 2. Onboarding Service

### 🎯 วัตถุประสงค์
ดูแลกระบวนการ Onboarding เจ้าของใหม่ หลังจากส่งมอบห้องเสร็จ ประกอบด้วย:
1. 📄 Upload เอกสารทางกฎหมาย
2. 👥 ลงทะเบียนสมาชิก (Member Registration)
3. ✅ Activate โปรไฟล์

### 📥 ข้อมูลที่ใช้จากทีมอื่น (REST API Requests)

| External Service | API Call | ข้อมูลที่ดึง | การใช้งาน |
|------------------|----------|--------------|-----------|
| Legal Contract Service | GET `/contracts/unit/:unitId` | สัญญาซื้อขาย | แสดงในหน้า Onboarding |
| Legal Warranty Service | GET `/warranty/:unitId` | ข้อมูล Warranty | แสดงระยะเวลา Warranty |
| Payment Service | GET `/invoices/customer/:customerId` | ประวัติการชำระ | แสดงสถานะการชำระ |

### 🔌 REST API Endpoints

#### GET APIs
- **GET `/api/onboarding/cases`** - ดึงรายการ onboarding cases
  - Query params: `status`, `unitId`, `customerId`
  - Response: Array of onboarding cases

- **GET `/api/onboarding/cases/:id`** - ดึงข้อมูล case เดียว
  - Response: Case detail พร้อม documents และ members

#### POST APIs
- **POST `/api/onboarding/cases`** - สร้าง onboarding case ใหม่
  - Body: `{ unitId, customerId, startedBy }`
  - Action: สร้าง case + **Publish: postsales.onboarding.started**

- **POST `/api/onboarding/cases/:id/upload-documents`** - Upload เอกสาร
  - Body: `{ documentType, fileUrl, uploadedBy }`
  - Action: บันทึก document record

- **POST `/api/onboarding/cases/:id/register-member`** - ลงทะเบียนสมาชิก
  - Body: `{ customerId, unitId, areaSize, feeRatePerSqm, billingCycle }`
  - Action: บันทึก member + **Publish: postsales.member.registered**

- **POST `/api/onboarding/cases/:id/activate`** - Activate โปรไฟล์
  - Body: `{ activatedBy, notes }`
  - Action: เปลี่ยนสถานะเป็น completed + **Publish: postsales.profile.activated**

- **POST `/api/onboarding/cases/:id/fetch-contract`** - ดึงสัญญาจาก Legal API
  - Action: เรียก Legal API + บันทึกผลลัพธ์

### 📤 Events ที่ Publish

#### 1. `postsales.onboarding.started`
**ส่งให้:** Internal (สำหรับ audit trail)  
**เมื่อไร:** เมื่อสร้าง onboarding case ใหม่  
**Payload:**
```json
{
  "eventId": "uuid",
  "eventType": "postsales.onboarding.started",
  "timestamp": "2026-05-02T11:00:00Z",
  "data": {
    "caseId": 1,
    "unitId": "UNIT-001",
    "customerId": "CUST-001"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

#### 2. `postsales.member.registered` ⭐ **สำคัญ**
**ส่งให้:** Payment Team (Team 6) - สำหรับตั้งค่า Account Receivable  
**เมื่อไร:** เมื่อลงทะเบียนสมาชิกสำเร็จ  
**Payload:**
```json
{
  "eventId": "uuid",
  "eventType": "postsales.member.registered",
  "timestamp": "2026-05-02T11:15:00Z",
  "data": {
    "customerId": "CUST-001",
    "unitId": "UNIT-001",
    "areaSize": 35.5,
    "feeRatePerSqm": 45.0,
    "effectiveDate": "2026-05-01",
    "billingCycle": "MONTHLY",
    "propertyId": "UNIT-001"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

#### 3. `postsales.profile.activated`
**ส่งให้:** Internal (อาจส่งต่อให้ Marketing/CRM ในอนาคต)  
**เมื่อไร:** เมื่อ Activate โปรไฟล์สำเร็จ  
**Payload:**
```json
{
  "eventId": "uuid",
  "eventType": "postsales.profile.activated",
  "timestamp": "2026-05-02T11:30:00Z",
  "data": {
    "caseId": 1,
    "unitId": "UNIT-001",
    "customerId": "CUST-001",
    "completedBy": "Admin User"
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

### 🔄 Onboarding Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                   ONBOARDING SERVICE WORKFLOW                    │
└─────────────────────────────────────────────────────────────────┘

Step 1: สร้าง Onboarding Case
═══════════════════════════════════════════════════════════════════

    [Frontend] หรือ Auto-Migration
         │
         ↓
    POST /api/onboarding/cases
    {
      "unitId": "UNIT-001",
      "customerId": "CUST-001",
      "startedBy": "Admin User"
    }
         │
         ↓
    [Backend] onboarding.routes.js
         │
         ├─→ INSERT INTO onboarding_cases
         │   (unit_id, customer_id, status='pending')
         │
         └─→ [Kafka Producer]
             publishOnboardingStarted()
                   │
                   ↓
    📤 Publish: postsales.onboarding.started
         │
         ↓
    ┌──────────────────────────────────────┐
    │  Case Created ✅                     │
    │  status: pending                     │
    │  documents_status: pending           │
    │  member_registration_status: pending │
    │  profile_activation_status: pending  │
    └──────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Step 2: Upload เอกสาร (Documents Upload)
═══════════════════════════════════════════════════════════════════

    [Frontend] Onboarding Detail Page
         │
         ↓
    POST /api/onboarding/cases/:id/upload-documents
    {
      "documentType": "id_card",
      "fileUrl": "https://storage.../id_card.pdf",
      "uploadedBy": "Admin User"
    }
         │
         ↓
    [Backend] บันทึก Document Record
         │
         ├─→ INSERT INTO onboarding_documents
         │   (case_id, type, url, uploaded_by, uploaded_at)
         │
         └─→ UPDATE onboarding_cases
             SET documents_status = 'uploaded'
         │
         ↓
    ┌──────────────────────────────────────┐
    │  Documents Uploaded ✅               │
    │  documents_status: uploaded          │
    └──────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Step 3: ลงทะเบียนสมาชิก (Member Registration) ⭐ สำคัญ
═══════════════════════════════════════════════════════════════════

    [Frontend] Register Member Dialog
         │
         ↓
    POST /api/onboarding/cases/:id/register-member
    {
      "customerId": "CUST-001",
      "unitId": "UNIT-001",
      "areaSize": 35.5,
      "feeRatePerSqm": 45.0,
      "billingCycle": "MONTHLY"
    }
         │
         ↓
    [Backend] onboarding.routes.js
         │
         ├─→ INSERT INTO onboarding_members
         │   (case_id, customer_id, area_size, fee_rate, ...)
         │
         ├─→ UPDATE onboarding_cases
         │   SET member_registration_status = 'registered'
         │
         └─→ [Kafka Producer]
             publishMemberRegistered()
                   │
                   ↓
    📤 Publish: postsales.member.registered
         │
         ↓
    ┌──────────────────────────────────────┐
    │  Payment Team (Team 6)               │
    │  Subscribe: postsales.member.registered │
    │                                      │
    │  Action:                             │
    │  1. Create Account Receivable        │
    │  2. Setup Monthly Billing            │
    │  3. Calculate Fee = areaSize × rate  │
    │     Example: 35.5 × 45 = 1,597.50 THB│
    └──────────────────────────────────────┘
         │
         ↓
    ┌──────────────────────────────────────┐
    │  Member Registered ✅                │
    │  member_registration_status:         │
    │  registered                          │
    └──────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Step 4: Activate Profile (Complete Onboarding)
═══════════════════════════════════════════════════════════════════

    [Frontend] Complete Onboarding Dialog
         │
         ↓
    POST /api/onboarding/cases/:id/activate
    {
      "activatedBy": "Admin User",
      "notes": "All steps completed"
    }
         │
         ↓
    [Backend] onboarding.routes.js
         │
         ├─→ UPDATE onboarding_cases
         │   SET status = 'completed',
         │       profile_activation_status = 'activated',
         │       activated_at = NOW()
         │
         └─→ [Kafka Producer]
             publishOnboardingCompleted()
                   │
                   ↓
    📤 Publish: postsales.profile.activated
         │
         ↓
    ┌──────────────────────────────────────┐
    │  🎉 Onboarding Complete!             │
    │  status: completed                   │
    │  ✅ Documents Uploaded               │
    │  ✅ Member Registered                │
    │  ✅ Profile Activated                │
    └──────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Optional: ดึงข้อมูลจาก External Services
═══════════════════════════════════════════════════════════════════

    GET /api/onboarding/cases/:id (Frontend Display)
         │
         ├─→ [External API Call] Legal Contract Service
         │   GET /contracts/unit/:unitId
         │   → แสดงสัญญาซื้อขาย
         │
         ├─→ [External API Call] Legal Warranty Service
         │   GET /warranty/:unitId
         │   → แสดงข้อมูล Warranty coverage
         │
         └─→ [External API Call] Payment Service
             GET /invoices/customer/:customerId
             → แสดงประวัติการชำระ
```

---

## 3. Defect Management Service

### 🎯 วัตถุประสงค์
จัดการข้อบกพร่อง (Defects/Snagging) หลังส่งมอบ ตรวจสอบ Warranty และประสานงานการแก้ไข

### 📥 ข้อมูลที่ใช้จากทีมอื่น (Subscribe Events)

| Topic | Producer Team | ข้อมูลที่ได้รับ | การใช้งาน |
|-------|---------------|----------------|-----------|
| `warranty.coverage.registered` | Legal (Team 5) | Warranty coverage data | บันทึกข้อมูล warranty ในระบบ |
| `warranty.coverage.verified` | Legal (Team 5) | Warranty claim verification | อัพเดทสถานะ warranty ของ defect |
| `payment.invoice.commonfees.completed` | Payment (Team 6) | Common fees payment | ตรวจสอบสถานะการชำระก่อนรับเคส |

### 🔌 REST API Endpoints

#### GET APIs
- **GET `/api/defects/cases`** - ดึงรายการ defect cases
  - Query params: `status`, `priority`, `category`, `unitId`
  - Response: Array of defect cases

- **GET `/api/defects/cases/:id`** - ดึงข้อมูล defect case เดียว
  - Response: Case detail พร้อม timeline

- **GET `/api/defects/cases/:id/warranty`** - ตรวจสอบ Warranty จาก Legal Team
  - External API: Legal Warranty Service
  - Response: Warranty coverage status

#### POST APIs
- **POST `/api/defects/cases`** - แจ้งข้อบกพร่องใหม่
  - Body: `{ unitId, title, description, category, priority, location, images }`
  - Action: สร้าง case + **Publish: postsales.defect.reported**

- **POST `/api/defects/cases/:id/assign`** - มอบหมายงาน
  - Body: `{ assignedTo, assignedBy, notes }`
  - Action: เปลี่ยนสถานะเป็น "assigned"

- **POST `/api/defects/cases/:id/schedule-repair`** - นัดหมายแก้ไข
  - Body: `{ scheduledDate, technicianName, estimatedDuration }`
  - Action: บันทึกวันนัด

- **POST `/api/defects/cases/:id/resolve`** - แก้ไขเสร็จสิ้น
  - Body: `{ resolvedBy, resolutionNotes, resolvedImages }`
  - Action: เปลี่ยนสถานะเป็น "resolved"

- **POST `/api/defects/cases/:id/verify`** - Verify การแก้ไข
  - Body: `{ verifiedBy, verificationNotes, isApproved }`
  - Action: เปลี่ยนสถานะเป็น "verified" หรือ "reopened"

- **POST `/api/defects/cases/:id/close`** - ปิด case
  - Body: `{ closedBy, closureNotes }`
  - Action: เปลี่ยนสถานะเป็น "closed"

### 📤 Events ที่ Publish

#### 1. `postsales.defect.reported` ⭐ **สำคัญ**
**ส่งให้:** Legal Team (ตรวจสอบ Warranty), Marketing Team (Quality tracking)  
**เมื่อไร:** เมื่อแจ้งข้อบกพร่องใหม่  
**Payload:**
```json
{
  "eventId": "uuid",
  "eventType": "postsales.defect.reported",
  "timestamp": "2026-05-02T14:00:00Z",
  "data": {
    "defectId": 1,
    "defectNumber": "DEF-2026-001",
    "unitId": "UNIT-001",
    "title": "รอยแตกฝ้าเพดาน",
    "category": "cosmetic",
    "priority": "medium",
    "description": "พบรอยแตกบริเวณฝ้าเพดานห้องนอน",
    "location": "ห้องนอนใหญ่",
    "images": ["url1", "url2"]
  },
  "metadata": {
    "source": "postsales-backend-bridge",
    "version": "1.0"
  }
}
```

### 🔄 Defect Management Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                DEFECT MANAGEMENT SERVICE WORKFLOW                │
└─────────────────────────────────────────────────────────────────┘

Step 1: รับแจ้งข้อบกพร่อง (Defect Reporting)
═══════════════════════════════════════════════════════════════════

    [Frontend] Owner/Staff แจ้งปัญหา
         │
         ↓
    POST /api/defects/cases
    {
      "unitId": "UNIT-001",
      "title": "รอยแตกฝ้าเพดาน",
      "description": "พบรอยแตก 30 cm",
      "category": "cosmetic",
      "priority": "medium",
      "location": "ห้องนอนใหญ่",
      "images": ["url1", "url2"]
    }
         │
         ↓
    [Backend] defects.routes.js
         │
         ├─→ INSERT INTO defect_cases
         │   (unit_id, title, status='reported', ...)
         │
         ├─→ INSERT INTO defect_timeline
         │   (defect_id, action='created', ...)
         │
         ├─→ [Optional] Check Warranty
         │   GET Legal Warranty Service API
         │   /warranty/:unitId
         │
         └─→ [Kafka Producer]
             publishDefectReported()
                   │
                   ↓
    📤 Publish: postsales.defect.reported
         │
         ↓
    ┌──────────────────────────────────────┐
    │  Legal Team (Team 5) Subscribe       │
    │  Topic: postsales.defect.reported    │
    │                                      │
    │  Action:                             │
    │  1. Check Warranty Coverage          │
    │  2. Verify Defect Category           │
    │  3. Determine Coverage Status        │
    └──────────────────────────────────────┘
         │
         ↓
    📤 Publish: warranty.coverage.verified
         │
         ↓
    ┌──────────────────────────────────────┐
    │  Defect Reported ✅                  │
    │  status: reported                    │
    │  defect_number: DEF-2026-001         │
    │  warranty_status: pending_verification│
    └──────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Step 2: รับผล Warranty Verification
═══════════════════════════════════════════════════════════════════

    [Kafka Consumer] Post-Sales Backend
         │
         ↓
    📥 Subscribe: warranty.coverage.verified
    {
      "claimId": "uuid",
      "defectId": 1,
      "coverageStatus": "covered",  // or "not_covered"
      "coverageReason": "Within 1-year warranty",
      "verifiedAt": "2026-05-02T14:30:00Z"
    }
         │
         ↓
    [eventHandlers.js]
    handleWarrantyVerifiedEvent()
         │
         ├─→ UPDATE defect_cases
         │   SET warranty_status = 'covered'
         │
         └─→ INSERT INTO defect_warranty_coverage
             (defect_id, status, verified_at, ...)
         │
         ↓
    ┌──────────────────────────────────────┐
    │  Warranty Verified ✅                │
    │  warranty_status: covered            │
    │  (หรือ not_covered ถ้าหมด warranty) │
    └──────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Step 3: มอบหมายงาน (Assignment)
═══════════════════════════════════════════════════════════════════

    [Frontend] Staff มอบหมายงาน
         │
         ↓
    POST /api/defects/cases/:id/assign
    {
      "assignedTo": "Technician A",
      "assignedBy": "Admin User",
      "notes": "Urgent - within warranty"
    }
         │
         ↓
    [Backend] defects.routes.js
         │
         ├─→ UPDATE defect_cases
         │   SET status = 'assigned',
         │       assigned_to = 'Technician A',
         │       assigned_at = NOW()
         │
         └─→ INSERT INTO defect_timeline
             (action='assigned', performed_by, ...)
         │
         ↓
    ┌──────────────────────────────────────┐
    │  Defect Assigned ✅                  │
    │  status: assigned                    │
    │  assigned_to: Technician A           │
    └──────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Step 4: นัดหมายแก้ไข (Schedule Repair)
═══════════════════════════════════════════════════════════════════

    POST /api/defects/cases/:id/schedule-repair
    {
      "scheduledDate": "2026-05-05T09:00:00Z",
      "technicianName": "Technician A",
      "estimatedDuration": "2 hours"
    }
         │
         ↓
    [Backend] UPDATE defect_cases
    SET scheduled_repair_date = ...,
        status = 'in_progress'
         │
         ↓
    ┌──────────────────────────────────────┐
    │  Repair Scheduled ✅                 │
    │  status: in_progress                 │
    │  scheduled_date: 2026-05-05 09:00    │
    └──────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Step 5: แก้ไขเสร็จสิ้น (Resolution)
═══════════════════════════════════════════════════════════════════

    POST /api/defects/cases/:id/resolve
    {
      "resolvedBy": "Technician A",
      "resolutionNotes": "Repaired ceiling crack",
      "resolvedImages": ["after1.jpg", "after2.jpg"]
    }
         │
         ↓
    [Backend] UPDATE defect_cases
    SET status = 'resolved',
        resolved_at = NOW()
         │
         ↓
    ┌──────────────────────────────────────┐
    │  Defect Resolved ✅                  │
    │  status: resolved                    │
    │  waiting for verification            │
    └──────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Step 6: ตรวจรับงาน (Verification)
═══════════════════════════════════════════════════════════════════

    POST /api/defects/cases/:id/verify
    {
      "verifiedBy": "Owner or Inspector",
      "verificationNotes": "Work quality approved",
      "isApproved": true
    }
         │
         ↓
    [Backend] defects.routes.js
         │
         ├─→ IF isApproved = true:
         │   UPDATE defect_cases
         │   SET status = 'verified'
         │
         └─→ ELSE:
             UPDATE defect_cases
             SET status = 'reopened'
         │
         ↓
    ┌──────────────────────────────────────┐
    │  IF Approved:                        │
    │  status: verified ✅                 │
    │                                      │
    │  IF Not Approved:                    │
    │  status: reopened 🔄                 │
    │  (กลับไป Step 4 ซ่อมใหม่)           │
    └──────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Step 7: ปิด Case (Closure)
═══════════════════════════════════════════════════════════════════

    POST /api/defects/cases/:id/close
    {
      "closedBy": "Admin User",
      "closureNotes": "Issue resolved satisfactorily"
    }
         │
         ↓
    [Backend] UPDATE defect_cases
    SET status = 'closed',
        closed_at = NOW()
         │
         ↓
    [Optional] 📤 Publish: defect.caseclosed.completed
         │
         ↓
    ┌──────────────────────────────────────┐
    │  🎉 Case Closed!                     │
    │  status: closed                      │
    │  closed_at: 2026-05-10               │
    └──────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

Status Flow Summary:
═══════════════════════════════════════════════════════════════════

    reported → assigned → in_progress → resolved → verified → closed
                                            ↓
                                        reopened (if not approved)
                                            ↓
                                     (back to assigned)
```

---

## 4. Complete Workflow Diagram

### 🔄 End-to-End Process Flow

```
┌═══════════════════════════════════════════════════════════════════════════════┐
│                    POST-SALES COMPLETE WORKFLOW                               │
│                    (From Purchase to Defect Management)                       │
└═══════════════════════════════════════════════════════════════════════════════┘

┌─────────────┐
│  BEFORE     │  ← ซื้อบ้านเสร็จ, KYC Pass, ชำระงวดที่ 2
│  POST-SALES │
└─────────────┘
      │
      ↓
┌───────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: HANDOVER SERVICE (รอเงื่อนไข + ส่งมอบ)                              │
└───────────────────────────────────────────────────────────────────────────────┘
      │
      ├─→ 📥 [Kafka Consumer] รอ Event จาก 3 ทีม:
      │   ├─ managing.kyc.completed (Team 4)
      │   ├─ purchase.contract.drafted (Team 5)
      │   └─ payment.secondpayment.completed (Team 6)
      │
      ├─→ ✅ เมื่อครบ 3 เงื่อนไข:
      │   overall_status = 'ready_for_handover'
      │
      ├─→ 🏢 Staff ส่งมอบห้อง:
      │   POST /api/handover/cases/:id/complete
      │
      └─→ 📤 [Kafka Producer] Publish:
          postsales.handover.completed → Sales Team
      │
      ↓
┌───────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: ONBOARDING SERVICE (ลงทะเบียนเจ้าของ)                               │
└───────────────────────────────────────────────────────────────────────────────┘
      │
      ├─→ 📄 Step 1: สร้าง Onboarding Case
      │   POST /api/onboarding/cases
      │   📤 Publish: postsales.onboarding.started
      │
      ├─→ 📎 Step 2: Upload เอกสาร
      │   POST /api/onboarding/cases/:id/upload-documents
      │
      ├─→ 👥 Step 3: ลงทะเบียนสมาชิก ⭐ สำคัญ!
      │   POST /api/onboarding/cases/:id/register-member
      │   📤 Publish: postsales.member.registered → Payment Team
      │   │
      │   └─→ [Payment Team รับ Event]
      │       สร้าง Account Receivable
      │       ตั้งค่าคิดค่าส่วนกลาง = areaSize × feeRate
      │
      └─→ ✅ Step 4: Activate Profile
          POST /api/onboarding/cases/:id/activate
          📤 Publish: postsales.profile.activated
      │
      ↓
┌───────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: DEFECT MANAGEMENT (จัดการข้อบกพร่อง - หลังส่งมอบ)                   │
└───────────────────────────────────────────────────────────────────────────────┘
      │
      ├─→ 📢 Owner แจ้งปัญหา:
      │   POST /api/defects/cases
      │   📤 Publish: postsales.defect.reported → Legal Team
      │
      ├─→ 📥 [Legal Team Response]:
      │   📤 Publish: warranty.coverage.verified
      │   [Post-Sales Subscribe & Update warranty_status]
      │
      ├─→ 👷 มอบหมาย + นัดหมาย + ซ่อม:
      │   POST /assign → assigned
      │   POST /schedule-repair → in_progress
      │   POST /resolve → resolved
      │
      ├─→ ✓ ตรวจรับงาน:
      │   POST /verify → verified (or reopened)
      │
      └─→ 🏁 ปิด Case:
          POST /close → closed
          [Optional] 📤 Publish: defect.caseclosed.completed
      │
      ↓
┌───────────────────────────────────────────────────────────────────────────────┐
│ ONGOING: ระบบคิดค่าส่วนกลางทุกเดือน (Payment Team)                           │
└───────────────────────────────────────────────────────────────────────────────┘
      │
      └─→ 💰 Payment Team สร้าง Invoice อัตโนมัติ
          ตาม billingCycle (MONTHLY/QUARTERLY/YEARLY)
          📤 Publish: payment.invoice.commonfees.completed

══════════════════════════════════════════════════════════════════════════════

Key Events Published by Post-Sales:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. postsales.handover.completed     → Sales, Marketing
2. postsales.onboarding.started     → Internal
3. postsales.member.registered      → Payment ⭐ (สร้าง AR)
4. postsales.profile.activated      → Internal
5. postsales.defect.reported        → Legal, Marketing

Key Events Subscribed by Post-Sales:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. managing.kyc.completed                 ← Managing
2. purchase.contract.drafted              ← Legal
3. payment.secondpayment.completed        ← Payment
4. payment.invoice.commonfees.completed   ← Payment
5. warranty.coverage.registered           ← Legal
6. warranty.coverage.verified             ← Legal
```

---

## 5. Integration Summary

### 📊 ภาพรวม Events ทั้งหมด

#### 📥 Subscribe (รับจากทีมอื่น - 6 Topics)

| Service | Topic | Producer | ข้อมูลที่ได้ |
|---------|-------|----------|--------------|
| **Handover** | `managing.kyc.completed` | Managing Team | KYC status |
| **Handover** | `purchase.contract.drafted` | Legal Team | Contract status |
| **Handover** | `payment.secondpayment.completed` | Payment Team | Payment status |
| **Defect** | `warranty.coverage.registered` | Legal Team | Warranty coverage |
| **Defect** | `warranty.coverage.verified` | Legal Team | Warranty verification |
| **Defect** | `payment.invoice.commonfees.completed` | Payment Team | Payment status |

#### 📤 Publish (ส่งให้ทีมอื่น - 5 Topics)

| Service | Topic | Consumers | เมื่อไร | ความสำคัญ |
|---------|-------|-----------|---------|----------|
| **Handover** | `postsales.handover.completed` | Sales, Marketing | ส่งมอบห้องเสร็จ | 🟢 Normal |
| **Onboarding** | `postsales.onboarding.started` | Internal | เริ่ม onboarding | 🟡 Info |
| **Onboarding** | `postsales.member.registered` | **Payment Team** | ลงทะเบียนสมาชิก | 🔴 **Critical** |
| **Onboarding** | `postsales.profile.activated` | Internal | Activate โปรไฟล์ | 🟢 Normal |
| **Defect** | `postsales.defect.reported` | Legal, Marketing | แจ้งข้อบกพร่อง | 🟠 Important |

### 🔗 REST API Dependencies (External Services)

| External Service | URL Pattern | ใช้ใน Service | จำนวน Calls |
|------------------|-------------|---------------|-------------|
| **Legal Contract Service** | `https://contract-service-h5fs.onrender.com` | Handover, Onboarding | ~2-3 calls/case |
| **Legal Warranty Service** | `https://warranty-service-gtv0.onrender.com` | Onboarding, Defect | ~3-5 calls/case |
| **Legal Acquisition Service** | `https://acquisition-service.onrender.com` | Onboarding | ~1 call/case |
| **Payment Service** | `https://cstu-payment-team.onrender.com` | Handover, Onboarding | ~2-4 calls/case |
| **Inventory Service** | `https://inventory-service.onrender.com` | Handover | ~1 call/case |

### 📝 Database Schema Summary

| Service | Main Table | Row Count (Est.) | Related Tables |
|---------|-----------|------------------|----------------|
| **Handover** | `handover_cases` | 100-500/month | `handover_events` (audit log) |
| **Onboarding** | `onboarding_cases` | 100-500/month | `onboarding_documents`, `onboarding_members` |
| **Defect** | `defect_cases` | 50-200/month | `defect_timeline`, `defect_warranty_coverage` |

---

## 🔑 Key Takeaways

### สำหรับ Handover Service
- **ขั้นแรก:** รอ 3 เงื่อนไข (KYC + Contract + Payment) ผ่าน Kafka
- **API หลัก:** GET cases, GET external data, POST complete
- **ข้อมูลจากทีม:** Managing, Legal, Payment (3 teams)
- **Publish:** `postsales.handover.completed` → Sales Team
- **Database:** `handover_cases` (status tracking), `handover_events` (audit)

### สำหรับ Onboarding Service
- **ขั้นแรก:** สร้าง case หลัง handover เสร็จ (manual/auto)
- **API หลัก:** POST create, POST upload, POST register-member, POST activate
- **ข้อมูลจากทีม:** Legal (contracts, warranty), Payment (invoices)
- **Publish:** `postsales.member.registered` → Payment Team ⭐ (สำคัญที่สุด!)
- **Database:** `onboarding_cases`, `onboarding_documents`, `onboarding_members`
- **Critical Event:** `member.registered` ต้อง Publish เพื่อให้ Payment สร้าง AR

### สำหรับ Defect Service
- **ขั้นแรก:** รับแจ้งจากเจ้าของ (POST /cases)
- **API หลัก:** POST report, POST assign, POST schedule, POST resolve, POST verify, POST close
- **ข้อมูลจากทีม:** Legal (warranty verification), Payment (payment status)
- **Publish:** `postsales.defect.reported` → Legal Team (เช็ค warranty)
- **Database:** `defect_cases`, `defect_timeline`, `defect_warranty_coverage`
- **Status Flow:** reported → assigned → in_progress → resolved → verified → closed

---

## 📞 Next Steps for Integration

### สำหรับ Payment Team (Team 6) 🔴 **CRITICAL**
✅ **ต้อง Subscribe:** `postsales.member.registered`  
📋 **Payload จะได้รับ:**
```json
{
  "customerId": "CUST-001",
  "unitId": "UNIT-001",
  "areaSize": 35.5,
  "feeRatePerSqm": 45.0,
  "effectiveDate": "2026-05-01",
  "billingCycle": "MONTHLY",
  "propertyId": "UNIT-001"
}
```
🎯 **Action ที่ต้องทำ:**
1. สร้าง Account Receivable (AR) สำหรับ customer
2. คำนวณค่าส่วนกลาง: `monthlyFee = areaSize × feeRatePerSqm`
3. ตั้งค่า Auto-billing ตาม `billingCycle`
4. เริ่มส่ง Invoice ตั้งแต่ `effectiveDate`

### สำหรับ Legal Team (Team 5) 🟠 **IMPORTANT**
✅ **ต้อง Subscribe:** `postsales.defect.reported`  
✅ **ต้อง Publish หลังประมวลผล:** `warranty.coverage.verified`  
📋 **ต้องสร้าง Topics ใหม่:**
- `purchase.contract.drafted` (ยังไม่มีใน Kafka cluster)
- `warranty.coverage.registered` (ยังไม่มีใน Kafka cluster)
- `warranty.coverage.verified` (ยังไม่มีใน Kafka cluster)

### สำหรับ Managing Team (Team 4) 🟡 **CONFIRMATION NEEDED**
✅ **ยืนยันชื่อ Topic:** `managing.kyc.completed` ถูกต้องหรือไม่?
📋 **ไม่มีเอกสาร:** ยังไม่มี CSV/Documentation สำหรับ Managing team

---

## 📚 Related Documentation

- [TEAM_INTEGRATION.md](TEAM_INTEGRATION.md) - ข้อมูล Integration กับทุกทีม
- [ARCHITECTURE.md](ARCHITECTURE.md) - System Architecture และ Technical Details
- [POSTSALES_API_DOCUMENTATION.md](POSTSALES_API_DOCUMENTATION.md) - Complete API Reference
- [FLOW_VERIFICATION.md](FLOW_VERIFICATION.md) - Flow Verification Checklist

---

**เอกสารนี้สร้างโดย:** GitHub Copilot  
**อ้างอิงจาก:** 
- TEAM_INTEGRATION.md
- ARCHITECTURE.md  
- Source code: routes/, kafka/, services/
- Database schemas: db/*.sql

**สถานะ:** ✅ Verified with actual implementation (May 2, 2026)  
**Last Updated:** May 2, 2026  
**Version:** 1.0
