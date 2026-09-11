"""
Lambda handler for Command Set CRUD.
Routes: GET/POST /command-sets, GET/PUT/DELETE /command-sets/{setId}
"""

from __future__ import annotations

import json
import logging

from shared.auth import get_user_id
from shared.response import success, created, no_content, from_exception
from shared.exceptions import DeltaNetError

from functions.commands.service import CommandService

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """Route command set requests."""
    try:
        user_id = get_user_id(event)
        method = event["httpMethod"]
        path_params = event.get("pathParameters") or {}
        set_id = path_params.get("setId")
        service = CommandService()

        if method == "POST" and not set_id:
            body = json.loads(event.get("body", "{}"))
            cmd_set = service.create_command_set(user_id, body)
            return created(cmd_set)

        if method == "GET" and not set_id:
            cmd_sets = service.list_command_sets(user_id)
            return success({"commandSets": cmd_sets})

        if method == "GET" and set_id:
            cmd_set = service.get_command_set(user_id, set_id)
            return success(cmd_set)

        if method == "PUT" and set_id:
            body = json.loads(event.get("body", "{}"))
            cmd_set = service.update_command_set(user_id, set_id, body)
            return success(cmd_set)

        if method == "DELETE" and set_id:
            service.delete_command_set(user_id, set_id)
            return no_content()

        return success({"error": "Method not allowed"}, status_code=405)

    except DeltaNetError as e:
        return from_exception(e)
    except Exception as e:
        logger.exception("Unhandled error in commands handler")
        return from_exception(e)
