# FollowMee Deployment Guide

This guide will help you deploy FollowMee v1.0 Alpha for **FREE** using:
- **Frontend**: Vercel (Free, Unlimited)
- **Backend**: Render (Free, 750 hours/month)
- **Database**: TiDB Cloud (Free, 5GB MySQL-compatible)

---

## 📋 Prerequisites

1. **GitHub Account** - Your code should be pushed to GitHub
2. **Vercel Account** - Sign up at https://vercel.com
3. **Render Account** - Sign up at https://render.com
4. **TiDB Cloud Account** - Sign up at https://tidbcloud.com

---

## Step 1: Set Up TiDB Cloud Database

### 1.1 Create TiDB Cluster

1. Go to https://tidbcloud.com and sign up
2. Click **"Create Cluster"**
3. Choose **"Serverless"** (Free tier)
4. Configure:
   - **Region**: Choose closest to your users (e.g., AWS Oregon `us-west-2`)
   - **Name**: `followmee-production`
5. Click **"Create"**

### 1.2 Get Connection String

1. In TiDB dashboard, click your cluster
2. Click **"Connect"**
3. Copy the connection details:
   ```
   Host: xxx.tidbcloud.com
   Port: 4000
   Username: xxx.root
   Password: (click to reveal)
   Database: followmee
   ```

### 1.3 Export Local Schema

```bash
cd Backend

# Export your local MySQL schema
npm run db:migrate:export
```

This creates `Backend/schema-export.sql`

### 1.4 Import Schema to TiDB

**Option A: Using the migration script**
```bash
# First, update Backend/.env.production with your TiDB credentials
npm run db:migrate:import
```

**Option B: Using TiDB web console**
1. In TiDB dashboard, click **"SQL Editor"**
2. Copy and paste the contents of `Backend/schema-export.sql`
3. Click **"Run"**

---

## Step 2: Deploy Backend to Render

### 2.1 Prepare Backend

1. Update `Backend/.env.production`:
   ```env
   # Database - Replace with your TiDB credentials
   DB_HOST=your-host.tidbcloud.com
   DB_PORT=4000
   DB_USERNAME=your-username.root
   DB_PASSWORD=your-password
   DB_NAME=followmee

   # Update these after deploying frontend
   FRONTEND_URL=https://your-app.vercel.app
   CORS_ORIGIN=https://your-app.vercel.app
   PUBLIC_URL=https://followmee-backend.onrender.com
   ```

### 2.2 Deploy to Render

1. Go to https://render.com and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `followmee-backend`
   - **Region**: Same as TiDB (e.g., Oregon)
   - **Branch**: `main`
   - **Root Directory**: `Backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: **Free**

5. Click **"Advanced"** and add environment variables:
   ```
   NODE_ENV=production
   PORT=10000
   DB_HOST=<your-tidb-host>
   DB_PORT=4000
   DB_USERNAME=<your-tidb-username>
   DB_PASSWORD=<your-tidb-password>
   DB_NAME=followmee
   JWT_SECRET=<generate-a-random-32-char-string>
   JWT_EXPIRES_IN=24h
   FRONTEND_URL=https://your-app.vercel.app
   CORS_ORIGIN=https://your-app.vercel.app
   CLOUDINARY_CLOUD_NAME=dgcued3vk
   CLOUDINARY_API_KEY=751239439928729
   CLOUDINARY_API_SECRET=<your-secret>
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=windtalkers423@gmail.com
   SMTP_PASSWORD=<your-app-password>
   ```

6. Click **"Create Web Service"**

### 2.3 Wait for Deployment

- Build takes ~3-5 minutes
- Once deployed, note your backend URL: `https://followmee-backend.onrender.com`

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Update Frontend Config

Update `Frontend/.env.production`:
```env
VITE_API_URL=https://followmee-backend.onrender.com/api
VITE_WS_URL=https://followmee-backend.onrender.com
VITE_NODE_ENV=production
VITE_ENCRYPTION_KEY=<generate-a-random-32-char-string>
```

### 3.2 Deploy to Vercel

1. Go to https://vercel.com and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `Frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Add environment variables:
   ```
   VITE_API_URL=https://followmee-backend.onrender.com/api
   VITE_WS_URL=https://followmee-backend.onrender.com
   VITE_NODE_ENV=production
   VITE_ENCRYPTION_KEY=<same-key-as-backend>
   ```

6. Click **"Deploy"**

### 3.3 Update Backend CORS

After frontend is deployed, you'll get a URL like: `https://followmee-app.vercel.app`

**Update Render backend environment variables:**
1. Go to Render dashboard
2. Click your backend service
3. Click **"Environment"**
4. Update:
   ```
   FRONTEND_URL=https://followmee-app.vercel.app
   CORS_ORIGIN=https://followmee-app.vercel.app
   ```
5. Click **"Save Changes"** (auto-redeploys)

---

## Step 4: Verify Deployment

### 4.1 Test Backend

```bash
# Test health endpoint
curl https://followmee-backend.onrender.com/health

# Expected: {"status":"UP"}
```

### 4.2 Test Frontend

1. Open your Vercel URL in browser
2. Try to register a new account
3. Check if you can log in

### 4.3 Test WebSocket

1. Log in to the application
2. Open browser DevTools → Console
3. You should see: `WebSocket connected`

---

## 🔄 Updating Your Application

### For Any Code Changes:

```bash
# 1. Make your changes locally
# 2. Test in development
npm run dev

# 3. Commit and push to GitHub
git add .
git commit -m "Fix: your change description"
git push origin main

# 4. Render and Vercel auto-deploy!
```

### Auto-Deploy Flow:

```
Local Changes → Git Commit → Git Push → GitHub
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    ↓                                   ↓
              Render (Backend)                    Vercel (Frontend)
              Auto-build & deploy                 Auto-build & deploy
                    ↓                                   ↓
              Production Updated!                 Production Updated!
```

---

## 📊 Important Notes

### Free Tier Limitations

| Service | Limitation | Workaround |
|---------|------------|------------|
| Render Backend | Sleeps after 15 min inactivity | First request is slow (~30s), subsequent requests are fast |
| TiDB Cloud | 5GB storage | Enough for ~10,000+ users |
| Vercel Frontend | None for hobby | Unlimited |

### Monitoring

- **Render Dashboard**: https://dashboard.render.com - View logs, metrics
- **Vercel Dashboard**: https://vercel.com/dashboard - View analytics, deployments
- **TiDB Dashboard**: https://tidbcloud.com - View database stats

### Security Checklist

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Change `VITE_ENCRYPTION_KEY` to a strong random string
- [ ] Use app-specific password for SMTP (not regular Gmail password)
- [ ] Enable 2FA on all accounts

---

## 🆘 Troubleshooting

### "CORS Error" in browser console
- Make sure `FRONTEND_URL` and `CORS_ORIGIN` in Render match your Vercel URL exactly

### "WebSocket connection failed"
- Check that `VITE_WS_URL` points to your Render backend URL
- Ensure backend CORS allows the frontend origin

### "Database connection failed"
- Verify TiDB credentials in Render environment variables
- Check that TiDB cluster is in the same region as Render

### Backend sleeps too long
- Use a free uptime monitor like https://uptimerobot.com to ping your backend every 10 minutes

---

## 📞 Support

If you encounter issues:
1. Check Render logs: Dashboard → Your Service → Logs
2. Check Vercel deployment logs: Dashboard → Your Project → Deployments
3. Check TiDB connection in SQL Editor

---

**Congratulations! Your FollowMee Alpha v1.0 is now live! 🎉**