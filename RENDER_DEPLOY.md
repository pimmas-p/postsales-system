# Render Deployment Guide

## Environment Variables Setup

**IMPORTANT**: Render ไม่ได้อ่านจากไฟล์ `.env` - ต้องตั้งค่าผ่าน Dashboard UI เท่านั้น

### How to Set Environment Variables on Render

1. Go to https://dashboard.render.com
2. Select your service **"postsales-system"**
3. Click **"Environment"** tab on the left menu
4. Click **"Add Environment Variable"** button
5. Copy-paste each variable below (format: `KEY=value`)
6. Click **"Save Changes"**
7. Render will automatically redeploy

---

## Required Environment Variables

ต้องตั้งค่า Environment Variables ใน Render Dashboard → Your Service → Environment

### Required Variables (ต้องมีทุกตัว)
```bash
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://itksoxfmkppjsqtvlfjc.supabase.co
SUPABASE_SECRET_KEY=<copy from your .env file>
FRONTEND_URL=https://postsales-system.vercel.app
```

**💡 TIP**: Copy actual values from your local `.env` file in `backend-bridge/` folder

### Optional Variables (ถ้าต้องการใช้ Kafka)
```bash
KAFKA_ENABLED=true
KAFKA_BOOTSTRAP_SERVERS=pkc-619z3.us-east1.gcp.confluent.cloud:9092
KAFKA_API_KEY=<copy from your .env file>
KAFKA_API_SECRET=<copy from your .env file>
KAFKA_CONSUMER_GROUP_ID=postsales-backend-bridge-group
KAFKA_DISABLE_SSL_VERIFICATION=false
```

**💡 TIP**: Copy actual Kafka credentials from your local `.env` file  
**Note**: ถ้าไม่ต้องการใช้ Kafka ให้ข้ามส่วนนี้ หรือตั้ง `KAFKA_ENABLED=false`

---

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Check Render Dashboard**
   - Go to https://dashboard.render.com
   - Select your service "postsales-system"
   - Check "Events" tab for deployment status

3. **Verify Environment Variables**
   - Go to "Environment" tab
   - Make sure all required variables are set
   - Click "Save Changes" if you made updates

4. **Check Logs**
   - Go to "Logs" tab
   - Look for:
     ```
     🔍 Environment Variables Check:
       ✅ SUPABASE_URL: https://...
       ✅ SUPABASE_SECRET_KEY: (hidden)
       ✅ PORT: 3001
     ```

5. **Test API**
   - Health check: https://postsales-system.onrender.com/health
   - API docs: https://postsales-system.onrender.com/api-docs
   - Test endpoint: https://postsales-system.onrender.com/api/handover/stats

## Troubleshooting

### 500 Internal Server Error
- ✅ Check environment variables are set correctly
- ✅ Check Render logs for error messages
- ✅ Verify Supabase credentials are correct
- ✅ Make sure database tables exist

### CORS Errors
- ✅ Add Vercel URL to FRONTEND_URL environment variable
- ✅ Check allowed origins in server logs

### Build Failures
- ✅ Check Node.js version (must be 20.x)
- ✅ Verify package.json has correct dependencies
- ✅ Check render.yaml configuration

## Current Configuration

- **Service Name**: postsales-system
- **Region**: Singapore
- **Environment**: Node.js 20.x
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Root Directory**: `ccloud-nodejs-client/backend-bridge`

## URLs

- Backend API: https://postsales-system.onrender.com
- Frontend: https://postsales-system.vercel.app
- API Documentation: https://postsales-system.onrender.com/api-docs
