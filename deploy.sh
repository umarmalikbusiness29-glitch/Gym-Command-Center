#!/bin/bash

# Firebase Deployment Script
# This script automates Firebase deployment

set -e

echo "🚀 Gym Command Center - Firebase Deployment"
echo "=============================================="

# Check prerequisites
echo "Checking prerequisites..."
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Install with: npm install -g firebase-tools"
    exit 1
fi

if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "✅ Prerequisites installed"

# Build project
echo ""
echo "Building project..."
npm run build
echo "✅ Build complete"

# Get Firebase project
echo ""
echo "Current Firebase projects:"
firebase projects:list

read -p "Enter your Firebase Project ID: " PROJECT_ID
read -p "Enter Google Cloud Project ID (usually same as Firebase): " GCP_PROJECT_ID
read -p "Enter Cloud Run region (default: us-central1): " REGION
REGION=${REGION:-us-central1}

# Build and push Docker image
echo ""
echo "Building Docker image..."
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/gym-command-center --project=$GCP_PROJECT_ID

# Deploy to Cloud Run
echo ""
echo "Deploying to Cloud Run..."
gcloud run deploy gym-command-center \
  --image gcr.io/$GCP_PROJECT_ID/gym-command-center \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --project=$GCP_PROJECT_ID \
  --memory=1Gi \
  --cpu=1

# Get Cloud Run URL
echo ""
echo "Getting Cloud Run URL..."
CLOUD_RUN_URL=$(gcloud run services describe gym-command-center \
  --region $REGION \
  --project=$GCP_PROJECT_ID \
  --format='value(status.url)')

echo "Cloud Run URL: $CLOUD_RUN_URL"

# Update firebase.json
echo ""
echo "Updating firebase.json..."
sed -i "s|https://your-cloud-run-url.run.app|$CLOUD_RUN_URL|g" firebase.json

# Deploy to Firebase Hosting
echo ""
echo "Deploying to Firebase Hosting..."
firebase deploy --project=$PROJECT_ID --only hosting

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Frontend: https://$PROJECT_ID.web.app"
echo "Backend API: $CLOUD_RUN_URL/api"
echo ""
echo "Next steps:"
echo "1. Set DATABASE_URL in Cloud Run secrets"
echo "2. Set SESSION_SECRET in Cloud Run secrets"
echo "3. Configure database firewall rules to allow Cloud Run"
echo "4. Run database migrations if needed"
