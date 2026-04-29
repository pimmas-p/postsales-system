# 🚀 Deployment Guide - Post-Sales Management System

**Last Updated:** April 29, 2026  
**Backend:** Render (Node.js)  
**Frontend:** Vercel (React + Vite)

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Backend Deployment (Render)](#backend-deployment-render)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Environment Variables](#environment-variables)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Troubleshooting](#troubleshooting)

---

## 1. Pre-Deployment Checklist

### ✅ Before You Start

- [ ] All code committed to Git repository
- [ ] `.env` files are in `.gitignore` (NEVER commit credentials)
- [ ] Backend builds successfully: `cd ccloud-nodejs-client/backend-bridge && npm install && npm start`
- [ ] Frontend builds successfully: `cd Front-end && npm install && npm run build`
- [ ] Supabase database tables created (run schema files)
- [ ] Kafka credentials available (from Confluent Cloud)
- [ ] GitHub/GitLab repository accessible

### 📦 Required Accounts

1. **Render Account** - https://render.com (free tier available)
2. **Vercel Account** - https://vercel.com (free tier available)
3. **Supabase Project** - Already setup at https://itksoxfmkppjsqtvlfjc.supabase.co
4. **Confluent Cloud** - Already setup with Kafka cluster

---

## 2. Backend Deployment (Render)

### Step 1: Create New Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository
4. Configure:
   - **Name:** `postsales-backend` (or your preferred name)
   - **Region:** Oregon (US West) or nearest region
   - **Branch:** `main` (or your deployment branch)
   - **Root Directory:** `ccloud-nodejs-client/backend-bridge`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` or `node server.js`
   - **Instance Type:** Free (or upgrade for production)

### Step 2: Set Environment Variables

Go to **Environment** tab and add all variables:

```bash
# Node Environment
NODE_ENV=production

# Server Configuration
PORT=3001
BACKEND_URL=https://postsales-backend.onrender.com
FRONTEND_URL=https://your-frontend.vercel.app

# Supabase Configuration
SUPABASE_URL=https://itksoxfmkppjsqtvlfjc.supabase.co
SUPABASE_SECRET_KEY=your-supabase-secret-key-here

# Kafka Configuration
KAFKA_ENABLED=true
KAFKA_BOOTSTRAP_SERVERS=pkc-619z3.us-east1.gcp.confluent.cloud:9092
KAFKA_SASL_USERNAME=your-kafka-api-key-here
KAFKA_SASL_PASSWORD=your-kafka-api-secret-here
KAFKA_CONSUMER_GROUP_ID=postsales-backend-bridge-group
```

**⚠️ IMPORTANT:** 
- Update `BACKEND_URL` with your actual Render URL (you'll get this after creation)
- Update `FRONTEND_URL` after deploying frontend to Vercel
- **NEVER** commit these values to Git

### Step 3: Deploy

1. Click **"Create Web Service"**
2. Render will automatically build and deploy
3. Wait for deployment to complete (5-10 minutes)
4. Note your service URL: `https://postsales-backend.onrender.com`

### Step 4: Update Environment Variables

1. Go back to **Environment** tab
2. Update these values with actual URLs:
   - `BACKEND_URL`: Your Render service URL
   - `FRONTEND_URL`: Your Vercel URL (after frontend deployment)
3. Click **"Save Changes"** (will trigger auto-redeploy)

### Step 5: Verify Backend Deployment

Test your backend endpoints:

```bash
# Health check
curl https://postsales-backend.onrender.com/api/handover/cases

# Should return JSON array (may be empty)
# Status 200 = Success
```

Check Render logs for:
```
✅ Connected to Supabase successfully
✅ Kafka consumer connected! (if KAFKA_ENABLED=true)
🚀 Server running on port 3001
```

---

## 3. Frontend Deployment (Vercel)

### Step 1: Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

Or use Vercel Dashboard (recommended for first deployment)

### Step 2: Deploy via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `Front-end`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### Step 3: Set Environment Variables

Click **"Environment Variables"** and add:

```bash
# Backend API URL (use your Render URL)
VITE_API_BASE_URL=https://postsales-backend.onrender.com

# Supabase Configuration (Frontend - Publishable Key)
VITE_SUPABASE_URL=https://itksoxfmkppjsqtvlfjc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key-here
```

**Note:** Use **Publishable Key** for frontend, NOT the Secret Key!

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Vercel will provide your URL: `https://your-project.vercel.app`

### Step 5: Update Backend CORS

1. Go back to **Render Dashboard**
2. Update `FRONTEND_URL` environment variable with your Vercel URL
3. Save changes (triggers redeploy)

This updates CORS to allow your Vercel frontend to call backend APIs.

### Step 6: Verify Frontend Deployment

1. Open your Vercel URL in browser
2. Check browser console (F12) for errors
3. Navigate to each page:
   - Home page with 3 cards
   - Handover Dashboard
   - Onboarding Dashboard
   - Defect Dashboard
4. Verify API calls work (check Network tab)

---

## 4. Environment Variables

### 4.1 Backend Environment Variables (Render)

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3001` | Server port (Render auto-assigns) |
| `BACKEND_URL` | `https://your-app.onrender.com` | Your Render URL |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Your Vercel URL (for CORS) |
| `SUPABASE_URL` | `https://itksoxfmkppjsqtvlfjc.supabase.co` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | `eyJhbG...` | Service role key (backend only) |
| `KAFKA_ENABLED` | `true` | Enable Kafka consumer/producer |
| `KAFKA_BOOTSTRAP_SERVERS` | `pkc-619z3...` | Kafka cluster URL |
| `KAFKA_SASL_USERNAME` | `XYEXLQ...` | Kafka API Key |
| `KAFKA_SASL_PASSWORD` | `dwflJO...` | Kafka API Secret |
| `KAFKA_CONSUMER_GROUP_ID` | `postsales-backend-bridge-group` | Kafka consumer group |

### 4.2 Frontend Environment Variables (Vercel)

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com` | Backend API URL |
| `VITE_SUPABASE_URL` | `https://itksoxfmkppjsqtvlfjc.supabase.co` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbG...` | Publishable anon key (safe for frontend) |

### 4.3 Security Notes

**🔒 NEVER commit to Git:**
- `.env` files
- Supabase secret keys
- Kafka credentials
- Any passwords or API keys

**✅ Safe to expose:**
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key, designed for frontend)
- Backend/Frontend URLs

**❌ Keep secret:**
- `SUPABASE_SECRET_KEY` (backend only, full database access)
- Kafka credentials (full topic access)

---

## 5. Post-Deployment Verification

### 5.1 Backend Health Check

```bash
# Test API endpoint
curl https://your-backend.onrender.com/api/handover/cases

# Expected: JSON array (200 OK)
```

### 5.2 Frontend → Backend Connection

1. Open Vercel URL in browser
2. Open Developer Tools (F12) → Network tab
3. Navigate to Handover Dashboard
4. Check for API request to Render backend
5. Should see successful responses (200 OK)

### 5.3 CORS Verification

**No CORS errors in console:**
```
✅ Good: API calls complete successfully
❌ Bad: "Access-Control-Allow-Origin" error
```

If CORS error appears:
1. Check `FRONTEND_URL` on Render matches your Vercel URL exactly
2. Redeploy backend after updating

### 5.4 Kafka Connection (Backend Logs)

Check Render logs:
```
✅ Kafka consumer connected!
📡 Subscribed to topics: kyc.completed, legal.contract.drafted, payment.secondpayment.completed, ...
```

If Kafka fails to connect:
- Verify `KAFKA_ENABLED=true`
- Check all Kafka credentials are correct
- Ensure Kafka cluster is running in Confluent Cloud

### 5.5 Database Connection

```
✅ Connected to Supabase successfully
```

If database fails:
- Verify `SUPABASE_URL` and `SUPABASE_SECRET_KEY`
- Check Supabase project is active
- Verify tables exist (handover_cases, onboarding_cases, defect_cases)

---

## 6. Troubleshooting

### 6.1 Backend Issues

#### Build Fails on Render

**Error:** `Cannot find module 'xxx'`

**Solution:**
```bash
# Ensure all dependencies in package.json
cd ccloud-nodejs-client/backend-bridge
npm install
# Commit package-lock.json if updated
```

#### Port Binding Error

**Error:** `EADDRINUSE: address already in use`

**Solution:** Render auto-assigns PORT. Update `server.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

#### Kafka Connection Timeout

**Error:** `Kafka consumer failed to connect`

**Solutions:**
1. Set `KAFKA_ENABLED=false` temporarily to test without Kafka
2. Verify Kafka credentials are correct
3. Check Confluent Cloud cluster status
4. Verify IP whitelist in Confluent Cloud (if enabled)

#### Database Connection Fails

**Error:** `Failed to connect to Supabase`

**Solutions:**
1. Verify `SUPABASE_URL` and `SUPABASE_SECRET_KEY`
2. Check Supabase project status at https://supabase.com/dashboard
3. Run database migrations (schema files)

### 6.2 Frontend Issues

#### Build Fails on Vercel

**Error:** `Failed to compile`

**Solution:**
```bash
# Test build locally first
cd Front-end
npm install
npm run build

# Fix TypeScript errors if any
npm run type-check
```

#### API Calls Fail (404)

**Error:** `GET https://backend.onrender.com/api/handover/cases 404`

**Solutions:**
1. Verify `VITE_API_BASE_URL` is correct (no trailing slash)
2. Check backend is deployed and running
3. Test backend directly with curl

#### CORS Error

**Error:** `Access to fetch at 'https://backend...' from origin 'https://frontend...' has been blocked by CORS`

**Solutions:**
1. Update `FRONTEND_URL` on Render backend
2. Must be exact match (https://your-app.vercel.app)
3. Redeploy backend after changing

#### Environment Variables Not Loading

**Error:** `import.meta.env.VITE_API_BASE_URL is undefined`

**Solutions:**
1. Ensure variables start with `VITE_` prefix
2. Redeploy after adding variables
3. Check Variables are set for Production environment

### 6.3 Integration Issues

#### Kafka Events Not Received

**Symptoms:** Events published to Kafka but backend doesn't process them

**Solutions:**
1. Check backend logs for consumer subscription
2. Verify topic names match exactly (case-sensitive)
3. Check consumer group ID is unique
4. Test with Confluent Cloud UI (publish test message)

#### Events Published But Not Received by Other Teams

**Symptoms:** Backend publishes events but other teams don't receive

**Solutions:**
1. Verify topic names match team expectations (coordinate naming convention)
2. Check event payload format matches documentation
3. Test with Confluent Cloud UI (subscribe to topic manually)
4. Coordinate with other teams to verify their consumer setup

#### External API Calls Fail

**Symptoms:** Calls to Inventory/Legal APIs fail with 404 or timeout

**Solutions:**
1. Verify external team services are deployed and running
2. Check API URLs in `services/externalApi.js`
3. Test endpoints with curl directly
4. Coordinate with other teams for authentication requirements
5. Implement proper error handling (already done with ErrorAlert)

---

## 7. Deployment Checklist

### ✅ Backend (Render)

- [ ] Service created and deployed
- [ ] All environment variables set
- [ ] `FRONTEND_URL` updated with Vercel URL
- [ ] Logs show successful startup
- [ ] Kafka consumer connected (if enabled)
- [ ] Database connection successful
- [ ] API endpoints respond (test with curl)

### ✅ Frontend (Vercel)

- [ ] Project deployed successfully
- [ ] Environment variables set
- [ ] `VITE_API_BASE_URL` points to Render backend
- [ ] No build errors
- [ ] No console errors in browser
- [ ] All pages load correctly
- [ ] API calls work (check Network tab)

### ✅ Integration

- [ ] Backend ↔ Frontend communication works
- [ ] CORS configured correctly
- [ ] Kafka consumer receives test events (if enabled)
- [ ] Kafka producer publishes events successfully
- [ ] External API calls work (or proper error handling)
- [ ] Database queries execute successfully

---

## 8. Continuous Deployment

### Auto-Deploy on Git Push

Both Render and Vercel support auto-deployment:

**Render:**
- Automatically redeploys when you push to configured branch
- Can disable in Settings if needed

**Vercel:**
- Automatically deploys on every Git push
- Creates preview deployments for PRs
- Production deployment on main branch

### Manual Redeploy

**Render:**
1. Go to Dashboard → Your Service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

**Vercel:**
1. Go to Project → Deployments
2. Click **"Redeploy"** on any deployment

---

## 9. Monitoring & Logs

### Render Logs

Access logs from Dashboard:
1. Go to your service
2. Click **"Logs"** tab
3. Real-time logs show:
   - Server startup
   - API requests
   - Kafka events
   - Errors

### Vercel Logs

Access logs from Dashboard:
1. Go to Project → Deployments
2. Click on a deployment
3. View **Build Logs** and **Runtime Logs**

### Log Monitoring

Watch for:
- ✅ `Server running on port 3001`
- ✅ `Kafka consumer connected`
- ✅ `Connected to Supabase`
- ❌ Error messages
- ❌ Failed API calls
- ❌ Kafka connection timeouts

---

## 10. Production Considerations

### 10.1 Performance

**Render Free Tier:**
- Spins down after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds
- Upgrade to paid plan for always-on service

**Vercel Free Tier:**
- Always active
- Generous bandwidth limits
- Upgrade for higher limits

### 10.2 Database

**Supabase:**
- Free tier: 500MB storage, 2GB bandwidth
- Monitor usage in Supabase dashboard
- Upgrade before hitting limits

### 10.3 Kafka

**Confluent Cloud:**
- Monitor message volume
- Check for consumer lag
- Alert on connection failures

### 10.4 Backup Strategy

**Database:**
1. Supabase auto-backups on paid plans
2. Export data regularly: `pg_dump` from Supabase
3. Store in secure location

**Code:**
- Always committed to Git
- Tag production releases: `git tag v1.0.0`
- Keep `main` branch stable

---

## 11. Scaling Considerations

### When to Upgrade

**Signs you need to upgrade:**
- Backend response times > 1 second
- Render service sleeping causes user complaints
- Database queries timing out
- Kafka consumer lag increasing
- High API error rates

**Upgrade Path:**
1. **Render:** Free → Starter ($7/month) → Standard ($25/month)
2. **Vercel:** Free → Pro ($20/month)
3. **Supabase:** Free → Pro ($25/month)
4. **Confluent:** Basic → Standard (contact sales)

---

## 12. Support & Resources

### Documentation

- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Confluent Cloud Docs](https://docs.confluent.io/cloud/)

### Project Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [TEAM_INTEGRATION.md](TEAM_INTEGRATION.md) - Team integration reference
- [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) - Variable reference
- [CHANGES.md](CHANGES.md) - Changelog

### Team Contacts

See [TEAM_INTEGRATION.md](TEAM_INTEGRATION.md) Section 15 for team service URLs and contacts.

---

**🎉 Deployment Complete!**

Your Post-Sales Management System is now live on:
- **Backend:** https://your-backend.onrender.com
- **Frontend:** https://your-frontend.vercel.app

**Next Steps:**
1. Test all features end-to-end
2. Coordinate with other teams for Kafka integration testing
3. Monitor logs for first few days
4. Setup alerts for errors (future work)
5. Document any production issues in troubleshooting section

---

**Version:** 1.0.0  
**Last Updated:** April 29, 2026  
**Maintained By:** Post-Sales Development Team
