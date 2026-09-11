# DeltaNet Voice & Tone Guidelines (VOICE_AND_TONE.md)

DeltaNet operates as an enterprise-grade network automation and AI-assisted operational platform for senior network engineers and architects. All interface copy, system notifications, error diagnostics, and AI outputs must conform strictly to these standards.

---

## 1. Core Principles

- **Tone**: Calm, precise, directly technical. Like a senior engineer reporting facts, impact, and next steps. Serious but not stiff; contractions are acceptable (e.g. *can't*, *doesn't*).
- **No Blame**: Never blame the user. State the system condition directly:
  - *Incorrect*: "You entered an invalid IP address!"
  - *Correct*: "Invalid IPv4 address format. Provide a valid quad-dotted notation (e.g. 10.0.1.1)."
- **Zero Exclamations or Emojis**: Never use exclamation marks (`!`), emojis, or colloquial humor in system, status, progress, or error messages.
- **Sentence Case Standard**: Use sentence case for all headings, sub-headings, labels, table headers, and buttons (conforming to modern enterprise design systems).
- **Consistent Terminology**:
  - Use **snapshot** (not capture file, dump, or backup).
  - Use **collection** (not grab, pull, or fetch).
  - Use **baseline** (not pre-check or original state).
  - Use **diff** (not disparity or delta comparison).
- **Advisory AI Framing**: Frame AI interpretations strictly as advisory guidance. The human engineer retains operational authority:
  - "AI analysis suggests potential routing loop on AS65002..."
  - "AI interpretation highlights interface shutdown risk..."

---

## 2. 3-Part Error Standard

Every error message in DeltaNet must explicitly answer three questions:
1. **What happened**: The exact technical condition or failure observed.
2. **What it means**: The operational impact on the device, comparison, or snapshot.
3. **What to do next**: The actionable remediation step for the operator.

```
[WHAT HAPPENED]: SSH connection timed out after 30 seconds to 10.200.1.1:22.
[WHAT IT MEANS]: Snapshot collection could not retrieve running configuration state.
[WHAT TO DO NEXT]: Verify device route reachability, ACL port 22 access, and TACACS+ credentials.
```

---

## 3. Verbatim Severity Labels & Color Pairing

Severity labels must be written verbatim in sentence case and paired strictly with fixed colors:

| Verbatim Label | Color Token | Semantic Definition |
| :--- | :--- | :--- |
| **Critical** | `rose-400` / `bg-rose-500/20` | Immediate traffic-dropping, routing loop, or severe outage risk |
| **High** | `orange-400` / `bg-orange-500/20` | Redundancy loss, failover degradation, or policy mismatch |
| **Medium** | `amber-400` / `bg-amber-500/20` | Sub-optimal routing, dynamic counter anomalies, or config drift |
| **Low** | `zinc-300` / `bg-zinc-800` | Benign configuration divergence with no operational impact |
| **Informational**| `emerald-400` / `bg-emerald-500/20` | Normal baseline verification or expected operational change |

---

## 4. Canonical Copy Reference Matrix

| State Type | Canonical DeltaNet Copy Pattern |
| :--- | :--- |
| **Success** | `Snapshot snap-01 created and archived to S3. Ready for diff analysis.` |
| **Partial Failure** | `Collected 4 of 5 commands. show ip route timed out; continuing with remaining outputs.` |
| **Device Unreachable** | `Device unreachable at 10.200.1.1:22. SSH handshake failed. Check network path and credentials.` |
| **AI Advisory Header** | `AI analysis suggests review of BGP neighbor session state. Engineer verification required.` |
| **Destructive Confirmation** | `Delete device CORE-SW-01? This removes all associated credentials and scheduled collections. This action cannot be undone.` |
| **Empty State** | `No snapshots collected yet. Select a device and command set to initiate collection.` |
| **Loading State** | `Connecting via SSH and executing command suite. This may take up to 30 seconds.` |
