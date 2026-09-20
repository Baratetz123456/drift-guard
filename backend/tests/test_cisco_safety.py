"""
Cisco show-command read-only safety & command filter tests.
Validates zero-mutation invariant: mutating commands (reload, write erase, config t)
are strictly rejected, while non-mutating show commands are accepted.
"""

import pytest

from shared.constants import MAX_COMMANDS_PER_SET
from shared.exceptions import UnsafeCommandError, ValidationError
from shared.validators import validate_commands, validate_ip_or_hostname, validate_port


class TestCiscoCommandSafety:
    """Validates Cisco CLI read-only command validation rules."""

    def test_valid_show_commands_pass(self):
        """Standard Cisco read-only commands must pass validation."""
        valid_cmds = [
            "show version",
            "show running-config",
            "show ip interface brief",
            "show ip route",
            "show ip bgp summary",
            "show interfaces status",
        ]
        result = validate_commands(valid_cmds)
        assert len(result) == len(valid_cmds)
        assert result == valid_cmds

    @pytest.mark.parametrize(
        "mutating_cmd",
        [
            "reload",
            "write erase",
            "write memory",
            "configure terminal",
            "conf t",
            "no ip routing",
            "shutdown",
            "erase startup-config",
            "delete flash:test.bin",
            "format bootflash:",
            "clear ip bgp *",
            "debug ip packet",
        ],
    )
    def test_mutating_commands_strictly_rejected(self, mutating_cmd):
        """Mutating and hazardous commands must raise UnsafeCommandError."""
        with pytest.raises(UnsafeCommandError) as exc_info:
            validate_commands([mutating_cmd])
        assert "Commands must start with 'show'" in str(exc_info.value) or "blocked pattern" in str(exc_info.value)

    def test_show_command_with_embedded_blocked_pattern_rejected(self):
        """Commands that start with show but contain blocked hazardous patterns are rejected."""
        hazardous_show_cmds = [
            "show run | reload",
            "show tech-support reload",
            "show running-config no shut",
            "show format bootflash",
        ]
        for cmd in hazardous_show_cmds:
            with pytest.raises(UnsafeCommandError) as exc_info:
                validate_commands([cmd])
            assert "blocked pattern" in str(exc_info.value).lower()

    def test_duplicate_commands_rejected(self):
        """Duplicate commands in the same set must raise ValidationError."""
        cmds = ["show version", "show ip route", "show version"]
        with pytest.raises(ValidationError) as exc_info:
            validate_commands(cmds)
        assert "Duplicate command" in str(exc_info.value)

    def test_empty_command_list_rejected(self):
        """An empty list of commands must raise ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            validate_commands([])
        assert "At least one valid command is required" in str(exc_info.value)

    def test_max_commands_per_set_enforced(self):
        """Enforces MAX_COMMANDS_PER_SET ceiling."""
        too_many = [f"show command {i}" for i in range(MAX_COMMANDS_PER_SET + 5)]
        with pytest.raises(ValidationError) as exc_info:
            validate_commands(too_many)
        assert f"Maximum {MAX_COMMANDS_PER_SET} commands" in str(exc_info.value)


class TestNetworkValidators:
    """Tests for IP, hostname, and SSH port format validation."""

    @pytest.mark.parametrize(
        "valid_target",
        ["10.200.1.1", "192.168.1.254", "core-switch-01.corp", "edge_router.lab"],
    )
    def test_valid_ips_and_hostnames(self, valid_target):
        assert validate_ip_or_hostname(valid_target) == valid_target

    @pytest.mark.parametrize(
        "invalid_target",
        ["", "   ", "invalid!target$", "router@cisco"],
    )
    def test_invalid_ips_and_hostnames(self, invalid_target):
        with pytest.raises(ValidationError):
            validate_ip_or_hostname(invalid_target)

    def test_valid_ssh_ports(self):
        assert validate_port(22) == 22
        assert validate_port(2222) == 2222

    @pytest.mark.parametrize("invalid_port", [0, -1, 65536, 70000])
    def test_invalid_ssh_ports(self, invalid_port):
        with pytest.raises(ValidationError):
            validate_port(invalid_port)
