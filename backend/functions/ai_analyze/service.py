"""
AI Analysis service — sends diffs to OpenAI for severity analysis.
Handles prompt building, token management, and structured response parsing.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from shared import dynamo, s3
from shared.audit import log_action
from shared.constants import (
    EntityPrefix,
    GSI1,
    GSI2,
    TOKEN_THRESHOLD_SINGLE,
    TOKEN_THRESHOLD_CHUNKED,
)
from shared.exceptions import DependencyError, ExternalServiceError, ValidationError
from shared.models import generate_id, utc_now, Severity, AnalysisStrategy

from functions.ai_analyze.prompt_builder import (
    build_analysis_prompt,
    SYSTEM_PROMPT,
    screen_diff_for_functional_changes,
    generate_canned_informational_result,
)
from functions.ai_analyze.openai_client import call_openai

logger = logging.getLogger(__name__)

SEVERITY_RISK_SCORES: dict[str, int] = {
    Severity.CRITICAL.value: 95,
    Severity.HIGH.value: 80,
    Severity.MEDIUM.value: 50,
    Severity.LOW.value: 20,
    Severity.INFORMATIONAL.value: 0,
}


class AIAnalyzeService:
    """Orchestrates AI analysis of comparison diffs."""

    def analyze_comparison(
        self, user_id: str, comparison_id: str
    ) -> dict[str, Any]:
        """
        Analyze a comparison using OpenAI.
        Handles token estimation and chunking strategy.
        """
        pk = dynamo.build_pk(user_id)

        # Get user's OpenAI config
        from functions.settings.service import SettingsService
        settings_service = SettingsService()
        openai_config = settings_service.get_openai_config(user_id)

        # Get comparison with resolved diffs
        comp_sk = f"{EntityPrefix.COMPARISON}{comparison_id}"
        comparison = dynamo.get_item_or_raise(pk, comp_sk, "Comparison")

        # Check if there are actual changes
        diff_summary = comparison.get("diffSummary", {})
        if diff_summary.get("commandsWithChanges", 0) == 0:
            raise ValidationError(
                "Snapshots are identical — nothing to analyze"
            )

        # Resolve diffs from S3 if needed
        diffs = comparison.get("diffs", {})
        resolved_diffs = {}
        for cmd, diff_data in diffs.items():
            if isinstance(diff_data, dict) and "s3Key" in diff_data and len(diff_data) == 2:
                content = s3.read_s3_object(diff_data["s3Key"])
                resolved_diffs[cmd] = json.loads(content)
            else:
                resolved_diffs[cmd] = diff_data

        # Build prompt and determine strategy
        device_info = {
            "device_name": comparison.get("deviceName", ""),
            "platform": "",  # Will be filled from snapshot
            "management_ip": "",
            "change_label": comparison.get("changeLabel", ""),
            "pre_timestamp": comparison.get("preSnapshotSK", "").split("#")[-1] if comparison.get("preSnapshotSK") else "",
            "post_timestamp": comparison.get("postSnapshotSK", "").split("#")[-1] if comparison.get("postSnapshotSK") else "",
        }

        # Get device info from snapshot
        pre_snap = dynamo.get_item(pk, comparison.get("preSnapshotSK", ""))
        if pre_snap:
            device_info["platform"] = pre_snap.get("platform", "")
            # Get management IP from device
            device_item = dynamo.get_item(
                pk, f"{EntityPrefix.DEVICE}{comparison.get('deviceId', '')}"
            )
            if device_item:
                device_info["management_ip"] = device_item.get("managementIp", "")

        # Layer 1 Pre-filtering: Screen for functional changes vs noise-only volatile drift
        has_functional, screened_breakdown = screen_diff_for_functional_changes(resolved_diffs)

        if not has_functional:
            # Emit canned Informational result directly — skip AI inference
            analysis_data = generate_canned_informational_result(screened_breakdown)
            strategy = AnalysisStrategy.SINGLE_PASS.value
            usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        else:
            prompt, strategy = build_analysis_prompt(
                device_info=device_info,
                diffs=resolved_diffs,
                model=openai_config["model"],
            )

            # Call OpenAI / OpenRouter
            try:
                result = call_openai(
                    api_key=openai_config["api_key"],
                    model=openai_config["model"],
                    system_prompt=SYSTEM_PROMPT,
                    user_prompt=prompt,
                    max_tokens=openai_config["max_tokens"],
                    base_url=openai_config.get("base_url"),
                )
                analysis_data = result["analysis"]
                usage = result.get("usage", {})
            except Exception as e:
                raise ExternalServiceError("AI Provider", str(e))

        # Validate severity
        severity = analysis_data.get("severity", "INFORMATIONAL").upper()
        if severity not in [s.value for s in Severity]:
            severity = "INFORMATIONAL"

        # Deterministic severity to score mapping
        risk_score = SEVERITY_RISK_SCORES.get(severity, 0)

        # Save analysis
        analysis_id = generate_id("analysis-")
        now = utc_now()

        analysis_item = {
            "PK": pk,
            "SK": f"{EntityPrefix.ANALYSIS}{analysis_id}",
            "GSI1PK": f"{pk}#ANALYSES",
            "GSI1SK": now,
            "GSI2PK": f"{pk}#SEV",
            "GSI2SK": f"{severity}#{now}",
            "entityType": "AIAnalysis",
            "userId": user_id,
            "analysisId": analysis_id,
            "comparisonId": comparison_id,
            "deviceId": comparison.get("deviceId", ""),
            "deviceName": comparison.get("deviceName", ""),
            "changeLabel": comparison.get("changeLabel"),
            "model": openai_config["model"],
            "promptTokens": usage.get("prompt_tokens", 0),
            "completionTokens": usage.get("completion_tokens", 0),
            "totalTokens": usage.get("total_tokens", 0),
            "severity": severity,
            "riskScore": risk_score,
            "summary": analysis_data.get("summary", ""),
            "impactAnalysis": analysis_data.get("impactAnalysis", ""),
            "risks": analysis_data.get("risks", []),
            "conflictsDetected": analysis_data.get("conflictsDetected", []),
            "recommendations": analysis_data.get("recommendations", []),
            "commandBreakdown": analysis_data.get("commandBreakdown", []),
            "processingStrategy": strategy,
            "createdAt": now,
        }

        dynamo.put_item(analysis_item)

        # Link analysis to comparison
        dynamo.update_item(
            pk, comp_sk, {"analysisId": analysis_id}
        )

        log_action(
            user_id=user_id,
            action="AI_ANALYSIS_COMPLETED",
            resource_type="AIAnalysis",
            resource_id=analysis_id,
            details={
                "comparisonId": comparison_id,
                "severity": severity,
                "model": openai_config["model"],
                "totalTokens": result.get("usage", {}).get("total_tokens", 0),
            },
        )

        return self._to_response(analysis_item)

    def _to_response(self, item: dict[str, Any]) -> dict[str, Any]:
        """Convert analysis item to API response."""
        return {
            "analysisId": item.get("analysisId", ""),
            "comparisonId": item.get("comparisonId", ""),
            "deviceId": item.get("deviceId", ""),
            "deviceName": item.get("deviceName", ""),
            "changeLabel": item.get("changeLabel"),
            "model": item.get("model", ""),
            "promptTokens": item.get("promptTokens", 0),
            "completionTokens": item.get("completionTokens", 0),
            "totalTokens": item.get("totalTokens", 0),
            "severity": item.get("severity", ""),
            "summary": item.get("summary", ""),
            "impactAnalysis": item.get("impactAnalysis", ""),
            "risks": item.get("risks", []),
            "recommendations": item.get("recommendations", []),
            "commandBreakdown": item.get("commandBreakdown", []),
            "processingStrategy": item.get("processingStrategy", ""),
            "createdAt": item.get("createdAt", ""),
        }
