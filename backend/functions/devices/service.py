"""
Device business logic — CRUD operations and SSH connectivity testing.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from shared import dynamo, kms
from shared.constants import GSI1, EntityPrefix
from shared.exceptions import ConflictError
from shared.models import (
    CreateDeviceRequest,
    DeviceResponse,
    UpdateDeviceRequest,
    generate_id,
    utc_now,
)

logger = logging.getLogger(__name__)


class DeviceService:
    """Manages network device inventory with encrypted credentials."""

    def create_device(self, user_id: str, body: dict) -> dict[str, Any]:
        """Create a new device with encrypted credentials."""
        request = CreateDeviceRequest(**body)
        pk = dynamo.build_pk(user_id)
        device_id = generate_id("dev-")
        now = utc_now()

        # Check for duplicate IP:port
        existing_devices = dynamo.query_all(pk, sk_prefix=EntityPrefix.DEVICE)
        for dev in existing_devices:
            if (
                dev.get("managementIp") == request.managementIp
                and dev.get("sshPort") == request.sshPort
            ):
                raise ConflictError(
                    f"Device with IP {request.managementIp}:{request.sshPort} already exists"
                )

        # Encrypt credentials
        encrypted_creds = kms.encrypt_credentials(
            username=request.username,
            password=request.password,
            enable_secret=request.enableSecret,
        )

        item = {
            "PK": pk,
            "SK": f"{EntityPrefix.DEVICE}{device_id}",
            "GSI1PK": f"{pk}#DEVICES",
            "GSI1SK": request.deviceName,
            "entityType": "Device",
            "userId": user_id,
            "deviceId": device_id,
            "deviceName": request.deviceName,
            "managementIp": request.managementIp,
            "sshPort": request.sshPort,
            "platform": request.platform.value,
            "timeoutSeconds": request.timeoutSeconds,
            "tags": request.tags,
            "commandSetId": request.commandSetId,
            "createdAt": now,
            "updatedAt": now,
            **encrypted_creds,
        }

        dynamo.put_item(item)

        logger.info(f"Created device {device_id}: {request.deviceName}")
        return self._to_response(item)

    def list_devices(
        self,
        user_id: str,
        tag: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        """List all devices for a user, optionally filtered by tag or search term."""
        pk = dynamo.build_pk(user_id)
        devices = dynamo.query_all(pk, sk_prefix=EntityPrefix.DEVICE)

        # Apply filters
        if tag:
            devices = [
                d for d in devices if tag.lower() in [t.lower() for t in d.get("tags", [])]
            ]

        if search:
            search_lower = search.lower()
            devices = [
                d
                for d in devices
                if search_lower in d.get("deviceName", "").lower()
                or search_lower in d.get("managementIp", "").lower()
            ]

        return [self._to_response(d) for d in devices]

    def get_device(self, user_id: str, device_id: str) -> dict[str, Any]:
        """Get a single device by ID."""
        pk = dynamo.build_pk(user_id)
        sk = f"{EntityPrefix.DEVICE}{device_id}"
        item = dynamo.get_item_or_raise(pk, sk, "Device")
        return self._to_response(item)

    def get_device_raw(self, user_id: str, device_id: str) -> dict[str, Any]:
        """Get a device with encrypted fields (for internal use only)."""
        pk = dynamo.build_pk(user_id)
        sk = f"{EntityPrefix.DEVICE}{device_id}"
        return dynamo.get_item_or_raise(pk, sk, "Device")

    def update_device(
        self, user_id: str, device_id: str, body: dict
    ) -> dict[str, Any]:
        """Update device fields. Only updates provided fields."""
        request = UpdateDeviceRequest(**body)
        pk = dynamo.build_pk(user_id)
        sk = f"{EntityPrefix.DEVICE}{device_id}"

        # Verify device exists
        dynamo.get_item_or_raise(pk, sk, "Device")

        updates: dict[str, Any] = {"updatedAt": utc_now()}

        if request.deviceName is not None:
            updates["deviceName"] = request.deviceName
            updates["GSI1SK"] = request.deviceName

        if request.managementIp is not None:
            updates["managementIp"] = request.managementIp

        if request.sshPort is not None:
            updates["sshPort"] = request.sshPort

        if request.platform is not None:
            updates["platform"] = request.platform.value

        if request.timeoutSeconds is not None:
            updates["timeoutSeconds"] = request.timeoutSeconds

        if request.tags is not None:
            updates["tags"] = [t.strip().lower() for t in request.tags]

        if request.commandSetId is not None:
            updates["commandSetId"] = request.commandSetId

        # Only update credentials if new values provided
        if request.username is not None and request.password is not None:
            encrypted_creds = kms.encrypt_credentials(
                username=request.username,
                password=request.password,
                enable_secret=request.enableSecret,
            )
            updates.update(encrypted_creds)

        updated = dynamo.update_item(pk, sk, updates)
        return self._to_response(updated)

    def delete_device(self, user_id: str, device_id: str) -> None:
        """Delete a device. Checks for active collection jobs first."""
        pk = dynamo.build_pk(user_id)
        sk = f"{EntityPrefix.DEVICE}{device_id}"

        # Verify device exists
        dynamo.get_item_or_raise(pk, sk, "Device")

        # Check for active jobs targeting this device
        jobs = dynamo.query_all(
            f"{pk}#JOBS",
            index_name=GSI1,
        )
        active_jobs = [
            j for j in jobs
            if j.get("status") in ("PENDING", "IN_PROGRESS")
            and device_id in j.get("deviceIds", [])
        ]

        if active_jobs:
            raise ConflictError(
                f"Cannot delete device with {len(active_jobs)} active collection job(s)"
            )

        dynamo.delete_item(pk, sk)
        logger.info(f"Deleted device {device_id}")

    def test_connectivity(self, user_id: str, device_id: str) -> dict[str, Any]:
        """Test SSH connectivity to a device."""
        pk = dynamo.build_pk(user_id)
        sk = f"{EntityPrefix.DEVICE}{device_id}"
        device = dynamo.get_item_or_raise(pk, sk, "Device")

        # Decrypt credentials
        creds = kms.decrypt_credentials(device)

        start_time = time.time()
        try:
            from netmiko import ConnectHandler

            device_params = {
                "device_type": device["platform"],
                "host": device["managementIp"],
                "port": device.get("sshPort", 22),
                "username": creds["username"],
                "password": creds["password"],
                "timeout": min(device.get("timeoutSeconds", 30), 30),
            }

            if creds.get("enable_secret"):
                device_params["secret"] = creds["enable_secret"]

            with ConnectHandler(**device_params) as conn:
                # Just test the connection — don't run any commands
                prompt = conn.find_prompt()

            elapsed = round((time.time() - start_time) * 1000)

            return {
                "reachable": True,
                "responseTimeMs": elapsed,
                "prompt": prompt,
            }

        except Exception as e:
            elapsed = round((time.time() - start_time) * 1000)
            logger.warning(f"Connection test failed for {device_id}: {e}")
            return {
                "reachable": False,
                "responseTimeMs": elapsed,
                "error": str(e),
            }

    def _to_response(self, item: dict[str, Any]) -> dict[str, Any]:
        """Convert a device item to API response (NO credentials)."""
        return DeviceResponse(
            deviceId=item.get("deviceId", ""),
            deviceName=item.get("deviceName", ""),
            managementIp=item.get("managementIp", ""),
            sshPort=item.get("sshPort", 22),
            platform=item.get("platform", ""),
            timeoutSeconds=item.get("timeoutSeconds", 30),
            tags=item.get("tags", []),
            commandSetId=item.get("commandSetId"),
            createdAt=item.get("createdAt", ""),
            updatedAt=item.get("updatedAt", ""),
        ).model_dump()
