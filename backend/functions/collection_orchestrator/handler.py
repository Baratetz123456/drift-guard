"""
Lambda handler for Collection Orchestrator.
Routes: POST /collections, GET /collections, GET /collections/{jobId}, DELETE /collections/{jobId}
"""

from __future__ import annotations

import json
import logging

from functions.collection_orchestrator.service import OrchestratorService
from shared.auth import get_user_id
from shared.exceptions import DeltaNetError
from shared.response import (
    accepted,
    from_exception,
    parse_pagination,
    success,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """Route collection requests."""
    try:
        user_id = get_user_id(event)
        method = event["httpMethod"]
        path_params = event.get("pathParameters") or {}
        job_id = path_params.get("jobId")
        service = OrchestratorService()

        # POST /collections — Start new collection
        if method == "POST" and not job_id:
            body = json.loads(event.get("body", "{}"))
            result = service.start_collection(user_id, body)
            return accepted(result)

        # GET /collections — List jobs
        if method == "GET" and not job_id:
            params = event.get("queryStringParameters") or {}
            pagination = parse_pagination(event)
            jobs = service.list_jobs(
                user_id,
                status=params.get("status"),
                limit=pagination["limit"],
            )
            return success({"jobs": jobs, "count": len(jobs)})

        # GET /collections/{jobId} — Get job detail
        if method == "GET" and job_id:
            job = service.get_job(user_id, job_id)
            return success(job)

        # DELETE /collections/{jobId} — Cancel job
        if method == "DELETE" and job_id:
            result = service.cancel_job(user_id, job_id)
            return success(result)

        return success({"error": "Method not allowed"}, status_code=405)

    except DeltaNetError as e:
        return from_exception(e)
    except Exception as e:
        logger.exception("Unhandled error in collection orchestrator")
        return from_exception(e)
