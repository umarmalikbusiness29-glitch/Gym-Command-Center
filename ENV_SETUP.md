# Firebase Deployment Environment Variables

## Production Environment (.env.prod)

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/gym_management

# Session Configuration
SESSION_SECRET=your-random-secret-key-here

# Server Configuration
NODE_ENV=production
PORT=5000

# Firebase Configuration (if needed for backend)
FIREBASE_API_KEY=your-firebase-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
```

## How to Generate Values

### DATABASE_URL
Choose one of these options:

#### Option 1: Cloud SQL (Google Cloud)
```
postgresql://user:password@/database?host=/cloudsql/INSTANCE_CONNECTION_NAME
```

#### Option 2: Supabase (Recommended - Easy Setup)
1. Go to supabase.com
2. Create a new project
3. Copy the connection string from Settings > Database

```
postgresql://postgres:YOUR_PASSWORD@db.REFERENCE.supabase.co:5432/postgres
```

#### Option 3: Digital Ocean PostgreSQL
1. Create managed database on DigitalOcean
2. Copy connection string

```
postgresql://doadmin:password@host:port/database?sslmode=require
```

### SESSION_SECRET
Generate a random secret (minimum 32 characters):

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString()))
```

**macOS/Linux:**
```bash
openssl rand -base64 32
```

**Online Generator:**
Copy output from: https://generate-random.org/

## Setting Environment Variables in Cloud Run

### Using Google Cloud Console:
1. Go to Cloud Run
2. Click on `gym-command-center` service
3. Click "Edit & Deploy New Revision"
4. Under "Runtime settings" → "Environment variables"
5. Add each variable:
   - Name: `DATABASE_URL`
   - Value: Your PostgreSQL connection string
   - Repeat for `SESSION_SECRET`

### Using gcloud CLI:
```bash
gcloud run deploy gym-command-center \
  --set-env-vars="DATABASE_URL=postgresql://...,SESSION_SECRET=your-secret" \
  --region us-central1 \
  --project YOUR_PROJECT_ID
```

### Using Cloud Run YAML:
Update `cloud-run.yaml`:
```yaml
env:
- name: DATABASE_URL
  value: "postgresql://user:pass@host/db"
- name: SESSION_SECRET
  value: "your-secret-key"
```

## Security Best Practices

### Don't Store Secrets in:
❌ firebase.json
❌ package.json
❌ Source code
❌ Commit to git

### Use Cloud Secret Manager Instead:
```bash
# Create secret
gcloud secrets create database-url \
  --replication-policy="automatic" \
  --data-file=- <<< "postgresql://..."

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding database-url \
  --member=serviceAccount:YOUR_SERVICE_ACCOUNT \
  --role=roles/secretmanager.secretAccessor

# Reference in Cloud Run YAML
env:
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: database-url
      key: latest
```

## Database Initialization

After setting DATABASE_URL in Cloud Run:

```bash
# Run migrations locally first to test
DATABASE_URL="your_connection_string" npm run db:push

# Or create schema manually in your database
psql postgresql://... < schema.sql
```

## Verify Deployment

Test your environment variables:

```bash
# Check logs
gcloud run logs read gym-command-center --limit 50

# Test API connection
curl https://your-gym-app.web.app/api/auth/me

# Check database connection
gcloud run exec gym-command-center -- psql "$DATABASE_URL" -c "SELECT version();"
```

## Troubleshooting

### "database connection refused"
- Check DATABASE_URL is correct
- Verify network access (Cloud SQL Proxy, firewall rules)
- Test locally: `psql $DATABASE_URL`

### "Cannot read env variables"
- Confirm variable names match exactly
- Redeploy after changing variables
- Check Cloud Run service account has Secret Manager access

### Sessions not persisting
- Verify DATABASE_URL connects to database
- Check SESSION_SECRET is set
- Look for session table creation logs

## Reset Environment Variables

To remove or reset variables:

```bash
gcloud run deploy gym-command-center \
  --update-env-vars="NEW_VAR=value" \
  --clear-env-vars=OLD_VAR \
  --region us-central1
```

## Monitoring

View real-time logs with:
```bash
gcloud run logs read gym-command-center --follow
```

## Local Testing Before Deployment

Test with production environment variables locally:

```bash
# Create .env.local
cp .env.prod .env.local

# Start server with production env
DATABASE_URL="your_value" SESSION_SECRET="your_secret" npm start

# Test endpoints
curl http://localhost:5000/api/auth/me
```
