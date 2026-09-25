"""
Settings business logic — user preferences and OpenAI-compatible API configuration.
Supports arbitrary OpenAI-compatible endpoints (OpenRouter, OpenAI, Local Ollama, vLLM).
"""

from __future__ import annotations

import logging
import os
from typing import Any

from shared import dynamo, kms
from shared.constants import EntityPrefix
from shared.models import (
    UpdateSettingsRequest,
    UserSettingsResponse,
    utc_now,
)

logger = logging.getLogger(__name__)

DEFAULT_AI_MODEL = os.environ.get("DEFAULT_AI_MODEL", "google/gemini-2.0-flash-lite:free")
DEFAULT_AI_BASE_URL = os.environ.get("DEFAULT_AI_BASE_URL", "https://openrouter.ai/api/v1")


class SettingsService:
    """Manages user settings with KMS-encrypted API keys for OpenAI-compatible providers."""

    def get_settings(self, user_id: str) -> dict[str, Any]:
        """Get user settings. Creates defaults if not found."""
        pk = dynamo.build_pk(user_id)
        item = dynamo.get_item(pk, EntityPrefix.SETTINGS)

        if not item:
            item = self._create_defaults(user_id)

        return self._to_response(item)

    def update_settings(self, user_id: str, body: dict) -> dict[str, Any]:
        """Update user settings. Encrypts API key if provided."""
        request = UpdateSettingsRequest(**body)
        pk = dynamo.build_pk(user_id)

        existing = dynamo.get_item(pk, EntityPrefix.SETTINGS)
        if not existing:
            existing = self._create_defaults(user_id)

        updates: dict[str, Any] = {"updatedAt": utc_now()}

        if request.aiBaseUrl is not None:
            updates["aiBaseUrl"] = request.aiBaseUrl.strip()

        if request.aiApiKey is not None and request.aiApiKey.strip():
            updates["aiApiKeyEncrypted"] = kms.encrypt_value(request.aiApiKey.strip())

        if request.aiModel is not None:
            updates["aiModel"] = request.aiModel.strip()

        if request.aiMaxTokens is not None:
            updates["aiMaxTokens"] = request.aiMaxTokens

        if request.defaultTimeoutSeconds is not None:
            updates["defaultTimeoutSeconds"] = request.defaultTimeoutSeconds

        if request.maskSecretsInDiffs is not None:
            updates["maskSecretsInDiffs"] = request.maskSecretsInDiffs

        if request.normalizeDynamicCounters is not None:
            updates["normalizeDynamicCounters"] = request.normalizeDynamicCounters

        if request.defaultCommandSetId is not None:
            updates["defaultCommandSetId"] = request.defaultCommandSetId

        updated = dynamo.update_item(pk, EntityPrefix.SETTINGS, updates)
        return self._to_response(updated)

    def get_openai_config(self, user_id: str) -> dict[str, Any]:
        """Get OpenAI-compatible configuration including decrypted API key, base URL, and model."""
        pk = dynamo.build_pk(user_id)
        item = dynamo.get_item(pk, EntityPrefix.SETTINGS)
        from shared.exceptions import DependencyError

        if not item or not item.get("aiApiKeyEncrypted"):
            raise DependencyError(
                "No AI API key configured. Please configure your API key in Settings."
            )

        return {
            "api_key": kms.decrypt_value(item["aiApiKeyEncrypted"]),
            "base_url": item.get("aiBaseUrl", DEFAULT_AI_BASE_URL),
            "model": item.get("aiModel", DEFAULT_AI_MODEL),
            "max_tokens": item.get("aiMaxTokens", 4096),
        }

    def _create_defaults(self, user_id: str) -> dict[str, Any]:
        """Create default settings for a new user."""
        now = utc_now()
        item = {
            "PK": dynamo.build_pk(user_id),
            "SK": EntityPrefix.SETTINGS,
            "entityType": "UserSettings",
            "userId": user_id,
            "aiBaseUrl": DEFAULT_AI_BASE_URL,
            "aiModel": DEFAULT_AI_MODEL,
            "aiMaxTokens": 4096,
            "defaultTimeoutSeconds": 30,
            "maskSecretsInDiffs": True,
            "normalizeDynamicCounters": True,
            "createdAt": now,
            "updatedAt": now,
        }
        dynamo.put_item(item)
        return item

    def _to_response(self, item: dict[str, Any]) -> dict[str, Any]:
        """Convert settings item to an API response without disclosing the secret key."""
        return UserSettingsResponse(
            aiBaseUrl=item.get("aiBaseUrl", DEFAULT_AI_BASE_URL),
            hasApiKey=bool(item.get("aiApiKeyEncrypted")),
            aiModel=item.get("aiModel", DEFAULT_AI_MODEL),
            aiMaxTokens=item.get("aiMaxTokens", 4096),
            defaultTimeoutSeconds=item.get("defaultTimeoutSeconds", 30),
            maskSecretsInDiffs=item.get("maskSecretsInDiffs", True),
            normalizeDynamicCounters=item.get("normalizeDynamicCounters", True),
            defaultCommandSetId=item.get("defaultCommandSetId"),
            createdAt=item.get("createdAt", ""),
            updatedAt=item.get("updatedAt", ""),
        ).model_dump()
