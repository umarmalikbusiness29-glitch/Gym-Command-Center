# Firebase Deployment Script for Windows
# Run with: powershell -ExecutionPolicy Bypass -File deploy.ps1

Write-Host "🚀 Gym Command Center - Firebase Deployment" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

$firebaseCheck = firebase --version 2>$null
if (-not $firebaseCheck) {
    Write-Host "❌ Firebase CLI not found. Install with: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}

$gcloudCheck = gcloud --version 2>$null
if (-not $gcloudCheck) {
    Write-Host "❌ Google Cloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites installed" -ForegroundColor Green

# Build project
Write-Host "" 
Write-Host "Building project..." -ForegroundColor Yellow
npm run build
Write-Host "✅ Build complete" -ForegroundColor Green

# Get Firebase project info
Write-Host ""
Write-Host "Current Firebase projects:" -ForegroundColor Yellow
firebase projects:list

$PROJECT_ID = Read-Host "Enter your Firebase Project ID"
$GCP_PROJECT_ID = Read-Host "Enter Google Cloud Project ID (usually same as Firebase)"
$REGION = Read-Host "Enter Cloud Run region (default: us-central1)"
if ([string]::IsNullOrEmpty($REGION)) {
    $REGION = "us-central1"
}

# Build and push Docker image
Write-Host ""
Write-Host "Building Docker image..." -ForegroundColor Yellow
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/gym-command-center --project=$GCP_PROJECT_ID

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed" -ForegroundColor Red
    exit 1
}

# Deploy to Cloud Run
Write-Host ""
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy gym-command-center `
  --image gcr.io/$GCP_PROJECT_ID/gym-command-center `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --project=$GCP_PROJECT_ID `
  --memory=1Gi `
  --cpu=1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cloud Run deployment failed" -ForegroundColor Red
    exit 1
}

# Get Cloud Run URL
Write-Host ""
Write-Host "Getting Cloud Run URL..." -ForegroundColor Yellow
$CLOUD_RUN_URL = gcloud run services describe gym-command-center `
  --region $REGION `
  --project=$GCP_PROJECT_ID `
  --format='value(status.url)'

Write-Host "Cloud Run URL: $CLOUD_RUN_URL" -ForegroundColor Cyan

# Update firebase.json
Write-Host ""
Write-Host "Updating firebase.json..." -ForegroundColor Yellow
$firebaseConfig = Get-Content firebase.json -Raw
$firebaseConfig = $firebaseConfig -replace "https://your-cloud-run-url.run.app", $CLOUD_RUN_URL
Set-Content firebase.json $firebaseConfig

# Deploy to Firebase Hosting
Write-Host ""
Write-Host "Deploying to Firebase Hosting..." -ForegroundColor Yellow
firebase deploy --project=$PROJECT_ID --only hosting

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase Hosting deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: https://$PROJECT_ID.web.app" -ForegroundColor Cyan
Write-Host "Backend API: $CLOUD_RUN_URL/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Set DATABASE_URL in Cloud Run secrets" -ForegroundColor White
Write-Host "2. Set SESSION_SECRET in Cloud Run secrets" -ForegroundColor White
Write-Host "3. Configure database firewall rules to allow Cloud Run" -ForegroundColor White
Write-Host "4. Run database migrations if needed" -ForegroundColor White
