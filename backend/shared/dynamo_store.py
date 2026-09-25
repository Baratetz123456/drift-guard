"""
DriftGuard DynamoDB Single-Table Repository Store.
Provides strongly typed access patterns, per-user tenant isolation, quota management,
and credential encryption for the DeltaNet DynamoDB table.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from boto3.dynamodb.conditions import Attr

from shared import dynamo, kms
from shared.constants import (
    GSI1,
    EntityPrefix,
)

logger = logging.getLogger("driftguard.dynamo_store")


def get_current_utc_date() -> str:
    """Return current date in YYYY-MM-DD UTC format."""
    return datetime.now(UTC).strftime("%Y-%m-%d")


def get_utc_now_iso() -> str:
    """Return current ISO 8601 UTC timestamp."""
    return datetime.now(UTC).isoformat()


# =============================================================================
# USER & QUOTA OPERATIONS
# =============================================================================

def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Query user item by email via GSI1 or scan fallback."""
    dynamo.ensure_table_exists()
    items = dynamo.query_all(
        pk=f"EMAIL#{email.lower()}",
        sk_prefix="PROFILE",
        index_name=GSI1,
    )
    if items:
        return items[0]

    # Fallback scan for resilience if index is still indexing
    table = dynamo.get_table()
    try:
        resp = table.scan(
            FilterExpression=Attr("email").eq(email.lower()) & Attr("SK").eq("PROFILE")
        )
        scan_items = resp.get("Items", [])
        if scan_items:
            return scan_items[0]
    except Exception as e:
        logger.warning(f"Note during user scan fallback: {e}")
    return None


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    """
    Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations.
    Returns (salt_hex, hash_hex).
    """
    if not salt:
        salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        100_000,
    ).hex()
    return salt, pw_hash


def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    """
    Verify submitted password against PBKDF2 salt and expected hash using constant-time comparison.
    """
    try:
        calculated_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt),
            100_000,
        ).hex()
        return hmac.compare_digest(calculated_hash, expected_hash)
    except Exception as e:
        logger.warning(f"Error during password verification: {e}")
        return False


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    """Get user profile item by user_id."""
    return dynamo.get_item(pk=f"USER#{user_id}", sk="PROFILE")


def get_or_create_user(
    user_id: str,
    email: str = "operator@driftguard.local",
    name: str = "Network Architect",
    role: str = "Network Architect",
    password: str | None = None,
) -> dict[str, Any]:
    """Retrieve existing user or create a new user profile with initial quotas and credentials."""
    existing = get_user_by_id(user_id)
    today = get_current_utc_date()
    now_iso = get_utc_now_iso()

    if existing:
        updates: dict[str, Any] = {}
        # Check quota reset date
        if existing.get("quotaResetDate") != today:
            updates["dailyAiCount"] = 0
            updates["dailyCollectCount"] = 0
            updates["quotaResetDate"] = today

        # If existing record has no password hash and one is supplied, update it
        if password and not existing.get("passwordHash"):
            salt, pw_hash = hash_password(password)
            updates["passwordSalt"] = salt
            updates["passwordHash"] = pw_hash

        if updates:
            existing = dynamo.update_item(pk=f"USER#{user_id}", sk="PROFILE", updates=updates)
            existing.update(updates)
        return existing

    # Hash password if provided
    salt, pw_hash = hash_password(password) if password else ("", "")

    # Create new user item
    user_item = {
        "PK": f"USER#{user_id}",
        "SK": "PROFILE",
        "GSI1PK": f"EMAIL#{email.lower()}",
        "GSI1SK": "PROFILE",
        "userId": user_id,
        "email": email.lower(),
        "name": name,
        "role": role,
        "passwordSalt": salt,
        "passwordHash": pw_hash,
        "failedLoginAttempts": 0,
        "lockedUntil": 0,
        "lastLoginAt": None,
        "createdAt": now_iso,
        "dailyAiCount": 0,
        "dailyCollectCount": 0,
        "quotaResetDate": today,
    }
    dynamo.put_item(user_item)

    # Initialize default user settings if not present
    init_default_settings(user_id)
    return user_item


def create_user_with_credentials(
    user_id: str,
    email: str,
    name: str,
    password: str,
    role: str = "Network Architect",
) -> dict[str, Any]:
    """Create a new user profile strictly with cryptographically hashed credentials and zero quota baseline."""
    return get_or_create_user(
        user_id=user_id,
        email=email,
        name=name,
        role=role,
        password=password,
    )


def record_login_success(user_id: str) -> None:
    """Record successful authentication, reset failed attempts and lockout, and update lastLoginAt."""
    now_iso = get_utc_now_iso()
    updates = {
        "failedLoginAttempts": 0,
        "lockedUntil": 0,
        "lastLoginAt": now_iso,
    }
    dynamo.update_item(pk=f"USER#{user_id}", sk="PROFILE", updates=updates)


def record_login_failure(user_id: str, max_attempts: int = 5, lockout_seconds: int = 60) -> tuple[int, int]:
    """
    Record failed authentication attempt on user record in DynamoDB.
    Returns (failed_attempts_count, remaining_lockout_seconds).
    """
    user = get_user_by_id(user_id) or {}
    current_attempts = int(user.get("failedLoginAttempts", 0)) + 1
    locked_until = 0

    if current_attempts >= max_attempts:
        locked_until = int(time.time()) + lockout_seconds

    updates: dict[str, Any] = {
        "failedLoginAttempts": current_attempts,
    }
    if locked_until > 0:
        updates["lockedUntil"] = locked_until

    dynamo.update_item(pk=f"USER#{user_id}", sk="PROFILE", updates=updates)
    remaining_lockout = max(0, locked_until - int(time.time())) if locked_until > 0 else 0
    return current_attempts, remaining_lockout


def check_and_increment_quota(user_id: str, quota_type: str) -> tuple[bool, int, int]:
    """
    Check if user is within daily quota and increment if permitted.
    quota_type: 'collect' or 'ai'
    Returns: (is_allowed, current_count, max_quota)
    """
    user = get_or_create_user(user_id)
    settings = get_user_settings(user_id)

    daily_ai_quota = int(settings.get("dailyAiQuota", 50))
    daily_collect_quota = int(settings.get("dailyCollectQuota", 100))

    if quota_type == "collect":
        current = int(user.get("dailyCollectCount", 0))
        if current >= daily_collect_quota:
            return False, current, daily_collect_quota
        new_count = current + 1
        dynamo.update_item(
            pk=f"USER#{user_id}",
            sk="PROFILE",
            updates={"dailyCollectCount": new_count},
        )
        return True, new_count, daily_collect_quota

    elif quota_type == "ai":
        current = int(user.get("dailyAiCount", 0))
        if current >= daily_ai_quota:
            return False, current, daily_ai_quota
        new_count = current + 1
        dynamo.update_item(
            pk=f"USER#{user_id}",
            sk="PROFILE",
            updates={"dailyAiCount": new_count},
        )
        return True, new_count, daily_ai_quota

    return True, 0, 100


# =============================================================================
# DEVICE INVENTORY OPERATIONS
# =============================================================================

def list_devices(user_id: str) -> list[dict[str, Any]]:
    """List all network devices belonging strictly to the user."""
    items = dynamo.query_all(
        pk=f"USER#{user_id}",
        sk_prefix=EntityPrefix.DEVICE,
    )
    result = []
    for item in items:
        dev_id = item.get("deviceId") or item["SK"].replace(EntityPrefix.DEVICE, "")
        canonical_driver = item.get("driver") or item.get("deviceType") or item.get("platform", "cisco_xe")
        result.append({
            "deviceId": dev_id,
            "name": item.get("name") or item.get("deviceName", ""),
            "hostname": item.get("hostname") or item.get("managementIp", ""),
            "port": item.get("port") or item.get("sshPort", 22),
            "driver": canonical_driver,
            "deviceType": canonical_driver,
            "status": item.get("status", "ONLINE"),
            "authMode": item.get("authMode", "Password"),
            "username": item.get("username", ""),
            "groupId": item.get("groupId"),
            "createdAt": item.get("createdAt", get_utc_now_iso()),
        })
    return result


def create_device(user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a device record with KMS/vault encrypted credentials."""
    dev_id = data.get("deviceId") or f"dev_{uuid.uuid4().hex[:8]}"
    now_iso = get_utc_now_iso()

    # Encrypt credentials securely
    enc_pw = kms.encrypt_value(data.get("password") or "") if data.get("password") else ""
    enc_sec = kms.encrypt_value(data.get("enableSecret") or "") if data.get("enableSecret") else ""
    canonical_driver = data.get("driver") or data.get("deviceType") or "cisco_xe"

    item = {
        "PK": f"USER#{user_id}",
        "SK": f"{EntityPrefix.DEVICE}{dev_id}",
        "GSI1PK": f"USER#{user_id}#DEVICES",
        "GSI1SK": data.get("name", dev_id),
        "deviceId": dev_id,
        "userId": user_id,
        "name": data.get("name", dev_id),
        "hostname": data.get("hostname", ""),
        "port": int(data.get("port") or 22),
        "driver": canonical_driver,
        "deviceType": canonical_driver,
        "status": data.get("status", "ONLINE"),
        "authMode": data.get("authMode", "Password"),
        "username": data.get("username", ""),
        "passwordEncrypted": enc_pw,
        "enableSecretEncrypted": enc_sec,
        "groupId": data.get("groupId"),
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }
    dynamo.put_item(item)
    return {
        "deviceId": dev_id,
        "name": item["name"],
        "hostname": item["hostname"],
        "port": item["port"],
        "driver": canonical_driver,
        "deviceType": canonical_driver,
        "status": item["status"],
        "authMode": item["authMode"],
        "username": item["username"],
        "groupId": item["groupId"],
        "createdAt": now_iso,
    }


def get_device(user_id: str, device_id: str) -> dict[str, Any] | None:
    """Get single device by ID and decrypt credentials for SSH use."""
    item = dynamo.get_item(pk=f"USER#{user_id}", sk=f"{EntityPrefix.DEVICE}{device_id}")
    if not item:
        return None

    decrypted = item.copy()
    canonical_driver = decrypted.get("driver") or decrypted.get("deviceType") or "cisco_xe"
    decrypted["driver"] = canonical_driver
    decrypted["deviceType"] = canonical_driver

    if item.get("passwordEncrypted"):
        decrypted["password"] = kms.decrypt_value(item["passwordEncrypted"])
    if item.get("enableSecretEncrypted"):
        decrypted["enableSecret"] = kms.decrypt_value(item["enableSecretEncrypted"])
    return decrypted


def delete_device(user_id: str, device_id: str) -> bool:
    """Delete a device record."""
    dynamo.delete_item(pk=f"USER#{user_id}", sk=f"{EntityPrefix.DEVICE}{device_id}")
    return True


# =============================================================================
# COMMAND SET OPERATIONS
# =============================================================================

def list_command_sets(user_id: str) -> list[dict[str, Any]]:
    """List all command sets for a user."""
    items = dynamo.query_all(
        pk=f"USER#{user_id}",
        sk_prefix=EntityPrefix.COMMAND_SET,
    )
    result = []
    for item in items:
        set_id = item.get("setId") or item["SK"].replace(EntityPrefix.COMMAND_SET, "")
        result.append({
            "setId": set_id,
            "name": item.get("name", ""),
            "driver": item.get("driver") or item.get("platform", "cisco_xe"),
            "deviceType": item.get("driver") or item.get("platform", "cisco_xe"),
            "commands": item.get("commands", []),
            "description": item.get("description", ""),
            "createdAt": item.get("createdAt", get_utc_now_iso()),
        })
    return result


def create_command_set(user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a new command set."""
    set_id = data.get("setId") or f"cmd_{uuid.uuid4().hex[:8]}"
    now_iso = get_utc_now_iso()

    item = {
        "PK": f"USER#{user_id}",
        "SK": f"{EntityPrefix.COMMAND_SET}{set_id}",
        "setId": set_id,
        "userId": user_id,
        "name": data.get("name", "Custom Commands"),
        "driver": data.get("driver") or data.get("deviceType") or "cisco_xe",
        "commands": data.get("commands", []),
        "description": data.get("description", ""),
        "createdAt": now_iso,
    }
    dynamo.put_item(item)
    return {
        "setId": set_id,
        "name": item["name"],
        "driver": item["driver"],
        "commands": item["commands"],
        "description": item["description"],
        "createdAt": now_iso,
    }


def get_command_set(user_id: str, set_id: str) -> dict[str, Any] | None:
    """Get single command set by ID."""
    item = dynamo.get_item(pk=f"USER#{user_id}", sk=f"{EntityPrefix.COMMAND_SET}{set_id}")
    return item


def delete_command_set(user_id: str, set_id: str) -> bool:
    """Delete a command set strictly scoped to the authenticated user."""
    dynamo.delete_item(pk=f"USER#{user_id}", sk=f"{EntityPrefix.COMMAND_SET}{set_id}")
    return True


# =============================================================================
# SNAPSHOT OPERATIONS
# =============================================================================

def list_snapshots(user_id: str, device_id: str | None = None) -> list[dict[str, Any]]:
    """List snapshots for a user, optionally filtered by deviceId."""
    if device_id:
        items = dynamo.query_all(
            pk=f"USER#{user_id}",
            sk_prefix=f"{EntityPrefix.SNAPSHOT}",
        )
        items = [i for i in items if i.get("deviceId") == device_id]
    else:
        items = dynamo.query_all(
            pk=f"USER#{user_id}",
            sk_prefix=EntityPrefix.SNAPSHOT,
        )

    result = []
    for item in sorted(items, key=lambda x: x.get("createdAt", ""), reverse=True):
        snap_id = item.get("snapshotId") or item["SK"].replace(EntityPrefix.SNAPSHOT, "")
        result.append({
            "snapshotId": snap_id,
            "deviceId": item.get("deviceId", ""),
            "deviceName": item.get("deviceName", ""),
            "deviceHostname": item.get("deviceHostname", ""),
            "deviceType": item.get("deviceType", "cisco_xe"),
            "snapshotType": item.get("snapshotType", "baseline"),
            "changeTicket": item.get("changeTicket", ""),
            "notes": item.get("notes", ""),
            "commands": item.get("commands", []),
            "outputs": item.get("outputs", {}),
            "createdAt": item.get("createdAt", get_utc_now_iso()),
        })
    return result


def create_snapshot(user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Store a captured snapshot item in DynamoDB."""
    snap_id = data.get("snapshotId") or f"snap-{data.get('snapshotType', 'base')}-{uuid.uuid4().hex[:6]}"
    now_iso = get_utc_now_iso()
    dev_id = data.get("deviceId") or "dev-unknown"

    item = {
        "PK": f"USER#{user_id}",
        "SK": f"{EntityPrefix.SNAPSHOT}{snap_id}",
        "GSI1PK": f"USER#{user_id}#DEVICE#{dev_id}#SNAPSHOTS",
        "GSI1SK": now_iso,
        "snapshotId": snap_id,
        "userId": user_id,
        "deviceId": dev_id,
        "deviceName": data.get("deviceName", dev_id),
        "deviceHostname": data.get("deviceHostname", ""),
        "deviceType": data.get("deviceType", "cisco_xe"),
        "snapshotType": data.get("snapshotType", "baseline"),
        "changeTicket": data.get("changeTicket", ""),
        "notes": data.get("notes", ""),
        "commands": data.get("commands", []),
        "outputs": data.get("outputs", {}),
        "createdAt": now_iso,
    }
    dynamo.put_item(item)
    return item


def get_snapshot(user_id: str, snapshot_id: str) -> dict[str, Any] | None:
    """Get single snapshot by ID."""
    item = dynamo.get_item(pk=f"USER#{user_id}", sk=f"{EntityPrefix.SNAPSHOT}{snapshot_id}")
    return item


def delete_snapshot(user_id: str, snapshot_id: str) -> bool:
    """Delete a snapshot strictly scoped to the authenticated user."""
    dynamo.delete_item(pk=f"USER#{user_id}", sk=f"{EntityPrefix.SNAPSHOT}{snapshot_id}")
    return True


# =============================================================================
# COMPARISONS & DIFFS
# =============================================================================

def list_comparisons(user_id: str) -> list[dict[str, Any]]:
    """List comparisons for a user."""
    items = dynamo.query_all(
        pk=f"USER#{user_id}",
        sk_prefix=EntityPrefix.COMPARISON,
    )
    result = []
    for item in sorted(items, key=lambda x: x.get("createdAt", ""), reverse=True):
        cmp_id = item.get("comparisonId") or item["SK"].replace(EntityPrefix.COMPARISON, "")
        result.append({
            "comparisonId": cmp_id,
            "deviceId": item.get("deviceId", ""),
            "deviceName": item.get("deviceName", ""),
            "preSnapshotId": item.get("preSnapshotId", ""),
            "postSnapshotId": item.get("postSnapshotId", ""),
            "changeLabel": item.get("changeLabel", ""),
            "commandDiffs": item.get("commandDiffs", []),
            "createdAt": item.get("createdAt", get_utc_now_iso()),
        })
    return result


def create_comparison(user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Store a comparison diff item in DynamoDB."""
    cmp_id = data.get("comparisonId") or f"cmp-{uuid.uuid4().hex[:8]}"
    now_iso = get_utc_now_iso()

    item = {
        "PK": f"USER#{user_id}",
        "SK": f"{EntityPrefix.COMPARISON}{cmp_id}",
        "GSI1PK": f"USER#{user_id}#COMPARISONS",
        "GSI1SK": now_iso,
        "comparisonId": cmp_id,
        "userId": user_id,
        "deviceId": data.get("deviceId", ""),
        "deviceName": data.get("deviceName", ""),
        "preSnapshotId": data.get("preSnapshotId", ""),
        "postSnapshotId": data.get("postSnapshotId", ""),
        "changeLabel": data.get("changeLabel", ""),
        "commandDiffs": data.get("commandDiffs", []),
        "createdAt": now_iso,
    }
    dynamo.put_item(item)
    return item


# =============================================================================
# USER SETTINGS OPERATIONS
# =============================================================================

def init_default_settings(user_id: str) -> dict[str, Any]:
    """Initialize default settings if not already created."""
    existing = get_user_settings(user_id)
    if existing and existing.get("updatedAt"):
        return existing

    now_iso = get_utc_now_iso()
    default_item = {
        "PK": f"USER#{user_id}",
        "SK": EntityPrefix.SETTINGS,
        "userId": user_id,
        "aiBaseUrl": "https://openrouter.ai/api/v1",
        "defaultModel": "google/gemini-2.0-flash-lite:free",
        "defaultTimeoutSeconds": 30,
        "maskSecretsInDiffs": True,
        "normalizeDynamicCounters": True,
        "dailyAiQuota": 50,
        "dailyCollectQuota": 100,
        "apiKeyEncrypted": "",
        "updatedAt": now_iso,
    }
    dynamo.put_item(default_item)
    return default_item


def get_user_settings(user_id: str) -> dict[str, Any]:
    """Get settings for a user."""
    item = dynamo.get_item(pk=f"USER#{user_id}", sk=EntityPrefix.SETTINGS)
    if not item:
        return {
            "userId": user_id,
            "aiBaseUrl": "https://openrouter.ai/api/v1",
            "defaultModel": "google/gemini-2.0-flash-lite:free",
            "defaultTimeoutSeconds": 30,
            "maskSecretsInDiffs": True,
            "normalizeDynamicCounters": True,
            "dailyAiQuota": 50,
            "dailyCollectQuota": 100,
            "hasApiKey": False,
        }

    return {
        "userId": user_id,
        "aiBaseUrl": item.get("aiBaseUrl") or "https://openrouter.ai/api/v1",
        "defaultModel": item.get("defaultModel") or "google/gemini-2.0-flash-lite:free",
        "defaultTimeoutSeconds": int(item.get("defaultTimeoutSeconds", 30)),
        "maskSecretsInDiffs": bool(item.get("maskSecretsInDiffs", True)),
        "normalizeDynamicCounters": bool(item.get("normalizeDynamicCounters", True)),
        "dailyAiQuota": int(item.get("dailyAiQuota", 50)),
        "dailyCollectQuota": int(item.get("dailyCollectQuota", 100)),
        "hasApiKey": bool(item.get("apiKeyEncrypted")),
        "updatedAt": item.get("updatedAt", ""),
    }


def update_user_settings(user_id: str, body: dict[str, Any]) -> dict[str, Any]:
    """Update settings for a user."""
    now_iso = get_utc_now_iso()
    updates: dict[str, Any] = {"updatedAt": now_iso}

    if "aiBaseUrl" in body and body["aiBaseUrl"] is not None:
        updates["aiBaseUrl"] = body["aiBaseUrl"]
    if "defaultModel" in body and body["defaultModel"] is not None:
        updates["defaultModel"] = body["defaultModel"]
    if "defaultTimeoutSeconds" in body and body["defaultTimeoutSeconds"] is not None:
        updates["defaultTimeoutSeconds"] = int(body["defaultTimeoutSeconds"])
    if "maskSecretsInDiffs" in body and body["maskSecretsInDiffs"] is not None:
        updates["maskSecretsInDiffs"] = bool(body["maskSecretsInDiffs"])
    if "normalizeDynamicCounters" in body and body["normalizeDynamicCounters"] is not None:
        updates["normalizeDynamicCounters"] = bool(body["normalizeDynamicCounters"])
    if body.get("openaiApiKey"):
        updates["apiKeyEncrypted"] = kms.encrypt_value(body["openaiApiKey"])

    dynamo.update_item(pk=f"USER#{user_id}", sk=EntityPrefix.SETTINGS, updates=updates)
    return get_user_settings(user_id)


# =============================================================================
# AUDIT LOG OPERATIONS
# =============================================================================

def add_audit_log(user_id: str, action: str, target: str, result: str, details: str = "") -> dict[str, Any]:
    """Record an audit log entry in DynamoDB."""
    now_iso = get_utc_now_iso()
    audit_id = f"aud_{uuid.uuid4().hex[:8]}"

    item = {
        "PK": f"USER#{user_id}",
        "SK": f"{EntityPrefix.AUDIT}{now_iso}#{audit_id}",
        "id": audit_id,
        "userId": user_id,
        "action": action,
        "target": target,
        "result": result,
        "details": details,
        "timestamp": now_iso,
    }
    dynamo.put_item(item)
    return item


def list_audit_logs(user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    """List recent audit logs for a user."""
    items = dynamo.query_all(
        pk=f"USER#{user_id}",
        sk_prefix=EntityPrefix.AUDIT,
    )
    result = []
    for item in sorted(items, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]:
        result.append({
            "id": item.get("id") or item["SK"].split("#")[-1],
            "action": item.get("action", ""),
            "target": item.get("target", ""),
            "result": item.get("result", ""),
            "details": item.get("details", ""),
            "timestamp": item.get("timestamp", ""),
        })
    return result


# =============================================================================
# BOOTSTRAP INITIAL DEMO ENVIRONMENT
# =============================================================================

def bootstrap_demo_environment(user_id: str = "user_default") -> None:
    """Bootstrap the initial demo operator environment and starter command sets."""
    dynamo.ensure_table_exists()

    # 1. Ensure demo operator profile exists with standard demo password
    get_or_create_user(
        user_id=user_id,
        email="operator@driftguard.local",
        name="Network Architect",
        role="Network Architect",
        password="DriftGuard2026!",
    )

    # 2. Ensure starter command sets exist
    existing_sets = list_command_sets(user_id)
    if not existing_sets:
        create_command_set(
            user_id=user_id,
            data={
                "name": "Standard Telemetry",
                "driver": "cisco_xe",
                "commands": [
                    "show ip interface brief",
                    "show ip bgp summary",
                    "show ip route summary",
                    "show version",
                ],
                "description": "Core baseline show commands for interface, routing, and system telemetry.",
            },
        )
        logger.info(f"Bootstrapped starter command set for user {user_id}.")

    logger.info("DynamoDB demo environment ready.")
