# Google Cloud Deployment

This repository is designed to run as two services on Google Cloud Run:

- `newsportal-frontend`: Next.js frontend in the repository root
- `newsportal-cms`: Strapi CMS in `strapi/`

The recommended production setup is:

- Cloud Run for both services
- Artifact Registry for container images
- Cloud SQL for PostgreSQL for Strapi persistence
- Secret Manager for runtime secrets
- Optional Cloud Storage for Strapi uploads later

## 1. Prerequisites

Install and authenticate the Google Cloud CLI:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

Enable required services:

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com
```

## 2. Create Artifact Registry

```bash
gcloud artifacts repositories create newsportal \
  --repository-format=docker \
  --location=YOUR_REGION
```

## 3. Create Cloud SQL PostgreSQL

Create a PostgreSQL instance:

```bash
gcloud sql instances create newsportal-sql \
  --database-version=POSTGRES_16 \
  --cpu=1 \
  --memory=3840MiB \
  --region=YOUR_REGION
```

Create the database and user:

```bash
gcloud sql databases create strapi --instance=newsportal-sql
gcloud sql users create strapi --instance=newsportal-sql --password=YOUR_DB_PASSWORD
```

## 4. Create Secrets

Create the frontend secret bundle values in Secret Manager:

- `STRAPI_API_TOKEN`
- `NEXT_PREVIEW_SECRET`
- `OPENAI_API_KEY`
- `EXA_API_KEY`

Create the CMS secret bundle values in Secret Manager:

- `APP_KEYS`
- `API_TOKEN_SALT`
- `ADMIN_JWT_SECRET`
- `TRANSFER_TOKEN_SALT`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `DATABASE_PASSWORD`

Example:

```bash
echo -n "YOUR_VALUE" | gcloud secrets create STRAPI_API_TOKEN --data-file=-
```

Grant the Cloud Run runtime service account access to those secrets.

## 5. Build the Containers

Build the frontend image:

```bash
gcloud builds submit \
  --config deploy/cloud-build.frontend.yaml \
  --substitutions=_REGION=YOUR_REGION
```

Build the CMS image:

```bash
gcloud builds submit \
  --config deploy/cloud-build.cms.yaml \
  --substitutions=_REGION=YOUR_REGION
```

If you prefer not to use substitutions, replace `REGION` directly in the YAML files before deploying.

## 6. Deploy the CMS First

Edit [deploy/cloud-run/cms-service.yaml](../deploy/cloud-run/cms-service.yaml) and set:

- `__RUNTIME_SERVICE_ACCOUNT__`
- `__CMS_PUBLIC_URL__`

Then deploy:

```bash
gcloud run services replace deploy/cloud-run/cms-service.yaml --region YOUR_REGION
```

After the service is live:

1. Open the Strapi admin URL
2. Create the first admin user
3. Create a read-only API token for the frontend
4. Optionally enable public registration in users-permissions

## 7. Deploy the Frontend

Edit [deploy/cloud-run/frontend-service.yaml](../deploy/cloud-run/frontend-service.yaml) and set:

- `__RUNTIME_SERVICE_ACCOUNT__`
- `__CMS_PUBLIC_URL__`

Then deploy:

```bash
gcloud run services replace deploy/cloud-run/frontend-service.yaml --region YOUR_REGION
```

## 8. Wire Secrets Into Cloud Run

If you prefer CLI over YAML-driven secret binding, deploy with `--set-secrets`.

Example frontend secret mapping:

```bash
gcloud run deploy newsportal-frontend \
  --image REGION-docker.pkg.dev/YOUR_PROJECT_ID/newsportal/frontend:latest \
  --region YOUR_REGION \
  --set-secrets STRAPI_API_TOKEN=STRAPI_API_TOKEN:latest,NEXT_PREVIEW_SECRET=NEXT_PREVIEW_SECRET:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,EXA_API_KEY=EXA_API_KEY:latest
```

Example CMS secret mapping:

```bash
gcloud run deploy newsportal-cms \
  --image REGION-docker.pkg.dev/YOUR_PROJECT_ID/newsportal/cms:latest \
  --region YOUR_REGION \
  --add-cloudsql-instances YOUR_PROJECT_ID:YOUR_REGION:newsportal-sql \
  --set-secrets APP_KEYS=APP_KEYS:latest,API_TOKEN_SALT=API_TOKEN_SALT:latest,ADMIN_JWT_SECRET=ADMIN_JWT_SECRET:latest,TRANSFER_TOKEN_SALT=TRANSFER_TOKEN_SALT:latest,JWT_SECRET=JWT_SECRET:latest,ENCRYPTION_KEY=ENCRYPTION_KEY:latest,DATABASE_PASSWORD=DATABASE_PASSWORD:latest
```

## 9. Production Environment Values

Frontend environment values:

- `NEXT_PUBLIC_STRAPI_URL`
- `STRAPI_API_TOKEN`
- `NEXT_PREVIEW_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`
- `EXA_API_KEY`
- `EXA_BASE_URL`

CMS environment values:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=8080`
- `PUBLIC_URL=https://cms-dot-...run.app`
- `DATABASE_CLIENT=postgres`
- `DATABASE_HOST=/cloudsql`
- `DATABASE_PORT=5432`
- `DATABASE_NAME=strapi`
- `DATABASE_USERNAME=strapi`
- `DATABASE_PASSWORD`
- `DATABASE_SOCKET_PATH=/cloudsql`
- `DATABASE_INSTANCE_UNIX_SOCKET=PROJECT:REGION:INSTANCE`

## 10. GitHub Actions Automation

Two workflows are included:

- [.github/workflows/deploy-cms.yml](../.github/workflows/deploy-cms.yml)
- [.github/workflows/deploy-frontend.yml](../.github/workflows/deploy-frontend.yml)

They are configured for:

- Project ID: `sanenews`
- Region: `us-west1`
- Cloud SQL instance: `sanenews:us-west1:net01`
- Deploy branch: `main`

Add these GitHub repository secrets before enabling deployment:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_DEPLOYER_SERVICE_ACCOUNT`
- `GCP_RUNTIME_SERVICE_ACCOUNT`
- `CMS_PUBLIC_URL`

Notes:

- `GCP_WORKLOAD_IDENTITY_PROVIDER` must be the full Google Cloud resource path using the numeric project number.
- `GCP_DEPLOYER_SERVICE_ACCOUNT` is the service account GitHub Actions impersonates to deploy.
- `GCP_RUNTIME_SERVICE_ACCOUNT` is the runtime identity injected into the Cloud Run manifests.
- `CMS_PUBLIC_URL` is reused by both services so the frontend knows where Strapi lives and Strapi knows its public URL.

## 11. Post-Deploy Checklist

1. Confirm the frontend can reach Strapi over the public CMS URL.
2. Create or refresh the Strapi API token and set it in the frontend service.
3. Test `/assistant`, `/topics`, `/articles`, and `/api/assistant`.
4. Test account registration if public registration is enabled.
5. Verify draft preview with `NEXT_PREVIEW_SECRET`.

## Notes

- The frontend Dockerfile uses Next standalone output for a smaller production container.
- The Strapi configuration now supports PostgreSQL and Cloud SQL Unix sockets.
- The existing SQLite mode still works for local development if you keep `DATABASE_CLIENT=sqlite` in your local Strapi `.env`.