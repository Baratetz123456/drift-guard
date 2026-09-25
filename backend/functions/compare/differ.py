"""
Line-based diff engine with normalization.
Generates structured diffs for the comparison viewer.
"""

from __future__ import annotations

import difflib
import re
from typing import Any

# Commands that produce tabular output — preserve spacing
TABULAR_COMMANDS = [
    "show ip interface brief",
    "show interfaces status",
    "show ip ospf neighbor",
    "show cdp neighbors",
    "show ip bgp summary",
    "show mac address-table",
]

# Patterns to ignore (timestamps, counters that change every collection)
IGNORE_PATTERNS = [
    re.compile(r".*uptime is.*", re.IGNORECASE),
    re.compile(r".*\d{2}:\d{2}:\d{2}\.\d+.*UTC.*"),
    re.compile(r"^Current configuration : \d+ bytes$"),
    re.compile(r"^! Last configuration change.*"),
    re.compile(r"^! NVRAM config last updated.*"),
    re.compile(r"^ntp clock-period \d+$"),
]


def generate_diff(pre_output: str, post_output: str, command: str) -> dict[str, Any]:
    """
    Generate a structured diff between pre and post command outputs.

    Returns a dict with:
    - command: the command name
    - hasChanges: bool
    - unifiedDiff: unified diff string for display
    - changes: list of structured change blocks for side-by-side view
    - stats: {linesAdded, linesRemoved}
    """
    # Normalize outputs
    pre_normalized = _normalize_output(pre_output, command)
    post_normalized = _normalize_output(post_output, command)

    pre_lines = pre_normalized.splitlines()
    post_lines = post_normalized.splitlines()

    # Generate unified diff
    diff_lines = list(
        difflib.unified_diff(
            pre_lines,
            post_lines,
            fromfile="pre-change",
            tofile="post-change",
            lineterm="",
        )
    )

    # Generate structured diff for side-by-side view
    matcher = difflib.SequenceMatcher(
        isjunk=None,
        a=pre_lines,
        b=post_lines,
    )

    changes = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        changes.append(
            {
                "type": tag,  # replace, insert, delete
                "preLines": {
                    "start": i1 + 1,
                    "end": i2,
                    "content": pre_lines[i1:i2],
                },
                "postLines": {
                    "start": j1 + 1,
                    "end": j2,
                    "content": post_lines[j1:j2],
                },
            }
        )

    # Count added/removed (skip header lines)
    lines_added = sum(
        1 for line in diff_lines if line.startswith("+") and not line.startswith("+++")
    )
    lines_removed = sum(
        1 for line in diff_lines if line.startswith("-") and not line.startswith("---")
    )

    return {
        "command": command,
        "hasChanges": len(changes) > 0,
        "unifiedDiff": "\n".join(diff_lines),
        "changes": changes,
        "stats": {
            "linesAdded": lines_added,
            "linesRemoved": lines_removed,
        },
    }


def _normalize_output(output: str, command: str) -> str:
    """
    Normalize command output for meaningful comparison.
    - Strips trailing whitespace
    - Removes timestamp/counter lines that change every collection
    - Normalizes multiple spaces for non-tabular commands
    """
    if not output:
        return ""

    lines = output.splitlines()
    normalized = []
    is_tabular = any(
        cmd in command.lower() for cmd in TABULAR_COMMANDS
    )

    for line in lines:
        # Strip trailing whitespace
        line = line.rstrip()

        # Skip lines matching ignore patterns
        if any(pattern.match(line) for pattern in IGNORE_PATTERNS):
            continue

        # Normalize multiple spaces for non-tabular output
        if not is_tabular:
            line = re.sub(r"  +", " ", line)

        normalized.append(line)

    # Remove leading/trailing blank lines
    while normalized and not normalized[0].strip():
        normalized.pop(0)
    while normalized and not normalized[-1].strip():
        normalized.pop()

    return "\n".join(normalized)
