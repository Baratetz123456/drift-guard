"""
Lambda handler for Audit Log.
Handles both:
1. Async invocations from other Lambdas (write audit entries)
2. API Gateway GET /audit-logs (query audit trail)
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from shared import dynamo
from shared.constants import EntityPrefix, AUDIT_TTL_DAYS
from shared.response import success, from_exception
from shared.exceptions import DeltaNetError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """Handle audit log operations."""
    try:
        # Check if this is an async invocation (write) or API request (read)
        if "httpMethod" in event:
            return _handle_api_request(event)
        else:
            return _handle_async_write(event)

    except DeltaNetError as e:
        return from_exception(e)
    except Exception as e:
        logger.exception("Unhandled error in audit handler")
        return from_exception(e)


def _handle_api_request(event: dict) -> dict:
    """Handle GET /audit-logs API request."""
    from shared.auth import get_user_id

    user_id = get_user_id(event)
    params = event.get("queryStringParameters") or {}

    pk = dynamo.build_pk(user_id)
    limit = min(int(params.get("limit", "50")), 100)

    # Query audit logs
    result = dynamo.query_items(
        pk,
        sk_prefix=EntityPrefix.AUDIT,
        limit=limit,
        scan_forward=False,
    )

    logs = []
    for item in result["items"]:
        # Filter by action if specified
        action_filter = params.get("action")
        if action_filter and item.get("action") != action_filter:
            continue

        logs.append({
            "eventId": item.get("eventId", ""),
            "action": item.get("action", ""),
            "resourceType": item.get("resourceType", ""),
            "resourceId": item.get("resourceId", ""),
            "details": item.get("details", {}),
            "timestamp": item.get("timestamp", ""),
        })

    return success({"logs": logs, "count": len(logs)})


def _handle_async_write(event: dict) -> dict:
    """Handle async audit log write from other Lambdas."""
    user_id = event.get("userId", "")
    if not user_id:
        logger.error("Audit write missing userId")
        return {"statusCode": 400}

    pk = dynamo.build_pk(user_id)
    timestamp = event.get("timestamp", "")
    event_id = event.get("eventId", "")

    # Calculate TTL (90 days from now)
    ttl = int(time.time()) + (AUDIT_TTL_DAYS * 24 * 60 * 60)

    item = {
        "PK": pk,
        "SK": f"{EntityPrefix.AUDIT}{timestamp}#{event_id}",
        "entityType": "AuditLog",
        "userId": user_id,
        "eventId": event_id,
        "action": event.get("action", ""),
        "resourceType": event.get("resourceType", ""),
        "resourceId": event.get("resourceId", ""),
        "details": event.get("details", {}),
        "ipAddress": event.get("ipAddress", ""),
        "userAgent": event.get("userAgent", ""),
        "timestamp": timestamp,
        "ttl": ttl,
    }

    dynamo.put_item(item)
    logger.debug(f"Audit log written: {event.get('action')} on {event.get('resourceType')}")

    return {"statusCode": 200}
