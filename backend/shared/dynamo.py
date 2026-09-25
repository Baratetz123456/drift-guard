"""
DynamoDB client wrapper with single-table design helpers.
Provides typed access patterns for all DeltaNet entities.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key

from shared.constants import (
    DYNAMODB_ENDPOINT_URL,
    GSI1,
    GSI2,
    TABLE_NAME,
)

logger = logging.getLogger(__name__)

# Lazy-init DynamoDB resources (reused across invocations)
_resource = None
_client = None
_table = None


def get_dynamo_resource():
    """Get or create boto3 DynamoDB resource with optional local endpoint."""
    global _resource
    if _resource is None:
        kwargs: dict[str, Any] = {}
        if DYNAMODB_ENDPOINT_URL:
            kwargs["endpoint_url"] = DYNAMODB_ENDPOINT_URL
            kwargs["region_name"] = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
            kwargs["aws_access_key_id"] = os.environ.get("AWS_ACCESS_KEY_ID", "mock")
            kwargs["aws_secret_access_key"] = os.environ.get("AWS_SECRET_ACCESS_KEY", "mock")
        _resource = boto3.resource("dynamodb", **kwargs)
    return _resource


def get_dynamo_client():
    """Get or create boto3 DynamoDB client with optional local endpoint."""
    global _client
    if _client is None:
        kwargs: dict[str, Any] = {}
        if DYNAMODB_ENDPOINT_URL:
            kwargs["endpoint_url"] = DYNAMODB_ENDPOINT_URL
            kwargs["region_name"] = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
            kwargs["aws_access_key_id"] = os.environ.get("AWS_ACCESS_KEY_ID", "mock")
            kwargs["aws_secret_access_key"] = os.environ.get("AWS_SECRET_ACCESS_KEY", "mock")
        _client = boto3.client("dynamodb", **kwargs)
    return _client


def get_table():
    """Get or create DynamoDB Table resource (connection reuse)."""
    global _table
    if _table is None:
        resource = get_dynamo_resource()
        _table = resource.Table(TABLE_NAME)
    return _table


def ensure_table_exists() -> None:
    """Ensure the DynamoDB table exists, provisioning PK/SK and GSI indexes if needed."""
    client = get_dynamo_client()
    try:
        client.describe_table(TableName=TABLE_NAME)
        logger.info(f"DynamoDB table '{TABLE_NAME}' verified and ready.")
        return
    except Exception as e:
        err_msg = str(e)
        if "ResourceNotFoundException" not in err_msg and "Cannot find table" not in err_msg:
            # If it's another error, log warning and attempt create
            logger.warning(f"Note during describe_table check: {err_msg}")

    logger.info(f"Creating DynamoDB table '{TABLE_NAME}' with GSI1 and GSI2...")
    try:
        client.create_table(
            TableName=TABLE_NAME,
            KeySchema=[
                {"AttributeName": "PK", "KeyType": "HASH"},
                {"AttributeName": "SK", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "PK", "AttributeType": "S"},
                {"AttributeName": "SK", "AttributeType": "S"},
                {"AttributeName": "GSI1PK", "AttributeType": "S"},
                {"AttributeName": "GSI1SK", "AttributeType": "S"},
                {"AttributeName": "GSI2PK", "AttributeType": "S"},
                {"AttributeName": "GSI2SK", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": GSI1,
                    "KeySchema": [
                        {"AttributeName": "GSI1PK", "KeyType": "HASH"},
                        {"AttributeName": "GSI1SK", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
                {
                    "IndexName": GSI2,
                    "KeySchema": [
                        {"AttributeName": "GSI2PK", "KeyType": "HASH"},
                        {"AttributeName": "GSI2SK", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        logger.info(f"DynamoDB table '{TABLE_NAME}' created successfully.")
    except Exception as create_err:
        if "ResourceInUseException" in str(create_err):
            logger.info(f"DynamoDB table '{TABLE_NAME}' was already created concurrently.")
        else:
            logger.error(f"Failed to create DynamoDB table: {create_err}")
            raise


# ============================================================
# Core Operations
# ============================================================

def put_item(item: dict[str, Any]) -> dict[str, Any]:
    """Put an item into the DeltaNet table."""
    table = get_table()
    table.put_item(Item=_serialize_item(item))
    return item


def put_item_unique(
    item: dict[str, Any],
    condition: str = "attribute_not_exists(PK) AND attribute_not_exists(SK)",
) -> dict[str, Any]:
    """Put an item only if PK+SK doesn't exist (prevent overwrites)."""
    from botocore.exceptions import ClientError

    from shared.exceptions import ConflictError

    table = get_table()
    try:
        table.put_item(
            Item=_serialize_item(item),
            ConditionExpression=condition,
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise ConflictError("Item already exists")
        raise
    return item


def get_item(pk: str, sk: str) -> dict[str, Any] | None:
    """Get a single item by PK and SK."""
    table = get_table()
    response = table.get_item(Key={"PK": pk, "SK": sk})
    item = response.get("Item")
    return _deserialize_item(item) if item else None


def get_item_or_raise(pk: str, sk: str, resource_type: str = "Item") -> dict[str, Any]:
    """Get a single item or raise NotFoundError."""
    from shared.exceptions import NotFoundError

    item = get_item(pk, sk)
    if item is None:
        raise NotFoundError(resource_type, f"{pk}/{sk}")
    return item


def update_item(
    pk: str,
    sk: str,
    updates: dict[str, Any],
    condition: str | None = None,
) -> dict[str, Any]:
    """Update specific attributes of an item."""
    table = get_table()

    update_parts = []
    names = {}
    values = {}

    for i, (key, value) in enumerate(updates.items()):
        attr_name = f"#attr{i}"
        attr_value = f":val{i}"
        update_parts.append(f"{attr_name} = {attr_value}")
        names[attr_name] = key
        values[attr_value] = value

    update_expr = "SET " + ", ".join(update_parts)

    kwargs = {
        "Key": {"PK": pk, "SK": sk},
        "UpdateExpression": update_expr,
        "ExpressionAttributeNames": names,
        "ExpressionAttributeValues": values,
        "ReturnValues": "ALL_NEW",
    }

    if condition:
        kwargs["ConditionExpression"] = condition

    response = table.update_item(**kwargs)
    return _deserialize_item(response.get("Attributes", {}))


def delete_item(pk: str, sk: str) -> None:
    """Delete an item by PK and SK."""
    table = get_table()
    table.delete_item(Key={"PK": pk, "SK": sk})


def query_items(
    pk: str,
    sk_prefix: str | None = None,
    sk_between: tuple[str, str] | None = None,
    index_name: str | None = None,
    limit: int | None = None,
    scan_forward: bool = True,
    exclusive_start_key: dict | None = None,
) -> dict[str, Any]:
    """
    Query items with flexible SK conditions.

    Returns: {"items": [...], "lastKey": {...} or None}
    """
    table = get_table()

    # Build key condition
    if index_name == GSI1:
        pk_attr = "GSI1PK"
        sk_attr = "GSI1SK"
    elif index_name == GSI2:
        pk_attr = "GSI2PK"
        sk_attr = "GSI2SK"
    else:
        pk_attr = "PK"
        sk_attr = "SK"

    key_condition = Key(pk_attr).eq(pk)

    if sk_prefix:
        key_condition = key_condition & Key(sk_attr).begins_with(sk_prefix)
    elif sk_between:
        key_condition = key_condition & Key(sk_attr).between(*sk_between)

    kwargs: dict[str, Any] = {
        "KeyConditionExpression": key_condition,
        "ScanIndexForward": scan_forward,
    }

    if index_name:
        kwargs["IndexName"] = index_name
    if limit:
        kwargs["Limit"] = limit
    if exclusive_start_key:
        kwargs["ExclusiveStartKey"] = exclusive_start_key

    response = table.query(**kwargs)

    return {
        "items": [_deserialize_item(item) for item in response.get("Items", [])],
        "lastKey": response.get("LastEvaluatedKey"),
    }


def query_all(
    pk: str,
    sk_prefix: str | None = None,
    index_name: str | None = None,
    scan_forward: bool = True,
) -> list[dict[str, Any]]:
    """Query all items matching the condition (handles pagination)."""
    all_items = []
    last_key = None

    while True:
        result = query_items(
            pk=pk,
            sk_prefix=sk_prefix,
            index_name=index_name,
            scan_forward=scan_forward,
            exclusive_start_key=last_key,
        )
        all_items.extend(result["items"])
        last_key = result.get("lastKey")
        if not last_key:
            break

    return all_items


def batch_get_items(keys: list[dict[str, str]]) -> list[dict[str, Any]]:
    """Batch get up to 100 items by their keys."""
    if not keys:
        return []

    dynamodb = get_dynamo_resource()

    items = []
    # DynamoDB batch_get limit is 100
    for i in range(0, len(keys), 100):
        batch = keys[i : i + 100]
        response = dynamodb.batch_get_item(
            RequestItems={
                TABLE_NAME: {
                    "Keys": [{"PK": k["PK"], "SK": k["SK"]} for k in batch]
                }
            }
        )
        items.extend(
            _deserialize_item(item)
            for item in response.get("Responses", {}).get(TABLE_NAME, [])
        )

    return items


# ============================================================
# Serialization Helpers
# ============================================================

def _serialize_item(item: dict[str, Any]) -> dict[str, Any]:
    """Prepare an item for DynamoDB storage."""
    serialized = {}
    for key, value in item.items():
        if value is None:
            continue
        if isinstance(value, (list, dict)) and not isinstance(value, str):
            # Store complex types — DynamoDB handles lists and maps natively
            serialized[key] = value
        else:
            serialized[key] = value
    return serialized


def _deserialize_item(item: dict[str, Any]) -> dict[str, Any]:
    """Process an item retrieved from DynamoDB."""
    if not item:
        return {}

    deserialized = {}
    for key, value in item.items():
        # Convert Decimal to int/float for JSON compatibility
        if hasattr(value, "as_integer_ratio"):
            deserialized[key] = int(value) if value == int(value) else float(value)
        else:
            deserialized[key] = value

    return deserialized


def build_pk(user_id: str) -> str:
    """Build the standard partition key for a user."""
    return f"USER#{user_id}"
