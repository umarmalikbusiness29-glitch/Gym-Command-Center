# Quick Start: Deploy Backend with Render + Supabase

## What You Need To Do:

### Step 1: Create Supabase Database (2 minutes)
1. Go to https://supabase.com → Click **"Start your project"**
2. Sign up with email
3. Create new project, pick region closest to you
4. **SAVE** your database password
5. Go to **Settings → Database** → Copy PostgreSQL connection string
   - Looks like: `postgresql://user:password@host:5432/postgres`

### Step 2: Create Render Account (1 minute)
1. Go to https://render.com → Sign up

### Step 3: Deploy Backend (5 minutes)
1. In Render, click **"New +" → "Web Service"**
2. Enter your GitHub repo URL (or use "Public Git repository")
3. Fill in:
   - **Name:** `gym-command-center`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node dist/index.cjs`
4. Click **"Environment"** tab and add:
   ```
   DATABASE_URL = (paste your Supabase connection string)
   SESSION_SECRET = change-this-to-something-random
   NODE_ENV = production
   ```
5. Click **"Deploy"** → Wait 3-5 minutes
6. **COPY** your Render URL from **"Live Site"** (looks like: `https://gym-command-center.onrender.com`)

### Step 4: Update Frontend (2 minutes)
Create file: `client/.env.production`
```
VITE_API_URL=https://your-render-url-here.onrender.com
```

### Step 5: Rebuild & Redeploy Frontend
```powershell
npm run build
firebase deploy --only hosting
```

### DONE! 🎉
- Frontend: https://gymnewmaka.web.app
- Login with: **admin / admin123**

---

## Costs:
- **Supabase:** Free forever (or $5+/month for more)
- **Render:** Free forever (or $7+/month to remove sleep limit)
- **Firebase Hosting:** Free (5GB/month)

## If Backend Falls Asleep (Render Free Tier)
Free tier sleeps after 15 mins. Just refresh the app, it wakes automatically.

## Need More Help?
- See `DEPLOYMENT_GUIDE.md` for detailed troubleshooting
- Check logs in Render dashboard: Your Service → Logs
