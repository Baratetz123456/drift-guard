"""
Collection Orchestrator service — creates jobs and triggers Step Functions.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import boto3

from shared import dynamo
from shared.audit import log_action
from shared.constants import EntityPrefix, GSI1, STATE_MACHINE_ARN
from shared.exceptions import ConflictError, ValidationError
from shared.models import (
    CreateCollectionRequest,
    CollectionJobResponse,
    JobStatus,
    DeviceCollectionStatus,
    generate_id,
    utc_now,
)

logger = logging.getLogger(__name__)

_sfn_client = None


def get_sfn_client():
    global _sfn_client
    if _sfn_client is None:
        _sfn_client = boto3.client("stepfunctions")
    return _sfn_client


class OrchestratorService:
    """Creates collection jobs and dispatches to Step Functions."""

    def start_collection(self, user_id: str, body: dict) -> dict[str, Any]:
        """Create a collection job and start the Step Functions execution."""
        request = CreateCollectionRequest(**body)
        pk = dynamo.build_pk(user_id)
        job_id = generate_id("job-")
        now = utc_now()

        # Validate all devices exist
        devices = []
        from functions.commands.service import CommandService
        cmd_service = CommandService()

        for device_id in request.deviceIds:
            sk = f"{EntityPrefix.DEVICE}{device_id}"
            device = dynamo.get_item(pk, sk)
            if not device:
                raise ValidationError(f"Device '{device_id}' not found")

            # Get commands for this device
            commands = cmd_service.get_commands_for_device(
                user_id, device.get("commandSetId")
            )

            devices.append({
                "userId": user_id,
                "jobId": job_id,
                "deviceId": device_id,
                "deviceSK": sk,
                "label": request.label.value,
                "changeLabel": request.changeLabel or "",
                "commands": commands,
            })

        # Check for concurrent collections on same devices
        active_jobs = dynamo.query_all(
            f"{pk}#JOBS",
            index_name=GSI1,
        )
        for job in active_jobs:
            if job.get("status") in (
                JobStatus.PENDING.value,
                JobStatus.IN_PROGRESS.value,
            ):
                overlap = set(request.deviceIds) & set(
                    job.get("deviceIds", [])
                )
                if overlap:
                    raise ConflictError(
                        f"Devices {list(overlap)} have an active collection job"
                    )

        # Initialize device results
        device_results = {
            did: {
                "deviceId": did,
                "status": DeviceCollectionStatus.PENDING.value,
            }
            for did in request.deviceIds
        }

        # Create job record
        job_item = {
            "PK": pk,
            "SK": f"{EntityPrefix.JOB}{job_id}",
            "GSI1PK": f"{pk}#JOBS",
            "GSI1SK": f"{JobStatus.PENDING.value}#{now}",
            "entityType": "CollectionJob",
            "userId": user_id,
            "jobId": job_id,
            "label": request.label.value,
            "changeLabel": request.changeLabel,
            "deviceIds": request.deviceIds,
            "status": JobStatus.PENDING.value,
            "totalDevices": len(request.deviceIds),
            "successCount": 0,
            "failureCount": 0,
            "deviceResults": json.dumps(device_results),
            "startedAt": now,
        }

        dynamo.put_item(job_item)

        # Start Step Functions execution
        sfn = get_sfn_client()
        sfn_input = {
            "PK": pk,
            "SK": f"{EntityPrefix.JOB}{job_id}",
            "userId": user_id,
            "jobId": job_id,
            "devices": devices,
        }

        try:
            sfn.start_execution(
                stateMachineArn=STATE_MACHINE_ARN,
                name=job_id,
                input=json.dumps(sfn_input),
            )
            logger.info(f"Started Step Functions execution for job {job_id}")
        except Exception as e:
            # Update job status to FAILED if SFN couldn't start
            dynamo.update_item(
                pk,
                f"{EntityPrefix.JOB}{job_id}",
                {
                    "status": JobStatus.FAILED.value,
                    "GSI1SK": f"{JobStatus.FAILED.value}#{now}",
                    "error": str(e),
                },
            )
            raise

        # Audit log
        log_action(
            user_id=user_id,
            action="COLLECTION_STARTED",
            resource_type="CollectionJob",
            resource_id=job_id,
            details={
                "deviceCount": len(request.deviceIds),
                "label": request.label.value,
            },
        )

        return {
            "jobId": job_id,
            "status": JobStatus.PENDING.value,
            "totalDevices": len(request.deviceIds),
        }

    def list_jobs(
        self,
        user_id: str,
        status: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """List collection jobs, optionally filtered by status."""
        pk = dynamo.build_pk(user_id)

        if status:
            result = dynamo.query_items(
                f"{pk}#JOBS",
                sk_prefix=f"{status}#",
                index_name=GSI1,
                limit=limit,
                scan_forward=False,
            )
        else:
            result = dynamo.query_items(
                pk,
                sk_prefix=EntityPrefix.JOB,
                limit=limit,
                scan_forward=False,
            )

        return [self._to_response(item) for item in result["items"]]

    def get_job(self, user_id: str, job_id: str) -> dict[str, Any]:
        """Get a collection job with per-device results."""
        pk = dynamo.build_pk(user_id)
        sk = f"{EntityPrefix.JOB}{job_id}"
        item = dynamo.get_item_or_raise(pk, sk, "CollectionJob")
        return self._to_response(item)

    def cancel_job(self, user_id: str, job_id: str) -> dict[str, Any]:
        """Cancel a running collection job."""
        pk = dynamo.build_pk(user_id)
        sk = f"{EntityPrefix.JOB}{job_id}"
        job = dynamo.get_item_or_raise(pk, sk, "CollectionJob")

        if job.get("status") not in (
            JobStatus.PENDING.value,
            JobStatus.IN_PROGRESS.value,
        ):
            raise ConflictError(
                f"Cannot cancel job in '{job.get('status')}' status"
            )

        now = utc_now()
        sfn = get_sfn_client()

        # Stop the Step Functions execution
        try:
            execution_arn = job.get("stepFunctionExecutionArn")
            if execution_arn:
                sfn.stop_execution(
                    executionArn=execution_arn,
                    cause="Cancelled by user",
                )
        except Exception as e:
            logger.warning(f"Failed to stop SFN execution: {e}")

        updated = dynamo.update_item(
            pk,
            sk,
            {
                "status": JobStatus.CANCELLED.value,
                "GSI1SK": f"{JobStatus.CANCELLED.value}#{now}",
                "completedAt": now,
            },
        )

        return {"jobId": job_id, "status": JobStatus.CANCELLED.value}

    def _to_response(self, item: dict[str, Any]) -> dict[str, Any]:
        """Convert a job item to API response."""
        device_results = item.get("deviceResults", "{}")
        if isinstance(device_results, str):
            device_results = json.loads(device_results)

        success_count = sum(
            1 for r in device_results.values()
            if isinstance(r, dict) and r.get("status") == "SUCCESS"
        )
        failure_count = sum(
            1 for r in device_results.values()
            if isinstance(r, dict) and r.get("status") == "FAILED"
        )
        total = item.get("totalDevices", 0)

        return {
            "jobId": item.get("jobId", ""),
            "label": item.get("label", ""),
            "changeLabel": item.get("changeLabel"),
            "status": item.get("status", ""),
            "totalDevices": total,
            "successCount": success_count,
            "failureCount": failure_count,
            "pendingCount": total - success_count - failure_count,
            "deviceResults": device_results,
            "startedAt": item.get("startedAt", ""),
            "completedAt": item.get("completedAt"),
        }
