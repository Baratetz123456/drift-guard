"""
Async audit log writer.
Invokes the fn-audit Lambda asynchronously (fire-and-forget).
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Optional

import boto3

from shared.models import generate_id, utc_now

logger = logging.getLogger(__name__)

_lambda_client = None


def get_lambda_client():
    """Get or create Lambda client (connection reuse)."""
    global _lambda_client
    if _lambda_client is None:
        _lambda_client = boto3.client("lambda")
    return _lambda_client


def log_action(
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str,
    details: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """
    Send an audit log entry asynchronously to the audit Lambda.
    This is fire-and-forget — failures are logged but don't affect the caller.
    """
    try:
        environment = os.environ.get("ENVIRONMENT", "dev")
        audit_function = f"deltanet-audit-{environment}"

        payload = {
            "userId": user_id,
            "eventId": generate_id("evt-"),
            "action": action,
            "resourceType": resource_type,
            "resourceId": resource_id,
            "details": details or {},
            "ipAddress": ip_address or "",
            "userAgent": user_agent or "",
            "timestamp": utc_now(),
        }

        client = get_lambda_client()
        client.invoke(
            FunctionName=audit_function,
            InvocationType="Event",  # Async — fire and forget
            Payload=json.dumps(payload),
        )

        logger.debug(f"Audit log sent: {action} on {resource_type}/{resource_id}")

    except Exception as e:
        # Never let audit failures break the main flow
        logger.error(f"Failed to send audit log: {e}")


def extract_client_info(event: dict) -> dict[str, str]:
    """Extract IP address and user agent from API Gateway event."""
    request_context = event.get("requestContext", {})
    identity = request_context.get("identity", {})

    return {
        "ip_address": identity.get("sourceIp", ""),
        "user_agent": identity.get("userAgent", ""),
    }
