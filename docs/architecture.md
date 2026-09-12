# DriftGuard System Architecture & Communication Specification

> **DriftGuard**: *"Before. After. Understood."*  
> Enterprise Network State Verification & Drift Analysis Platform

---

## 1. Executive Summary & Design Principles

DriftGuard is an enterprise desktop verification instrument engineered to capture, analyze, and diff network device configurations and operational states before and after maintenance windows. Built on a serverless AWS foundation with a React 19 desktop frontend, the system guarantees operational safety, cryptographic security, and predictable resource utilization within AWS Free Tier limits.

### Core Architectural Tenets
- **Cisco Read-Only Enforcement**: Execution of state-mutating commands (`configure terminal`, `reload`, `write erase`, etc.) is blocked at the application and protocol layer. DriftGuard executes strict `show` inspection commands only.
- **Envelope Encryption**: Device SSH credentials and AI provider keys are encrypted before persistence in DynamoDB using dedicated AWS KMS Customer Master Keys (CMKs).
- **Hybrid Data Tiering**: DynamoDB single-table design houses relational entities and small CLI outputs (< 4 KB), while large snapshot dumps and structural diffs are offloaded to Amazon S3 with automated 365-day lifecycle rules.
- **Free-Tier Abuse Shielding**: Granular API Gateway throttling protects downstream compute, AI tokens, and physical networking hardware from automated abuse and runaway billing.

---

## 2. System Context & Architecture Topology

The DriftGuard architecture spans client-side desktop execution, edge content delivery, serverless API microservices, asynchronous workflow orchestration, secure storage, and external network targets.

```mermaid
graph TB
    subgraph "Client Layer"
        User[Network Engineer / Browser]
        SPA[React 19 + TypeScript SPA<br/>Zustand State Store]
    end

    subgraph "Edge & Identity (AWS)"
        CF[Amazon CloudFront CDN<br/>Static Web Distribution]
        S3_Web[(S3 Web Bucket<br/>Static Assets)]
        Cognito[Amazon Cognito User Pool<br/>JWT Authentication]
    end

    subgraph "API & Ingress (AWS)"
        APIGW[Amazon API Gateway REST v1<br/>Stage: v1 with Method Throttling]
    end

    subgraph "Compute Microservices (AWS Lambda)"
        Fn_Auth[Settings / Auth Function]
        Fn_Dev[Devices Function]
        Fn_Cmd[Commands Function]
        Fn_Orch[Collection Orchestrator]
        Fn_Worker[Collection Worker<br/>Netmiko SSH]
        Fn_Snap[Snapshots Function]
        Fn_Comp[Compare Function]
        Fn_AI[AI Analyze Function]
        Fn_Audit[Audit Function]
    end

    subgraph "Orchestration & Workflows (AWS)"
        SFN[AWS Step Functions<br/>Collection State Machine]
    end

    subgraph "Data & Security (AWS)"
        DDB[(Amazon DynamoDB<br/>DeltaNet-env Single-Table)]
        S3_Data[(Amazon S3<br/>Snapshots & Diffs Bucket)]
        KMS[AWS KMS<br/>alias/deltanet-env]
    end

    subgraph "External Targets"
        Routers[Cisco IOS / XE / XR / NX-OS<br/>Arista EOS / Juniper Junos]
        LLM[AI Provider API<br/>OpenRouter / OpenAI]
    end

    %% Client Interactions
    User -->|HTTPS| CF
    CF -->|Origin Access Control| S3_Web
    User -->|Sign In / SRP Auth| Cognito
    SPA -->|Bearer JWT + HTTPS| APIGW

    %% Ingress to Lambda
    APIGW -->|Cognito Authorizer| Fn_Auth
    APIGW -->|Cognito Authorizer| Fn_Dev
    APIGW -->|Cognito Authorizer| Fn_Cmd
    APIGW -->|Cognito Authorizer| Fn_Orch
    APIGW -->|Cognito Authorizer| Fn_Snap
    APIGW -->|Cognito Authorizer| Fn_Comp
    APIGW -->|Cognito Authorizer| Fn_AI
    APIGW -->|Cognito Authorizer| Fn_Audit

    %% Orchestration
    Fn_Orch -->|StartExecution| SFN
    SFN -->|Task State Invoke| Fn_Worker

    %% Worker Execution
    Fn_Worker -->|Decrypt SSH Password| KMS
    Fn_Worker -->|SSH port 22 show cmds| Routers
    Fn_Worker -->|Write Snapshot Metadata| DDB
    Fn_Worker -->|Write Raw CLI Output > 4KB| S3_Data

    %% AI Analysis Execution
    Fn_AI -->|Decrypt API Key| KMS
    Fn_AI -->|Read Diff Payload| S3_Data
    Fn_AI -->|Analysis Prompt| LLM
    Fn_AI -->|Persist Analysis| DDB

    %% General Data Access
    Fn_Dev <--> DDB
    Fn_Cmd <--> DDB
    Fn_Snap <--> DDB
    Fn_Snap <--> S3_Data
    Fn_Comp <--> DDB
    Fn_Comp <--> S3_Data
    Fn_Audit <--> DDB
    Fn_Auth <--> DDB
```

### Component Responsibility Matrix

| Subsystem | Technology | Responsibility |
| :--- | :--- | :--- |
| **Desktop Web UI** | React 19, TypeScript, Tailwind CSS, Zustand | Interactive network dashboard, unified diff viewer, AI card inspector, and mock/API dual-mode data provider. |
| **CDN & Edge Delivery** | Amazon CloudFront + S3 OAC | Global caching of compiled static SPA assets with custom 404/403 rewrite rules to `index.html`. |
| **User Identity** | Amazon Cognito User Pool | Secure authentication via SRP (Secure Remote Password), user session lifecycle, and JWT issuance (ID, Access, Refresh). |
| **API Ingress** | Amazon API Gateway (REST v1) | Request routing, CORS headers enforcement, Cognito token validation, and method-level rate limiting / burst throttling. |
| **Synchronous Compute** | AWS Lambda (Python 3.12, ARM64) | Low-latency CRUD operations for devices, command sets, settings, snapshot queries, and audit logs. |
| **Workflow Engine** | AWS Step Functions | Distributed state machine coordinating multi-device parallel SSH collection jobs with retries, catch blocks, and status updates. |
| **Device Automation** | Lambda + Netmiko Layer | Connects to Cisco/Arista/Juniper hardware over SSH (port 22), issues read-only inspection commands, and parses terminal outputs. |
| **Primary Database** | Amazon DynamoDB (Pay-Per-Request) | Single-table schema supporting sub-millisecond lookups for devices, collections, snapshots, comparisons, and audit trails. |
| **Payload Storage** | Amazon S3 | Secure bucket for raw CLI captures and large diff payloads exceeding the 4 KB DynamoDB inline threshold. |
| **Cryptography** | AWS Key Management Service (KMS) | AES-256 envelope encryption for device credentials and AI provider access tokens. |
| **Reasoning Engine** | LLM (OpenRouter / OpenAI) | Structured risk evaluation, operational impact assessment, and remediation command generation. |

---

## 3. Frontend & Backend Communication Architecture

### 3.1 Authentication & Token Lifecycle

DriftGuard implements an enterprise token authentication flow powered by Amazon Cognito:

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Frontend SPA (React)
    participant Cognito as AWS Cognito User Pool
    participant APIGW as API Gateway (/v1)
    participant Lambda as Backend Lambda

    Browser->>Cognito: InitiateAuth (ALLOW_USER_SRP_AUTH)
    Cognito-->>Browser: Challenge / Authentication Result
    Browser->>Cognito: RespondToAuthChallenge (SRP / Password)
    Cognito-->>Browser: Tokens: { AccessToken, IdToken, RefreshToken }
    Note over Browser: Token stored in localStorage ('auth_token')
    
    Browser->>APIGW: GET /devices (Header: Authorization: Bearer <AccessToken>)
    APIGW->>Cognito: Validate Token Signature & Expiry (CognitoAuthorizer)
    Cognito-->>APIGW: Authorized (Claims: sub, email, username)
    APIGW->>Lambda: Invoke with requestContext.authorizer.claims
    Lambda-->>APIGW: 200 OK + JSON Payload
    APIGW-->>Browser: 200 OK + JSON Data
```

1. **Sign In**: The operator submits credentials through the desktop UI. The client communicates directly with Cognito using SRP authentication to prevent transmitting plaintext passwords.
2. **Token Issuance**: Upon successful authentication, Cognito returns an `AccessToken` (1 hour validity), `IdToken` (1 hour validity), and `RefreshToken` (30 days validity).
3. **API Authorization**: The frontend HTTP client ([api.ts](file:///d:/DriftGuard/drift-guard/frontend/src/services/api.ts)) attaches the token to every outbound request in the `Authorization: Bearer <token>` header.
4. **Gateway Enforcement**: The API Gateway `CognitoAuthorizer` cryptographically validates the JWT against the Cognito User Pool JWKS public keys before dispatching the request to downstream Lambda microservices.

---

### 3.2 Asynchronous Collection & Diff Workflow

Network device collections over SSH require multiple seconds per device and are executed asynchronously via AWS Step Functions:

```mermaid
sequenceDiagram
    autonumber
    participant UI as Frontend Dashboard
    participant API as API Gateway
    participant Orch as CollectionOrchestrator
    participant SFN as Step Functions State Machine
    participant Worker as CollectionWorker (Netmiko)
    participant DDB as DynamoDB
    participant S3 as S3 Bucket

    UI->>API: POST /collections { deviceId, commandSetId, snapshotType }
    API->>Orch: Invoke Lambda
    Orch->>DDB: Create Job Record (status: PENDING)
    Orch->>SFN: StartExecution(jobId, deviceId, commandSetId)
    Orch-->>API: 202 Accepted { jobId, executionArn }
    API-->>UI: 202 Accepted { jobId }

    SFN->>Worker: Task State: RunCollection
    Worker->>DDB: Fetch device IP & KMS-encrypted credentials
    Worker->>Worker: Decrypt credentials & connect via SSH
    Worker->>Worker: Execute show commands & sanitize output
    alt Output <= 4 KB
        Worker->>DDB: Save Snapshot (rawOutput inline)
    else Output > 4 KB
        Worker->>S3: PutObject(snapshots/{id}.json)
        Worker->>DDB: Save Snapshot (s3Key: snapshots/{id}.json)
    end
    Worker->>DDB: Update Job Record (status: SUCCEEDED)
    Worker-->>SFN: Task Succeeded

    loop Polling Status (Interval: 2-3s)
        UI->>API: GET /collections/{jobId}
        API->>DDB: Query Job by PK
        DDB-->>API: { status: SUCCEEDED, snapshotId: "snap-123" }
        API-->>UI: 200 OK { status: SUCCEEDED }
    end

    UI->>API: GET /snapshots/snap-123
    API-->>UI: 200 OK { snapshot data }
```

---

### 3.3 Dual-Mode Data Provider

The DriftGuard frontend is designed to run seamlessly in two environments:
1. **Mock / Offline Demonstration Mode**: Powered by the in-memory Zustand store ([useAppStore.ts](file:///d:/DriftGuard/drift-guard/frontend/src/store/useAppStore.ts)) pre-seeded with realistic Cisco IOS-XE routing tables, BGP neighbors, and interface diffs. This enables rapid UI verification, local development, and offline demonstrations without AWS cloud connectivity.
2. **Live Cloud Mode**: Activated by providing `VITE_API_BASE_URL` pointing to the deployed API Gateway endpoint. The typed client ([api.ts](file:///d:/DriftGuard/drift-guard/frontend/src/services/api.ts)) communicates with the REST API.

---

### 3.4 Ingress Topology & CloudFront Domain Unification

#### Current Hybrid Topology (Default)
In the baseline deployment, the client browser accesses the application through two distinct hostnames:
- **Frontend SPA**: `https://dXXXXXXXXXXXX.cloudfront.net` (CloudFront CDN distribution serving S3 web assets).
- **Backend API**: `https://{api-id}.execute-api.{region}.amazonaws.com/v1` (Direct API Gateway endpoint).

Cross-Origin Resource Sharing (CORS) is enabled on the API Gateway to permit requests originating from the CloudFront domain.

#### Production Domain Unification Path (Recommended for Enterprise)
To optimize performance and reduce request counts, API Gateway can be mounted behind CloudFront under an `/api/*` cache behavior:

```
https://driftguard.company.com/          ──> CloudFront Default (*)  ──> S3 Static Bucket
https://driftguard.company.com/api/*     ──> CloudFront Behavior     ──> API Gateway Origin
```

**Benefits of Domain Unification**:
- **Eliminates CORS Preflights**: Because the frontend and API share an identical origin (`Origin: https://driftguard.company.com`), the browser skips HTTP `OPTIONS` preflight requests entirely. This cuts billable API Gateway requests by **50%**.
- **Single SSL Certificate**: One ACM certificate covers the web interface and API.
- **Edge Security Shielding**: CloudFront AWS WAF inspects all web and API traffic under a single entry point.

---

## 4. API Rate Limiting & AWS Free-Tier Abuse Protection

### 4.1 AWS Free-Tier Capacity Analysis

DriftGuard is designed to operate safely within AWS Always Free and 12-Month Free Tier limits:

| AWS Service | Free Tier Allocation | DriftGuard Monthly Budget | Abuse Risk Without Throttling |
| :--- | :--- | :--- | :--- |
| **Amazon CloudFront** | **1 TB** data transfer-out / month<br/>**10,000,000** HTTP/HTTPS requests / month<br/>**2,000,000** CloudFront Function invocations | ~50 MB transfer<br/>~25,000 requests | Negligible; 10M requests is virtually impossible to exceed through normal interactive operations. |
| **Amazon API Gateway** | **1,000,000** REST API calls / month (12-month free tier) | ~15,000 API calls | **HIGH**: An unthrottled API Gateway accepts 10,000 req/s by default. A runaway loop or malicious actor could exhaust 1,000,000 requests in **1.6 minutes**, resulting in unexpected AWS bills ($3.50/M calls thereafter). |
| **AWS Lambda** | **1,000,000** requests / month<br/>**3,200,000** seconds compute time / month (400,000 GB-s) | ~20,000 invocations<br/>~60,000 seconds | **MEDIUM**: Excessive invocations could exceed 1M calls or cause concurrent execution limits (default 1,000) to throttle other accounts. |
| **Amazon DynamoDB** | **25 GB** storage<br/>Pay-per-request or 25 WCU / 25 RCU | ~15 MB storage<br/>~50,000 read/write units | Low to Medium; Pay-per-request handles spikes gracefully, but unthrottled writes incur storage and throughput costs. |
| **AWS KMS** | **20,000** API requests / month | ~500 decrypt calls | Low; credentials decrypted only during active collection or AI analysis runs. |

---

### 4.2 Throttling & Rate-Limiting Implementation

To protect against denial-of-service, rogue scripts, and free-tier exhaustion, DriftGuard enforces multi-tier throttling directly in [backend/template.yaml](file:///d:/DriftGuard/drift-guard/backend/template.yaml) via API Gateway `MethodSettings`:

```yaml
  DeltaNetApi:
    Type: AWS::Serverless::Api
    Properties:
      Name: !Sub deltanet-api-${Environment}
      StageName: v1
      MethodSettings:
        # Default baseline throttling across all endpoints
        - ResourcePath: '/*'
          HttpMethod: '*'
          ThrottlingRateLimit: 20
          ThrottlingBurstLimit: 40
        # High-impact endpoint: Netmiko SSH device collections
        - ResourcePath: '/collections'
          HttpMethod: 'POST'
          ThrottlingRateLimit: 2
          ThrottlingBurstLimit: 5
        # High-impact endpoint: AI LLM prompt analysis
        - ResourcePath: '/comparisons/{comparisonId}/analyze'
          HttpMethod: 'POST'
          ThrottlingRateLimit: 2
          ThrottlingBurstLimit: 5
```

### 4.3 Rate Limit Logic & Rationale

1. **Token Bucket Algorithm**: API Gateway employs a token bucket algorithm:
   - **`ThrottlingRateLimit`**: The steady-state sustained request capacity per second.
   - **`ThrottlingBurstLimit`**: The maximum number of concurrent requests the gateway will accept before immediately rejecting excess traffic with `HTTP 429 Too Many Requests`.
2. **Baseline Limits (`20 req/s`, `40 burst`)**:
   - Accommodates human UI navigation, live status checks, and data filtering across tabs without friction.
   - Caps total hourly throughput to a maximum that prevents burning through the 1M free-tier monthly budget.
3. **Heavy Operation Isolation (`2 req/s`, `5 burst`)**:
   - `POST /collections`: Initiates Netmiko SSH connections to enterprise network devices. Capping this endpoint at 2 req/s prevents overwhelming network management interfaces or locking VTY lines on Cisco switches.
   - `POST /comparisons/{id}/analyze`: Invokes upstream AI reasoning models (OpenRouter/OpenAI). Capping at 2 req/s prevents AI API token depletion and financial leakage.

---

### 4.4 Client-Side 429 Error Resilience

The frontend API client ([api.ts](file:///d:/DriftGuard/drift-guard/frontend/src/services/api.ts)) intercepts HTTP 429 status codes and surfaces structured diagnostic feedback conforming to the DriftGuard 3-part error pattern:

```typescript
if (!response.ok) {
  if (response.status === 429) {
    throw new Error(
      'Request rate limit exceeded: System throttled this operation to preserve infrastructure stability. Wait a few seconds before retrying.'
    );
  }
  const errorData = await response.json().catch(() => ({}));
  throw new Error(errorData.message || `API Request failed with status ${response.status}`);
}
```

- **What happened**: Rate limit exceeded (`HTTP 429`).
- **What it means**: Gateway throttled the request to protect cloud infrastructure and target devices.
- **What to do next**: Wait briefly before re-attempting the action.

---

## 5. Data Architecture & Storage Strategy

### 5.1 DynamoDB Single-Table Schema

DriftGuard utilizes an optimized single-table design (`DeltaNet-${Environment}`) with two Global Secondary Indexes (`GSI1`, `GSI2`) to satisfy all access patterns in sub-10ms latency:

| Entity | PK (Partition Key) | SK (Sort Key) | GSI1PK | GSI1SK | GSI2PK | GSI2SK |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **User Settings** | `USER#{userId}` | `SETTINGS` | — | — | — | — |
| **Device** | `USER#{userId}` | `DEVICE#{deviceId}` | `USER#{userId}` | `#DEVICES` | — | — |
| **Command Set** | `USER#{userId}` | `CMDSET#{setId}` | `USER#{userId}` | `#CMDSETS` | — | — |
| **Collection Job** | `USER#{userId}` | `JOB#{jobId}` | `USER#{userId}` | `#JOBS#{timestamp}` | `JOB#{jobId}` | `STATUS#{status}` |
| **Snapshot** | `USER#{userId}` | `SNAP#{snapshotId}` | `USER#{userId}` | `#SNAPS#{deviceId}#{ts}` | `DEVICE#{deviceId}` | `SNAP#{timestamp}` |
| **Comparison** | `USER#{userId}` | `COMP#{comparisonId}` | `USER#{userId}` | `#COMPS#{timestamp}` | — | — |
| **AI Analysis** | `USER#{userId}` | `ANALYSIS#{analysisId}`| `USER#{userId}` | `#ANALYSES#{timestamp}`| `COMP#{comparisonId}` | `ANALYSIS#{ts}` |
| **Audit Log** | `USER#{userId}` | `AUDIT#{timestamp}` | `USER#{userId}` | `#AUDIT#{action}` | — | — |

---

### 5.2 Hybrid S3 Data Tiering

To maintain low storage costs and sub-millisecond database response times, DriftGuard enforces a strict **4 KB threshold rule** ([constants.py](file:///d:/DriftGuard/drift-guard/backend/shared/constants.py)):

```
                      +-----------------------------+
                      |     CLI Output Captured     |
                      +--------------+--------------+
                                     |
                          Is Payload <= 4 KB?
                                     |
                     +---------------+---------------+
                     |                               |
                   YES                              NO
                     |                               |
                     v                               v
        +-------------------------+    +---------------------------+
        | Store Inline in DynamoDB|    | 1. Write payload to S3    |
        |   (rawOutput attribute) |    |    (snapshots/{id}.json)  |
        +-------------------------+    | 2. Store s3Key in DynamoDB|
                                       +---------------------------+
```

- **DynamoDB Inline**: Lightweight command outputs (`show ip interface brief`, `show version`) are stored directly in the `rawOutput` string attribute.
- **S3 External Storage**: Large outputs (`show running-config`, full BGP RIB dumps) and structured diff text are compressed and uploaded to `s3://deltanet-snapshots-{account}-{env}/`.
- **Lifecycle Rule**: All S3 snapshot objects automatically transition to expiration after **365 days**, preventing unbounded cloud storage growth.

---

## 6. Security Architecture & Cisco Read-Only Enforcement

### 6.1 Command Safety Engine

DriftGuard enforces a strict read-only execution policy. All commands scheduled in command sets or initiated through manual collections are validated against the blocked pattern registry ([constants.py](file:///d:/DriftGuard/drift-guard/backend/shared/constants.py)):

```python
BLOCKED_COMMAND_PATTERNS = [
    "configure", "conf t", "conf terminal", "no ",
    "enable", "reload", "write", "copy", "delete",
    "erase", "format", "squeeze", "clear", "debug",
    "undebug", "shutdown", "terminal length"
]
```

Any command containing a blocked pattern substring is rejected at API submission time with an `HTTP 400 Bad Request` before any SSH connection can be established.

### 6.2 Credential Protection via KMS Envelope Encryption

Device passwords, SSH private keys, and external AI provider tokens are encrypted prior to database insertion:

1. **Encryption**: The Lambda function invokes `kms:Encrypt` against `alias/deltanet-${Environment}`, producing a base64 ciphertext string stored in DynamoDB.
2. **Decryption**: Plaintext credentials only exist in the volatile memory of the `CollectionWorker` or `AIAnalyze` Lambda execution context and are zeroed immediately upon task completion.
3. **Audit Trail**: Every encryption and decryption event is logged in AWS CloudTrail and recorded in the DriftGuard audit log table with a 90-day Time-To-Live (TTL).

---

## 7. Architecture Summary & Verification Checklist

- [x] **Zero Mutating Commands**: Enforced by code-level regex/substring inspection.
- [x] **Envelope Encryption**: Enforced by AWS KMS CMKs on all credentials.
- [x] **Rate Limiting**: Configured in API Gateway `MethodSettings` (20 req/s baseline, 2 req/s heavy).
- [x] **Free-Tier Protection**: Throttling shields DynamoDB, Lambda, and API Gateway budgets.
- [x] **Resilient UI**: React 19 client gracefully handles HTTP 429 status with informative feedback.
- [x] **Dual-Mode Execution**: Operates in standalone local mock mode or live serverless cloud mode.
