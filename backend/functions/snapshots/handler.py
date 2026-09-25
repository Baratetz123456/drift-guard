"""
Lambda handler for Snapshots.
Routes: GET /snapshots, GET /snapshots/{snapshotId}, DELETE /snapshots/{snapshotId}
"""

from __future__ import annotations

import logging
from typing import Any

from shared import dynamo, s3
from shared.auth import get_user_id
from shared.constants import GSI1, EntityPrefix
from shared.exceptions import DeltaNetError
from shared.response import from_exception, no_content, success

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """Route snapshot requests."""
    try:
        user_id = get_user_id(event)
        method = event["httpMethod"]
        path_params = event.get("pathParameters") or {}
        snapshot_id = path_params.get("snapshotId")

        if method == "GET" and not snapshot_id:
            params = event.get("queryStringParameters") or {}
            snapshots = _list_snapshots(
                user_id,
                device_id=params.get("deviceId"),
                label=params.get("label"),
                limit=int(params.get("limit", "20")),
            )
            return success({"snapshots": snapshots, "count": len(snapshots)})

        if method == "GET" and snapshot_id:
            snapshot = _get_snapshot(user_id, snapshot_id)
            return success(snapshot)

        if method == "DELETE" and snapshot_id:
            _delete_snapshot(user_id, snapshot_id)
            return no_content()

        return success({"error": "Method not allowed"}, status_code=405)

    except DeltaNetError as e:
        return from_exception(e)
    except Exception as e:
        logger.exception("Unhandled error in snapshots handler")
        return from_exception(e)


def _list_snapshots(
    user_id: str,
    device_id: str | None = None,
    label: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """List snapshots filtered by device and/or label."""
    pk = dynamo.build_pk(user_id)

    if device_id:
        result = dynamo.query_items(
            f"{pk}#SNAPS#{device_id}",
            index_name=GSI1,
            limit=limit,
            scan_forward=False,
        )
    else:
        result = dynamo.query_items(
            pk,
            sk_prefix=EntityPrefix.SNAPSHOT,
            limit=limit,
            scan_forward=False,
        )

    snapshots = result["items"]

    if label:
        snapshots = [s for s in snapshots if s.get("label") == label]

    return [_to_response(s) for s in snapshots]


def _get_snapshot(user_id: str, snapshot_sk: str) -> dict[str, Any]:
    """Get a snapshot with resolved command outputs."""
    pk = dynamo.build_pk(user_id)
    # Handle URL-encoded SK
    snapshot_sk = snapshot_sk.replace("%23", "#")
    if not snapshot_sk.startswith(EntityPrefix.SNAPSHOT):
        snapshot_sk = f"{EntityPrefix.SNAPSHOT}{snapshot_sk}"

    item = dynamo.get_item_or_raise(pk, snapshot_sk, "Snapshot")

    # Resolve command outputs from S3
    outputs = item.get("commandOutputs", {})
    resolved = {}
    for cmd, meta in outputs.items():
        if isinstance(meta, dict):
            content = s3.read_output(meta)
            resolved[cmd] = {
                **meta,
                "content": content,
            }
            # Remove inline field to avoid duplication
            if "inline" in resolved[cmd]:
                del resolved[cmd]["inline"]

    response = _to_response(item)
    response["commandOutputs"] = resolved
    return response


def _delete_snapshot(user_id: str, snapshot_sk: str) -> None:
    """Delete a snapshot and its S3 artifacts."""
    pk = dynamo.build_pk(user_id)
    snapshot_sk = snapshot_sk.replace("%23", "#")
    if not snapshot_sk.startswith(EntityPrefix.SNAPSHOT):
        snapshot_sk = f"{EntityPrefix.SNAPSHOT}{snapshot_sk}"

    item = dynamo.get_item_or_raise(pk, snapshot_sk, "Snapshot")

    # Collect S3 keys
    s3_keys = []
    for meta in item.get("commandOutputs", {}).values():
        if isinstance(meta, dict) and "s3Key" in meta:
            s3_keys.append(meta["s3Key"])

    if s3_keys:
        s3.delete_s3_objects(s3_keys)

    dynamo.delete_item(pk, snapshot_sk)


def _to_response(item: dict[str, Any]) -> dict[str, Any]:
    """Convert snapshot item to API response."""
    return {
        "snapshotSK": item.get("SK", ""),
        "deviceId": item.get("deviceId", ""),
        "deviceName": item.get("deviceName", ""),
        "jobId": item.get("jobId", ""),
        "label": item.get("label", ""),
        "changeLabel": item.get("changeLabel"),
        "timestamp": item.get("timestamp", ""),
        "commandOutputs": {
            cmd: {
                "sizeBytes": meta.get("sizeBytes", 0),
                "lineCount": meta.get("lineCount", 0),
                "hasS3": "s3Key" in meta,
            }
            for cmd, meta in item.get("commandOutputs", {}).items()
            if isinstance(meta, dict)
        },
        "platform": item.get("platform", ""),
    }
