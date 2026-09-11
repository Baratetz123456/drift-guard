# DriftGuard — GitHub CI/CD Guide

> **Strategy:** GitHub Actions — 3 workflow files, IAM user credentials in GitHub Secrets, GitHub Environments for prod approval gate  
> **Region:** ap-southeast-1 (Singapore)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Step 1 — Create the CI/CD IAM User in AWS](#3-step-1--create-the-cicd-iam-user-in-aws)
4. [Step 2 — Create GitHub Environments](#4-step-2--create-github-environments)
5. [Step 3 — Configure GitHub Secrets](#5-step-3--configure-github-secrets)
6. [Step 4 — Enable the Workflows](#6-step-4--enable-the-workflows)
7. [Workflow Reference](#7-workflow-reference)
8. [Deployment Triggers](#8-deployment-triggers)
9. [Secrets Reference](#9-secrets-reference)
10. [Updating the Shared Lambda Layer](#10-updating-the-shared-lambda-layer)
11. [Rollback Procedure](#11-rollback-procedure)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Architecture Overview

```
GitHub Repository (Baratetz123456/drift-guard)
│
├── Push to main  ──────────────────────────────────────────────────────────────────────────────►  ci.yml
│                                                                                                    Lint (ruff) + Tests (pytest)
│                                                                                                    Type check (tsc) + Build (npm run build)
│
├── Push to main  ──────────────────────────────────────────────────────────────────────────────►  deploy-dev.yml
│   (after ci.yml passes)                                                                           → Lambda update-function-code (10 functions)
│                                                                                                   → Step Functions update-state-machine
│                                                                                                   → Frontend build → S3 sync → CloudFront invalidation
│                                                                                                   → Netmiko layer rebuild (only if worker.txt changed)
│
└── Publish GitHub Release (tag: v1.0.0)  ──────────────────────────────────────────────────────►  deploy-prod.yml
    (after ci.yml passes + manual approval in GitHub)                                               → Same deploy steps targeting prod resources
```

### Workflow Files

| File | Trigger | Purpose |
|---|---|---|
| [`.github/workflows/ci.yml`](file:///d:/DriftGuard/drift-guard/.github/workflows/ci.yml) | Every push to main, every PR | Lint, type check, build verification |
| [`.github/workflows/deploy-dev.yml`](file:///d:/DriftGuard/drift-guard/.github/workflows/deploy-dev.yml) | Push to main | Deploy all components to the dev environment |
| [`.github/workflows/deploy-prod.yml`](file:///d:/DriftGuard/drift-guard/.github/workflows/deploy-prod.yml) | GitHub Release published | Deploy all components to prod (with approval gate) |

---

## 2. Prerequisites

Before enabling CI/CD, the following AWS infrastructure must already be manually provisioned per the [AWS Deployment Guide](file:///d:/DriftGuard/drift-guard/docs/aws-deployment-guide.md):

- [ ] All 10 Lambda functions created (dev and prod)
- [ ] DynamoDB tables created (`DriftGuard-dev`, `DriftGuard-prod`)
- [ ] S3 snapshot buckets created
- [ ] S3 frontend buckets created
- [ ] CloudFront distributions created and deployed
- [ ] Step Functions state machines created
- [ ] Cognito User Pools and App Clients created
- [ ] KMS key created

> [!IMPORTANT]
> CI/CD only **updates** existing infrastructure. It does not create new AWS resources. All infrastructure must be provisioned manually first using the AWS Console guide.

---

## 3. Step 1 — Create the CI/CD IAM User in AWS

The GitHub Actions pipelines authenticate to AWS using a dedicated IAM user with scoped programmatic access.

### 3.1 Create the IAM User

1. Navigate to **IAM** → **Users** → **Create user**.
2. Set **User name:** `driftguard-cicd`
3. Do **not** enable console access — this is a programmatic-only user.
4. Click **Next**.
5. Select **Attach policies directly** and attach:
   - `AWSLambda_FullAccess`
   - `AmazonS3FullAccess`
   - `AWSStepFunctionsFullAccess`
   - `CloudFrontFullAccess`
6. Click **Next** → **Create user**.

### 3.2 Create Access Keys

1. Open the `driftguard-cicd` user → **Security credentials** tab.
2. Under **Access keys**, click **Create access key**.
3. Select **Application running outside AWS** as the use case.
4. Click **Next** → **Create access key**.
5. **Download the .csv** or copy the keys immediately — the secret is not shown again.

> [!CAUTION]
> Store these credentials securely. You will paste them into GitHub Secrets in Step 3. Never commit them to the repository.

---

## 4. Step 2 — Create GitHub Environments

GitHub Environments scope secrets per environment and enable the prod approval gate.

1. Navigate to your GitHub repository → **Settings** → **Environments** → **New environment**.

### 4.1 Create the `dev` Environment

1. Set name: `dev`
2. Under **Environment secrets**, you will add secrets in Step 3.
3. No deployment protection rules needed for dev.
4. Click **Configure environment**.

### 4.2 Create the `prod` Environment

1. Set name: `prod`
2. Under **Deployment protection rules**, check **Required reviewers**.
3. Add yourself (and any other approvers) as required reviewers.
4. Optionally set a **Wait timer** (e.g. 5 minutes) if you want a buffer before deploy begins.
5. Click **Configure environment**.

> [!NOTE]
> When the prod deploy pipeline triggers, GitHub will pause and send a notification to all required reviewers. The deploy will not proceed until a reviewer clicks **Approve and deploy** in the GitHub Actions UI.

---

## 5. Step 3 — Configure GitHub Secrets

### 5.1 Repository-Level Secrets

Navigate to **Settings** → **Secrets and variables** → **Actions** → **Repository secrets**.

Add the following secrets (these are not environment-scoped — they apply to all environments):

| Secret Name | Value | Notes |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | Access key ID from Step 3.2 | Shared IAM user for dev + prod |
| `AWS_SECRET_ACCESS_KEY` | Secret access key from Step 3.2 | Shared IAM user for dev + prod |
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID | Used to construct bucket names and ARNs |

### 5.2 Environment Secrets — `dev`

Navigate to **Settings** → **Environments** → `dev` → **Add secret**.

| Secret Name | Value | Where to Find It |
|---|---|---|
| `VITE_API_BASE_URL` | `https://XXXXXXXX.execute-api.ap-southeast-1.amazonaws.com/v1` | API Gateway → dev stage → Invoke URL |
| `VITE_COGNITO_USER_POOL_ID` | `ap-southeast-1_XXXXXXXXX` | Cognito → `driftguard-users-dev` → User Pool ID |
| `VITE_COGNITO_CLIENT_ID` | `XXXXXXXXXXXXXXXXXXXXXXXXXX` | Cognito → `driftguard-users-dev` → App integration → App client ID |
| `CLOUDFRONT_DISTRIBUTION_ID_DEV` | `EXXXXXXXXXXXX` | CloudFront → dev distribution → Distribution ID |

### 5.3 Environment Secrets — `prod`

Navigate to **Settings** → **Environments** → `prod` → **Add secret**.

| Secret Name | Value | Where to Find It |
|---|---|---|
| `VITE_API_BASE_URL` | `https://YYYYYYYY.execute-api.ap-southeast-1.amazonaws.com/v1` | API Gateway → prod stage → Invoke URL |
| `VITE_COGNITO_USER_POOL_ID` | `ap-southeast-1_YYYYYYYYY` | Cognito → `driftguard-users-prod` → User Pool ID |
| `VITE_COGNITO_CLIENT_ID` | `YYYYYYYYYYYYYYYYYYYYYYYYYY` | Cognito → `driftguard-users-prod` → App integration → App client ID |
| `CLOUDFRONT_DISTRIBUTION_ID_PROD` | `EYYYYYYYYYYYYY` | CloudFront → prod distribution → Distribution ID |

> [!IMPORTANT]
> The `CLOUDFRONT_DISTRIBUTION_ID_DEV` and `CLOUDFRONT_DISTRIBUTION_ID_PROD` secrets must be set in the **environment** secrets, not repository-level secrets. The deploy workflows reference them as `secrets.CLOUDFRONT_DISTRIBUTION_ID_DEV` and `secrets.CLOUDFRONT_DISTRIBUTION_ID_PROD` from the `env:` block — they are exposed through the GitHub Environment context.

---

## 6. Step 4 — Enable the Workflows

1. Navigate to your GitHub repository → **Actions** tab.
2. If prompted, click **I understand my workflows, go ahead and enable them**.
3. The three workflows will appear: `CI — Checks`, `Deploy — dev`, `Deploy — prod`.

### 6.1 Verify the First dev Deploy

1. Make a trivial commit to `main` (e.g. add a blank line to README.md) and push.
2. Navigate to **Actions** → **Deploy — dev**.
3. Confirm all three jobs complete: `ci-gate`, `deploy-backend`, `deploy-frontend`.
4. Confirm the updated Lambda code is live by checking the Lambda console.

### 6.2 Verify the First prod Deploy

1. In GitHub, navigate to **Releases** → **Draft a new release**.
2. Create a tag: `v0.1.0`
3. Set a release title and description, then click **Publish release**.
4. Navigate to **Actions** → **Deploy — prod**.
5. The pipeline will pause at the `deploy-backend`, `deploy-netmiko-layer`, and `deploy-frontend` jobs, waiting for approval.
6. Click **Review deployments** → check `prod` → **Approve and deploy**.
7. Confirm all jobs complete successfully.

---

## 7. Workflow Reference

### `ci.yml` — CI Checks

**Trigger:** Every push to `main`, every pull request targeting `main`

**Jobs:**

| Job | Steps | Runtime |
|---|---|---|
| `backend-checks` | `pip install dev deps` → `ruff check .` → `pytest --cov` | ~2–3 min |
| `frontend-checks` | `npm ci` → `tsc --noEmit` → `npm run build` | ~2–4 min |

Both jobs run in **parallel**. Total CI time: ~3–4 minutes.

> [!NOTE]
> pytest runs with `AWS_ACCESS_KEY_ID=testing` and `AWS_SECRET_ACCESS_KEY=testing`. The `moto` library intercepts all boto3 calls and mocks them — no real AWS resources are contacted during tests.

### `deploy-dev.yml` — Dev Deployment

**Trigger:** Push to `main`, or manual `workflow_dispatch`

**Jobs (parallel after ci-gate):**

| Job | What it does |
|---|---|
| `ci-gate` | Re-runs lint + type check as a gate before deploy jobs |
| `deploy-backend` | Packages backend zip → uploads to S3 → calls `aws lambda update-function-code` for all 10 functions sequentially → updates Step Functions ASL |
| `deploy-netmiko-layer` | Only runs when `backend/requirements/worker.txt` changes. Builds arm64 layer with Docker QEMU → publishes new layer version → updates worker + devices functions |
| `deploy-frontend` | `npm ci` → injects `.env.production` from secrets → `npm run build` → `aws s3 sync` with cache headers → CloudFront invalidation |

**Concurrency:** All deploy jobs run in parallel after `ci-gate` passes.

### `deploy-prod.yml` — Prod Deployment

**Trigger:** GitHub Release published (tag format: `v*`)

**Identical to `deploy-dev.yml`** except:
- All jobs reference the `prod` GitHub Environment (triggers the approval gate)
- All resource names end in `-prod`
- Step Functions references `driftguard-collection-prod`

---

## 8. Deployment Triggers

### Deploy to dev

```bash
# Any push to main triggers a dev deploy automatically
git push origin main

# Or trigger manually via GitHub Actions UI
# Go to: Actions → Deploy — dev → Run workflow
```

### Deploy to prod

```bash
# Tag the release commit
git tag -a v1.2.0 -m "Release v1.2.0 — OSPF drift detection improvements"
git push origin v1.2.0

# Then create a GitHub Release from the tag:
# GitHub → Releases → Draft a new release → select tag → Publish release
```

> [!TIP]
> Use **semantic versioning** for release tags: `v{MAJOR}.{MINOR}.{PATCH}`. Example: `v1.0.0` (major), `v1.1.0` (new feature), `v1.1.1` (bugfix).

---

## 9. Secrets Reference

Complete listing of all secrets used across workflows:

| Secret | Scope | Used In | Description |
|---|---|---|---|
| `AWS_ACCESS_KEY_ID` | Repository | All deploy workflows | Shared CI/CD IAM user key ID |
| `AWS_SECRET_ACCESS_KEY` | Repository | All deploy workflows | Shared CI/CD IAM user secret key |
| `AWS_ACCOUNT_ID` | Repository | All deploy workflows | 12-digit AWS account ID (for constructing S3 bucket names and ARNs) |
| `VITE_API_BASE_URL` | dev Environment | `deploy-dev.yml` | API Gateway invoke URL for dev stage |
| `VITE_COGNITO_USER_POOL_ID` | dev Environment | `deploy-dev.yml` | Cognito dev user pool ID |
| `VITE_COGNITO_CLIENT_ID` | dev Environment | `deploy-dev.yml` | Cognito dev app client ID |
| `CLOUDFRONT_DISTRIBUTION_ID_DEV` | dev Environment | `deploy-dev.yml` | CloudFront dev distribution ID for cache invalidation |
| `VITE_API_BASE_URL` | prod Environment | `deploy-prod.yml` | API Gateway invoke URL for prod stage |
| `VITE_COGNITO_USER_POOL_ID` | prod Environment | `deploy-prod.yml` | Cognito prod user pool ID |
| `VITE_COGNITO_CLIENT_ID` | prod Environment | `deploy-prod.yml` | Cognito prod app client ID |
| `CLOUDFRONT_DISTRIBUTION_ID_PROD` | prod Environment | `deploy-prod.yml` | CloudFront prod distribution ID for cache invalidation |

---

## 10. Updating the Shared Lambda Layer

The `driftguard-shared` layer contains `backend/shared/` and must be manually updated whenever the shared Python package changes significantly. The CI/CD pipeline does **not** auto-rebuild this layer (shared code is bundled directly into the backend zip which is always deployed).

> [!NOTE]
> The `backend/shared/` package is included in the deployment zip that CI/CD uploads. Lambda function code (which includes `shared/`) is always up to date after every deploy. The `driftguard-shared` Lambda Layer is only needed for functions that rely on it at the layer level. If you restructure the shared layer, update it manually via the AWS Console and update the Lambda function configurations.

### When to Manually Rebuild the Netmiko Layer

The CI/CD pipeline auto-rebuilds the Netmiko layer when `backend/requirements/worker.txt` changes. If you need to force a rebuild without changing that file:

1. Trigger a manual dispatch: **Actions** → **Deploy — dev** → **Run workflow**.
2. The `deploy-netmiko-layer` job checks for `workflow_dispatch` and always rebuilds on manual triggers.

---

## 11. Rollback Procedure

### Backend Rollback (Lambda)

Lambda keeps the previous deployment package in S3. To roll back:

1. Navigate to **Lambda** → select the affected function.
2. Under **Versions**, identify the previous version ARN.

Or roll back via S3 — keep versioned deployment zips in S3 with timestamped keys:

```bash
# Re-deploy a specific previous zip
aws lambda update-function-code \
  --function-name driftguard-devices-prod \
  --s3-bucket driftguard-snapshots-ACCOUNT_ID-prod \
  --s3-key "deployments/driftguard-backend-v1.1.0.zip"
```

> [!TIP]
> After a confirmed successful prod deploy, tag the deployed zip in S3 with the release version for easy rollback reference.

### Frontend Rollback

Keep the previous `dist/` build as a GitHub Actions artifact. Download it and re-upload to S3:

1. Navigate to **Actions** → the previous successful deploy run → **Artifacts** → download the frontend build.
2. Extract and re-sync to S3.
3. Trigger a CloudFront invalidation.

### Emergency: Revert to a Previous Git Tag

```bash
# Point to the previous release tag
git checkout v1.1.0

# Create a new release from this state to re-trigger the prod pipeline
git tag -a v1.1.1-hotfix -m "Hotfix rollback to v1.1.0 baseline"
git push origin v1.1.1-hotfix
# Then publish a GitHub Release from this tag
```

---

## 12. Troubleshooting

### `aws lambda wait function-updated` hangs

Lambda updates are sequential. If a function is in `InProgress` state and the wait times out:

1. Navigate to **Lambda** → the affected function → **Configuration** → verify the code update completed.
2. Re-run the failed workflow job via **Re-run failed jobs** in the Actions UI.

### CloudFront invalidation fails with `NoSuchDistribution`

The `CLOUDFRONT_DISTRIBUTION_ID_DEV` or `CLOUDFRONT_DISTRIBUTION_ID_PROD` secret is incorrect.

1. Navigate to **CloudFront** → copy the **Distribution ID** (not the domain name).
2. Update the secret in GitHub: **Settings** → **Environments** → correct environment → edit the secret.

### Docker QEMU arm64 layer build times out

The Netmiko arm64 cross-compilation can take 5–8 minutes on GitHub's runners. If it exceeds the job timeout (currently uncapped):

1. Check the Docker container output in the Actions log.
2. If the `pip install` step hangs, the ECR public image may be slow to pull. Retry the job.

### ruff lint fails on push

Run ruff locally before pushing:

```bash
cd backend
pip install ruff
ruff check .
ruff check --fix .  # Auto-fix where possible
```

### tsc type check fails

Run locally:

```bash
cd frontend
npx tsc --noEmit
```

Fix all reported type errors before pushing to main.

### pytest fails with `NoRegionError`

Ensure the test environment variables are set. In CI they are set as `env:` in the workflow. Locally:

```bash
export AWS_DEFAULT_REGION=ap-southeast-1
export AWS_ACCESS_KEY_ID=testing
export AWS_SECRET_ACCESS_KEY=testing
cd backend
pytest
```
