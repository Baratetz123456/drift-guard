# DriftGuard — AWS Console Deployment Guide

> **Region:** ap-southeast-1 (Singapore)  
> **Approach:** Manual AWS Console deployment — no CloudFormation, no SAM CLI  
> **Cost posture:** Near-zero / Free Tier maximized  
> **Environments:** `dev` first, repeat tagged steps for `prod`

> [!IMPORTANT]
> **This guide provisions infrastructure once.** After initial setup is complete, all subsequent code deployments (Lambda updates, frontend rebuilds, Step Functions definition changes) are automated via GitHub Actions CI/CD. See the [CI/CD Guide](file:///d:/DriftGuard/drift-guard/docs/cicd-guide.md) for the automated deployment pipeline.

---

## Table of Contents

1. [Prerequisites & Cost Overview](#1-prerequisites--cost-overview)
2. [IAM — Deployment User & Roles](#2-iam--deployment-user--roles)
3. [KMS — Encryption Key](#3-kms--encryption-key)
4. [DynamoDB — Single-Table Storage](#4-dynamodb--single-table-storage)
5. [S3 — Snapshot Object Storage](#5-s3--snapshot-object-storage)
6. [Cognito — User Authentication](#6-cognito--user-authentication)
7. [Lambda Layers — Shared Code & Netmiko](#7-lambda-layers--shared-code--netmiko)
8. [Lambda Functions — All 10 Functions](#8-lambda-functions--all-10-functions)
9. [Step Functions — Collection Workflow](#9-step-functions--collection-workflow)
10. [API Gateway — REST API](#10-api-gateway--rest-api)
11. [Frontend — S3 Static Hosting + CloudFront](#11-frontend--s3-static-hosting--cloudfront)
12. [Post-Deployment Configuration](#12-post-deployment-configuration)
13. [Repeating for prod Environment](#13-repeating-for-prod-environment)
14. [Cost Estimate Summary](#14-cost-estimate-summary)
15. [Teardown / Cleanup](#15-teardown--cleanup)
16. [Handoff to CI/CD](#16-handoff-to-cicd)

---

## 1. Prerequisites & Cost Overview

### 1.1 What You Need Before Starting

- An AWS account with billing enabled
- A modern web browser (Chrome or Firefox recommended)
- Git and Node.js 20+ installed locally (for building the frontend)
- Python 3.12+ installed locally (for packaging Lambda code)
- A Docker installation (Docker Desktop) — required for building the Netmiko arm64 layer
- The DriftGuard repository cloned locally at `d:\DriftGuard\drift-guard`

### 1.2 Projected Monthly Cost (dev environment, low traffic)

| Service | Configuration | Estimated Cost |
|---|---|---|
| AWS KMS | 1 CMK shared between dev + prod | ~$1.00/month |
| DynamoDB | On-demand, ~1 GB data | Free tier covers first 25 GB |
| S3 (snapshots) | < 5 GB stored, < 20K requests | Free tier covers first year |
| Lambda | 10 functions, < 1M invocations/month | Free tier: 1M requests free forever |
| Step Functions | Express Workflows, < 1M state transitions | Free tier: 4,000 state transitions/month |
| API Gateway | REST API, < 1M calls/month | Free tier: 1M calls/month free for 12 months |
| Cognito | < 50,000 MAUs | Free tier: 50,000 MAUs free forever |
| CloudFront | < 1 TB transfer/month | Free tier: 1 TB/month free for 12 months |
| S3 (frontend) | < 1 GB static files | Free tier covers well within limits |
| CloudWatch Logs | Disabled (per your preference) | $0.00 |
| **Total** | | **~$1.00 – $2.00/month after free tier expires** |

> [!IMPORTANT]
> The $1/month KMS CMK fee is the primary recurring cost. It applies after the first 10,000 API requests/month free.

---

## 2. IAM — Deployment User & Roles

This section creates a dedicated IAM user for deploying DriftGuard, and all the Lambda execution roles.

### 2.1 Create the DriftGuard Deployment User

1. Sign in to the AWS Console as **root** or an existing IAM administrator.
2. Navigate to **IAM** → **Users** → **Create user**.
3. Set **User name:** `driftguard-deployer`
4. Enable **AWS Management Console access** → set a custom password → uncheck "User must create a new password at next sign-in".
5. Click **Next**.
6. On the **Set permissions** page, select **Attach policies directly**.
7. Attach the following AWS managed policies:
   - `AmazonDynamoDBFullAccess`
   - `AmazonS3FullAccess`
   - `AWSLambda_FullAccess`
   - `IAMFullAccess`
   - `AmazonAPIGatewayAdministrator`
   - `AWSKeyManagementServicePowerUser`
   - `AmazonCognitoPowerUser`
   - `AWSStepFunctionsFullAccess`
   - `CloudFrontFullAccess`
8. Click **Next** → **Create user**.
9. Save the Console sign-in URL and credentials securely.

> [!NOTE]
> For production-grade deployments, scope down these policies to the minimum required resources. For now, broad managed policies get you running without permission roadblocks.

### 2.2 Create the Lambda Execution Role

All 10 Lambda functions will share one base execution role, with additional inline policies per function.

1. Navigate to **IAM** → **Roles** → **Create role**.
2. Select **Trusted entity type:** AWS Service → **Use case:** Lambda.
3. Click **Next**.
4. Attach the following managed policies:
   - `AWSLambdaBasicExecutionRole`
5. Click **Next**.
6. Set **Role name:** `driftguard-lambda-exec-dev`
7. Click **Create role**.
8. Open the new role and record its **ARN** — you'll use it for every Lambda function.

> [!NOTE]
> You will attach additional **inline policies** to specific Lambda functions in [Section 8](#8-lambda-functions--all-10-functions) when configuring permissions per function (DynamoDB, S3, KMS access).

### 2.3 Create the Step Functions Execution Role

1. Navigate to **IAM** → **Roles** → **Create role**.
2. Select **Trusted entity type:** AWS Service.
3. In the **Use case** search box, type `Step Functions` → select **Step Functions**.
4. Click **Next** → **Next**.
5. Set **Role name:** `driftguard-stepfunctions-exec-dev`
6. Click **Create role**.
7. Open the new role → **Add permissions** → **Create inline policy**.
8. Switch to the **JSON** editor and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:ap-southeast-1:YOUR_ACCOUNT_ID:function:driftguard-collection-worker-dev"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:UpdateItem",
        "dynamodb:GetItem",
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev"
    }
  ]
}
```

> [!IMPORTANT]
> Replace `YOUR_ACCOUNT_ID` with your 12-digit AWS account ID. You can find it in the top-right dropdown of the AWS Console.

9. Set **Policy name:** `driftguard-sfn-policy-dev` → **Create policy**.

---

## 3. KMS — Encryption Key

DriftGuard uses one Customer Managed Key (CMK) shared between dev and prod to minimize cost ($1/month total instead of $2).

### 3.1 Create the CMK

1. Navigate to **KMS** → **Customer managed keys** → **Create key**.
2. Configure the key:
   - **Key type:** Symmetric
   - **Key usage:** Encrypt and decrypt
3. Click **Next**.
4. Set **Alias:** `alias/driftguard`
5. Set **Description:** `DriftGuard field-level encryption for device credentials and API keys`
6. Click **Next**.
7. Under **Key administrators**, search for and add: `driftguard-deployer`
8. Click **Next**.
9. Under **Key users**, add: `driftguard-lambda-exec-dev`

> [!NOTE]
> When you create the prod Lambda execution role later, add it as a key user here too — this is how one key serves both environments.

10. Click **Next** → **Finish**.
11. Open the newly created key and **record the Key ARN** — format: `arn:aws:kms:ap-southeast-1:ACCOUNT_ID:key/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

## 4. DynamoDB — Single-Table Storage

### 4.1 Create the Table (dev)

1. Navigate to **DynamoDB** → **Tables** → **Create table**.
2. Configure:
   - **Table name:** `DriftGuard-dev`
   - **Partition key:** `PK` (String)
   - **Sort key:** `SK` (String)
3. Under **Table settings**, select **Customize settings**.
4. Under **Table class**, select **DynamoDB Standard** (default).
5. Under **Read/write capacity settings**, select **On-demand** (PAY_PER_REQUEST).

> [!TIP]
> On-demand mode has zero upfront cost and scales to zero when unused. This is ideal for dev environments.

6. Under **Encryption at rest**, keep **Owned by Amazon DynamoDB** (free). Field-level KMS encryption for sensitive content is handled by the application code using the CMK created in Section 3.

7. **Disable** Point-in-time recovery (PITR) — leave it off to avoid the ~$0.20/GB/month charge.

8. Click **Create table** and wait for the status to show **Active**.

### 4.2 Create Global Secondary Indexes (GSI)

After the table is Active:

1. Open the `DriftGuard-dev` table → **Indexes** tab → **Create index**.
2. Create **GSI1**:
   - **Partition key:** `GSI1PK` (String)
   - **Sort key:** `GSI1SK` (String)
   - **Index name:** `GSI1`
   - **Projected attributes:** All
   - Click **Create index** — wait for Active status.
3. Create **GSI2** (click **Create index** again):
   - **Partition key:** `GSI2PK` (String)
   - **Sort key:** `GSI2SK` (String)
   - **Index name:** `GSI2`
   - **Projected attributes:** All
   - Click **Create index** — wait for Active status.

### 4.3 Enable TTL

1. Open the `DriftGuard-dev` table → **Additional settings** tab.
2. Under **Time to Live (TTL)**, click **Enable**.
3. Set **TTL attribute name:** `ttl`
4. Click **Enable TTL**.

---

## 5. S3 — Snapshot Object Storage

### 5.1 Create the Snapshot Bucket

1. Navigate to **S3** → **Create bucket**.
2. Configure:
   - **Bucket name:** `driftguard-snapshots-YOUR_ACCOUNT_ID-dev`  
     *(Replace `YOUR_ACCOUNT_ID` with your 12-digit account ID — S3 bucket names must be globally unique)*
   - **AWS Region:** ap-southeast-1
3. Under **Object Ownership**, select **ACLs disabled** (recommended).
4. Under **Block Public Access settings**, ensure all four checkboxes are **checked** (block all public access).
5. Under **Bucket Versioning**, leave **Disabled**.
6. Under **Default encryption**, select **Server-side encryption with Amazon S3 managed keys (SSE-S3)**.

> [!NOTE]
> Application-level KMS encryption for sensitive content is handled by the Lambda code. SSE-S3 here provides at-rest encryption for raw snapshot text at zero additional cost.

7. Click **Create bucket**.

### 5.2 Configure Lifecycle Rules (Auto-delete old snapshots)

1. Open the bucket → **Management** tab → **Create lifecycle rule**.
2. Configure:
   - **Lifecycle rule name:** `expire-old-snapshots`
   - **Rule scope:** Apply to all objects in the bucket
3. Under **Lifecycle rule actions**, check **Expire current versions of objects**.
4. Set **Days after object creation:** `365`
5. Click **Create rule**.

---

## 6. Cognito — User Authentication

### 6.1 Create the User Pool

1. Navigate to **Cognito** → **User pools** → **Create user pool**.
2. Select **Email** as the sign-in option.
3. Click **Next**.

**Password policy:**
4. Select **Custom** password policy:
   - Minimum length: `12`
   - Require uppercase: checked
   - Require lowercase: checked
   - Require numbers: checked
   - Require symbols: checked
5. Under **Multi-factor authentication**, select **Optional MFA**.
6. Under **MFA methods**, check **Authenticator apps (TOTP)**.
7. Click **Next**.

**Self-registration:**
8. Keep defaults (allow self-registration enabled).
9. Under **Email**, select **Send email with Cognito** (free, no SES setup needed for low volume).
10. Click **Next**.

**User pool name:**
11. Set **User pool name:** `driftguard-users-dev`
12. Under **Hosted authentication pages**, leave unchecked (DriftGuard uses Amplify UI, not Cognito Hosted UI).
13. Click **Next**.

**App client:**
14. Under **App type**, select **Public client** (no client secret).
15. Set **App client name:** `driftguard-web-client`
16. Under **Authentication flows**, check:
    - `ALLOW_USER_SRP_AUTH`
    - `ALLOW_REFRESH_TOKEN_AUTH`
17. Set token validity:
    - Access token: `1 hour`
    - ID token: `1 hour`
    - Refresh token: `30 days`
18. Under **Advanced app client settings** → **Prevent user existence errors:** Enable.
19. Click **Next** → **Create user pool**.

### 6.2 Record the User Pool Outputs

After creation, navigate to the User Pool and record:
- **User Pool ID** — format: `ap-southeast-1_XXXXXXXXX`
- **App client ID** — found under **App integration** → **App clients and analytics** tab

> [!IMPORTANT]
> These two values must be set in the frontend's Amplify configuration. You will use them in [Section 12](#12-post-deployment-configuration).

---

## 7. Lambda Layers — Shared Code & Netmiko

DriftGuard requires two Lambda layers:
1. **`driftguard-shared`** — the `backend/shared/` Python package
2. **`driftguard-netmiko`** — Netmiko + Paramiko SSH library (must be built on Amazon Linux 2023 for arm64)

### 7.1 Build the Shared Layer (Windows)

The shared layer packages the `backend/shared/` directory.

Open PowerShell in `d:\DriftGuard\drift-guard\backend\` and run:

```powershell
# Create staging directory
New-Item -ItemType Directory -Path layers\staging\shared-layer\python -Force

# Copy the shared package
Copy-Item -Recurse shared\ layers\staging\shared-layer\python\shared\

# Zip it
Compress-Archive -Path layers\staging\shared-layer\python `
  -DestinationPath layers\driftguard-shared-layer.zip -Force
```

### 7.2 Build the Netmiko Layer (arm64 / Amazon Linux 2023)

Netmiko must be compiled on Amazon Linux 2023 to match the Lambda runtime. Use Docker:

```powershell
# From d:\DriftGuard\drift-guard\backend\
docker run --rm --platform linux/arm64 `
  -v "${PWD}\layers:/output" `
  public.ecr.aws/sam/build-python3.12:latest-arm64 `
  /bin/bash -c "pip install netmiko -t /output/staging/netmiko-layer/python/ && echo Done"

# Zip the output
Compress-Archive -Path layers\staging\netmiko-layer\python `
  -DestinationPath layers\driftguard-netmiko-layer.zip -Force
```

> [!NOTE]
> If Docker is not available, use AWS CloudShell (browser-based) as an alternative. In CloudShell (Singapore region), run:
> ```bash
> mkdir -p python && pip install netmiko -t python/
> zip -r driftguard-netmiko-layer.zip python/
> ```
> Then download the zip and upload it as shown in 7.4.

### 7.3 Upload the Shared Layer

1. Navigate to **Lambda** → **Layers** → **Create layer**.
2. Configure:
   - **Name:** `driftguard-shared`
   - **Upload a .zip file** → upload `layers\driftguard-shared-layer.zip`
   - **Compatible runtimes:** Python 3.12
   - **Compatible architectures:** arm64
3. Click **Create**.
4. Record the full **Layer ARN** (including version number) — format: `arn:aws:lambda:ap-southeast-1:ACCOUNT_ID:layer:driftguard-shared:1`

### 7.4 Upload the Netmiko Layer

1. Navigate to **Lambda** → **Layers** → **Create layer**.
2. Configure:
   - **Name:** `driftguard-netmiko`
   - **Upload a .zip file** → upload `layers\driftguard-netmiko-layer.zip`
   - **Compatible runtimes:** Python 3.12
   - **Compatible architectures:** arm64
3. Click **Create**.
4. Record the full **Layer ARN** (including version number).

> [!IMPORTANT]
> Lambda layers have a 250 MB unzipped size limit. The Netmiko layer is approximately 120 MB unzipped. If it exceeds the limit, split `cryptography` into its own separate layer.

---

## 8. Lambda Functions — All 10 Functions

### 8.1 Package the Backend Code

All Lambda functions share a single deployment package containing the full `backend/` source tree.

In PowerShell from `d:\DriftGuard\drift-guard\backend\`:

```powershell
# Install Python dependencies into a vendor/ directory
pip install -r requirements\base.txt -t vendor\

# Create a staging directory with all source + vendored deps
New-Item -ItemType Directory -Path staging_deploy -Force
Copy-Item -Recurse functions staging_deploy\
Copy-Item -Recurse shared staging_deploy\
Copy-Item -Recurse vendor\* staging_deploy\

# Zip everything
Compress-Archive -Path staging_deploy\* `
  -DestinationPath ..\driftguard-backend.zip -Force

# Clean up staging
Remove-Item -Recurse staging_deploy
```

### 8.2 Upload the Deployment Package to S3

1. Navigate to **S3** → open the `driftguard-snapshots-YOUR_ACCOUNT_ID-dev` bucket.
2. Click **Create folder** → name it `deployments` → **Create folder**.
3. Open the `deployments/` folder → **Upload** → add `driftguard-backend.zip` → **Upload**.
4. Record the S3 URI: `s3://driftguard-snapshots-YOUR_ACCOUNT_ID-dev/deployments/driftguard-backend.zip`

### 8.3 Common Lambda Creation Steps

For each function below, follow this creation flow:

1. Navigate to **Lambda** → **Functions** → **Create function**.
2. Select **Author from scratch**.
3. Set the **Function name** (see per-function table in 8.5).
4. Set **Runtime:** Python 3.12
5. Set **Architecture:** arm64
6. Under **Permissions**, select **Use an existing role** → choose `driftguard-lambda-exec-dev`.
7. Click **Create function**.
8. On the function page → **Code** tab → **Upload from** → **Amazon S3 location**.
9. Enter the S3 URI from 8.2 → **Save**.
10. Update the **Handler** under **Code** → **Runtime settings** → **Edit** (see per-function table in 8.5).
11. Navigate to **Configuration** → **General configuration** → **Edit** → set Timeout and Memory (see 8.5).
12. Navigate to **Configuration** → **Environment variables** → **Edit** → add all variables from 8.4.
13. Navigate to **Configuration** → **Layers** → **Add a layer** → **Custom layers** → add the Shared Layer ARN (and Netmiko layer ARN for worker/devices functions — see 8.5).

### 8.4 Environment Variables (All Functions)

Set these environment variables on **every** Lambda function:

| Key | Value |
|---|---|
| `TABLE_NAME` | `DriftGuard-dev` |
| `BUCKET_NAME` | `driftguard-snapshots-YOUR_ACCOUNT_ID-dev` |
| `KMS_KEY_ID` | `arn:aws:kms:ap-southeast-1:YOUR_ACCOUNT_ID:key/YOUR_KEY_ID` |
| `ENVIRONMENT` | `dev` |

> [!NOTE]
> The `KMS_KEY_ID` value is the full Key ARN you recorded in [Section 3.1](#31-create-the-cmk).

### 8.5 Function Reference Table

| Function Name | Handler | Timeout | Memory | Extra Layers |
|---|---|---|---|---|
| `driftguard-settings-dev` | `functions.settings.handler.lambda_handler` | 10s | 128 MB | Shared only |
| `driftguard-devices-dev` | `functions.devices.handler.lambda_handler` | 60s | 256 MB | Shared + Netmiko |
| `driftguard-commands-dev` | `functions.commands.handler.lambda_handler` | 10s | 128 MB | Shared only |
| `driftguard-collection-orchestrator-dev` | `functions.collection_orchestrator.handler.lambda_handler` | 15s | 256 MB | Shared only |
| `driftguard-collection-worker-dev` | `functions.collection_worker.handler.lambda_handler` | 300s | 512 MB | Shared + Netmiko |
| `driftguard-snapshots-dev` | `functions.snapshots.handler.lambda_handler` | 15s | 256 MB | Shared only |
| `driftguard-compare-dev` | `functions.compare.handler.lambda_handler` | 60s | 512 MB | Shared only |
| `driftguard-ai-analyze-dev` | `functions.ai_analyze.handler.lambda_handler` | 120s | 256 MB | Shared only |
| `driftguard-history-dev` | `functions.history.handler.lambda_handler` | 15s | 128 MB | Shared only |
| `driftguard-audit-dev` | `functions.audit.handler.lambda_handler` | 10s | 128 MB | Shared only |

> [!NOTE]
> The **collection-orchestrator** function also needs the `STATE_MACHINE_ARN` environment variable. Add it after completing [Section 9](#9-step-functions--collection-workflow).

### 8.6 Per-Function IAM Inline Policies

After creating each function, navigate to its **Configuration** → **Permissions** → click the execution role link → **Add permissions** → **Create inline policy** → switch to the **JSON** editor.

#### driftguard-settings-dev — Policy name: `driftguard-settings-policy-dev`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev"
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "arn:aws:kms:ap-southeast-1:YOUR_ACCOUNT_ID:key/YOUR_KEY_ID"
    }
  ]
}
```

#### driftguard-devices-dev — Policy name: `driftguard-devices-policy-dev`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query"],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev",
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "arn:aws:kms:ap-southeast-1:YOUR_ACCOUNT_ID:key/YOUR_KEY_ID"
    }
  ]
}
```

#### driftguard-commands-dev — Policy name: `driftguard-commands-policy-dev`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev"
    }
  ]
}
```

#### driftguard-collection-orchestrator-dev — Policy name: `driftguard-orchestrator-policy-dev`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query"],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev",
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "states:StartExecution",
      "Resource": "arn:aws:states:ap-southeast-1:YOUR_ACCOUNT_ID:stateMachine:driftguard-collection-dev"
    }
  ]
}
```

> [!NOTE]
> The Step Functions ARN does not exist yet — add this policy after completing [Section 9](#9-step-functions--collection-workflow).

#### driftguard-collection-worker-dev — Policy name: `driftguard-worker-policy-dev`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev",
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::driftguard-snapshots-YOUR_ACCOUNT_ID-dev/*"
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "arn:aws:kms:ap-southeast-1:YOUR_ACCOUNT_ID:key/YOUR_KEY_ID"
    }
  ]
}
```

#### driftguard-snapshots-dev — Policy name: `driftguard-snapshots-policy-dev`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:DeleteItem"],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev",
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::driftguard-snapshots-YOUR_ACCOUNT_ID-dev/*"
    }
  ]
}
```

#### driftguard-compare-dev — Policy name: `driftguard-compare-policy-dev`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query"],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev",
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::driftguard-snapshots-YOUR_ACCOUNT_ID-dev/*"
    }
  ]
}
```

#### driftguard-ai-analyze-dev — Policy name: `driftguard-ai-analyze-policy-dev`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev",
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::driftguard-snapshots-YOUR_ACCOUNT_ID-dev/*"
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt"],
      "Resource": "arn:aws:kms:ap-southeast-1:YOUR_ACCOUNT_ID:key/YOUR_KEY_ID"
    }
  ]
}
```

#### driftguard-history-dev — Policy name: `driftguard-history-policy-dev`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:Query"],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev",
        "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::driftguard-snapshots-YOUR_ACCOUNT_ID-dev/*"
    }
  ]
}
```

#### driftguard-audit-dev — Policy name: `driftguard-audit-policy-dev`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/DriftGuard-dev"
    }
  ]
}
```

---

## 9. Step Functions — Collection Workflow

### 9.1 Create the State Machine

1. Navigate to **Step Functions** → **State machines** → **Create state machine**.
2. Select **Write your workflow in code** (not the visual editor).
3. Set **Type:** Express

> [!IMPORTANT]
> **Why Express, not Standard:** Express Workflows charge per execution-duration, not per state transition. For DriftGuard's collection jobs (parallel device collection, typically under 5 minutes total), Express is significantly cheaper. Standard Workflows charge $0.025 per 1,000 state transitions. Express charges $0.00001 per state transition plus duration — far cheaper at low volumes.

4. In the **Definition** editor, paste the following ASL (substitute your real `YOUR_ACCOUNT_ID`):

```json
{
  "Comment": "DriftGuard Collection Workflow — Orchestrates parallel device data collection",
  "StartAt": "ValidateInput",
  "States": {
    "ValidateInput": {
      "Type": "Pass",
      "Next": "CollectFromDevices"
    },
    "CollectFromDevices": {
      "Type": "Map",
      "ItemsPath": "$.devices",
      "MaxConcurrency": 10,
      "ItemProcessor": {
        "ProcessorConfig": {
          "Mode": "INLINE"
        },
        "StartAt": "CollectFromDevice",
        "States": {
          "CollectFromDevice": {
            "Type": "Task",
            "Resource": "arn:aws:states:::lambda:invoke",
            "Parameters": {
              "FunctionName": "arn:aws:lambda:ap-southeast-1:YOUR_ACCOUNT_ID:function:driftguard-collection-worker-dev",
              "Payload": {
                "userId.$": "$.userId",
                "jobId.$": "$.jobId",
                "deviceId.$": "$.deviceId",
                "deviceSK.$": "$.deviceSK",
                "label.$": "$.label",
                "changeLabel.$": "$.changeLabel",
                "commands.$": "$.commands"
              }
            },
            "ResultPath": "$.result",
            "ResultSelector": {
              "statusCode.$": "$.Payload.statusCode",
              "body.$": "$.Payload.body"
            },
            "Retry": [
              {
                "ErrorEquals": ["Lambda.ServiceException", "Lambda.AWSLambdaException"],
                "IntervalSeconds": 2,
                "MaxAttempts": 2,
                "BackoffRate": 2
              }
            ],
            "Catch": [
              {
                "ErrorEquals": ["States.ALL"],
                "ResultPath": "$.error",
                "Next": "HandleDeviceError"
              }
            ],
            "End": true
          },
          "HandleDeviceError": {
            "Type": "Pass",
            "Parameters": {
              "deviceId.$": "$.deviceId",
              "status": "FAILED",
              "error.$": "$.error.Cause"
            },
            "ResultPath": "$.result",
            "End": true
          }
        }
      },
      "ResultPath": "$.collectionResults",
      "Next": "UpdateJobStatus"
    },
    "UpdateJobStatus": {
      "Type": "Task",
      "Resource": "arn:aws:states:::dynamodb:updateItem",
      "Parameters": {
        "TableName": "DriftGuard-dev",
        "Key": {
          "PK": { "S.$": "$.PK" },
          "SK": { "S.$": "$.SK" }
        },
        "UpdateExpression": "SET #status = :status, completedAt = :completedAt, collectionResults = :results",
        "ExpressionAttributeNames": {
          "#status": "status"
        },
        "ExpressionAttributeValues": {
          ":status": { "S": "COMPLETED" },
          ":completedAt": { "S.$": "$$.State.EnteredTime" },
          ":results": { "S.$": "States.JsonToString($.collectionResults)" }
        }
      },
      "End": true
    }
  }
}
```

5. Under **Permissions**, select **Choose an existing role** → `driftguard-stepfunctions-exec-dev`.
6. Under **Logging**, set to **OFF**.
7. Click **Next**.
8. Set **State machine name:** `driftguard-collection-dev`
9. Click **Create state machine**.
10. Record the **State Machine ARN** — format: `arn:aws:states:ap-southeast-1:YOUR_ACCOUNT_ID:stateMachine:driftguard-collection-dev`

### 9.2 Update the Collection Orchestrator Lambda

1. Navigate to **Lambda** → `driftguard-collection-orchestrator-dev`.
2. **Configuration** → **Environment variables** → **Edit**.
3. Add: `STATE_MACHINE_ARN` = `arn:aws:states:ap-southeast-1:YOUR_ACCOUNT_ID:stateMachine:driftguard-collection-dev`
4. Click **Save**.
5. Now add the inline policy `driftguard-orchestrator-policy-dev` from [Section 8.6](#driftguard-collection-orchestrator-dev--policy-name-driftguard-orchestrator-policy-dev) if not already done.

---

## 10. API Gateway — REST API

### 10.1 Create the REST API

1. Navigate to **API Gateway** → **Create API**.
2. Select **REST API** (not HTTP API — the Cognito Authorizer requires REST API).
3. Select **New API**.
4. Configure:
   - **API name:** `driftguard-api-dev`
   - **Description:** `DriftGuard REST API — dev environment`
   - **API endpoint type:** Regional
5. Click **Create API**.

### 10.2 Create the Cognito Authorizer

1. In the left panel, click **Authorizers** → **Create authorizer**.
2. Configure:
   - **Authorizer name:** `CognitoAuthorizer`
   - **Authorizer type:** Cognito
   - **Cognito User Pool:** select `driftguard-users-dev`
   - **Token source:** `Authorization`
3. Click **Create authorizer**.

### 10.3 Create Resources

Use the API Gateway console to build the resource tree. Select the root `/` → **Create resource** for each path segment.

**Resource tree to build:**

```
/
├── settings
├── devices
│   └── {deviceId}
│       └── test
├── command-sets
│   └── {setId}
├── collections
│   └── {jobId}
├── snapshots
│   └── {snapshotId}
├── comparisons
│   └── {comparisonId}
│       └── analyze
├── history
├── export
│   ├── comparison
│   │   └── {comparisonId}
│   └── analysis
│       └── {analysisId}
└── audit-logs
```

For each resource:
1. Select the parent resource → **Create resource**.
2. Set **Resource name** and **Resource path** (for path parameters like `{deviceId}`, include the curly braces in the resource path).
3. Click **Create resource**.

### 10.4 Create Methods

For each route in the table below:
1. Select the resource in the tree.
2. Click **Create method** → select the HTTP verb → **Create method**.
3. Configure:
   - **Integration type:** Lambda function
   - **Lambda proxy integration:** Enabled
   - **Lambda function:** type the function name (e.g. `driftguard-settings-dev`)
   - **Region:** ap-southeast-1
4. Click **Save**.
5. After saving, click the method → **Method request** → **Authorization** → select `CognitoAuthorizer` → **Save**.

**Complete Route Table:**

| Method | Resource Path | Lambda Function |
|---|---|---|
| `GET` | `/settings` | `driftguard-settings-dev` |
| `PUT` | `/settings` | `driftguard-settings-dev` |
| `GET` | `/devices` | `driftguard-devices-dev` |
| `POST` | `/devices` | `driftguard-devices-dev` |
| `GET` | `/devices/{deviceId}` | `driftguard-devices-dev` |
| `PUT` | `/devices/{deviceId}` | `driftguard-devices-dev` |
| `DELETE` | `/devices/{deviceId}` | `driftguard-devices-dev` |
| `POST` | `/devices/{deviceId}/test` | `driftguard-devices-dev` |
| `GET` | `/command-sets` | `driftguard-commands-dev` |
| `POST` | `/command-sets` | `driftguard-commands-dev` |
| `GET` | `/command-sets/{setId}` | `driftguard-commands-dev` |
| `PUT` | `/command-sets/{setId}` | `driftguard-commands-dev` |
| `DELETE` | `/command-sets/{setId}` | `driftguard-commands-dev` |
| `POST` | `/collections` | `driftguard-collection-orchestrator-dev` |
| `GET` | `/collections` | `driftguard-collection-orchestrator-dev` |
| `GET` | `/collections/{jobId}` | `driftguard-collection-orchestrator-dev` |
| `DELETE` | `/collections/{jobId}` | `driftguard-collection-orchestrator-dev` |
| `GET` | `/snapshots` | `driftguard-snapshots-dev` |
| `GET` | `/snapshots/{snapshotId}` | `driftguard-snapshots-dev` |
| `DELETE` | `/snapshots/{snapshotId}` | `driftguard-snapshots-dev` |
| `POST` | `/comparisons` | `driftguard-compare-dev` |
| `GET` | `/comparisons` | `driftguard-compare-dev` |
| `GET` | `/comparisons/{comparisonId}` | `driftguard-compare-dev` |
| `DELETE` | `/comparisons/{comparisonId}` | `driftguard-compare-dev` |
| `POST` | `/comparisons/{comparisonId}/analyze` | `driftguard-ai-analyze-dev` |
| `GET` | `/history` | `driftguard-history-dev` |
| `GET` | `/export/comparison/{comparisonId}` | `driftguard-history-dev` |
| `GET` | `/export/analysis/{analysisId}` | `driftguard-history-dev` |
| `GET` | `/audit-logs` | `driftguard-audit-dev` |

### 10.5 Enable CORS

For each resource that has methods, enable CORS:

1. Select the resource → **Enable CORS** (button at the top of the resource detail panel).
2. Configure:
   - **Access-Control-Allow-Origin:** `*` (update to your CloudFront URL after Section 11)
   - **Access-Control-Allow-Headers:** `Content-Type,Authorization`
   - **Access-Control-Allow-Methods:** Select all methods present on that resource
3. Click **Save**.

### 10.6 Deploy the API

1. Click **Deploy API** (top toolbar).
2. **Deployment stage:** `[New Stage]`
3. **Stage name:** `v1`
4. Click **Deploy**.
5. Record the **Invoke URL** — format: `https://XXXXXXXX.execute-api.ap-southeast-1.amazonaws.com/v1`

---

## 11. Frontend — S3 Static Hosting + CloudFront

### 11.1 Build the Frontend

In PowerShell from `d:\DriftGuard\drift-guard\frontend\`:

```powershell
# Install dependencies
npm install

# Create production environment file
$envContent = @"
VITE_API_BASE_URL=https://XXXXXXXX.execute-api.ap-southeast-1.amazonaws.com/v1
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_REGION=ap-southeast-1
"@
$envContent | Out-File -FilePath .env.production -Encoding utf8

# Build the production bundle
npm run build
```

The build output will be in `frontend/dist/`.

### 11.2 Create the Frontend S3 Bucket

1. Navigate to **S3** → **Create bucket**.
2. Configure:
   - **Bucket name:** `driftguard-frontend-YOUR_ACCOUNT_ID-dev`
   - **AWS Region:** ap-southeast-1
3. Under **Block Public Access settings**, **uncheck** all four options.

> [!NOTE]
> The bucket itself is not publicly accessible — CloudFront's Origin Access Control (OAC) policy restricts access to CloudFront only. Unchecking "Block Public Access" is required to allow CloudFront's policy to take effect.

4. Leave all other settings default → **Create bucket**.

### 11.3 Upload the Frontend Build

1. Open the `driftguard-frontend-YOUR_ACCOUNT_ID-dev` bucket.
2. Click **Upload** → **Add files** and **Add folder**.
3. Navigate to `d:\DriftGuard\drift-guard\frontend\dist\` and select all files and folders.
4. Click **Upload**.

### 11.4 Create CloudFront Distribution

1. Navigate to **CloudFront** → **Distributions** → **Create distribution**.
2. Under **Origin domain**, select `driftguard-frontend-YOUR_ACCOUNT_ID-dev.s3.ap-southeast-1.amazonaws.com`.
3. Under **Origin access**, select **Origin access control settings (recommended)**.
4. Click **Create new OAC** → keep the defaults → **Create**.
5. Under **Default cache behavior**:
   - **Viewer protocol policy:** Redirect HTTP to HTTPS
   - **Allowed HTTP methods:** GET, HEAD
   - **Cache policy:** CachingOptimized
6. Under **Settings**:
   - **Default root object:** `index.html`
   - **Price class:** Use only Asia, Middle East, and Africa
7. Click **Create distribution**.
8. A banner will appear: **"Copy the S3 bucket policy"** — copy it and save it for the next step.

### 11.5 Apply the S3 Bucket Policy for CloudFront OAC

1. Navigate to **S3** → `driftguard-frontend-YOUR_ACCOUNT_ID-dev` → **Permissions** tab → **Bucket policy** → **Edit**.
2. Paste the CloudFront-generated policy (from step 11.4.8). It will look like:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::driftguard-frontend-YOUR_ACCOUNT_ID-dev/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

3. Click **Save changes**.

### 11.6 Configure SPA Routing

React Router handles client-side navigation. Without this step, direct URL access returns a 403 or 404 from CloudFront.

1. Navigate to **CloudFront** → your distribution → **Error pages** tab → **Create custom error response**.
2. Create the first error response:
   - **HTTP error code:** 403
   - **Customize error response:** Yes
   - **Response page path:** `/index.html`
   - **HTTP response code:** 200
   - Click **Create custom error response**.
3. Create the second error response:
   - **HTTP error code:** 404
   - **Customize error response:** Yes
   - **Response page path:** `/index.html`
   - **HTTP response code:** 200
   - Click **Create custom error response**.

### 11.7 Record the CloudFront URL

1. Wait for the distribution **Status** to show **Deployed** (typically 5–15 minutes).
2. Record the **Distribution domain name** — format: `https://dXXXXXXXXXXXX.cloudfront.net`

### 11.8 Update API Gateway CORS

Return to **API Gateway** → `driftguard-api-dev`:
1. For every resource, update **Enable CORS** → set **Access-Control-Allow-Origin** to: `https://dXXXXXXXXXXXX.cloudfront.net`
2. Re-deploy the API to stage `v1`.

---

## 12. Post-Deployment Configuration

### 12.1 Rebuild Frontend With Correct Values

If the CloudFront URL was not known before the initial build, rebuild:

```powershell
# From d:\DriftGuard\drift-guard\frontend\
# Update .env.production with correct values, then:
npm run build
```

Re-upload `dist/` contents to S3, then invalidate the CloudFront cache:
1. Navigate to **CloudFront** → your distribution → **Invalidations** tab → **Create invalidation**.
2. Set **Object paths:** `/*`
3. Click **Create invalidation**.

### 12.2 Create Your First Cognito User

1. Navigate to **Cognito** → `driftguard-users-dev` → **Users** tab → **Create user**.
2. Configure:
   - **Invitation message:** Send an email invitation
   - **Email address:** your email address
   - **Temporary password:** set a temporary password
3. Click **Create user**.
4. Open `https://dXXXXXXXXXXXX.cloudfront.net` in your browser and sign in — Cognito will prompt you to set a permanent password.

### 12.3 Verify End-to-End Connectivity

Work through this checklist after signing in:

- [ ] Login page loads without console errors
- [ ] Sign-in completes and redirects to the dashboard
- [ ] Navigate to **Settings** → configure an OpenAI API key → save
- [ ] Navigate to **Devices** → register a test device
- [ ] On the device, click **Test** → confirm SSH reachability test returns a result
- [ ] Navigate to **Command sets** → confirm the default command set is visible
- [ ] Trigger a collection run → confirm job status transitions to Completed

---

## 13. Repeating for `prod` Environment

To deploy the prod environment, repeat all sections with these naming substitutions:

| dev resource | prod resource |
|---|---|
| `DriftGuard-dev` | `DriftGuard-prod` |
| `driftguard-snapshots-ACCTID-dev` | `driftguard-snapshots-ACCTID-prod` |
| `driftguard-users-dev` | `driftguard-users-prod` |
| `driftguard-lambda-exec-dev` | `driftguard-lambda-exec-prod` |
| `driftguard-stepfunctions-exec-dev` | `driftguard-stepfunctions-exec-prod` |
| `driftguard-collection-dev` | `driftguard-collection-prod` |
| `driftguard-api-dev` | `driftguard-api-prod` |
| `driftguard-frontend-ACCTID-dev` | `driftguard-frontend-ACCTID-prod` |
| `ENVIRONMENT=dev` | `ENVIRONMENT=prod` |
| All function names: `...-dev` | `...-prod` |

**KMS key reuse for prod (cost saving):**  
Use the same `alias/driftguard` key. After creating `driftguard-lambda-exec-prod`:
1. Navigate to **KMS** → open `alias/driftguard` → **Key users** tab → **Add** → select `driftguard-lambda-exec-prod`.

**DynamoDB for prod — re-enable PITR:**  
For the prod table, enable Point-in-Time Recovery:
- Open `DriftGuard-prod` → **Additional settings** → **Point-in-time recovery** → **Enable**.

---

## 14. Cost Estimate Summary

### During AWS Free Tier (First 12 Months)

| Service | Free Tier Limit | Cost |
|---|---|---|
| Lambda | 1M requests/month + 400K GB-seconds | $0.00 |
| API Gateway | 1M REST API calls/month | $0.00 |
| DynamoDB | 25 GB storage | $0.00 |
| S3 (snapshots + frontend) | 5 GB, 20K GET, 2K PUT | $0.00 |
| CloudFront | 1 TB transfer + 10M requests | $0.00 |
| Cognito | 50,000 MAUs | $0.00 |
| Step Functions Express | 4,000 state transitions | $0.00 |
| CloudWatch Logs | Disabled | $0.00 |
| KMS CMK | 10,000 requests free/month | ~$1.00 |
| **Total** | | **~$1.00/month** |

### After Free Tier Expires

| Service | Estimate |
|---|---|
| KMS CMK | $1.00/month (1 key, shared dev + prod) |
| Lambda | $0.00 – $0.50/month |
| DynamoDB | $0.00 – $1.00/month |
| S3 | $0.03/GB/month |
| API Gateway | $3.50 per million API calls |
| CloudFront | $0.012/GB (Asia-Pacific egress) |
| **Total** | **~$1.00 – $5.00/month** |

---

## 15. Teardown / Cleanup

Delete resources in this order to avoid dependency errors:

1. **CloudFront** → select distribution → **Disable** → wait → **Delete**
2. **S3** → `driftguard-frontend-*` bucket → **Empty** → **Delete**
3. **S3** → `driftguard-snapshots-*` bucket → **Empty** → **Delete**
4. **API Gateway** → delete `driftguard-api-dev` and `driftguard-api-prod`
5. **Step Functions** → delete `driftguard-collection-dev` and `driftguard-collection-prod`
6. **Lambda** → delete all 10 dev functions → all 10 prod functions
7. **Lambda** → **Layers** → delete `driftguard-shared` and `driftguard-netmiko` (all versions)
8. **Cognito** → delete `driftguard-users-dev` and `driftguard-users-prod`
9. **DynamoDB** → delete `DriftGuard-dev` and `DriftGuard-prod`
10. **KMS** → select `alias/driftguard` → **Schedule key deletion** → set 7-day waiting period → confirm
11. **IAM** → delete all roles and inline policies
12. **IAM** → **Users** → delete `driftguard-deployer`

> [!CAUTION]
> Deleting the KMS key is permanent and irreversible. Any data encrypted with it — device SSH credentials and OpenAI API keys stored in DynamoDB — will be permanently unrecoverable. Schedule deletion only when the environment is fully decommissioned.

---

## 16. Handoff to CI/CD

Once all infrastructure in this guide is provisioned and verified end-to-end, subsequent code deployments are fully automated. Manual console deploys are no longer required.

### What CI/CD Automates

| Trigger | What Gets Deployed |
|---|---|
| Push to `main` | All 10 Lambda functions (dev), Step Functions ASL (dev), Frontend (dev) |
| GitHub Release published | All 10 Lambda functions (prod), Step Functions ASL (prod), Frontend (prod) — after manual approval |
| `backend/requirements/worker.txt` changed | Netmiko arm64 Lambda layer rebuild + republish |

### What CI/CD Does NOT Automate

The following changes still require manual AWS Console intervention:

| Change | Manual Action Required |
|---|---|
| Adding a new Lambda function | Create function manually → CI/CD will update its code automatically thereafter |
| Adding a new API Gateway route | Add resource + method in API Gateway console → redeploy the stage |
| Modifying DynamoDB GSIs | Apply index changes in DynamoDB console (cannot be done in-place without downtime) |
| Rotating the KMS key | KMS key rotation is enabled by default annually; manual schedule via KMS console |
| Creating a new Cognito User Pool | Manual provisioning only |
| Changing CloudFront behaviors | Update distribution settings in CloudFront console |
| Modifying IAM roles or inline policies | Update via IAM console |

### Setup Checklist (One-Time)

Complete these steps after finishing the AWS guide to activate CI/CD:

- [ ] Create `driftguard-cicd` IAM user with programmatic access (see [CI/CD Guide Section 3](file:///d:/DriftGuard/drift-guard/docs/cicd-guide.md))
- [ ] Create `dev` and `prod` GitHub Environments with required reviewer on `prod`
- [ ] Add all repository-level and environment-level secrets to GitHub
- [ ] Push a commit to `main` to trigger the first automated dev deploy
- [ ] Verify the dev deploy completes successfully
- [ ] Create a `v0.1.0` GitHub Release to trigger and verify the first prod deploy

> [!TIP]
> The full CI/CD setup procedure, all secrets reference, rollback procedures, and troubleshooting guide are documented in [docs/cicd-guide.md](file:///d:/DriftGuard/drift-guard/docs/cicd-guide.md).
