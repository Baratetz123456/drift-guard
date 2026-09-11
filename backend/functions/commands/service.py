"""
Command Set business logic — CRUD with safety validation.
"""

from __future__ import annotations

import logging
from typing import Any

from shared import dynamo
from shared.constants import EntityPrefix
from shared.exceptions import ConflictError
from shared.models import (
    CreateCommandSetRequest,
    UpdateCommandSetRequest,
    CommandSetResponse,
    generate_id,
    utc_now,
)

logger = logging.getLogger(__name__)


class CommandService:
    """Manages command set configuration with safety validation."""

    def create_command_set(self, user_id: str, body: dict) -> dict[str, Any]:
        """Create a new command set."""
        request = CreateCommandSetRequest(**body)
        pk = dynamo.build_pk(user_id)
        set_id = generate_id("cmdset-")
        now = utc_now()

        # If setting as default, unset any existing default
        if request.isDefault:
            self._clear_default(user_id)

        item = {
            "PK": pk,
            "SK": f"{EntityPrefix.COMMAND_SET}{set_id}",
            "entityType": "CommandSet",
            "userId": user_id,
            "setId": set_id,
            "name": request.name,
            "commands": request.commands,
            "isDefault": request.isDefault,
            "createdAt": now,
            "updatedAt": now,
        }

        dynamo.put_item(item)
        logger.info(f"Created command set {set_id}: {request.name}")
        return self._to_response(item)

    def list_command_sets(self, user_id: str) -> list[dict[str, Any]]:
        """List all command sets for a user."""
        pk = dynamo.build_pk(user_id)
        items = dynamo.query_all(pk, sk_prefix=EntityPrefix.COMMAND_SET)
        return [self._to_response(item) for item in items]

    def get_command_set(self, user_id: str, set_id: str) -> dict[str, Any]:
        """Get a single command set."""
        pk = dynamo.build_pk(user_id)
        sk = f"{EntityPrefix.COMMAND_SET}{set_id}"
        item = dynamo.get_item_or_raise(pk, sk, "CommandSet")
        return self._to_response(item)

    def get_commands_for_device(
        self, user_id: str, device_command_set_id: str | None
    ) -> list[str]:
        """
        Get the commands to use for a device.
        Priority: device override → user default → built-in default.
        """
        from shared.constants import DEFAULT_COMMANDS

        pk = dynamo.build_pk(user_id)

        # Try device-specific command set
        if device_command_set_id:
            sk = f"{EntityPrefix.COMMAND_SET}{device_command_set_id}"
            item = dynamo.get_item(pk, sk)
            if item:
                return item.get("commands", DEFAULT_COMMANDS)

        # Try user's default command set
        all_sets = dynamo.query_all(pk, sk_prefix=EntityPrefix.COMMAND_SET)
        for cs in all_sets:
            if cs.get("isDefault"):
                return cs.get("commands", DEFAULT_COMMANDS)

        return DEFAULT_COMMANDS

    def update_command_set(
        self, user_id: str, set_id: str, body: dict
    ) -> dict[str, Any]:
        """Update a command set."""
        request = UpdateCommandSetRequest(**body)
        pk = dynamo.build_pk(user_id)
        sk = f"{EntityPrefix.COMMAND_SET}{set_id}"

        dynamo.get_item_or_raise(pk, sk, "CommandSet")

        updates: dict[str, Any] = {"updatedAt": utc_now()}

        if request.name is not None:
            updates["name"] = request.name

        if request.commands is not None:
            updates["commands"] = request.commands

        if request.isDefault is not None:
            if request.isDefault:
                self._clear_default(user_id)
            updates["isDefault"] = request.isDefault

        updated = dynamo.update_item(pk, sk, updates)
        return self._to_response(updated)

    def delete_command_set(self, user_id: str, set_id: str) -> None:
        """Delete a command set. Check if any devices reference it."""
        pk = dynamo.build_pk(user_id)
        sk = f"{EntityPrefix.COMMAND_SET}{set_id}"

        dynamo.get_item_or_raise(pk, sk, "CommandSet")

        # Check if any devices reference this command set
        devices = dynamo.query_all(pk, sk_prefix=EntityPrefix.DEVICE)
        referencing = [d for d in devices if d.get("commandSetId") == set_id]

        if referencing:
            raise ConflictError(
                f"Cannot delete command set — {len(referencing)} device(s) reference it"
            )

        dynamo.delete_item(pk, sk)
        logger.info(f"Deleted command set {set_id}")

    def _clear_default(self, user_id: str) -> None:
        """Unset any existing default command set."""
        pk = dynamo.build_pk(user_id)
        all_sets = dynamo.query_all(pk, sk_prefix=EntityPrefix.COMMAND_SET)
        for cs in all_sets:
            if cs.get("isDefault"):
                dynamo.update_item(
                    pk,
                    cs["SK"],
                    {"isDefault": False, "updatedAt": utc_now()},
                )

    def _to_response(self, item: dict[str, Any]) -> dict[str, Any]:
        """Convert a command set item to API response."""
        return CommandSetResponse(
            setId=item.get("setId", ""),
            name=item.get("name", ""),
            commands=item.get("commands", []),
            isDefault=item.get("isDefault", False),
            createdAt=item.get("createdAt", ""),
            updatedAt=item.get("updatedAt", ""),
        ).model_dump()
