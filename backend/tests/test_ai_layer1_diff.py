"""
AI Analysis Layer 1 Pre-filtering, Volatile Screening & Invariant Tests.
Validates that volatile noise does not trigger LLM calls, zero-change produces
anchored Informational severity (0/100 risk), and summary envelope rules are obeyed.
"""

import pytest

from functions.ai_analyze.prompt_builder import (
    build_analysis_prompt,
    generate_canned_informational_result,
    is_line_volatile_noise,
    screen_diff_for_functional_changes,
)
from functions.ai_analyze.service import SEVERITY_RISK_SCORES


class TestAILayer1VolatileScreening:
    """Validates Layer 1 regex screening of expected volatile noise."""

    @pytest.mark.parametrize(
        "volatile_line",
        [
            "- router uptime is 4 weeks, 2 days, 11 hours, 14 minutes",
            "+ router uptime is 4 weeks, 2 days, 11 hours, 18 minutes",
            "+     5 minute input rate 124000 bits/sec, 45 packets/sec",
            "-     5 minute input rate 118000 bits/sec, 42 packets/sec",
            "+     32849202 packets input, 49204928420 bytes",
            "-     last input 00:00:04, output 00:00:01, output hang never",
            "+ NTP clock is synchronized, stratum 2, reference is 10.0.0.1",
            "+ CPU utilization for five seconds: 4%/0%; one minute: 5%; five minutes: 4%",
            "- load average: 0.12, 0.08, 0.05",
        ],
    )
    def test_identifies_volatile_noise(self, volatile_line):
        """Volatile drift lines must be flagged as noise."""
        assert is_line_volatile_noise(volatile_line) is True

    @pytest.mark.parametrize(
        "functional_line",
        [
            "-  ip route 10.50.0.0 255.255.0.0 10.200.1.1",
            "+  shutdown",
            "-  neighbor 10.100.1.2 remote-as 65001",
            "+  interface GigabitEthernet0/0/2",
            "-  ip address 192.168.10.1 255.255.255.0",
            "+  no ip routing",
        ],
    )
    def test_identifies_functional_signal(self, functional_line):
        """Routing, interface, and config changes must NOT be flagged as noise."""
        assert is_line_volatile_noise(functional_line) is False

    def test_screen_diff_with_volatile_drift_only(self):
        """Diff with only volatile drift returns has_functional_changes=False."""
        diffs = {
            "show version": {
                "unifiedDiff": (
                    "--- pre\n"
                    "+++ post\n"
                    "- router uptime is 1 day, 2 hours\n"
                    "+ router uptime is 1 day, 2 hours, 15 minutes\n"
                )
            },
            "show interfaces": {
                "unifiedDiff": (
                    "--- pre\n"
                    "+++ post\n"
                    "-     5 minute input rate 1000 bits/sec\n"
                    "+     5 minute input rate 1500 bits/sec\n"
                )
            },
        }

        has_functional, breakdown = screen_diff_for_functional_changes(diffs)
        assert has_functional is False
        assert len(breakdown) == 2
        for item in breakdown:
            assert item["changeType"] == "no-change"

    def test_screen_diff_with_functional_signal(self):
        """Diff with routing change returns has_functional_changes=True."""
        diffs = {
            "show ip route": {
                "unifiedDiff": (
                    "--- pre\n"
                    "+++ post\n"
                    "- B    10.10.0.0/16 [20/0] via 192.168.1.1\n"
                )
            }
        }

        has_functional, breakdown = screen_diff_for_functional_changes(diffs)
        assert has_functional is True
        assert breakdown[0]["changeType"] == "modified"


class TestAIAnalysisInvariants:
    """Validates DriftGuard change verification and zero-change invariants."""

    def test_canned_informational_result_structure(self):
        """Zero-change canned result enforces Prime Directive and summary envelope."""
        breakdown = [
            {"command": "show version", "changeType": "no-change", "details": "output congruent"}
        ]
        res = generate_canned_informational_result(breakdown)

        assert res["severity"] == "Informational"
        assert res["risks"] == []
        assert res["conflictsDetected"] == []
        assert res["recommendations"] == []
        assert res["suggestedRollbackPlan"] is None

        # Summary envelope invariant
        summary = res["summary"]
        assert summary.startswith(("Verification analysis suggests", "AI analysis suggests"))
        assert summary.endswith("Verify against raw output before approval.")

    def test_deterministic_severity_risk_scores(self):
        """Anchor score mapping must strictly follow specification."""
        assert SEVERITY_RISK_SCORES["CRITICAL"] == 95
        assert SEVERITY_RISK_SCORES["HIGH"] == 80
        assert SEVERITY_RISK_SCORES["MEDIUM"] == 50
        assert SEVERITY_RISK_SCORES["LOW"] == 20
        assert SEVERITY_RISK_SCORES["INFORMATIONAL"] == 0

    def test_prompt_builder_wraps_untrusted_device_output(self):
        """Device output in prompt is wrapped in untrusted_device_output blocks."""
        device_info = {"device_name": "Test-Router", "platform": "cisco_xe"}
        diffs = {
            "show version": {
                "preOutput": "pre data",
                "postOutput": "post data",
                "unifiedDiff": "+ change",
            }
        }
        prompt, strategy = build_analysis_prompt(device_info, diffs)
        assert '<untrusted_device_output command="show version">' in prompt
        assert "</untrusted_device_output>" in prompt
        assert strategy in ["single-pass", "per-command", "chunked"]
