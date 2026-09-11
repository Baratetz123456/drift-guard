"""
Input validation utilities for DeltaNet.
Includes command safety filtering and IP validation.
"""

from shared.constants import BLOCKED_COMMAND_PATTERNS, MAX_COMMANDS_PER_SET
from shared.exceptions import UnsafeCommandError, ValidationError


def validate_commands(commands: list[str]) -> list[str]:
    """
    Validate a list of show commands.
    - Must start with 'show'
    - Must not contain blocked patterns
    - No duplicates
    - Max limit enforced
    """
    if len(commands) > MAX_COMMANDS_PER_SET:
        raise ValidationError(
            f"Maximum {MAX_COMMANDS_PER_SET} commands per set allowed"
        )

    validated = []
    seen = set()

    for cmd in commands:
        cmd = cmd.strip()
        if not cmd:
            continue

        # Must start with 'show'
        if not cmd.lower().startswith("show"):
            raise UnsafeCommandError(
                cmd, "Commands must start with 'show'"
            )

        # Check blocked patterns
        cmd_lower = cmd.lower()
        for pattern in BLOCKED_COMMAND_PATTERNS:
            if pattern in cmd_lower:
                raise UnsafeCommandError(
                    cmd,
                    f"Command contains blocked pattern: '{pattern}'",
                )

        # No duplicates
        if cmd_lower in seen:
            raise ValidationError(f"Duplicate command: '{cmd}'")
        seen.add(cmd_lower)

        validated.append(cmd)

    if not validated:
        raise ValidationError("At least one valid command is required")

    return validated


def validate_ip_or_hostname(value: str) -> str:
    """Validate that a string is a valid IP address or hostname."""
    import ipaddress

    value = value.strip()
    if not value:
        raise ValidationError("IP address or hostname is required")

    try:
        ipaddress.ip_address(value)
        return value
    except ValueError:
        pass

    # Validate as hostname
    if len(value) > 253:
        raise ValidationError("Hostname too long (max 253 characters)")

    allowed = set(
        "abcdefghijklmnopqrstuvwxyz"
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "0123456789.-_"
    )
    if not all(c in allowed for c in value):
        raise ValidationError(
            f"Invalid hostname: '{value}'. "
            "Only alphanumeric, dots, hyphens, and underscores allowed."
        )

    return value


def validate_port(port: int) -> int:
    """Validate SSH port number."""
    if not 1 <= port <= 65535:
        raise ValidationError(f"Invalid port: {port}. Must be 1-65535.")
    return port
