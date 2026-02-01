# Firebase Deployment Quick Start

## 🚀 Quick Deployment (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

## 🚀 Quick Deployment (macOS/Linux)

```bash
bash deploy.sh
```

## Manual Step-by-Step

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
npm install -g @google-cloud/cli
```

### 2. Authenticate
```bash
gcloud auth login
firebase login
```

### 3. Initialize Firebase
```bash
firebase init
```

Select:
- Hosting
- Cloud Run

### 4. Build
```bash
npm run build
```

### 5. Deploy Backend to Cloud Run
```bash
# Using the automated script (easiest)
powershell -ExecutionPolicy Bypass -File deploy.ps1

# Or manually:
gcloud builds submit --tag gcr.io/YOUR_PROJECT/gym-command-center
gcloud run deploy gym-command-center \
  --image gcr.io/YOUR_PROJECT/gym-command-center \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### 6. Set Environment Variables in Cloud Run

Go to Cloud Run console → gym-command-center → Edit & Deploy New Revision

Add these environment variables:
- `DATABASE_URL`: Your PostgreSQL connection string
- `SESSION_SECRET`: A random secret key (e.g., `$(openssl rand -base64 32)`)

### 7. Deploy Frontend to Firebase Hosting
```bash
firebase deploy --only hosting
```

## 📍 Access Your App

- **Frontend**: https://YOUR_PROJECT_ID.web.app
- **Backend**: https://gym-command-center-REGION.run.app

## 🔧 Environment Variables Needed

### DATABASE_URL
```
postgresql://user:password@host:5432/database_name
```

Get this from your PostgreSQL provider:
- Cloud SQL
- Supabase
- Digital Ocean
- Any managed PostgreSQL

### SESSION_SECRET
Random secret string for session encryption:
```bash
# Generate one:
openssl rand -base64 32
```

## 📊 Deployment Architecture

```
┌─────────────────────────────────────────────┐
│         Firebase Hosting                    │
│  (Frontend - React app with Tailwind)       │
└────────────┬────────────────────────────────┘
             │ /api/** routes
             ↓
┌─────────────────────────────────────────────┐
│         Cloud Run                           │
│   (Backend - Express server)                │
└────────────┬────────────────────────────────┘
             │ 
             ↓
┌─────────────────────────────────────────────┐
│      PostgreSQL Database                    │
│   (Cloud SQL, Supabase, etc.)               │
└─────────────────────────────────────────────┘
```

## 💡 Key Features

✅ **Serverless Backend** - Auto-scales on Cloud Run
✅ **Static Frontend** - Hosted on Firebase (fast, CDN)
✅ **Database** - Your choice of PostgreSQL provider
✅ **Authentication** - Firebase Auth integration
✅ **Environment Separation** - Dev on Replit, Prod on Firebase

## 🆘 Troubleshooting

### "gcloud: command not found"
Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install

### "firebase: command not found"
Install Firebase CLI: `npm install -g firebase-tools`

### Database Connection Fails
1. Check DATABASE_URL is correct
2. Verify firewall allows Cloud Run IP
3. Test connection locally first

### API Calls Return 404
1. Verify Cloud Run URL in firebase.json
2. Check backend is running on Cloud Run
3. Verify rewrites in firebase.json

### Static Files Not Loading
1. Build frontend: `npm run build`
2. Check dist/public exists
3. Verify firebase.json has correct public path

## 📝 Files Created for Firebase

- `firebase.json` - Firebase configuration
- `Dockerfile` - Container image for Cloud Run
- `.dockerignore` - Docker build exclusions
- `cloud-run.yaml` - Cloud Run deployment spec
- `deploy.ps1` - Windows deployment script
- `deploy.sh` - Linux/Mac deployment script
- `FIREBASE_DEPLOYMENT.md` - Detailed guide

## 🎯 Next Steps After Deployment

1. ✅ Set up Cloud SQL or PostgreSQL
2. ✅ Configure environment variables
3. ✅ Run database migrations
4. ✅ Enable Firebase Security Rules
5. ✅ Set up domain custom domain (optional)
6. ✅ Enable HTTPS (automatic on Firebase)
7. ✅ Set up monitoring/logging

## 📞 Support

For issues:
1. Check Cloud Run logs: `gcloud run logs read gym-command-center --limit 50`
2. Check Firebase console
3. Verify database connectivity
4. Check Network tab in browser DevTools
