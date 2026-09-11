"""
Prompt builder for OpenAI analysis.
Constructs system and user prompts with token estimation and chunking strategy.
"""

from __future__ import annotations

import logging
from typing import Any

from shared.constants import TOKEN_THRESHOLD_SINGLE, TOKEN_THRESHOLD_CHUNKED
from shared.models import AnalysisStrategy

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are a senior network engineer and configuration auditor operating under DeltaNet Voice & Tone standards. You are analyzing \
the output of Cisco "show" commands collected from a network device before and \
after a configuration change.

Your task is to analyze the diff (comparison) between the pre-change and \
post-change outputs and provide a structured, advisory assessment.

Rules:
1. Tone: Calm, precise, directly technical, senior engineer perspective.
2. Zero exclamation marks (!), zero emojis, and zero colloquial humor.
3. Advisory Framing: AI outputs are strictly advisory. The summary MUST begin with "AI analysis suggests " and conclude with an advisory perspective. The human engineer retains operational authority.
4. Focus ONLY on functional, operational changes. Ignore cosmetic differences \
(whitespace, line ordering that doesn't affect behavior, timestamp changes \
in uptime counters).
5. 3-Part Diagnostic Model: For every identified risk and impact, structure findings around:
   - Observation: Exact technical condition or state divergence observed (reference interface names, IP addresses, route entries, ACLs).
   - Operational impact: What this change means for traffic forwarding, routing convergence, redundancy, or security posture.
   - Actionable next step: Concrete technical next step or remediation verification command.
6. If the diff is empty or shows no meaningful changes, state: "AI analysis suggests no functional configuration changes detected."

Severity Definitions:
- Critical: Immediate outage, routing blackhole, loop, or security failure (e.g., removing default route, shutting primary trunk).
- High: Substantial traffic path alteration, loss of peer redundancy, or policy mismatch requiring intervention.
- Medium: Contained feature change with isolated blast radius (e.g., adding a VLAN, adjusting non-backbone timers).
- Low: Minor operational change with no forwarding impact (e.g., interface description, NTP server drift).
- Informational: Normal baseline verification or purely cosmetic change.

You MUST respond with valid JSON matching this schema:
{
  "severity": "Critical|High|Medium|Low|Informational",
  "summary": "AI analysis suggests [plain-language advisory summary of what changed]. Senior engineer verification required before change approval.",
  "impactAnalysis": "Detailed technical analysis of operational impact",
  "risks": [
    {
      "observation": "Exact technical condition observed",
      "impact": "Operational impact on network stability",
      "nextStep": "Actionable verification or rollback step"
    }
  ],
  "recommendations": ["action1", "action2"],
  "commandBreakdown": [{"command": "show ...", "changeType": "modified", "details": "..."}]
}

Do not include any text outside the JSON object."""


def build_analysis_prompt(
    device_info: dict[str, str],
    diffs: dict[str, Any],
    model: str = "gpt-4o",
) -> tuple[str, str]:
    """
    Build the user prompt for analysis.

    Returns:
        tuple of (prompt_text, strategy)
        strategy is one of: "single-pass", "per-command", "chunked"
    """
    # Separate commands with and without changes
    changed_commands = {}
    identical_commands = []

    for cmd, diff_data in diffs.items():
        if isinstance(diff_data, dict) and diff_data.get("hasChanges"):
            changed_commands[cmd] = diff_data
        else:
            identical_commands.append(cmd)

    # Estimate token count
    total_diff_text = ""
    for cmd, diff_data in changed_commands.items():
        unified = diff_data.get("unifiedDiff", "")
        total_diff_text += f"\n### Command: {cmd}\n```diff\n{unified}\n```\n"

    estimated_tokens = _estimate_tokens(total_diff_text)
    logger.info(f"Estimated prompt tokens: {estimated_tokens}")

    # Determine strategy
    if estimated_tokens < TOKEN_THRESHOLD_SINGLE:
        strategy = AnalysisStrategy.SINGLE_PASS.value
    elif estimated_tokens < TOKEN_THRESHOLD_CHUNKED:
        strategy = AnalysisStrategy.PER_COMMAND.value
    else:
        strategy = AnalysisStrategy.CHUNKED.value

    # Build prompt
    prompt_parts = [
        "## Device Information",
        f"- Device Name: {device_info.get('device_name', 'Unknown')}",
        f"- Platform: {device_info.get('platform', 'Unknown')}",
        f"- Management IP: {device_info.get('management_ip', 'Unknown')}",
        f"- Change Label: {device_info.get('change_label', 'N/A')}",
        f"- Pre-Change Timestamp: {device_info.get('pre_timestamp', 'Unknown')}",
        f"- Post-Change Timestamp: {device_info.get('post_timestamp', 'Unknown')}",
        "",
        "## Diff Output",
        "",
    ]

    if strategy == AnalysisStrategy.SINGLE_PASS.value:
        # Include all diffs in one prompt
        for cmd, diff_data in changed_commands.items():
            unified = diff_data.get("unifiedDiff", "No diff available")
            prompt_parts.append(f"### Command: {cmd}")
            prompt_parts.append(f"```diff\n{unified}\n```")
            prompt_parts.append("")
    elif strategy == AnalysisStrategy.PER_COMMAND.value:
        # Include all diffs but note it's a large analysis
        prompt_parts.append(
            "*Note: This is a large diff. Analyze each command section carefully.*"
        )
        prompt_parts.append("")
        for cmd, diff_data in changed_commands.items():
            unified = diff_data.get("unifiedDiff", "")
            # Truncate very long individual diffs
            if len(unified) > 8000:
                unified = unified[:4000] + "\n...[TRUNCATED]...\n" + unified[-4000:]
            prompt_parts.append(f"### Command: {cmd}")
            prompt_parts.append(f"```diff\n{unified}\n```")
            prompt_parts.append("")
    else:
        # Chunked — only include summaries + first/last segments
        prompt_parts.append(
            "*Note: Very large diff. Showing key excerpts for each command.*"
        )
        prompt_parts.append("")
        for cmd, diff_data in changed_commands.items():
            unified = diff_data.get("unifiedDiff", "")
            stats = diff_data.get("stats", {})
            excerpt = unified[:3000] + "\n...[TRUNCATED]...\n" + unified[-1000:] if len(unified) > 4000 else unified
            prompt_parts.append(f"### Command: {cmd}")
            prompt_parts.append(
                f"*(+{stats.get('linesAdded', 0)} added, "
                f"-{stats.get('linesRemoved', 0)} removed)*"
            )
            prompt_parts.append(f"```diff\n{excerpt}\n```")
            prompt_parts.append("")

    if identical_commands:
        prompt_parts.append("## Commands With No Changes")
        for cmd in identical_commands:
            prompt_parts.append(f"- {cmd}")
        prompt_parts.append("")

    prompt_parts.append("Analyze the above diff and provide your assessment as JSON.")

    return "\n".join(prompt_parts), strategy


def _estimate_tokens(text: str) -> int:
    """
    Estimate token count. Uses a simple heuristic (~4 chars per token).
    For production, use tiktoken for exact counts.
    """
    # Simple estimation: ~4 characters per token
    return len(text) // 4
