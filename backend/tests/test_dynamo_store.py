"""
DynamoDB multi-tenant partition key & isolation tests.
Validates that all data access strictly scopes by deterministic tenant ID (USER#{userId})
and prevents cross-tenant data leakage.
"""

from unittest.mock import patch

from shared import dynamo_store
from shared.constants import EntityPrefix


class TestDynamoStoreMultiTenantIsolation:
    """Tests multi-tenant key isolation and CRUD methods in dynamo_store."""

    @patch("shared.dynamo.query_all")
    def test_list_devices_scoped_to_tenant(self, mock_query):
        """Listing devices queries only with the specific user's partition key."""
        user_id = "usr_tenant_alpha"
        mock_query.return_value = [
            {
                "PK": f"USER#{user_id}",
                "SK": "DEVICE#dev_1",
                "deviceId": "dev_1",
                "name": "switch-alpha",
                "hostname": "10.0.0.1",
                "driver": "cisco_xe",
                "deviceType": "cisco_xe",
            }
        ]

        devices = dynamo_store.list_devices(user_id)
        assert len(devices) == 1
        assert devices[0]["name"] == "switch-alpha"
        assert devices[0]["driver"] == "cisco_xe"
        assert devices[0]["deviceType"] == "cisco_xe"

        mock_query.assert_called_once_with(
            pk=f"USER#{user_id}",
            sk_prefix=EntityPrefix.DEVICE,
        )

    @patch("shared.dynamo.put_item")
    def test_create_device_populates_both_driver_and_device_type(self, mock_put):
        """Ensures device creation persists both driver and deviceType to guarantee compatibility."""
        user_id = "usr_engineer"
        mock_put.return_value = {}

        created = dynamo_store.create_device(
            user_id=user_id,
            data={
                "name": "core-router-01",
                "hostname": "10.10.10.1",
                "driver": "cisco_xe",
                "username": "admin",
                "password": "SecretPassword99!",
            },
        )

        assert created["driver"] == "cisco_xe"
        assert created["deviceType"] == "cisco_xe"
        assert created["name"] == "core-router-01"

        mock_put.assert_called_once()
        put_item = mock_put.call_args[0][0]
        assert put_item["PK"] == f"USER#{user_id}"
        assert put_item["SK"].startswith(EntityPrefix.DEVICE)
        assert put_item["driver"] == "cisco_xe"
        assert put_item["deviceType"] == "cisco_xe"

    @patch("shared.dynamo.delete_item")
    def test_delete_device_scoped_to_tenant(self, mock_delete):
        """Deleting a device executes delete_item with tenant's partition key."""
        user_id = "usr_tenant_beta"
        device_id = "dev_beta_99"
        mock_delete.return_value = True

        result = dynamo_store.delete_device(user_id, device_id)
        assert result is True

        mock_delete.assert_called_once_with(
            pk=f"USER#{user_id}",
            sk=f"{EntityPrefix.DEVICE}{device_id}",
        )
