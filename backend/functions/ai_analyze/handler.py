"""
Lambda handler for AI Analysis.
Route: POST /comparisons/{comparisonId}/analyze
"""

from __future__ import annotations

import logging

from functions.ai_analyze.service import AIAnalyzeService
from shared.auth import get_user_id
from shared.exceptions import DeltaNetError
from shared.response import from_exception, success

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """Trigger AI analysis on a comparison."""
    try:
        user_id = get_user_id(event)
        path_params = event.get("pathParameters") or {}
        comparison_id = path_params.get("comparisonId")

        service = AIAnalyzeService()
        analysis = service.analyze_comparison(user_id, comparison_id)

        return success(analysis)

    except DeltaNetError as e:
        return from_exception(e)
    except Exception as e:
        logger.exception("Unhandled error in AI analyze handler")
        return from_exception(e)
