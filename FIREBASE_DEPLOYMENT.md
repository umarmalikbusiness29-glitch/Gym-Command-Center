# Firebase Deployment Guide

## Prerequisites
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud CLI: `gcloud` command line tools
- A Firebase project and Google Cloud project

## Step 1: Initialize Firebase Project

```bash
firebase login
firebase init
```

When prompted:
- Select "Hosting" and "Cloud Run"
- Choose your Firebase project
- Use `dist/public` as public directory
- Don't deploy functions yet

## Step 2: Configure Environment Variables

Create `.env.prod` file with your production settings:
```
DATABASE_URL=your_postgresql_url
SESSION_SECRET=your_secret_key
PORT=5000
```

## Step 3: Build the Project

```bash
npm run build
```

## Step 4: Deploy Backend to Cloud Run

### Option A: Using Google Cloud Console
1. Go to Cloud Run in Google Cloud Console
2. Click "Create Service"
3. Upload the Dockerfile from this project
4. Set environment variables from `.env.prod`
5. Deploy

### Option B: Using gcloud CLI

```bash
# Build Docker image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/gym-command-center

# Deploy to Cloud Run
gcloud run deploy gym-command-center \
  --image gcr.io/YOUR_PROJECT_ID/gym-command-center \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=your_url,SESSION_SECRET=your_secret"
```

## Step 5: Get Cloud Run URL

After deployment, copy the URL from Cloud Run console:
```
https://your-service-REGION.run.app
```

## Step 6: Update Firebase Config

Edit `firebase.json` and replace `your-cloud-run-url.run.app`:

```json
"rewrites": [
  {
    "source": "/api/**",
    "destination": "https://gym-command-center-REGION.run.app"
  }
]
```

## Step 7: Deploy Frontend to Firebase Hosting

```bash
firebase deploy --only hosting
```

## Step 8: Update Client API Calls

If using relative URLs like `/api/`, they will automatically route to Cloud Run.
If using absolute URLs, update them in your environment configuration.

## Verify Deployment

- Frontend: `https://your-firebase-project.web.app`
- Backend API: `https://gym-command-center-REGION.run.app/api/*`

## Environment Variables in Cloud Run

Set these secrets in Cloud Run:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key

## Database Setup

Make sure your PostgreSQL database is:
1. Accessible from Cloud Run (firewall rules)
2. Has the schema initialized via `npm run db:push`
3. Has proper connection pooling configured

## Monitoring

Monitor your deployment at:
- Cloud Run: https://console.cloud.google.com/run
- Firebase Hosting: https://console.firebase.google.com

## Rollback

To rollback to a previous version:
```bash
gcloud run services describe gym-command-center --region us-central1
gcloud run deploy gym-command-center --image gcr.io/YOUR_PROJECT_ID/gym-command-center:PREVIOUS_TAG
```

## Notes

- Cloud Run automatically scales based on traffic
- Cold starts are typically 1-3 seconds
- PostgreSQL must be in the same VPC or have proper firewall rules
- Cost scales with requests and compute time
