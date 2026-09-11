"""
Lambda handler for Device CRUD + test connectivity.
Routes: GET/POST /devices, GET/PUT/DELETE /devices/{deviceId}, POST /devices/{deviceId}/test
"""

from __future__ import annotations

import json
import logging

from shared.auth import get_user_id
from shared.response import success, created, no_content, from_exception
from shared.exceptions import DeltaNetError

from functions.devices.service import DeviceService

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """Route device requests."""
    try:
        user_id = get_user_id(event)
        method = event["httpMethod"]
        path = event.get("resource", "")
        path_params = event.get("pathParameters") or {}
        device_id = path_params.get("deviceId")
        service = DeviceService()

        # POST /devices/{deviceId}/test
        if method == "POST" and path.endswith("/test"):
            result = service.test_connectivity(user_id, device_id)
            return success(result)

        # POST /devices
        if method == "POST" and not device_id:
            body = json.loads(event.get("body", "{}"))
            device = service.create_device(user_id, body)
            return created(device)

        # GET /devices
        if method == "GET" and not device_id:
            params = event.get("queryStringParameters") or {}
            devices = service.list_devices(
                user_id,
                tag=params.get("tag"),
                search=params.get("search"),
            )
            return success({"devices": devices, "count": len(devices)})

        # GET /devices/{deviceId}
        if method == "GET" and device_id:
            device = service.get_device(user_id, device_id)
            return success(device)

        # PUT /devices/{deviceId}
        if method == "PUT" and device_id:
            body = json.loads(event.get("body", "{}"))
            device = service.update_device(user_id, device_id, body)
            return success(device)

        # DELETE /devices/{deviceId}
        if method == "DELETE" and device_id:
            service.delete_device(user_id, device_id)
            return no_content()

        return success({"error": "Method not allowed"}, status_code=405)

    except DeltaNetError as e:
        return from_exception(e)
    except Exception as e:
        logger.exception("Unhandled error in devices handler")
        return from_exception(e)
