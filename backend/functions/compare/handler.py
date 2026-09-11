"""
Lambda handler for Compare function.
Routes: POST /comparisons, GET /comparisons, GET/DELETE /comparisons/{id}
"""

from __future__ import annotations

import json
import logging

from shared.auth import get_user_id
from shared.response import success, created, no_content, from_exception
from shared.exceptions import DeltaNetError

from functions.compare.service import CompareService

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """Route comparison requests."""
    try:
        user_id = get_user_id(event)
        method = event["httpMethod"]
        path_params = event.get("pathParameters") or {}
        comparison_id = path_params.get("comparisonId")
        service = CompareService()

        if method == "POST" and not comparison_id:
            body = json.loads(event.get("body", "{}"))
            comparison = service.create_comparison(user_id, body)
            return created(comparison)

        if method == "GET" and not comparison_id:
            params = event.get("queryStringParameters") or {}
            comparisons = service.list_comparisons(
                user_id,
                device_id=params.get("deviceId"),
            )
            return success({"comparisons": comparisons, "count": len(comparisons)})

        if method == "GET" and comparison_id:
            comparison = service.get_comparison(user_id, comparison_id)
            return success(comparison)

        if method == "DELETE" and comparison_id:
            service.delete_comparison(user_id, comparison_id)
            return no_content()

        return success({"error": "Method not allowed"}, status_code=405)

    except DeltaNetError as e:
        return from_exception(e)
    except Exception as e:
        logger.exception("Unhandled error in compare handler")
        return from_exception(e)
