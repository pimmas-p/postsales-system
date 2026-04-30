# 🔗 Team Integration Reference

**Project:** Post-Sales Management System  
**Last Updated:** April 29, 2026  
**Source:** Dev Document from all 7 teams

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Team 1 - Inventory](#team-1---inventory)
3. [Team 2 - Marketing](#team-2---marketing)
4. [Team 3 - Sales](#team-3---sales)
5. [Team 4 - Managing (CEO)](#team-4---managing-ceo)
6. [Team 5 - Legal](#team-5---legal)
7. [Team 6 - Payment](#team-6---payment)
8. [Team 7 - Post-Sales](#team-7---post-sales)
9. [Integration Matrix](#integration-matrix)
10. [Topic Naming Convention](#topic-naming-convention)

---

## 1. Overview

เอกสารนี้รวบรวม **Event Integration** และ **API Integration** ของทั้ง 7 ทีมในระบบอสังหาริมทรัพย์ โดยข้อมูลมาจาก Cloud implementations ของแต่ละทีม

### System Architecture

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Inventory  │   │  Marketing  │   │    Sales    │   │   Payment   │
│   (Team 1)  │   │  (Team 2)   │   │  (Team 3)   │   │  (Team 6)   │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │                 │
       └─────────────────┴─────────────────┴─────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   KAFKA TOPICS       │
                    │  (Confluent Cloud)   │
                    └───────────┬───────────┘
                                │
       ┌────────────────────────┼────────────────────────┐
       │                        │                        │
┌──────▼──────┐         ┌──────▼──────┐         ┌──────▼──────┐
│    Legal    │         │ Post-Sales  │         │   CEO/Mgmt  │
│  (Team 5)   │         │  (Team 7)   │         │  (Team 4)   │
└─────────────┘         └─────────────┘         └─────────────┘
```

---

## 2. Team 1 - Inventory

**Purpose:** Property registration, status management, price settlement

### 2.1 Inbound Events (Subscribe)

| Event Topic | Producer | Description | Request Data |
|------------|----------|-------------|--------------|
| `payment.secondpayment.completed` | Payment | Triggers property booking process | - |
| `payment.propertybought.completed` | Payment | Triggers property purchased complete | - |
| `sale.quotation.*` | Sales | Updates property status to QUOTATION_IN_PROGRESS | - |
| `sale.reservation.*` | Sales | Updates property status to RESERVED | - |
| `sale.booking.*` | Sales | Updates property status to BOOKED | - |

### 2.2 Outbound Events (Publish)

| Event Topic | Consumers | Payload | Description |
|------------|-----------|---------|-------------|
| `property.registered` | Sales & Booking | `{ propertyId, status, registeredAt }` | Property successfully registered |
| `price.settled` | Marketing, CEO | `{ propertyId, propertyName, settledPrice, currency, settledAt }` | Property price finalized during acquisition |

### 2.3 REST APIs

**Base URL:** `https://inventory-service.onrender.com`

| Endpoint | Method | Consumer | Response | Description |
|----------|--------|----------|----------|-------------|
| `/api/v1/properties/{id}/status` | GET | Sales & Booking | `{ propertyId, status, updatedAt }` | Current status of a property |
| `/api/v1/properties` | GET | Sales & Booking | `{ properties: [{...}] }` | Full list of all properties |
| `/api/v1/properties?status={status}` | GET | Sales & Booking | `{ properties: [{...}] }` | Filtered list by status |
| `/api/v1/properties/{id}/price` | GET | Marketing, CEO | `{ propertyId, price, currency }` | Current settled price |
| `/api/v1/properties/{id}/history` | GET | **Post-Sales** | `{ propertyId, events: [{...}] }` | **Full status and ownership history for defect assessment** |
| `/api/v1/properties/{id}/inspection` | GET | CEO | `{ propertyId, inspectionStatus, inspectedAt, inspectedBy }` | Inspection report result |

---

## 3. Team 2 - Marketing

**Purpose:** Advertisement, lead management, customer surveys

### 3.1 Inbound Events (Subscribe)

| Event Topic | Producer | Description |
|------------|----------|-------------|
| `inventory.price.settled` | Inventory | **Triggers advertisement creation** |
| `sale.reservation.made` | Sales | Update listing (mark reserved/stop campaign) |
| `sale.completed` | Sales | **Triggers customer survey** |
| `sale.property.inspected` | Sales | Track funnel (optional analytics) |
| `postsale.case.closed` | Post-Sales | Analyze post-sale satisfaction |

### 3.2 Outbound Events (Publish)

| Event Topic | Consumers | Payload | Description |
|------------|-----------|---------|-------------|
| `marketing.advertisement.announced` | Sales | `{ propertyId, price, campaign }` | Property advertised with promotion |
| `marketing.lead.created` | Sales | `{ customerId, name, interest, contact }` | Customer submitted info |
| `marketing.survey.completed` | CEO, Sales | `{ score, feedback, summary }` | Customer survey analyzed |

### 3.3 REST APIs

**Base URL:** `https://marketing-service.onrender.com`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/marketing/advertisements/announcement` | GET | For Sales to view advertisements |
| `/api/marketing/customer/{customerId}` | POST/GET | Lead registration |
| `/api/marketing/customer/surveys` | GET | For CEO to view survey insights |

---

## 4. Team 3 - Sales

**Purpose:** Quotation, reservation, booking, deal closing

### 4.1 Inbound Events (Subscribe)

| Event Topic | Producer | Request Data | Description |
|------------|----------|--------------|-------------|
| `inventory.*` | Inventory | Area unit, room type, room number, ProjectName | For quotation creation |
| `marketing.*` | Marketing | PropertyID, location, price, promotion | For quotation creation |
| `kyc.completed` | KYC | Status | For booking confirmation |
| `legal.contract.drafted` | Legal | ContractID | For booking confirmation |
| `payment.secondpayment.completed` | Payment | Payment status | For booking confirmation |
| `marketing.survey.*` | Marketing | saleId, customerId, feedback, rating | Survey status update |

### 4.2 Outbound Events (Publish)

| Event Topic | Consumers | Payload | Description |
|------------|-----------|---------|-------------|
| `sale.quotationcreated.complete` | Inventory, Marketing | PropertyID, Location, CustomerID, Quotation details | Quotation created |
| `sale.reservationcreated.complete` | Inventory, Marketing, Payment | Reservation details + PaymentFirstStatus | Reservation created with expire date |
| `sale.booked.complete` | Inventory, Marketing, Payment, Legal | Booking details + KYC + Contract + Payment status | Booking confirmed |
| `sale.completed` | Marketing, Payment | BookingID, ProjectName, CustomerID, ContractID | Deal closed |

### 4.3 Key Data Flow

```
Quotation → Reservation → Booking → Close Deal

1. Quotation: รับข้อมูลจาก Inventory + Marketing
2. Reservation: Lock ห้อง + เรียกเก็บ first payment
3. Booking: ตรวจสอบ KYC + Contract + Second payment → Lock แน่นอน
4. Close Deal: ส่ง event ให้ Marketing + Payment
```

---

## 5. Team 4 - Managing (CEO)

**Purpose:** Property approval, customer approval, reporting, daily operations

### 5.1 Inbound Events (Subscribe)

| Event Topic | Producer | Description |
|------------|----------|-------------|
| `inventory.price.settled` | Inventory | Property price approval |
| `payment.propertybought.completed` | Payment | Property acquisition approval |
| `marketing.survey.completed` | Marketing | Customer satisfaction reports |
| `acquisition.approval.requested` | Legal | Property acquisition approval request |

### 5.2 Outbound Events (Publish)

| Event Topic | Consumers | Description |
|------------|-----------|-------------|
| `payment.ceo.approved` | Payment | Payment approval granted |
| `acquisition.approval.granted` | Legal | Property acquisition approved |

### 5.3 REST APIs

**Access to all teams' APIs for:**
- Property reports (Inventory)
- Customer approval (Marketing)
- Sales metrics (Sales)
- Financial reports (Payment)
- Daily reports (Post-Sales)

### 5.4 Naming Convention

จากไฟล์ overview:
- **Topic Naming**: `[domain].[datatype].[action]-topic`
- **Key Variables**: Project ID, Project Code, Unit ID, Customer ID, เลขที่เอกสารสัญญา

---

## 6. Team 5 - Legal

**Purpose:** Contract management, property acquisition, warranty verification

### 6.1 Services Overview

Legal team มี **3 main services**:

1. **Contract Service** - สัญญาซื้อขาย
2. **Acquisition Service** - การเข้าซื้อ property
3. **Warranty Service** - การตรวจสอบประกัน

### 6.2 Inbound Events (Subscribe)

| Event Topic | Producer | Action | Description |
|------------|----------|--------|-------------|
| `booking.order.confirmed` | Sales | Contract drafting | เริ่มร่างสัญญาซื้อขาย |
| `property.survey.received` | Inventory | Acquisition process | รับข้อมูล survey property |
| `acquisition.approval.granted` | CEO | Draft willing contract | อนุมัติเข้าซื้อ → ร่างสัญญา |
| `warranty.defect.reported` | **Post-Sales** | Coverage verification | ตรวจสอบความคุ้มครอง warranty |

### 6.3 Outbound Events (Publish)

| Event Topic | Consumers | Payload | Description |
|------------|-----------|---------|-------------|
| `contract.draft.created` | Internal (Property Verification) | `{ contractId, bookingId, unitId, customerId, status: "DRAFT", fileUrl, templateId, createdAt, draftedAt }` | สัญญาร่างถูกสร้าง |
| `acquisition.approval.requested` | CEO | `{ acquisitionId, surveyId, propertyId, address, estimatedValue, sellerName, requestedAt }` | ขออนุมัติเข้าซื้อ property |
| `acquisition.contract.drafted` | Inventory | `{ acquisitionId, willingContractId, propertyId, fileUrl, agreedPrice, templateId, draftedAt }` | Willing contract เสร็จ |
| `warranty.coverage.registered` | **Post-Sales** | `{ contractId, unitId, customerId, startsAt, endsAt, coveredCategories: [...] }` | ลงทะเบียน warranty coverage |
| `warranty.coverage.verified` | **Post-Sales** | `{ claimId, warrantyId, defectId, contractId, unitId, customerId, coverageStatus, coverageReason, verifiedAt, expiresAt }` | ผลตรวจ warranty |

### 6.4 REST APIs

**Contract Service:** `https://contract-service-h5fs.onrender.com`

| Endpoint | Method | Consumer | Description |
|----------|--------|----------|-------------|
| `/api/contracts/{id}` | GET | Frontend, Sales | อ่านสัญญาตาม ID |
| `/api/contracts?customerId={uuid}` | GET | Frontend | List สัญญาของลูกค้า |
| `/api/contracts` | GET | Admin | Audit ทั้งระบบ |
| `/health` | GET | DevOps (UptimeRobot) | Health check |

**Acquisition Service:** `https://acquisition-service.onrender.com`

| Endpoint | Method | Consumer | Description |
|----------|--------|----------|-------------|
| `/api/acquisitions/{id}` | GET | Inventory, CEO | อ่าน acquisition ตาม ID |
| `/api/acquisitions?status=APPROVAL_REQUESTED` | GET | CEO | List ที่รออนุมัติ |
| `/api/acquisitions` | GET | Admin | Audit ทั้งระบบ |
| `/health` | GET | DevOps (UptimeRobot) | Health check |

**Warranty Service:** `https://warranty-service-gtv0.onrender.com`

| Endpoint | Method | Consumer | Description |
|----------|--------|----------|-------------|
| `/api/warranties/{contractId}` | GET | **Post-Sales**, Frontend | อ่าน warranty พร้อม claims |
| `/api/warranties/{warrantyId}/claims` | GET | **Post-Sales** | List ทุก claim ที่แจ้ง |
| `/health` | GET | DevOps (UptimeRobot) | Health check |

### 6.5 Integration with Post-Sales

**Critical for Defect Management:**

```
Post-Sales Defect Flow:
1. Customer reports defect → Post-Sales
2. Post-Sales → Publish: warranty.defect.reported
3. Legal → Subscribe → Verify warranty coverage
4. Legal → Publish: warranty.coverage.verified
5. Post-Sales → Subscribe → Schedule repair or reject
```

---

## 7. Team 6 - Payment

**Purpose:** Payment processing, financial settlement, invoicing, account receivable

### 7.1 Inbound Events (Subscribe)

| Event Topic | Producer | Request Data | Description |
|------------|----------|--------------|-------------|
| `sale.availableunit.completed` | Sales | property status, booking cost, payment amount | Property status has been inspected |
| `legal.contract.drafted` | Legal | contract status, payment amount | Contract drafted |
| `payment.ceo.approved` | CEO | payment approved | Payment approval from CEO |
| `sale.transfer.completed` | Sales | sale status | Sale has been completed |
| `postsales.member.registered` | **Post-Sales** | customerId, unitId, areaSize, effectiveDate, billingCycle | **Owner Account Activated (for account receivable)** |

### 7.2 Outbound Events (Publish)

| Event Topic | Consumers | Payload | Description |
|------------|-----------|---------|-------------|
| `payment.firstpayment.completed` | Sales, Legal (optional) | `{ success: true, data: { paymentId, propertyId, customerId, type: "First", amount, status: "CONFIRMED", approvedBy, approvedAt, createdAt, updatedAt }, timestamp }` | First payment confirmed |
| `payment.secondpayment.completed` | Sales, **Post-Sales**, Marketing (optional), Inventory | `{ success: true, data: { paymentId, propertyId, customerId, type: "Second", amount, status: "CONFIRMED", approvedBy, approvedAt, createdAt, updatedAt }, timestamp }` | **Second payment confirmed (triggers Post-Sales handover)** |
| `payment.propertybought.completed` | Inventory, CEO | - | Property has been bought |
| `payment.settlement.completed` | Sales, Marketing | - | Settlement completed |
| `payment.invoice.commonfees.completed` | **Post-Sales** | `{ invoiceId, refId, customerId, unitId, propertyId, amount, type: "COMMON_FEE", status: "PAID", issuedAt, paidAt }` | **Common area fees paid** |

### 7.3 REST APIs

**Base URL:** `https://cstu-payment-team.onrender.com`

**Settlement API:** 
- **Endpoint:** `/settlement/api/settlements/summary`
- **Method:** GET
- **Consumer:** CEO, Post-Sales
- **Description:** Calculate daily, monthly, yearly, all-time sales

**Invoice/Payment API:** 
- **Endpoint:** `/api/payments/{customerId}/{unitId}` (assumed)
- **Method:** GET  
- **Consumer:** Post-Sales
- **Description:** Get payment details for customer and unit

**Health Check:** `/api/health`

### 7.4 Payload Structure

**Note:** Payment team uses wrapper format:
```json
{
  "success": true,
  "data": { /* actual data */ },
  "timestamp": "ISO8601"
}
```

---

## 8. Team 7 - Post-Sales

**Purpose:** Handover readiness, owner onboarding, defect management

### 8.1 Inbound Events (Subscribe)

| Event Topic | Producer | Description | Topic Name in Excel |
|------------|----------|-------------|---------------------|
| `kyc.completed` | KYC | KYC verification completed | "KYCHasBeenMade" |
| `legal.contract.drafted` | Legal | Purchase contract drafted | "PurchaseContactHasBeenDraft" |
| `payment.secondpayment.completed` | Payment | Second payment made | "second payment has been made" |
| `payment.invoice.commonfees.completed` | Payment | Common fees payment completed | "common fees payment completed" |
| `warranty.coverage.registered` | Legal | Warranty coverage registered | - |
| `warranty.coverage.verified` | Legal | Warranty coverage verified | - |

### 8.2 Outbound Events (Publish)

| Event Topic | Consumers | Description | Topic Name in Excel |
|------------|-----------|-------------|---------------------|
| `postsales.handover.completed` | Sales | Handover completed | "unit.handedover.completed" |
| `postsales.onboarding.started` | Internal | Owner onboarding started | "Owner Onboarding Started" |
| `postsales.member.registered` | Payment | Owner account activated | "Owner Account Activated" |
| `postsales.profile.activated` | Internal | Resident profile activated | "Resident Profile Activated" |
| `defect.caseclosed.completed` | Marketing, Legal | Defect case closed | "DefectCaseClosed" |
| `warranty.defect.reported` | Legal | Defect reported for warranty check | "WarrantyCoverageCheckRequested" |

### 8.3 REST API Requests (Outbound)

Post-Sales makes requests to:

| Target Team | Request Type | Description |
|-------------|--------------|-------------|
| Legal | `WarrantyCoverageCheckRequested` | Request warranty coverage check for defect |
| Inventory | `UnitDetailRequested` | Request unit details |
| Payment | `MaintancePaymentFeeRequest` (Optional) | Request maintenance payment fee |

### 8.4 Data Required

**For Handover Readiness:**
- KYC status (from KYC team)
- Contract status (from Legal team)
- Payment status (from Payment team)

**For Member Registration:**
- customerId, unitId, areaSize, effectiveDate, billingCycle
- Sent to Payment team for account receivable setup

**For Defect Management:**
- Warranty coverage (from Legal team)
- Unit history (from Inventory team)
- Invoice status (from Payment team)

---

## 9. Integration Matrix

### 9.1 Complete Event Flow Map

```
POST-SALES INTEGRATION MAP
═══════════════════════════════════════════════════════════════

INCOMING (Subscribe):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────┐
│ KYC Team    │ → kyc.completed
└─────────────┘   └─→ Post-Sales: Update kyc_status

┌─────────────┐
│ Legal Team  │ → legal.contract.drafted
└─────────────┘   └─→ Post-Sales: Update contract_status

┌─────────────┐
│ Payment Team│ → payment.secondpayment.completed
└─────────────┘   └─→ Post-Sales: Update payment_status → Ready for handover

┌─────────────┐
│ Payment Team│ → payment.invoice.commonfees.completed
└─────────────┘   └─→ Post-Sales: Track common fees payment

┌─────────────┐
│ Legal Team  │ → warranty.coverage.registered
└─────────────┘   └─→ Post-Sales: Register warranty for unit

┌─────────────┐
│ Legal Team  │ → warranty.coverage.verified
└─────────────┘   └─→ Post-Sales: Defect coverage decision


OUTGOING (Publish):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────┐
│ Post-Sales  │ → postsales.handover.completed
└─────────────┘   └─→ Sales: Handover done

┌─────────────┐
│ Post-Sales  │ → postsales.member.registered
└─────────────┘   └─→ Payment: Setup billing account

┌─────────────┐
│ Post-Sales  │ → defect.caseclosed.completed
└─────────────┘   └─→ Marketing + Legal: Case closed

┌─────────────┐
│ Post-Sales  │ → warranty.defect.reported
└─────────────┘   └─→ Legal: Check warranty coverage
```

### 9.2 All Teams Event Matrix

| Event Topic | Producer | Consumers | Purpose |
|------------|----------|-----------|---------|
| **property.registered** | Inventory | Sales & Booking | Property available |
| **price.settled** | Inventory | Marketing, CEO | Start promotion |
| **marketing.advertisement.announced** | Marketing | Sales | Property advertised |
| **marketing.lead.created** | Marketing | Sales | New customer lead |
| **marketing.survey.completed** | Marketing | CEO, Sales | Customer feedback |
| **sale.quotationcreated.complete** | Sales | Inventory, Marketing | Quotation created |
| **sale.reservationcreated.complete** | Sales | Inventory, Marketing, Payment | Reservation made |
| **sale.booked.complete** | Sales | Inventory, Marketing, Payment, Legal | Booking confirmed |
| **sale.completed** | Sales | Marketing, Payment | Deal closed |
| **contract.draft.created** | Legal | Internal | Contract drafted |
| **acquisition.approval.requested** | Legal | CEO | Request property acquisition approval |
| **acquisition.contract.drafted** | Legal | Inventory | Willing contract ready |
| **warranty.coverage.registered** | Legal | **Post-Sales** | Warranty registered |
| **warranty.coverage.verified** | Legal | **Post-Sales** | Warranty verified |
| **payment.firstpayment.completed** | Payment | Sales, Legal | First payment done |
| **payment.secondpayment.completed** | Payment | Sales, **Post-Sales**, Marketing, Inventory | **Second payment done** |
| **payment.propertybought.completed** | Payment | Inventory, CEO | Property bought |
| **payment.settlement.completed** | Payment | Sales, Marketing | Settlement done |
| **payment.invoice.commonfees.completed** | Payment | **Post-Sales** | **Common fees paid** |
| **postsales.handover.completed** | **Post-Sales** | Sales | Handover done |
| **postsales.member.registered** | **Post-Sales** | Payment | **Member registered** |
| **defect.caseclosed.completed** | **Post-Sales** | Marketing, Legal | Defect case closed |
| **warranty.defect.reported** | **Post-Sales** | Legal | Defect reported |

---

## 10. Topic Naming Convention

### 10.1 Observed Patterns

จากการวิเคราะห์ Excel พบว่ามี **2 naming styles**:

**Style 1: Lowercase with dots (ARCHITECTURE.md)**
```
inventory.price.settled
sale.booked.complete
payment.secondpayment.completed
postsales.handover.completed
```

**Style 2: CamelCase (Excel - some teams)**
```
KYCHasBeenMade
PurchaseContactHasBeenDraft
unit.handedover.completed
```

### 10.2 Standard Convention (from Overview sheet)

**Format:** `[domain].[datatype].[action]-topic`

**Examples:**
- `payment.secondpayment.completed`
- `postsales.handover.completed`
- `legal.contract.drafted`

### 10.3 Recommended Standard

**USE:**
```
[team].[entity].[action]

Examples:
- inventory.property.registered
- payment.invoice.completed
- legal.warranty.verified
- postsales.member.registered
```

**Key Variables:**
- Project ID
- Project Code
- Unit ID
- Customer ID
- Contract Document Number

---

## 11. Critical Integration Points

### 11.1 Post-Sales Dependencies

**Pre-Handover (Must Complete):**
1. ✅ KYC verification (`kyc.completed`)
2. ✅ Contract drafted (`legal.contract.drafted`)
3. ✅ Second payment (`payment.secondpayment.completed`)

**Post-Handover:**
1. ✅ Member registration → Payment (`postsales.member.registered`)
2. ✅ Warranty setup → Legal (`warranty.coverage.registered`)
3. ⚠️ Common fees tracking (`payment.invoice.commonfees.completed`)

### 11.2 Defect Management Flow

```
Customer Reports Defect
         ↓
    Post-Sales (receive)
         ↓
    warranty.defect.reported → Legal
         ↓
    Legal checks coverage
         ↓
    warranty.coverage.verified → Post-Sales
         ↓
    ├─ COVERED: Schedule repair
    └─ REJECTED: Notify customer
         ↓
    defect.caseclosed.completed → Marketing, Legal
```

### 11.3 Payment Integration

**Post-Sales → Payment:**
- `postsales.member.registered` (Owner account activation)
- Request data: customerId, unitId, areaSize, effectiveDate, billingCycle

**Payment → Post-Sales:**
- `payment.invoice.commonfees.completed` (Common fees tracking)
- Payload: invoiceId, customerId, unitId, amount, status, paidAt

---

## 12. REST API Integration Summary

### 12.1 APIs Post-Sales Consumes

| Team | Endpoint | Purpose |
|------|----------|---------|
| **Inventory** | `/api/v1/properties/{id}/history` | Get property history for defect assessment |
| **Legal** | `/api/contracts/{id}` | Get contract details |
| **Legal** | `/api/warranties/{contractId}` | Get warranty coverage |
| **Legal** | `/api/warranties/{warrantyId}/claims` | Get warranty claims list |

### 12.2 Request Types (Event-Driven)

Post-Sales sends these requests via events:
- `WarrantyCoverageCheckRequested` → Legal
- `UnitDetailRequested` → Inventory
- `MaintancePaymentFeeRequest` → Payment (Optional)

---

## 13. Implementation Notes

### 13.1 Topic Naming Inconsistency

⚠️ **CRITICAL:** Topic names ไม่ตรงกันระหว่าง ARCHITECTURE.md และ Excel

**Action Required:**
1. ประชุมทีมทั้ง 7 ทีม
2. ตกลง standard naming convention
3. อัพเดท implementation ทุกทีมให้ตรงกัน
4. Update ARCHITECTURE.md

### 13.2 Payload Format Standards

⚠️ **IMPORTANT:** Payment team ใช้ wrapper format:
```json
{
  "success": true,
  "data": { /* actual payload */ },
  "timestamp": "2026-04-29T..."
}
```

ทีมอื่นอาจใช้ direct payload:
```json
{
  "propertyId": "...",
  "status": "..."
}
```

**Action Required:**
- กำหนด standard payload format
- หรือ document wrapper ของแต่ละทีม
- Update consumer code ให้ parse ถูกต้อง

### 13.3 Error Handling Strategy

**Not Documented in Excel:**
- Retry logic for failed events
- Dead letter queue (DLQ) handling
- Timeout configurations
- Circuit breaker patterns

**Recommendation:**
- Define retry policy (3 retries with exponential backoff)
- Setup DLQ for failed messages
- Implement health checks for all services
- Add monitoring and alerting

---

## 14. Next Steps

### 14.1 Immediate Actions

- [ ] ประชุมทีมทั้ง 7 ทีมเพื่อ sync topic names
- [ ] กำหนด payload format standard
- [ ] Document error handling strategy
- [ ] Setup monitoring for all integrations
- [ ] Create integration tests

### 14.2 Documentation Updates

- [ ] Update ARCHITECTURE.md with confirmed topic names
- [ ] Add payload schemas for all events
- [ ] Document retry and error handling
- [ ] Create sequence diagrams for major flows
- [ ] Add troubleshooting guide

### 14.3 Testing Requirements

- [ ] Unit tests for each event handler
- [ ] Integration tests for team-to-team flows
- [ ] End-to-end tests for complete scenarios
- [ ] Load testing for high-volume events
- [ ] Chaos testing for failure scenarios

---

## 15. Contact & Support

### 15.1 Team Contacts

| Team | Service URL | Documentation |
|------|------------|---------------|
| Inventory | https://inventory-service.onrender.com | - |
| Marketing | https://marketing-service.onrender.com | - |
| Sales | - | - |
| Managing | - | - |
| Legal (Contract) | https://contract-service-h5fs.onrender.com | - |
| Legal (Acquisition) | https://acquisition-service.onrender.com | - |
| Legal (Warranty) | https://warranty-service-gtv0.onrender.com | - |
| Payment | - | - |
| Post-Sales | https://your-postsales.onrender.com | See ARCHITECTURE.md |

### 15.2 Kafka Infrastructure

- **Platform:** Confluent Cloud
- **Region:** us-east1 (GCP)
- **Cluster:** pkc-619z3.us-east1.gcp.confluent.cloud:9092

---

**📝 Document Version:** 1.0.0  
**Last Updated:** April 29, 2026  
**Maintained By:** Integration Team  
**Source:** Dev Document (1).xlsx
