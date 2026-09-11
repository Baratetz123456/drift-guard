"""
S3 helpers for reading and writing large snapshot payloads and diffs.
Implements the inline vs. S3 threshold strategy.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import boto3

from shared.constants import BUCKET_NAME, INLINE_THRESHOLD, S3Prefix

logger = logging.getLogger(__name__)

_s3_client = None


def get_s3_client():
    """Get or create S3 client (connection reuse)."""
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client("s3")
    return _s3_client


def store_output(
    content: str,
    user_id: str,
    device_id: str,
    timestamp: str,
    command: str,
    prefix: str = S3Prefix.SNAPSHOTS,
) -> dict:
    """
    Store command output, using inline storage for small outputs
    and S3 for larger ones.

    Returns metadata dict with either 'inline' or 's3Key'.
    """
    content_bytes = content.encode("utf-8")
    size_bytes = len(content_bytes)
    line_count = content.count("\n") + 1

    meta = {
        "sizeBytes": size_bytes,
        "lineCount": line_count,
    }

    if size_bytes <= INLINE_THRESHOLD:
        meta["inline"] = content
    else:
        # Sanitize command for use in S3 key
        safe_command = command.replace(" ", "_").replace("/", "-")
        s3_key = f"{prefix}{user_id}/{device_id}/{timestamp}/{safe_command}.txt"

        s3 = get_s3_client()
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=content_bytes,
            ContentType="text/plain",
        )

        meta["s3Key"] = s3_key
        logger.info(f"Stored output to S3: {s3_key} ({size_bytes} bytes)")

    return meta


def read_output(meta: dict) -> str:
    """
    Read command output from inline storage or S3.
    """
    if "inline" in meta and meta["inline"] is not None:
        return meta["inline"]

    if "s3Key" in meta:
        return read_s3_object(meta["s3Key"])

    return ""


def read_s3_object(key: str) -> str:
    """Read a text object from S3."""
    s3 = get_s3_client()
    response = s3.get_object(Bucket=BUCKET_NAME, Key=key)
    return response["Body"].read().decode("utf-8")


def write_s3_object(key: str, content: str, content_type: str = "text/plain") -> str:
    """Write a text object to S3. Returns the key."""
    s3 = get_s3_client()
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=key,
        Body=content.encode("utf-8"),
        ContentType=content_type,
    )
    logger.info(f"Wrote S3 object: {key}")
    return key


def write_json_to_s3(key: str, data: dict) -> str:
    """Write a JSON object to S3. Returns the key."""
    return write_s3_object(
        key, json.dumps(data, indent=2), content_type="application/json"
    )


def delete_s3_objects(keys: list[str]) -> None:
    """Delete multiple S3 objects."""
    if not keys:
        return

    s3 = get_s3_client()
    # S3 delete_objects limit is 1000
    for i in range(0, len(keys), 1000):
        batch = keys[i : i + 1000]
        s3.delete_objects(
            Bucket=BUCKET_NAME,
            Delete={"Objects": [{"Key": k} for k in batch]},
        )
    logger.info(f"Deleted {len(keys)} S3 objects")
