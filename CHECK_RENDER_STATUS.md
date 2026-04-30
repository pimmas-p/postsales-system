# ตรวจสอบสถานะ Render Deployment

## ✅ Checklist ก่อนใช้งาน

### 1. เช็ค Environment Variables บน Render
ไปที่: https://dashboard.render.com → postsales-system → **Environment**

ต้องมีตัวแปรเหล่านี้:
- [ ] `NODE_ENV` = production
- [ ] `PORT` = 3001
- [ ] `SUPABASE_URL` = https://itksoxfmkppjsqtvlfjc.supabase.co
- [ ] `SUPABASE_SECRET_KEY` = sb_secret_... (copy จาก .env)
- [ ] `FRONTEND_URL` = https://postsales-system.vercel.app

### 2. เช็ค Logs บน Render
ไปที่: https://dashboard.render.com → postsales-system → **Logs**

**ถ้า Deploy สำเร็จจะเห็น:**
```
🔍 Environment Variables Check:
  ✅ SUPABASE_URL: https://itksoxfmkppjsqtvlfjc.supabase.co
  ✅ SUPABASE_SECRET_KEY: (hidden)
  ✅ PORT: 3001
  ✅ NODE_ENV: production
  ✅ FRONTEND_URL: https://postsales-system.vercel.app

✅ Successfully connected to Supabase
ℹ️  Kafka is disabled (KAFKA_ENABLED=false)
🚀 Server running on port 3001
📚 Swagger docs available at: https://postsales-system.onrender.com/api-docs
```

**ถ้ามี Error จะเห็น:**
```
❌ SUPABASE_URL is not set!
❌ SUPABASE_SECRET_KEY is not set!
Server will not start without required environment variables.
```

### 3. ทดสอบ Endpoints

**Health Check** (ต้องได้ 200 OK):
```
https://postsales-system.onrender.com/health
```

**Response ที่ถูกต้อง:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-30T...",
  "uptime": 123.45,
  "environment": "production"
}
```

**API Docs** (ต้องเปิดได้):
```
https://postsales-system.onrender.com/api-docs
```

**Stats Endpoint** (ต้องได้ข้อมูล):
```
https://postsales-system.onrender.com/api/handover/stats
```

---

## 🔴 ถ้ายังได้ 500 Error

### ปัญหา: Environment Variables ยังไม่ได้ตั้ง

1. ไปที่ Render Dashboard
2. คลิก **Environment** tab
3. เพิ่มตัวแปรทั้งหมดตามด้านบน
4. คลิก **Save Changes**
5. รอ Render redeploy (2-3 นาที)
6. เช็ค Logs อีกครั้ง

### ปัญหา: Supabase Credentials ผิด

1. เปิดไฟล์ `.env` ในเครื่อง (โฟลเดอร์ `backend-bridge/`)
2. Copy ค่า `SUPABASE_SECRET_KEY` 
3. ไปที่ Render → Environment
4. แก้ไขค่า `SUPABASE_SECRET_KEY`
5. Save Changes → รอ redeploy

### ปัญหา: Database Tables ไม่มี

ถ้า Logs บอกว่า "relation ... does not exist":
1. เปิด Supabase Dashboard
2. ไปที่ SQL Editor
3. รัน schema files:
   - `defects_schema.sql`
   - `onboarding_schema.sql`

---

## 📞 ติดต่อขอความช่วยเหลือ

ส่ง screenshot ของ:
1. Render Environment Variables (เซนเซอร์ secrets)
2. Render Logs (error messages)
3. Browser Console (network errors)
