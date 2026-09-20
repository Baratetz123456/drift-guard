"""
Standardized API Gateway response builders.
Ensures consistent JSON response format across all Lambda functions.
"""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)


def success(
    body: Any = None,
    status_code: int = 200,
    headers: dict[str, str] | None = None,
) -> dict:
    """Build a successful API Gateway response."""
    response = {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            **(headers or {}),
        },
    }

    if body is not None:
        response["body"] = json.dumps(body, default=str)
    else:
        response["body"] = ""

    return response


def created(body: Any = None) -> dict:
    """201 Created response."""
    return success(body, status_code=201)


def accepted(body: Any = None) -> dict:
    """202 Accepted response (for async operations)."""
    return success(body, status_code=202)


def no_content() -> dict:
    """204 No Content response."""
    return success(body=None, status_code=204)


def error(
    message: str,
    status_code: int = 500,
    details: dict | None = None,
) -> dict:
    """Build an error API Gateway response."""
    body = {"error": message}
    if details:
        body["details"] = details

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(body),
    }


def from_exception(exc: Exception) -> dict:
    """Build an error response from a DeltaNetError or generic exception."""
    from shared.exceptions import DeltaNetError

    if isinstance(exc, DeltaNetError):
        logger.warning(f"[{exc.status_code}] {exc.message}")
        return error(exc.message, status_code=exc.status_code)

    logger.exception(f"Unhandled exception: {exc}")
    return error("Internal server error", status_code=500)


def paginated(
    items: list,
    last_key: dict | None = None,
    count: int | None = None,
) -> dict:
    """Build a paginated response with items and optional next token."""
    import base64

    body: dict[str, Any] = {
        "items": items,
        "count": count if count is not None else len(items),
    }

    if last_key:
        body["nextToken"] = base64.b64encode(
            json.dumps(last_key).encode()
        ).decode()

    return success(body)


def parse_pagination(event: dict) -> dict:
    """Parse pagination parameters from query string."""
    import base64

    params = event.get("queryStringParameters") or {}
    result = {
        "limit": min(int(params.get("limit", "20")), 100),
    }

    next_token = params.get("nextToken")
    if next_token:
        try:
            result["exclusiveStartKey"] = json.loads(
                base64.b64decode(next_token).decode()
            )
        except (ValueError, TypeError) as e:
            logger.debug(f"Invalid pagination nextToken ignored: {e}")

    return result
