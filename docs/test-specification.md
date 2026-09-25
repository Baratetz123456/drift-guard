# DriftGuard Enterprise Test Specification & Verification Matrix

> **Document ID:** DG-SPEC-TEST-2026  
> **Status:** Approved / Active Baseline  
> **Target System:** DriftGuard v2.0.0 (React 19 / TypeScript / Python 3.12 / Amazon DynamoDB / AWS Serverless)  
> **Operating Protocol:** AGENTS.md Multi-Agent Software Engineering Standard  

---

## 1. Executive Summary & Purpose

This document provides the formal Test Specification and Quality Assurance Matrix for **DriftGuard**, the enterprise Cisco network change verification platform. It defines the definitive verification criteria, preconditions, execution steps, expected results, and automated test command mappings across all seven core functional pillars.

Every automated test case mapped in this specification is continuously verified against:
1. **Backend Test Suite:** `pytest` in Docker / Python 3.12 (`backend/tests/`)
2. **Frontend Test Suite:** Playwright E2E & Node.js verification (`frontend/tests/`)
3. **Compiler & Bundler Checks:** `npm --prefix frontend run build` (`tsc && vite build`)

---

## 2. Test Verification Pillars

```
+---------------------------------------------------------------------------------------+
|                               DRIFTGUARD VERIFICATION MATRIX                          |
+-------------------+--------------------+--------------------+-------------------------+
| Pillar 1: AUTH    | Pillar 2: CISCO    | Pillar 3: COLLECT  | Pillar 4: DIFF          |
| Authentication &  | Network Inventory  | Telemetry Engine & | Volatile Noise Filter & |
| Session Lifecycle | & Read-Only Safety | Quota Enforcement  | Deterministic Diff      |
+-------------------+--------------------+--------------------+-------------------------+
| Pillar 5: AI      | Pillar 6: EXPORT   | Pillar 7: TENANT                             |
| Categorical Risk  | Standalone Dossiers| Multi-Tenant Partition                       |
| & Invariants      | & Audit Trails     | Key Isolation                                |
+-------------------+--------------------+----------------------------------------------+
```

---

## 3. Detailed Test Specifications

### Pillar 1: Authentication, Database Retrieval & Session Lifecycle (`TC-AUTH`)

#### `TC-AUTH-01`: Operator Registration with Cryptographic PBKDF2 Hashing
- **Category:** Functional / Cryptographic Security
- **Requirement:** User registration must persist cryptographically random salt and PBKDF2-HMAC-SHA256 hash (100,000 iterations) directly to DynamoDB `USER#{userId} / PROFILE`.
- **Preconditions:** DynamoDB running (Local or AWS). Target email not previously registered.
- **Execution Steps:**
  1. Submit `POST /api/auth/register` with `{ name, email, password }`.
  2. Query DynamoDB single table item `PK = USER#{userId}`, `SK = PROFILE`.
- **Expected Results:**
  - HTTP `200 OK` with authentic JWT token and sanitized user profile.
  - DynamoDB item contains `passwordSalt` (32-char hex) and `passwordHash` (64-char hex).
  - Raw password string is NEVER persisted.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_db_auth.py::TestDatabaseAuthUserLifecycle::test_create_user_with_credentials_stores_hash_and_salt`

#### `TC-AUTH-02`: Login with Database User Retrieval & Password Verification
- **Category:** Functional / Database Integration
- **Requirement:** Login must query DynamoDB for the registered user record, retrieve stored salt and hash, and verify incoming password via constant-time digest comparison (`hmac.compare_digest`).
- **Preconditions:** User registered in DynamoDB via `TC-AUTH-01`.
- **Execution Steps:**
  1. Submit `POST /api/auth/login` with correct credentials.
- **Expected Results:**
  - HTTP `200 OK` returning authentic JWT token.
  - User profile attributes (`id`, `email`, `name`, `role`, `lastLoginAt`) returned from database.
  - Database audit updates `lastLoginAt` and resets `failedLoginAttempts` to `0`.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_api_endpoints.py::TestAPIEndpointsSecurity::test_register_and_login_with_database_verification`

#### `TC-AUTH-03`: Unregistered Operator 401 Rejection
- **Category:** Security / Zero Insecure Fallback
- **Requirement:** Submitting credentials for an email not present in DynamoDB must strictly return `HTTP 401 Unauthorized` without creating dummy records.
- **Preconditions:** Random non-existent email address.
- **Execution Steps:**
  1. Submit `POST /api/auth/login` with unregistered email `unregistered_operator@enterprise.net`.
- **Expected Results:**
  - HTTP `401 Unauthorized`.
  - Response body contains detail: `"Operator account not found. Please register first."`
  - Zero items created in DynamoDB.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_api_endpoints.py::TestAPIEndpointsSecurity::test_unregistered_operator_login_rejected_401`

#### `TC-AUTH-04`: Incorrect Password 401 Rejection & Failure Increment
- **Category:** Security / Brute Force Mitigation
- **Requirement:** Submitting invalid password for existing user must reject with `HTTP 401` and increment `failedLoginAttempts` in DynamoDB.
- **Execution Steps:**
  1. Submit `POST /api/auth/login` with valid email and invalid password.
- **Expected Results:**
  - HTTP `401 Unauthorized` with detail `"Invalid operator credentials. Please check your email and password."`
  - `failedLoginAttempts` incremented in DynamoDB.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_api_endpoints.py::TestAPIEndpointsSecurity::test_register_and_login_with_database_verification`

#### `TC-AUTH-05`: Account Lockout on 5 Consecutive Failures
- **Category:** Security / Account Lockout
- **Requirement:** After 5 consecutive failed attempts, account must lock for 60 seconds returning `HTTP 429 Too Many Requests`.
- **Execution Steps:**
  1. Submit 5 invalid login requests sequentially.
  2. Inspect `lockedUntil` timestamp in DynamoDB.
  3. Submit 6th request (even with valid password).
- **Expected Results:**
  - HTTP `429 Too Many Requests` with lockout countdown.
  - DynamoDB user profile contains active `lockedUntil` timestamp.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_db_auth.py::TestDatabaseAuthUserLifecycle::test_record_login_failure_increments_and_locks`

#### `TC-AUTH-06`: Bot Speed-Trap & Honeypot Rejection
- **Category:** Anti-Bot Defense
- **Requirement:** Submissions under 500ms or with filled honeypot fields must reject immediately.
- **Execution Steps:**
  1. Submit login with `mount_time_ms` indicating elapsed time < 500ms.
  2. Submit login with `operator_honeypot_code` populated.
- **Expected Results:**
  - Both submissions return `HTTP 400 Bad Request`.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_api_endpoints.py::TestAPIEndpointsSecurity::test_honeypot_bot_defense_rejection` and `test_speed_trap_bot_defense`

#### `TC-AUTH-07`: Session Storage Credential Destruction
- **Category:** Session Security
- **Requirement:** Operator tokens must reside strictly in `sessionStorage`. Closing tab or browser must completely destroy credentials.
- **Execution Steps:**
  1. Authenticate into DriftGuard console.
  2. Terminate browser tab/context.
  3. Reopen browser context and navigate to `/`.
- **Expected Results:**
  - User redirected to `/login`.
  - Zero tokens found in `localStorage`.
- **Automated Test:** `node frontend/tests/browser-lifecycle-persistence.mjs`

#### `TC-AUTH-08`: 30-Minute Inactivity Auto-Logout & Warning Modal
- **Category:** Compliance / Session Inactivity
- **Requirement:** 30 minutes of operator inactivity must trigger a 60-second warning dialog followed by automatic session termination.
- **Execution Steps:**
  1. Simulate 29 minutes elapsed session time without user events.
  2. Verify warning modal presence.
  3. Allow remaining 60 seconds to expire.
- **Expected Results:**
  - Active session terminated; operator redirected to `/login`.
- **Automated Test:** `npx playwright test frontend/tests/security-and-routes.spec.ts`

---

### Pillar 2: Cisco Network Device Inventory & Read-Only Safety (`TC-CISCO`)

#### `TC-CISCO-01`: Device Fleet Registration & Multi-Driver Support
- **Category:** Functional / Inventory
- **Requirement:** Register devices with specific Cisco drivers (`cisco_xe`, `cisco_xr`, `cisco_nxos`).
- **Execution Steps:**
  1. `POST /api/devices` with device details and driver `cisco_xe`.
- **Expected Results:**
  - Device saved with both `driver` and `deviceType` persisted.
  - Status defaults to `untested`.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_dynamo_store.py::TestDynamoStoreMultiTenantIsolation::test_create_device_populates_both_driver_and_device_type`

#### `TC-CISCO-02`: Strict Read-Only Show Command Whitelist Enforcement
- **Category:** Safety / Zero-Mutation Invariant
- **Requirement:** System must accept ONLY non-mutating diagnostic commands starting with `show` or `display`.
- **Execution Steps:**
  1. Validate diagnostic commands: `show ip route`, `show ip bgp summary`, `show interfaces status`.
- **Expected Results:**
  - Validator returns `is_safe=True`.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_cisco_safety.py::TestCiscoCommandSafety::test_read_only_commands_allowed`

#### `TC-CISCO-03`: Mutation Command Rejection
- **Category:** Safety / Blast Radius Protection
- **Requirement:** Mutating CLI commands (`config t`, `reload`, `write erase`, `boot`, `shutdown`) must be strictly blocked at three independent layers.
- **Execution Steps:**
  1. Submit command sets containing `reload`, `configure terminal`, `write memory`, or `erase startup-config`.
- **Expected Results:**
  - Validator flags command as forbidden (`is_safe=False`).
  - API returns `HTTP 400 Bad Request`.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_cisco_safety.py::TestCiscoCommandSafety::test_forbidden_commands_rejected`

#### `TC-CISCO-04`: Command Injection & Pipe Mutation Protection
- **Category:** Security / Command Sanitization
- **Requirement:** Pipe mutations (`| redirect`, `| format`, `> tftp:`) and stacked command delimiters (`;`, `&`, `\n`) must be detected and blocked.
- **Execution Steps:**
  1. Test commands with embedded shell metacharacters and redirect targets.
- **Expected Results:**
  - All injection variations rejected.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_cisco_safety.py::TestCiscoCommandSafety::test_injection_payloads_rejected`

#### `TC-CISCO-05`: AWS KMS Envelope Credential Encryption
- **Category:** Security / Secrets Management
- **Requirement:** SSH passwords and enable secrets must be encrypted via KMS envelope before persisting to DynamoDB.
- **Execution Steps:**
  1. Submit device with plaintext password.
  2. Inspect stored DynamoDB item.
- **Expected Results:**
  - Item contains `passwordEncrypted` payload with ciphertext.
  - Plaintext password never stored.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_encryption.py`

#### `TC-CISCO-06`: Netmiko Connection Testing
- **Category:** Integration / SSH
- **Requirement:** Test connection endpoint verifies SSH reachability without mutating device state.
- **Execution Steps:**
  1. Trigger `POST /api/devices/{id}/test`.
- **Expected Results:**
  - Returns `success=True` for reachable host, or structured diagnostic error on failure.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_cisco_safety.py`

---

### Pillar 3: Telemetry Collection Engine & Quota Enforcement (`TC-COLLECT`)

#### `TC-COLLECT-01`: Standard Command Set Validation
- **Category:** Functional / Telemetry
- **Requirement:** Command sets enforce Cisco show command integrity upon creation.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_api_endpoints.py::TestAPIEndpointsSecurity::test_unauthenticated_command_sets_returns_401`

#### `TC-COLLECT-02`: Parallel SSH Batch Collection & Fault Isolation
- **Category:** Resilience / Execution
- **Requirement:** Multi-device collection executes in parallel workers. An unreachable host or auth failure must NOT fail other devices in the batch.
- **Expected Results:**
  - Batch completes with granular per-device status (`collected` vs `failed`).
- **Automated Test:** `node frontend/tests/driver-compatibility-e2e.mjs`

#### `TC-COLLECT-03`: Daily Collection Abuse Quota Enforcement
- **Category:** Resource Management / Cost Control
- **Requirement:** Exceeding user daily collection quota (e.g. 100 collections/day) must reject collection requests until quota reset date.
- **Expected Results:**
  - `check_and_increment_quota` returns `(False, current_count, max_quota)` and API returns `HTTP 429`.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_dynamo_store.py`

---

### Pillar 4: Layer 1 Diff Screening & Volatile Noise Filtering (`TC-DIFF`)

#### `TC-DIFF-01`: Deterministic Line-by-Line CLI Diff Computation
- **Category:** Functional / Verification Engine
- **Requirement:** Unified diff algorithm accurately identifies added lines, removed lines, and unchanged context lines.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_ai_layer1_diff.py`

#### `TC-DIFF-02`: Directional Volatile Noise Normalization
- **Category:** Algorithmic Filtering / Cost Optimization
- **Requirement:** Regex pre-filter (`screen_diff_for_functional_changes`) must strip volatile noise: elapsed uptime, packet counters, interface input/output rates, and timestamps.
- **Expected Results:**
  - Diffs containing only uptime/counter noise evaluate to `has_functional_changes = False`.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_ai_layer1_diff.py::test_volatile_counters_screened`

#### `TC-DIFF-03`: Clean Diff Informational Evaluation (0 Tokens Consumed)
- **Category:** Verification / Cost Control
- **Requirement:** When no functional changes remain after Layer 1 pre-filtering, engine early-exits with Informational severity (0/100 risk) and reports `0 tokens (Layer 1 pre-filter)`.
- **Expected Results:**
  - AI LLM inference bypassed, preserving token budget.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_ai_layer1_diff.py::test_clean_diff_returns_informational`

#### `TC-DIFF-04`: Interface Flapping & Status Change Detection
- **Category:** Functional / Network Analysis
- **Requirement:** Interface changes from `up/up` to `down/down` or `administratively down` must be detected as functional changes.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_ai_layer1_diff.py::test_interface_state_change_detected`

#### `TC-DIFF-05`: BGP Neighbor Divergence Detection
- **Category:** Functional / Routing Verification
- **Requirement:** BGP state transitions from `Established` to `Active` or `Idle` must trigger High/Critical functional findings.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_ai_layer1_diff.py::test_bgp_neighbor_change_detected`

---

### Pillar 5: AI Analysis, Severity Mapping & Invariants (`TC-AI`)

#### `TC-AI-01`: Deterministic Categorical Severity Mapping
- **Category:** Deterministic Risk Scoring
- **Requirement:** Severity categories map deterministically to fixed, unanchored numeric scores:
  - `Critical` $\to$ **95/100**
  - `High` $\to$ **80/100**
  - `Medium` $\to$ **50/100**
  - `Low` $\to$ **20/100**
  - `Informational` $\to$ **0/100**
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_ai_layer1_diff.py`

#### `TC-AI-02`: Outright Ban on Unanchored LLM Numeric Scores
- **Category:** Prompt Safety / Compliance
- **Requirement:** Prompts ban models from outputting numeric scores; code performs mapping deterministically.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_ai_layer1_diff.py`

#### `TC-AI-03`: 3-Part Diagnostic Model
- **Category:** UX & Diagnostic Integrity
- **Requirement:** Every finding specifies: 1. What happened, 2. What it means, 3. What to do next.
- **Automated Test:** `npx playwright test frontend/tests/ai-analysis-and-reports.spec.ts`

#### `TC-AI-04`: Positive Baseline Congruent Banner Display
- **Category:** UX Invariant
- **Requirement:** Clean diffs with zero findings render a `Baseline Congruent` banner with a Voltage `#c8ff00` `Safe to Approve` badge.
- **Automated Test:** `npx playwright test frontend/tests/ai-analysis-and-reports.spec.ts`

#### `TC-AI-05`: Automated Rollback Runbook Strict Suppression
- **Category:** Operational Safety
- **Requirement:** Rollback runbooks must NEVER display for Informational severity or clean diffs.
- **Automated Test:** `npx playwright test frontend/tests/ai-analysis-and-reports.spec.ts`

#### `TC-AI-06`: Pre-Inference Secret Scrubbing
- **Category:** Privacy & Security
- **Requirement:** High-entropy secrets, passwords, and SNMP strings must be regex-scrubbed before LLM submission.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_cisco_safety.py`

---

### Pillar 6: Report Generation, Fluid Detail Layout & Audit Trails (`TC-EXPORT`)

#### `TC-EXPORT-01`: Universal Fluid Full-Width Layout
- **Category:** Design System Standard
- **Requirement:** Profile, inspector, and detail views must render full-width (`w-full`), never boxed in narrow `max-w-4xl` containers.
- **Automated Test:** `npx playwright test frontend/tests/crud-lifecycle.spec.ts`

#### `TC-EXPORT-02`: Standalone Printable 1:1 ISO A4 Dossiers
- **Category:** Compliance Documentation
- **Requirement:** Standalone routes (`/reports/analysis/:id`, `/reports/snapshot/:id`, `/reports/audit/:id`) render clean ruled ISO A4 documents with exact print fidelity.
- **Automated Test:** `npx playwright test frontend/tests/printable-documents.spec.ts`

#### `TC-EXPORT-03`: Immutable Audit Trail Recording
- **Category:** Compliance / Auditability
- **Requirement:** All operational events (captures, diffs, exports, logins) append immutable audit logs to DynamoDB.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_dynamo_store.py`

---

### Pillar 7: Multi-Tenant Partition Key Isolation (`TC-TENANT`)

#### `TC-TENANT-01`: Deterministic Tenant Partition Key (`USER#{userId}`)
- **Category:** Multi-Tenancy / Data Security
- **Requirement:** All DynamoDB items partitioned strictly by `USER#{userId}` derived deterministically from email SHA-256.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_dynamo_store.py::TestDynamoStoreMultiTenantIsolation::test_list_devices_scoped_to_tenant`

#### `TC-TENANT-02`: Zero Insecure Fallback on Missing Auth Headers
- **Category:** Security / Zero Insecure Fallback
- **Requirement:** Requests missing or presenting malformed Authorization headers must strictly return `HTTP 401 Unauthorized`.
- **Automated Test:** `docker exec driftguard-backend pytest tests/test_api_endpoints.py::TestAPIEndpointsSecurity::test_unauthenticated_devices_returns_401`

#### `TC-TENANT-03`: Demo Operator Baseline Quarantine
- **Category:** Multi-Tenancy Isolation
- **Requirement:** Demo devices and command sets are strictly quarantined to `operator@driftguard.local`. Newly registered tenants initialize with zero data pollution.
- **Automated Test:** `node frontend/tests/auth-isolation.test.mjs`

#### `TC-TENANT-04`: Cold-Restart Storage Durability
- **Category:** Durability Verification
- **Requirement:** Browser cold restarts purge `sessionStorage` (forcing re-auth) while tenant data remains 100% durable in DynamoDB.
- **Automated Test:** `node frontend/tests/browser-lifecycle-persistence.mjs`

---

## 4. Automated Execution Matrix

| Test Suite | Scope | Target Environment | Command | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Unit & Security** | All 72 backend test cases | Docker / Python 3.12 | `docker exec driftguard-backend pytest` | `72 passed` (0 errors) |
| **Frontend TypeScript Build** | Static types & Vite bundle | Local Node.js | `npm --prefix frontend run build` | Clean compilation |
| **Auth & Isolation E2E** | Multi-tenant quarantine | Node.js E2E | `node frontend/tests/auth-isolation.test.mjs` | Verified |
| **Driver Compatibility** | Netmiko CLI multi-driver | Node.js E2E | `node frontend/tests/driver-compatibility-e2e.mjs`| Verified |
| **Browser Cold Restart** | Persistent context storage | Chromium E2E | `node frontend/tests/browser-lifecycle-persistence.mjs` | Verified |
