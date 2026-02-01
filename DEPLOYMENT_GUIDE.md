# Deploy Gym Command Center - Render + Supabase Guide

## Step 1: Create Supabase Database

1. Go to https://supabase.com
2. Click **"Start your project"**
3. Sign up with email
4. Create a new organization and project
5. Choose:
   - **Region:** Pick the closest to you
   - **Database Password:** Save this! (you'll need it)
6. Wait for setup (2-3 minutes)

### Get Your Connection String

1. In Supabase dashboard, go to **Settings** → **Database**
2. Find **Connection string** section
3. Copy the **PostgreSQL** connection string
4. It looks like: `postgresql://user:password@host:5432/postgres`
5. **Save this** - you'll need it for Render

---

## Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub or email
3. Connect your GitHub account (optional but recommended)

---

## Step 3: Deploy Backend to Render

### Option A: Using GitHub (Recommended)
1. Push your code to GitHub
2. In Render dashboard, click **"New +"** → **"Web Service"**
3. Select **"Connect a repository"**
4. Choose your GitHub repo
5. Fill in:
   - **Name:** `gym-command-center`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node dist/index.cjs`

### Option B: Using Docker
1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Select **"Public Git repository"**
3. Paste: `https://github.com/yourusername/your-repo.git`
4. Fill in same details as Option A

### Add Environment Variables
Before deploying, add these environment variables in Render:

1. Click **"Environment"** tab
2. Add each variable:
   ```
   DATABASE_URL = (paste your Supabase connection string here)
   SESSION_SECRET = your-random-secret-key-here
   NODE_ENV = production
   ```

3. Click **"Deploy"**
4. Wait 3-5 minutes for deployment
5. Copy your Render URL (looks like: `https://gym-command-center.onrender.com`)

---

## Step 4: Update Frontend to Use New Backend

Your backend URL will be something like: `https://gym-command-center.onrender.com`

Replace this in your code:

### File: `client/src/lib/utils.ts`
Find where API calls are made and update the base URL:

```typescript
// OLD (localhost)
const API_BASE = "http://localhost:5000"

// NEW (Render)
const API_BASE = "https://gym-command-center.onrender.com"
```

Or in `client/src/hooks/use-auth.ts`, update fetch calls:
```typescript
// Change this
fetch(api.auth.login.path, ...)

// To this (if needed)
fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, ...)
```

---

## Step 5: Rebuild and Redeploy Frontend

```powershell
cd c:\Users\user\Downloads\Gym-Command-Center\Gym-Command-Center
npm run build
firebase deploy --only hosting
```

---

## Step 6: Test Login

1. Visit https://gymnewmaka.web.app
2. Try logging in with: **admin / admin123**
3. Should now redirect to dashboard! ✅

---

## Troubleshooting

### "Login failed" error
- Check Render logs: Dashboard → Your app → Logs
- Make sure DATABASE_URL is correct in Render environment variables
- Verify Supabase database is running

### "Cannot connect to database"
- Supabase might be sleeping on free tier
- Visit Supabase dashboard to wake it up

### Backend URL not working
- Wait 5 minutes after Render deployment
- Check URL is correct: `https://gym-command-center.onrender.com/api/health`

---

## Next: Create Admin Users

Once backend is running:

```powershell
npm run create-admin
```

This will generate credentials for new admin accounts.

---

## Free Tier Limits

**Supabase Free:**
- 500MB database (enough for 1000s of records)
- 2GB bandwidth/month
- Auto-paused after inactivity

**Render Free:**
- Sleeps after 15 mins of inactivity (wakes on request)
- Perfect for testing and small teams

**Upgrade costs:** ~$10-20/month if you need more

---

## Need Help?

- Supabase docs: https://supabase.com/docs
- Render docs: https://render.com/docs
- Check logs in Render/Supabase dashboard if something fails
