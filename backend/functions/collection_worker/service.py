"""
Collection Worker service — SSH into a device and collect show command outputs.
Uses Netmiko for device connectivity with per-command error isolation.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from shared import dynamo, kms, s3
from shared.constants import EntityPrefix
from shared.models import utc_now

logger = logging.getLogger(__name__)


class WorkerService:
    """Connects to a single network device and collects show command outputs."""

    def collect_from_device(
        self,
        user_id: str,
        job_id: str,
        device_id: str,
        device_sk: str,
        label: str,
        change_label: str,
        commands: list[str],
    ) -> dict[str, Any]:
        """
        SSH to a device, run all show commands, save snapshot.
        Returns result dict with status, snapshot info, or error.
        """
        pk = dynamo.build_pk(user_id)
        timestamp = utc_now()

        # Get device details (with encrypted credentials)
        device = dynamo.get_item(pk, device_sk)
        if not device:
            return {
                "deviceId": device_id,
                "status": "FAILED",
                "error": f"Device {device_id} not found",
            }

        # Decrypt credentials
        creds = kms.decrypt_credentials(device)

        # Connect and collect
        command_outputs: dict[str, dict] = {}
        errors: list[str] = []

        try:
            from netmiko import ConnectHandler

            device_params = {
                "device_type": device["platform"],
                "host": device["managementIp"],
                "port": device.get("sshPort", 22),
                "username": creds["username"],
                "password": creds["password"],
                "timeout": device.get("timeoutSeconds", 30),
                "conn_timeout": device.get("timeoutSeconds", 30),
            }

            if creds.get("enable_secret"):
                device_params["secret"] = creds["enable_secret"]

            logger.info(
                f"Connecting to {device['deviceName']} "
                f"({device['managementIp']}:{device.get('sshPort', 22)})"
            )

            with ConnectHandler(**device_params) as conn:
                # Enter enable mode if needed
                if creds.get("enable_secret"):
                    conn.enable()

                # Execute each command with individual error handling
                for cmd in commands:
                    try:
                        logger.info(f"Running: {cmd}")
                        output = conn.send_command(
                            cmd,
                            read_timeout=60,
                            strip_prompt=True,
                            strip_command=True,
                        )

                        # Store output (inline or S3 based on size)
                        meta = s3.store_output(
                            content=output,
                            user_id=user_id,
                            device_id=device_id,
                            timestamp=timestamp,
                            command=cmd,
                        )
                        command_outputs[cmd] = meta

                    except Exception as cmd_error:
                        logger.warning(f"Command '{cmd}' failed: {cmd_error}")
                        errors.append(f"{cmd}: {str(cmd_error)}")
                        command_outputs[cmd] = {
                            "error": str(cmd_error),
                            "sizeBytes": 0,
                            "lineCount": 0,
                        }

        except Exception as conn_error:
            logger.error(
                f"Connection to {device.get('deviceName')} failed: {conn_error}"
            )
            return {
                "deviceId": device_id,
                "status": "FAILED",
                "error": str(conn_error),
            }

        # Save snapshot to DynamoDB
        snapshot_sk = f"{EntityPrefix.SNAPSHOT}{device_id}#{timestamp}"

        snapshot_item = {
            "PK": pk,
            "SK": snapshot_sk,
            "GSI1PK": f"{pk}#SNAPS#{device_id}",
            "GSI1SK": timestamp,
            "entityType": "Snapshot",
            "userId": user_id,
            "deviceId": device_id,
            "deviceName": device.get("deviceName", ""),
            "jobId": job_id,
            "label": label,
            "changeLabel": change_label,
            "timestamp": timestamp,
            "commandOutputs": command_outputs,
            "platform": device.get("platform", ""),
        }

        dynamo.put_item(snapshot_item)

        logger.info(
            f"Saved snapshot for {device.get('deviceName')}: "
            f"{len(command_outputs)} commands, {len(errors)} errors"
        )

        return {
            "deviceId": device_id,
            "status": "SUCCESS",
            "snapshotSK": snapshot_sk,
            "commandCount": len(command_outputs),
            "errorCount": len(errors),
            "errors": errors if errors else None,
        }
