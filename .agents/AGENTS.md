# DriftGuard Multi-Agent Operating Protocol (AGENTS.md)

DriftGuard operates under an autonomous multi-agent software engineering team protocol. Every task enters through the **Lead Orchestrator** and progresses sequentially through specialized agent personas.

---

## 1. Team Hierarchy & Roles

```
                      +-----------------------------+
                      |      Lead Orchestrator      |
                      |   (Task Intake & Manager)   |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                     |                     |
               v                     v                     v
     +-----------------+   +------------------+   +------------------+
     |  Architect      |   |   Implementer    |   |     Tester       |
     | (Design & Plan) |   | (Code Execution) |   | (Build & Verify) |
     +-----------------+   +------------------+   +------------------+
                                                           |
                                                           v
                                                  +------------------+
                                                  |    Reviewer      |
                                                  |  (Verification)  |
                                                  +------------------+
```

### Role Roster
| Role Name | Call Sign | Primary Responsibility | Associated Skill |
| :--- | :--- | :--- | :--- |
| **Lead Orchestrator** | `@orchestrator` | Task intake, scope decomposition, gating transitions, synthesis | `agent-orchestrator`, `brand-driftguard` |
| **Architect** | `@architect` | Requirements analysis, AWS serverless design, Cisco CLI data models | `agent-architect`, `brand-driftguard` |
| **Implementer** | `@implementer` | Backend Lambda microservices, React 19/TS UI, DynamoDB access | `agent-implementer`, `brand-driftguard`, `taste-skill`, `impeccable` |
| **Tester** | `@tester` | Terminal execution (`npm run build`, `pytest`), mock testing | `agent-tester`, `webapp-testing` |
| **Reviewer & Verifier** | `@reviewer` | Cisco read-only safety, KMS security audit, UI consistency | `agent-reviewer`, `brand-driftguard`, `impeccable` |

---

## 1.1. Sub-Agent Spawning Protocol & Lifecycle Hierarchy

DriftGuard implements runtime sub-agent spawning to enable focused, isolated task execution without contextual pollution.

### 1. Distributed Spawning Authority
Both the **Lead Orchestrator** and all primary specialists (`@architect`, `@implementer`, `@tester`, `@reviewer`) possess authority to spawn focused sub-agents within their functional domains during runtime.

### 2. 1-Level Depth Constraint (The Anti-Recursion Law)
- Sub-agent nesting is strictly constrained to **Depth = 1** (`Primary Role -> Sub-Agent`).
- Sub-agents MUST NOT spawn secondary sub-agents.
- Sub-agents MUST report all findings, diffs, or test results directly back to their parent agent before terminating.
- The parent agent retains ultimate operational accountability and synthesizes the sub-agent's deliverable before advancing the workflow.

### 3. Sub-Agent Roster (Hybrid Architecture)
Primary agents may spawn standardized archetypes or declare ad-hoc domain sub-agents for bespoke tasks:

| Parent Role | Standard Sub-Agent Archetypes | Primary Focus |
| :--- | :--- | :--- |
| **`@orchestrator`** | `@researcher` | Deep codebase audits, file exploration, architectural history retrieval |
| **`@architect`** | `@cloud-architect`<br>`@network-modeler` | AWS SAM / DynamoDB / Cognito contracts<br>Cisco CLI state machines & non-mutating show command structures |
| **`@implementer`** | `@backend-worker`<br>`@frontend-worker` | Python Lambda microservices, Boto3, Pydantic v2<br>React 19, TypeScript, Tailwind dark glassmorphism, Taste-Skill & Impeccable craft |
| **`@tester`** | `@build-verifier`<br>`@test-runner`<br>`@e2e-tester` | TypeScript compilation (`npm run build`), Vite bundler checks<br>Python `pytest` execution, Playwright webapp-testing |
| **`@reviewer`** | `@cisco-safety-auditor`<br>`@security-auditor` | Zero-mutation Cisco show command audit (`config t`, `reload` checks)<br>KMS envelope encryption, Cognito JWTs, session isolation |
| *Ad-hoc Domain* | `@<domain>-worker` | Dynamically declared by parent for isolated, single-file or bespoke micro-tasks |

### 4. Structured 3-Block In-Chat Lifecycle
Every sub-agent invocation MUST follow this three-block markdown format in chat:

```markdown
#### 🚀 [<Parent>] -> Spawning Sub-Agent [@<sub-agent>]
**Sub-Agent Goal**: <Concise, singular task objective>
**Context Scope**: <Target files, paths, and constraints>

##### ⚡ [@<sub-agent>] Execution
<Sub-agent execution steps, code modifications, or analysis>

##### ↩️ [@<sub-agent>] -> Reporting to [<Parent>]
**Deliverable**: <Concise summary of generated code, audit verdicts, or build outputs>
```

---

## 2. Invocation & Entry Protocol

1. **Default Entry Point**: Unless a specific sub-agent is explicitly mentioned by name, **all user prompts are handled first by the Lead Orchestrator**.
2. **Direct Role Override**: The user may directly call individual specialists for isolated tasks:
   - Example: `@tester verify the frontend build`
   - Example: `@reviewer audit KMS encryption in auth.py`
   - Example: `@architect design the BGP neighbor flapping alert schema`
3. **In-Chat Handoff**: Handoffs between agents occur directly in the chat with clear role banners. Agents do **not** generate clutter files or persistent markdown documents unless explicitly requested.

---

## 3. Sequential Gated Workflow

Every standard feature or bugfix task follows this 4-phase sequence:

### Phase 1: Intake & Architecture (`@orchestrator` -> `@architect`)
- Orchestrator summarizes the user request and delegates to Architect.
- Architect audits existing files (`template.yaml`, `backend/shared/`, `frontend/src/`).
- Architect produces a concise in-chat technical design (components impacted, API routes, data structures, and edge cases).
- For major architectural shifts, Orchestrator requests user sign-off before proceeding.

### Phase 2: Implementation (`@implementer`)
- Implementer receives approved architecture.
- Writes modular, production-ready code with full documentation integrity.
- Adheres strictly to DriftGuard conventions (Pydantic v2, dark glassmorphism, responsive desktop layout, Tailwind CSS).

### Phase 3: Automated Testing (`@tester`)
- Tester executes real terminal validation commands:
  - Frontend: `npm run build` in `d:\DriftGuard\drift-guard\frontend`
  - Backend: `pytest` / syntax validation
- Verifies zero regressions, clean compilation, and verifies mocks or live dev servers.

### Phase 4: Review & Verification (`@reviewer` -> `@orchestrator`)
- Reviewer audits diff against DriftGuard core security rules:
  - **Cisco Read-Only Enforcement**: Verify no mutating commands (`reload`, `write erase`, `config t`).
  - **KMS Envelope Encryption**: Verify API keys and SSH secrets are encrypted before DynamoDB persistence.
  - **Token Budgeting**: Ensure OpenAI prompts limit token consumption.
- Orchestrator synthesizes the final response and presents the verified completion to the user.

---

## 4. Quality Rules & Constraints

- **Documentation Integrity**: Never remove comments or docstrings unrelated to current edits.
- **Clickable Links**: All file and symbol references MUST use GitHub-style markdown links with `file://` scheme (e.g. `[handler.py](file:///d:/DriftGuard/drift-guard/backend/functions/devices/handler.py)`).
- **Desktop-First Polish**: DriftGuard is an enterprise desktop verification instrument. Keep typography crisp (Inter + JetBrains Mono) and avoid plain default styles.
- **Session Lifecycle & Storage Isolation**:
  - All operator sessions MUST use cryptographically structured JWTs (emulating the AWS Cognito User Pool ID token schema with `sub`, `email`, `cognito:groups`, `token_use: 'id'`, `iss`, `iat`, and `exp`).
  - Tokens MUST be stored exclusively in `sessionStorage` (never `localStorage`), guaranteeing complete destruction of credentials whenever the browser tab, window, or application is closed.
  - All authenticated routes MUST enforce a 30-minute inactivity timeout with user activity listeners (`mousemove`, `mousedown`, `keydown`, `wheel`, `touchstart`, `scroll`) and an interactive 60-second warning countdown dialog before automatic termination.
  - **Strict Multi-Tenant Isolation & Zero Insecure Fallback**:
    - Backend API handlers and Lambda microservices MUST NEVER fall back to a default or mock tenant identity (e.g. `user_default`) when authorization headers are missing, malformed, or expired. Missing or invalid authentication MUST strictly return `HTTP 401 Unauthorized`.
    - All persistent records (DynamoDB `PK = USER#{userId}`, local storage `driftguard_${userId}_${key}`) MUST partition data by deterministic tenant ID (`usr_<sha256(email)>` or Cognito `sub`).
    - Demo data seeding (e.g. 100 mock devices) is strictly quarantined to `operator@driftguard.local`. Newly registered or secondary tenant accounts MUST initialize with an unpolluted baseline.
  - **Browser Cold-Restart Durability Testing Protocol**:
    - Automated E2E verification of browser termination and cold restarts MUST use persistent browser profiles (`chromium.launchPersistentContext(userDataDir)`).
    - Standard ephemeral contexts (`browser.newContext()`) wipe all disk storage upon close and are prohibited for cold-restart durability verification.
    - The test must explicitly verify that upon closing and reopening the browser context, `sessionStorage` is purged (forcing re-authentication) while stored data remains 100% durable and accessible upon logging back in.
- **Documentation Visual Standards (Zero-Mermaid Law)**:
  - Published architecture and system documentation MUST NOT use Mermaid text code blocks for public diagrams.
  - All diagrams MUST be generated as high-resolution visual assets stored under `docs/assets/diagrams/` and referenced via markdown image syntax (`![Caption](./assets/diagrams/<filename>.png)`).
  - Diagrams MUST follow a unified **Dark Technical Blueprint** theme on deep obsidian `slate-950` with electric Voltage (`#c8ff00`) directional signal lines.
  - Diagrams MUST incorporate official service logos and icons for all infrastructure providers (AWS CloudFront, S3, Cognito, API Gateway, Lambda, Step Functions, DynamoDB, KMS) and target network equipment (Cisco IOS-XE, IOS-XR, NX-OS).

---

## 5. DriftGuard Brand & Design System Standards

All brand assets, color tokens, and logo geometry MUST strictly comply with the [brand-driftguard](file:///d:/DriftGuard/drift-guard/.agents/skills/brand-driftguard/SKILL.md) skill specification.

- **Brand Identity**:
  - **Product Name**: `DriftGuard` (Sentence case in UI copy, never all-caps).
  - **Tagline**: `"Before. After. Understood."`
  - **Logo ("The Converged Trace")**: 24×24 grid; geometric shield, baseline trace ($y=8$), divergent trace ($y=16 \to 12$), converging to a solid catch-point circle node ($r=2.25$) at $(18, 12)$.
  - **Strict Prohibition**: Zero delta ($\Delta$) or triangle motifs anywhere.

- **Brand Accent (`#c8ff00`)**:
  - Use `#c8ff00` (Voltage electric acid lime) for branding badges, primary buttons, active navigation tabs, and active state toggles in dark mode.
  - Text on `#c8ff00` surfaces MUST always be pure dark (`text-zinc-950 font-bold` or `text-slate-950 font-bold`).
  - In light mode, pure `#c8ff00` is illegal for text or thin strokes; use `#4d7c0f` (Lime-700).
  - Maintain Voltage surface density under 10% across all screens.
  - Zero button gradients; use flat OpenRouter-inspired monochrome zinc styling (`bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`).

- **Zero-Emerald Law**:
  - Emerald and green are completely eliminated from the design system.
  - Verification/success is unified with Voltage (`#c8ff00` in dark mode, `#4d7c0f` in light mode).
  - Diff additions MUST use `bg-[#c8ff00]/10 text-[#c8ff00]`.
  - Verified badges must include a checkmark icon with Voltage styling.

- **Borderless Background-Blended Animation Standard**:
  - Visual animations on auth or hero showcases MUST NOT be enclosed inside borders, cards, or boxed containers with contrasting background rectangles.
  - Animations MUST render transparently and blend natively into the canvas background (`slate-950`).
  - Animation themes MUST directly reflect the network change verification nature (floating Cisco nodes, streaming CLI syntax diff tokens with backdrop label pills, and dual-phase converged trace paths).
  - External JSON animation engines (such as DotLottie) are strictly prohibited in favor of native HTML5 Canvas or SVG rendering.

- **Copy Non-Repetition**:
  - The brand tagline (`"Before. After. Understood."`) MUST be presented as an electric Voltage pill badge or sub-anchor. It MUST NEVER be duplicated verbatim as the main `<h2>` page headline. Page titles must feature an operational, risk-focused headline in sentence case.

- **Strict Button Naming**:
  - **`Run collection`** (or **`Capture`**) and **`Compare`** are the standard names for data collection and diff analysis.
  - All other buttons MUST be concise: 1 to 2 words only (`Register`, `Cancel`, `Test`, `Inspect`, `Analyze`, `Export`, `Copy`, `Save`, `Create`, `Delete`, `Sign In`, `Sign Out`).
- **Data Table Mandatory Features**:
  - Every data table MUST implement search filtering, column dropdown filters, and pagination via `PaginationToolbar`.
- **Provider Quarantine**:
  - The terms "OpenAI" and "OpenRouter" are strictly restricted to the AI Model tab under Settings. Global UI components must use vendor-neutral terminology.
- **Universal Fluid Detail Layout Standard**:
  - All profile, inspector, and detail views (including Device Profile, Audit Profile, Device Group Details, Command Set Details, and Snapshot Details) MUST NOT be enclosed inside arbitrary narrow wrappers (e.g. `max-w-4xl mx-auto` or `max-w-5xl mx-auto`).
  - All detail and profile views MUST render fluid full-width (`w-full space-y-6 font-sans`), matching the visual width, table dimensions, and desktop viewport of the parent module tabs.
- **Zero-Badge-Count Law (Navigation & Tabs)**:
  - Numeric badge count pills (e.g. `{devices.length}`, `{snapshots.length}`, `{group.deviceIds.length}`) are strictly prohibited across:
    1. Primary sidebar navigation items
    2. Top module phase tabs (`Setup`, `Operations`, `Analysis`)
    3. Sub-view switcher buttons (e.g. `All Devices` vs `Device Groups`)
    4. Profile/detail header title badges
  - Item counts belong exclusively inside dedicated summary telemetry cards, table pagination toolbars, or filter chips—never as persistent nav badges.
- **Operational Header Action Standard**:
  - Every device, group, or command profile detail view MUST provide a prominent operational shortcut button in the header actions bar:
    - Devices: Primary **`Run collection`** button linking to `/operations?tab=capture&deviceId={device.deviceId}`.
    - Groups: Primary **`Run collection`** button linking to `/operations?tab=capture&groupId={group.groupId}`.
    - Command Sets: Primary **`Run collection`** button linking to `/operations?tab=capture&setId={commandSet.setId}`.
  - Button text MUST strictly use sentence case: **`Run collection`** (never all-caps or title-case "Run Collection").

---

## 6. Voice, Tone & Error Diagnostic Standards

- **Senior Engineer Tone**:
  - Calm, precise, directly technical. State operational facts, impact, and next steps.
  - Strictly zero exclamation marks (`!`), emojis, or colloquial humor in system, status, or error messages.
  - Zero blame: state the system condition directly without attributing error to the operator (e.g. *"Invalid IPv4 address format"*).
  - Standard Empty State: *"No snapshots yet. Run your first collection to establish a baseline."*
  - Standard Loading State: *"Collecting from {n} devices…"*
  - Standard Show Safety: *"DriftGuard enforces show commands only."*
- **3-Part Error & Diagnostic Pattern**:
  - Every error message and AI risk finding MUST define:
    1. **What happened** (Observation): Technical condition or state divergence.
    2. **What it means** (Operational impact): Routing, forwarding, or redundancy blast radius.
    3. **What to do next** (Actionable next step): Verification or remediation commands.
- **Advisory AI Framing**:
  - Frame AI interpretations strictly as advisory guidance (`"DriftGuard analysis suggests..."`). The human engineer retains operational authority.
  - Report headers and remediation runbooks MUST include the senior engineer verification disclaimer.
- **Verbatim Sentence-Case Severities**:
  - Use `Critical`, `High`, `Medium`, `Low`, and `Informational` verbatim, paired with fixed color tokens (`rose-600`, `orange-500`, `amber-400`, `sky-400`, `slate-400`). Amber is strictly quarantined to severity ratings.
- **Sentence Case Standard**:
  - All headings, sub-headings, table headers, badges, and empty states MUST use sentence case conforming to shadcn/ui conventions.
- **Consistent Terminology**:
  - Strictly use `snapshot`, `collection`, `baseline`, and `diff`.

---

## 7. AI Change Verification & Zero-Change Invariants

- **The Prime Directive of Verification**:
  - An empty diff, or a diff containing solely expected volatile drift (elapsed uptime between collections, packet/byte counters, interface rates, load average drift), is a **valid, correct, and successful analysis result**.
  - System output for clean diffs MUST evaluate to severity **`Informational`** with an anchored risk score of **`0/100`**.
  - Never inflate severity to appear thorough. A false alarm costs the operator more than a cosmetic volatile detail.

- **Layer 1 Code Pre-Filtering (Safety Net & Cost Optimization)**:
  - Code-level regex screening (`screen_diff_for_functional_changes`) MUST screen out directional volatile noise (elapsed uptime, packet counters, last input/output timestamps) before invoking LLM inference.
  - If no functional signal remains after screening, the engine MUST early-exit, emit the canonical Informational payload, and report **`0 tokens (Layer 1 pre-filter)`** rather than consuming or hallucinating token usage.

- **Outright Ban on Unanchored AI Numeric Scores**:
  - LLM prompts MUST explicitly ban numeric scores, percentages, or ratings (`"Do not output numeric scores, percentages, or ratings of any kind."`).
  - Models MUST output categorical `severity` (`Critical`, `High`, `Medium`, `Low`, `Informational`).
  - Application code deterministically maps severity to anchored scores:
    - `Critical` $\to$ **95/100**
    - `High` $\to$ **80/100**
    - `Medium` $\to$ **50/100**
    - `Low` $\to$ **20/100**
    - `Informational` $\to$ **0/100**

- **Zero-Change Presentation Invariants**:
  - **Strict Rollback Suppression**: The Automated Rollback & Remediation Runbook MUST NOT be displayed when severity is `Informational`, risk score is `0`, or no changes exist. Never suggest reverting configurations or soft-resetting routing sessions when no changes occurred.
  - **Positive Baseline Congruent State**: When the findings count is 0, the UI MUST render a positive verification banner (**`Baseline Congruent`** with a **`Safe to Approve`** Voltage `#c8ff00` badge) confirming state congruence with the baseline.
  - **Summary Envelope Invariant**: The summary field MUST begin with the exact string `AI analysis suggests ` and end with the exact string `Verify against raw output before approval.`
  - **Verbatim Grounding**: Evidence excerpts MUST be copied verbatim from raw diffs and verified against raw diff lines.

