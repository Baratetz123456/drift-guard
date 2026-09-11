"""
Extract userId from Cognito JWT claims in API Gateway events.
"""

from __future__ import annotations

import logging

from shared.exceptions import UnauthorizedError

logger = logging.getLogger(__name__)


def get_user_id(event: dict) -> str:
    """
    Extract the authenticated user's ID from the API Gateway event.

    The Cognito authorizer injects claims into the request context.
    We use the 'sub' claim as the unique user identifier.
    """
    try:
        claims = event["requestContext"]["authorizer"]["claims"]
        user_id = claims.get("sub")

        if not user_id:
            raise UnauthorizedError("Missing user ID in token claims")

        return user_id

    except KeyError:
        logger.error("No authorizer claims found in request context")
        raise UnauthorizedError("Authentication required")


def get_user_email(event: dict) -> str:
    """Extract the user's email from token claims."""
    try:
        claims = event["requestContext"]["authorizer"]["claims"]
        return claims.get("email", "")
    except KeyError:
        return ""
