# จำลองข้อมูลจากทีมอื่น (External Teams Simulation)

## 📌 ภาพรวม

Script นี้จำลองการส่งข้อมูลจาก**ทีมอื่น**เข้ามายัง Service 1 (Post-Sales) ผ่าน Kafka เพื่อทดสอบ workflow ต่างๆ

### ทีมที่จำลอง:
- **Managing Team (Team 4)** - ส่ง KYC completion
- **Legal Team (Team 5)** - ส่ง Contract drafted & Warranty verification  
- **Payment Team (Team 6)** - ส่ง Payment completed & Common fees

## 🎯 Scenarios ที่รองรับ

### Scenario 1: Complete Handover Readiness Flow ✅
จำลองกระบวนการ Handover แบบสมบูรณ์ (3 ขั้นตอน):
1. **Managing Team** → KYC approved
2. **Legal Team** → Contract signed  
3. **Payment Team** → Second payment completed

```bash
npm run simulate:handover
# หรือ
npm run simulate:external 1
```

**ผลลัพธ์ที่คาดหวัง:**
- Handover case สถานะ = `ready` (พร้อมส่งมอบ)
- ข้อมูลแสดงใน Handover Dashboard

---

### Scenario 2: Onboarding - Common Fees Payment 💰
จำลอง**การชำระค่าส่วนกลาง** สำหรับ Onboarding (Step 4 Gatekeeper):

```bash
npm run simulate:onboarding
# หรือ
npm run simulate:external 2
```

**ผลลัพธ์ที่คาดหวัง:**
- Onboarding payment_status = `paid`
- สามารถ activate profile ได้ (ผ่าน gatekeeper)

---

### Scenario 3: Defect - Warranty Verification 🛡️
จำลอง**การตรวจสอบการรับประกัน** สำหรับข้อบกพร่อง:

```bash
npm run simulate:warranty
# หรือ
npm run simulate:external 3
```

**ผลลัพธ์ที่คาดหวัง:**
- Defect warranty_status = `COVERED`
- ข้อมูลการรับประกันปรากฏใน Defect details

---

### Scenario 4: Batch Test (Multiple Units) 📦
ทดสอบหลาย units พร้อมกัน (default: 3 units):

```bash
# ทดสอบ 3 units
npm run simulate:batch
# หรือ
npm run simulate:external batch 3

# ทดสอบ 10 units
npm run simulate:external batch 10
```

**ผลลัพธ์ที่คาดหวัง:**
- สร้าง handover cases หลายรายการ
- ทุก case สถานะ = `ready`

---

### Scenario 5: Partial Flow (Incomplete) ⚠️
ทดสอบกรณี**ข้อมูลไม่ครบ** (incomplete state):

```bash
# ส่งแค่ KYC (ไม่มี Contract + Payment)
npm run simulate:external partial kyc-only

# ส่ง KYC + Contract (ไม่มี Payment)
npm run simulate:external partial kyc-contract

# ส่ง Contract + Payment (ไม่มี KYC)
npm run simulate:external partial contract-payment
```

**ผลลัพธ์ที่คาดหวัง:**
- Handover case สถานะ = `pending` (ยังไม่พร้อม)
- แสดงข้อมูลเฉพาะที่ได้รับ

---

### Run All Scenarios 🚀
รันทุก scenarios ทีเดียว:

```bash
npm run simulate:all
```

## 📊 ตรวจสอบผลลัพธ์

### 1. ผ่าน Web UI
- **Handover Dashboard**: http://localhost:5173/handover
- **Onboarding Dashboard**: http://localhost:5173/onboarding  
- **Defect Dashboard**: http://localhost:5173/defects

### 2. ผ่าน API
```bash
# ตรวจสอบ Kafka consumer status
curl http://localhost:3001/api/kafka/status

# ดู Handover cases
curl http://localhost:3001/api/handover

# ดู Onboarding cases  
curl http://localhost:3001/api/onboarding

# ดู Defects
curl http://localhost:3001/api/defects
```

### 3. ดู Console Logs
เปิด terminal ที่รัน backend (npm start) จะเห็น logs:
```
📤 Received message from managing.kyc.complete
   📋 Processing KYC event...
   ✅ KYC event processed for unit: TEST-UNIT-xxx
   📊 Overall status: pending
```

## 🔧 Event Format Details

### 1. KYC Complete Event
```javascript
{
  "eventType": "managing.kyc.complete",
  "unitId": "UNIT-001",
  "customerId": "CUST-001",
  "kycStatus": "approved",
  "timestamp": "2026-05-02T10:00:00Z"
}
```
**Topic**: `managing.kyc.complete`

---

### 2. Contract Drafted Event
```javascript
{
  "eventType": "purchase.contract.drafted",
  "contractId": "uuid",
  "unitId": "UNIT-001",
  "customerId": "CUST-001",
  "status": "SIGNED",
  "fileUrl": "https://...",
  "draftedAt": "2026-05-02T10:00:00Z"
}
```
**Topic**: `purchase.contract.drafted`  
**Format**: camelCase (Legal team standard)

---

### 3. Second Payment Event
```javascript
{
  "success": true,
  "data": {
    "propertyId": "UNIT-001",  // Note: propertyId, not unitId
    "customerId": "CUST-001",
    "amount": 5000000,
    "status": "CONFIRMED",
    "updatedAt": "2026-05-02T10:00:00Z"
  },
  "timestamp": "2026-05-02T10:00:00Z"
}
```
**Topic**: `payment.secondpayment.completed`  
**Format**: Wrapped format with `success` + `data`

---

### 4. Common Fees Event
```javascript
{
  "success": true,
  "data": {
    "invoiceId": "INV-xxx",
    "customerId": "CUST-001",
    "unitId": "UNIT-001",
    "amount": 15000,
    "type": "COMMON_FEES",
    "status": "PAID",
    "paidAt": "2026-05-02T10:00:00Z"
  },
  "timestamp": "2026-05-02T10:00:00Z"
}
```
**Topic**: `payment.invoice.commonfees.completed`  
**Critical**: Onboarding Step 4 gatekeeper

---

### 5. Warranty Verification Event
```javascript
{
  "eventType": "warranty.coverage.verified",
  "warrantyId": "uuid",
  "defectId": "DEFECT-001",
  "unitId": "UNIT-001",
  "coverageStatus": "COVERED",
  "coverageReason": "Covered under structural warranty",
  "verifiedAt": "2026-05-02T10:00:00Z"
}
```
**Topic**: `warranty.coverage.verified-topic`

## 💡 Use Cases

### Use Case 1: ทดสอบ Handover Readiness Complete
```bash
# 1. รัน backend
npm start

# 2. รัน frontend
cd ../../Front-end && npm run dev

# 3. จำลองข้อมูล
npm run simulate:handover

# 4. เปิด browser ดู
# http://localhost:5173/handover
```

### Use Case 2: ทดสอบ Onboarding Gatekeeper
```bash
# สร้าง onboarding case ก่อน (manual หรือผ่าน API)
curl -X POST http://localhost:3001/api/onboarding \
  -H "Content-Type: application/json" \
  -d '{"unit_id":"UNIT-TEST","customer_id":"CUST-TEST"}'

# จำลองการชำระค่าส่วนกลาง
npm run simulate:onboarding

# ตรวจสอบ - payment_status ควรเป็น "paid"
curl http://localhost:3001/api/onboarding
```

### Use Case 3: ทดสอบ Batch Processing
```bash
# ส่งข้อมูล 50 units พร้อมกัน
npm run simulate:external batch 50

# ดูประสิทธิภาพ consumer
curl http://localhost:3001/api/kafka/status
```

## ⚠️ สิ่งที่ต้องระวัง

1. **Kafka ต้อง Enable**: ตรวจสอบ `.env` มี `KAFKA_ENABLED=true`
2. **Backend ต้องรันอยู่**: Consumer ต้องทำงานเพื่อรับ events
3. **Topic Names**: ตรงกับที่ consumer subscribe ไว้
4. **Event Format**: ต้องตรงตาม schema ที่แต่ละทีมกำหนด
5. **Unit ID Uniqueness**: ใช้ unit_id เดียวกันจะ update case เดิม

## 🐛 Troubleshooting

### ปัญหา: Events ไม่ถูกประมวลผล
```bash
# ตรวจสอบ consumer status
curl http://localhost:3001/api/kafka/status

# ดู logs ใน backend terminal
# ควรเห็น: "📤 Received message from..."
```

### ปัญหา: Kafka connection failed
```bash
# ตรวจสอบ environment variables
cat .env | grep KAFKA

# ทดสอบ connection
npm run kafka:test
```

### ปัญหา: Data ไม่แสดงใน UI
```bash
# ตรวจสอบข้อมูลใน database
curl http://localhost:3001/api/handover
curl http://localhost:3001/api/onboarding
curl http://localhost:3001/api/defects

# ตรวจสอบ CORS และ network
```

## 📚 Related Documentation

- [POSTSALES_SERVICES_OVERVIEW.md](../../../POSTSALES_SERVICES_OVERVIEW.md)
- [HANDOVER_READINESS_WORKFLOW.drawio](../../../IO/HANDOVER_READINESS_WORKFLOW.drawio)
- [TEAM_INTEGRATION.md](../../../TEAM_INTEGRATION.md)
- [Kafka Producer Examples](./README.md)

## 🎓 Tips

1. **เริ่มจาก scenario ง่าย**: ทดลอง handover flow ก่อน
2. **ดู logs**: เปิด backend terminal เพื่อดู event processing
3. **ทดสอบ partial flow**: เพื่อดูว่า system handle incomplete data ได้ดีไหม
4. **ใช้ batch test**: ทดสอบประสิทธิภาพเมื่อมี load สูง
5. **เก็บ unit_id**: เพื่อใช้ทดสอบซ้ำหรือ debug

---

**Happy Testing! 🚀**
