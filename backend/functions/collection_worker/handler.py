"""
Lambda handler for Collection Worker.
Triggered by Step Functions Map state — collects data from ONE device.
"""

from __future__ import annotations

import logging
import time

from functions.collection_worker.service import WorkerService

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """
    Collect show command outputs from a single device.
    Called by Step Functions — NOT by API Gateway.
    """
    try:
        start_time = time.time()

        user_id = event["userId"]
        job_id = event["jobId"]
        device_id = event["deviceId"]
        device_sk = event["deviceSK"]
        label = event["label"]
        change_label = event.get("changeLabel", "")
        commands = event["commands"]

        service = WorkerService()
        result = service.collect_from_device(
            user_id=user_id,
            job_id=job_id,
            device_id=device_id,
            device_sk=device_sk,
            label=label,
            change_label=change_label,
            commands=commands,
        )

        elapsed = round((time.time() - start_time) * 1000)
        result["durationMs"] = elapsed

        logger.info(
            f"Collection from {device_id} completed in {elapsed}ms "
            f"— status: {result['status']}"
        )

        return {
            "statusCode": 200,
            "body": result,
        }

    except Exception as e:
        logger.exception(f"Worker failed for device {event.get('deviceId')}")
        return {
            "statusCode": 500,
            "body": {
                "deviceId": event.get("deviceId", ""),
                "status": "FAILED",
                "error": str(e),
            },
        }
