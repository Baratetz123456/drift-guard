"""
Comparison service — generates diffs between pre and post snapshots.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from shared import dynamo, s3
from shared.audit import log_action
from shared.constants import EntityPrefix, GSI1, GSI2, S3Prefix
from shared.exceptions import ValidationError
from shared.models import (
    CreateComparisonRequest,
    generate_id,
    utc_now,
)

from functions.compare.differ import generate_diff

logger = logging.getLogger(__name__)


class CompareService:
    """Generates and manages snapshot comparisons."""

    def create_comparison(self, user_id: str, body: dict) -> dict[str, Any]:
        """Create a comparison between two snapshots."""
        request = CreateComparisonRequest(**body)
        pk = dynamo.build_pk(user_id)

        # Fetch both snapshots
        pre_snapshot = dynamo.get_item(pk, request.preSnapshotSK)
        if not pre_snapshot:
            raise ValidationError("Pre-change snapshot not found")

        post_snapshot = dynamo.get_item(pk, request.postSnapshotSK)
        if not post_snapshot:
            raise ValidationError("Post-change snapshot not found")

        # Verify same device
        pre_device = pre_snapshot.get("deviceId")
        post_device = post_snapshot.get("deviceId")
        if pre_device != post_device:
            raise ValidationError(
                "Pre and post snapshots must be from the same device"
            )

        comparison_id = generate_id("comp-")
        now = utc_now()
        device_id = pre_device
        device_name = pre_snapshot.get("deviceName", "")

        # Generate diffs for each command
        pre_outputs = pre_snapshot.get("commandOutputs", {})
        post_outputs = post_snapshot.get("commandOutputs", {})

        all_commands = sorted(
            set(list(pre_outputs.keys()) + list(post_outputs.keys()))
        )

        diffs = {}
        total_added = 0
        total_removed = 0
        commands_with_changes = 0
        commands_identical = 0

        for cmd in all_commands:
            pre_meta = pre_outputs.get(cmd, {})
            post_meta = post_outputs.get(cmd, {})

            # Read actual content
            pre_content = s3.read_output(pre_meta) if pre_meta else ""
            post_content = s3.read_output(post_meta) if post_meta else ""

            # Generate diff
            diff_result = generate_diff(pre_content, post_content, cmd)

            if diff_result["hasChanges"]:
                commands_with_changes += 1
                total_added += diff_result["stats"].get("linesAdded", 0)
                total_removed += diff_result["stats"].get("linesRemoved", 0)
            else:
                commands_identical += 1

            # Store diff (inline or S3)
            diff_json = json.dumps(diff_result)
            if len(diff_json) > 4096:
                s3_key = f"{S3Prefix.DIFFS}{user_id}/{comparison_id}/{cmd.replace(' ', '_')}.diff.json"
                s3.write_s3_object(s3_key, diff_json, "application/json")
                diffs[cmd] = {
                    "s3Key": s3_key,
                    "hasChanges": diff_result["hasChanges"],
                }
            else:
                diffs[cmd] = diff_result

        diff_summary = {
            "totalCommands": len(all_commands),
            "commandsWithChanges": commands_with_changes,
            "commandsIdentical": commands_identical,
            "totalLinesAdded": total_added,
            "totalLinesRemoved": total_removed,
        }

        # Save comparison
        comparison_item = {
            "PK": pk,
            "SK": f"{EntityPrefix.COMPARISON}{comparison_id}",
            "GSI1PK": f"{pk}#COMPS",
            "GSI1SK": now,
            "GSI2PK": f"{pk}#COMPS#{device_id}",
            "GSI2SK": now,
            "entityType": "Comparison",
            "userId": user_id,
            "comparisonId": comparison_id,
            "deviceId": device_id,
            "deviceName": device_name,
            "preSnapshotSK": request.preSnapshotSK,
            "postSnapshotSK": request.postSnapshotSK,
            "preLabel": pre_snapshot.get("label", ""),
            "postLabel": post_snapshot.get("label", ""),
            "changeLabel": pre_snapshot.get("changeLabel")
            or post_snapshot.get("changeLabel"),
            "diffSummary": diff_summary,
            "diffs": diffs,
            "createdAt": now,
        }

        dynamo.put_item(comparison_item)

        log_action(
            user_id=user_id,
            action="COMPARISON_CREATED",
            resource_type="Comparison",
            resource_id=comparison_id,
            details=diff_summary,
        )

        return self._to_response(comparison_item)

    def list_comparisons(
        self, user_id: str, device_id: Optional[str] = None
    ) -> list[dict[str, Any]]:
        """List comparisons, optionally filtered by device."""
        pk = dynamo.build_pk(user_id)

        if device_id:
            result = dynamo.query_items(
                f"{pk}#COMPS#{device_id}",
                index_name=GSI2,
                scan_forward=False,
            )
        else:
            result = dynamo.query_items(
                f"{pk}#COMPS",
                index_name=GSI1,
                scan_forward=False,
            )

        return [self._to_response(item) for item in result["items"]]

    def get_comparison(self, user_id: str, comparison_id: str) -> dict[str, Any]:
        """Get a comparison with full diffs (resolved from S3 if needed)."""
        pk = dynamo.build_pk(user_id)
        sk = f"{EntityPrefix.COMPARISON}{comparison_id}"
        item = dynamo.get_item_or_raise(pk, sk, "Comparison")

        # Resolve S3-stored diffs
        diffs = item.get("diffs", {})
        resolved_diffs = {}
        for cmd, diff_data in diffs.items():
            if isinstance(diff_data, dict) and "s3Key" in diff_data and "hasChanges" in diff_data and len(diff_data) == 2:
                # This is a pointer — fetch from S3
                content = s3.read_s3_object(diff_data["s3Key"])
                resolved_diffs[cmd] = json.loads(content)
            else:
                resolved_diffs[cmd] = diff_data

        item["diffs"] = resolved_diffs
        return self._to_response(item)

    def delete_comparison(self, user_id: str, comparison_id: str) -> None:
        """Delete a comparison and its S3 artifacts."""
        pk = dynamo.build_pk(user_id)
        sk = f"{EntityPrefix.COMPARISON}{comparison_id}"
        item = dynamo.get_item_or_raise(pk, sk, "Comparison")

        # Clean up S3 artifacts
        s3_keys = []
        for cmd, diff_data in item.get("diffs", {}).items():
            if isinstance(diff_data, dict) and "s3Key" in diff_data:
                s3_keys.append(diff_data["s3Key"])

        if s3_keys:
            s3.delete_s3_objects(s3_keys)

        dynamo.delete_item(pk, sk)

    def _to_response(self, item: dict[str, Any]) -> dict[str, Any]:
        """Convert comparison item to API response."""
        return {
            "comparisonId": item.get("comparisonId", ""),
            "deviceId": item.get("deviceId", ""),
            "deviceName": item.get("deviceName", ""),
            "preSnapshotSK": item.get("preSnapshotSK", ""),
            "postSnapshotSK": item.get("postSnapshotSK", ""),
            "preLabel": item.get("preLabel", ""),
            "postLabel": item.get("postLabel", ""),
            "changeLabel": item.get("changeLabel"),
            "diffSummary": item.get("diffSummary", {}),
            "diffs": item.get("diffs", {}),
            "analysisId": item.get("analysisId"),
            "createdAt": item.get("createdAt", ""),
        }
