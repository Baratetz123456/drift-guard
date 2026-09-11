"""
Lambda handler for History & Export.
Routes: GET /history, GET /export/comparison/{id}, GET /export/analysis/{id}
"""

from __future__ import annotations

import json
import logging
from typing import Any

from shared.auth import get_user_id
from shared import dynamo, s3
from shared.constants import EntityPrefix, GSI1, GSI2
from shared.response import success, from_exception
from shared.exceptions import DeltaNetError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """Route history and export requests."""
    try:
        user_id = get_user_id(event)
        path = event.get("resource", "")
        path_params = event.get("pathParameters") or {}

        if "/export/comparison/" in path:
            comparison_id = path_params.get("comparisonId")
            data = _export_comparison(user_id, comparison_id)
            return success(data)

        if "/export/analysis/" in path:
            analysis_id = path_params.get("analysisId")
            data = _export_analysis(user_id, analysis_id)
            return success(data)

        if "/history" in path:
            params = event.get("queryStringParameters") or {}
            events = _get_history(
                user_id,
                device_id=params.get("deviceId"),
                event_type=params.get("type"),
            )
            return success({"events": events, "count": len(events)})

        return success({"error": "Method not allowed"}, status_code=405)

    except DeltaNetError as e:
        return from_exception(e)
    except Exception as e:
        logger.exception("Unhandled error in history handler")
        return from_exception(e)


def _get_history(
    user_id: str,
    device_id: str | None = None,
    event_type: str | None = None,
) -> list[dict[str, Any]]:
    """Get unified timeline of snapshots, comparisons, and analyses."""
    pk = dynamo.build_pk(user_id)
    events = []

    # Fetch snapshots
    if not event_type or event_type == "snapshot":
        if device_id:
            result = dynamo.query_items(
                f"{pk}#SNAPS#{device_id}",
                index_name=GSI1,
                scan_forward=False,
                limit=50,
            )
        else:
            result = dynamo.query_items(
                pk, sk_prefix=EntityPrefix.SNAPSHOT, scan_forward=False, limit=50
            )
        for item in result["items"]:
            events.append({
                "type": "snapshot",
                "id": item.get("SK", ""),
                "deviceId": item.get("deviceId", ""),
                "deviceName": item.get("deviceName", ""),
                "label": item.get("label", ""),
                "changeLabel": item.get("changeLabel"),
                "timestamp": item.get("timestamp", ""),
            })

    # Fetch comparisons
    if not event_type or event_type == "comparison":
        if device_id:
            result = dynamo.query_items(
                f"{pk}#COMPS#{device_id}",
                index_name=GSI2,
                scan_forward=False,
                limit=50,
            )
        else:
            result = dynamo.query_items(
                f"{pk}#COMPS",
                index_name=GSI1,
                scan_forward=False,
                limit=50,
            )
        for item in result["items"]:
            events.append({
                "type": "comparison",
                "id": item.get("comparisonId", ""),
                "deviceId": item.get("deviceId", ""),
                "deviceName": item.get("deviceName", ""),
                "changeLabel": item.get("changeLabel"),
                "diffSummary": item.get("diffSummary", {}),
                "analysisId": item.get("analysisId"),
                "timestamp": item.get("createdAt", ""),
            })

    # Fetch analyses
    if not event_type or event_type == "analysis":
        result = dynamo.query_items(
            f"{pk}#ANALYSES",
            index_name=GSI1,
            scan_forward=False,
            limit=50,
        )
        for item in result["items"]:
            if device_id and item.get("deviceId") != device_id:
                continue
            events.append({
                "type": "analysis",
                "id": item.get("analysisId", ""),
                "deviceId": item.get("deviceId", ""),
                "deviceName": item.get("deviceName", ""),
                "severity": item.get("severity", ""),
                "changeLabel": item.get("changeLabel"),
                "model": item.get("model", ""),
                "timestamp": item.get("createdAt", ""),
            })

    # Sort by timestamp descending
    events.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
    return events[:100]


def _export_comparison(user_id: str, comparison_id: str) -> dict[str, Any]:
    """Export full comparison with resolved diffs."""
    pk = dynamo.build_pk(user_id)
    sk = f"{EntityPrefix.COMPARISON}{comparison_id}"
    item = dynamo.get_item_or_raise(pk, sk, "Comparison")

    # Resolve S3-stored diffs
    diffs = item.get("diffs", {})
    for cmd, diff_data in diffs.items():
        if isinstance(diff_data, dict) and "s3Key" in diff_data and len(diff_data) == 2:
            content = s3.read_s3_object(diff_data["s3Key"])
            diffs[cmd] = json.loads(content)

    item["diffs"] = diffs

    # Remove internal fields
    for field in ["PK", "SK", "GSI1PK", "GSI1SK", "GSI2PK", "GSI2SK", "entityType", "userId"]:
        item.pop(field, None)

    return {"export": item, "exportType": "comparison", "exportedAt": dynamo.build_pk(user_id)}


def _export_analysis(user_id: str, analysis_id: str) -> dict[str, Any]:
    """Export full analysis."""
    pk = dynamo.build_pk(user_id)
    sk = f"{EntityPrefix.ANALYSIS}{analysis_id}"
    item = dynamo.get_item_or_raise(pk, sk, "AIAnalysis")

    for field in ["PK", "SK", "GSI1PK", "GSI1SK", "GSI2PK", "GSI2SK", "entityType", "userId"]:
        item.pop(field, None)

    return {"export": item, "exportType": "analysis"}
