"""
Lambda handler for User Settings CRUD.
Routes: GET /settings, PUT /settings
"""

from __future__ import annotations

import json
import logging

from functions.settings.service import SettingsService
from shared.auth import get_user_id
from shared.exceptions import DeltaNetError
from shared.response import from_exception, success

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """Route settings requests."""
    try:
        user_id = get_user_id(event)
        method = event["httpMethod"]
        service = SettingsService()

        if method == "GET":
            settings = service.get_settings(user_id)
            return success(settings)

        elif method == "PUT":
            body = json.loads(event.get("body", "{}"))
            settings = service.update_settings(user_id, body)
            return success(settings)

        return success({"error": "Method not allowed"}, status_code=405)

    except DeltaNetError as e:
        return from_exception(e)
    except Exception as e:
        logger.exception("Unhandled error in settings handler")
        return from_exception(e)
