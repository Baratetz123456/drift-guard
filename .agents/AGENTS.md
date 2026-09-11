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
| **Lead Orchestrator** | `@orchestrator` | Task intake, scope decomposition, gating transitions, synthesis | `agent-orchestrator` |
| **Architect** | `@architect` | Requirements analysis, AWS serverless design, Cisco CLI data models | `agent-architect` |
| **Implementer** | `@implementer` | Backend Lambda microservices, React 19/TS UI, DynamoDB access | `agent-implementer` |
| **Tester** | `@tester` | Terminal execution (`npm run build`, `pytest`), mock testing | `agent-tester` |
| **Reviewer & Verifier** | `@reviewer` | Cisco read-only safety, KMS security audit, UI consistency | `agent-reviewer` |

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
  - Frontend: `npm run build` in `d:\DeltaNet\frontend`
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
- **Clickable Links**: All file and symbol references MUST use GitHub-style markdown links with `file://` scheme (e.g. `[handler.py](file:///d:/DeltaNet/backend/functions/devices/handler.py)`).
- **Desktop-First Polish**: DriftGuard is an enterprise desktop verification instrument. Keep typography crisp (Inter + JetBrains Mono) and avoid plain default styles.

---

## 5. DriftGuard Brand & Design System Standards

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

- **Strict Button Naming**:
  - **`Run collection`** (or **`Capture`**) and **`Compare`** are the standard names for data collection and diff analysis.
  - All other buttons MUST be concise: 1 to 2 words only (`Register`, `Cancel`, `Test`, `Inspect`, `Analyze`, `Export`, `Copy`, `Save`, `Create`, `Delete`, `Sign In`, `Sign Out`).
- **Data Table Mandatory Features**:
  - Every data table MUST implement search filtering, column dropdown filters, and pagination via `PaginationToolbar`.
- **Provider Quarantine**:
  - The terms "OpenAI" and "OpenRouter" are strictly restricted to the AI Model tab under Settings. Global UI components must use vendor-neutral terminology.
- **Progressive AI Disclosure**:
  - Comparison views present an in-place AI summary card with an `Inspect` button linking to the dedicated detailed report view.

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
