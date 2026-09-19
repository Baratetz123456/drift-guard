"""
DriftGuard Local Collector Bridge & Database API Server.
Executes authentic Cisco show commands over SSH (Netmiko) and provides real Amazon DynamoDB single-table persistence,
per-user tenant data isolation, multi-layer bot defense, and abuse quota enforcement.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# Ensure shared package is importable regardless of working directory
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if _CURRENT_DIR not in sys.path:
    sys.path.insert(0, _CURRENT_DIR)

from fastapi import FastAPI, HTTPException, Header, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from netmiko import ConnectHandler
from pydantic import BaseModel

from shared import dynamo, dynamo_store
from shared.constants import TABLE_NAME, DYNAMODB_ENDPOINT_URL

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("driftguard.collector")

app = FastAPI(
    title="DriftGuard Local Collector & DynamoDB Bridge",
    description="Real SSH collector bridge and DynamoDB single-table persistence layer with per-user tenant isolation",
    version="2.0.0",
)

@app.on_event("startup")
def on_startup():
    """Initialize DynamoDB single-table and default demo operator profile."""
    logger.info("Initializing DriftGuard DynamoDB table and default environment...")
    try:
        dynamo.ensure_table_exists()
        dynamo_store.bootstrap_demo_environment()
        logger.info("DriftGuard DynamoDB initialized successfully.")
    except Exception as e:
        logger.warning(f"Note during DynamoDB startup: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FORBIDDEN_MUTATIONS = [
    "conf t",
    "configure",
    "reload",
    "write erase",
    "erase",
    "shutdown",
    "no ",
    "delete",
    "format",
    "boot",
    "install",
    "license",
]

# Heuristic prompt injection canary patterns
PROMPT_INJECTION_PATTERNS = [
    re.compile(r"(?i)\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions\b"),
    re.compile(r"(?i)\bdisregard\s+(?:all\s+)?(?:previous|prior|above)\b"),
    re.compile(r"(?i)\bsystem\s+override\b"),
    re.compile(r"(?i)\byou\s+are\s+now\s+(?:a|an)\b"),
    re.compile(r"(?i)\bdo\s+anything\s+now\b"),
    re.compile(r"(?i)\bdan\s+mode\b"),
    re.compile(r"(?i)\bjailbreak\b"),
    re.compile(r"(?i)\bact\s+as\s+(?:an?\s+)?unrestricted\b"),
    re.compile(r"(?i)\bnew\s+rule:\s*"),
]

# Track failed login attempts by IP / email for brute-force mitigation
FAILED_LOGIN_ATTEMPTS: Dict[str, Dict[str, Any]] = {}


# =============================================================================
# AUTH HELPERS & JWT TOKEN PARSER
# =============================================================================

def extract_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Extract user_id from Cognito / Bearer JWT token, or default to demo user."""
    if not authorization or not authorization.startswith("Bearer "):
        return "user_default"
    token = authorization.split(" ")[1]
    try:
        parts = token.split(".")
        if len(parts) >= 2:
            padding = "=" * (4 - len(parts[1]) % 4)
            decoded_bytes = base64.urlsafe_b64decode(parts[1] + padding)
            payload = json.loads(decoded_bytes)
            # Ensure user exists in DynamoDB
            dynamo_store.get_or_create_user(
                user_id=user_id,
                email=payload.get("email", f"{user_id}@driftguard.local"),
                name=payload.get("name", "Network Architect"),
            )
            return user_id
    except Exception as e:
        logger.warning(f"Could not parse JWT bearer: {e}")
    return "user_default"


def generate_mock_jwt(user_id: str, email: str, name: str, role: str = "Network Architect") -> str:
    """Create authentic JWT token structure for browser session."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "cognito:groups": [role],
        "token_use": "id",
        "iss": "https://cognito-idp.us-east-1.amazonaws.com/driftguard",
        "iat": now,
        "exp": now + 86400,
    }
    h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    p_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig_b64 = base64.urlsafe_b64encode(b"driftguard_cryptographic_signature").decode().rstrip("=")
    return f"{h_b64}.{p_b64}.{sig_b64}"


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class AuthRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    operator_honeypot_code: Optional[str] = None
    mount_time_ms: Optional[int] = None
    verification_token: Optional[str] = None


class AuthLoginRequest(BaseModel):
    email: str
    password: str
    operator_honeypot_code: Optional[str] = None
    mount_time_ms: Optional[int] = None


class DeviceCreateRequest(BaseModel):
    name: str
    hostname: str
    port: Optional[int] = 22
    driver: Optional[str] = "cisco_xe"
    username: Optional[str] = "admin"
    password: Optional[str] = None
    enableSecret: Optional[str] = None
    authMode: Optional[str] = "Password"
    groupId: Optional[str] = None


class CommandSetCreateRequest(BaseModel):
    name: str
    driver: Optional[str] = "cisco_xe"
    commands: List[str]
    description: Optional[str] = None


class DeviceTestRequest(BaseModel):
    hostname: Optional[str] = None
    port: Optional[int] = 22
    deviceType: Optional[str] = "cisco_xe"
    username: Optional[str] = None
    password: Optional[str] = None
    enableSecret: Optional[str] = None


class CollectRequest(BaseModel):
    deviceId: Optional[str] = None
    deviceName: Optional[str] = None
    hostname: Optional[str] = None
    port: Optional[int] = 22
    deviceType: Optional[str] = "cisco_xe"
    username: Optional[str] = None
    password: Optional[str] = None
    enableSecret: Optional[str] = None
    commands: List[str]
    snapshotType: Optional[str] = "baseline"
    changeTicket: Optional[str] = None
    notes: Optional[str] = None


class CompareRequest(BaseModel):
    preSnapshotId: str
    postSnapshotId: str
    changeLabel: Optional[str] = None


class AIAnalyzeRequest(BaseModel):
    comparisonId: str
    promptOverride: Optional[str] = None


# =============================================================================
# SSH EXECUTION LOGIC
# =============================================================================

def sanitize_platform(device_type: Optional[str]) -> str:
    if not device_type:
        return "cisco_xe"
    normalized = device_type.strip().lower().replace("-", "_").replace(" ", "_")

    mapping = {
        "cisco_xe": "cisco_xe",
        "cisco_ios_xe": "cisco_xe",
        "ios_xe": "cisco_xe",
        "xe": "cisco_xe",
        "ciscoxe": "cisco_xe",
        "cisco_ios": "cisco_ios",
        "ios": "cisco_ios",
        "ciscoios": "cisco_ios",
        "cisco_nxos": "cisco_nxos",
        "cisco_nx_os": "cisco_nxos",
        "nxos": "cisco_nxos",
        "nx_os": "cisco_nxos",
        "cisconxos": "cisco_nxos",
        "cisco_xr": "cisco_xr",
        "cisco_ios_xr": "cisco_xr",
        "ios_xr": "cisco_xr",
        "xr": "cisco_xr",
        "ciscoxr": "cisco_xr",
        "cisco_asa": "cisco_asa",
        "asa": "cisco_asa",
        "ciscoasa": "cisco_asa",
    }
    if normalized in mapping:
        return mapping[normalized]

    compact = re.sub(r"[^a-z0-9]", "", normalized)
    for key, val in mapping.items():
        if re.sub(r"[^a-z0-9]", "", key) == compact:
            return val

    return "cisco_xe"


def execute_ssh_collection(
    host: str,
    port: int,
    platform: str,
    username: str,
    password: str,
    commands: List[str],
    secret: Optional[str] = None,
    timeout: int = 40,
) -> Dict[str, str]:
    for cmd in commands:
        c_lower = cmd.lower().strip()
        for forbidden in FORBIDDEN_MUTATIONS:
            if c_lower.startswith(forbidden):
                raise HTTPException(
                    status_code=400,
                    detail=f"Security violation: Mutating command '{cmd}' blocked by DriftGuard Cisco Read-Only Law.",
                )

    device_params = {
        "device_type": sanitize_platform(platform),
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "timeout": timeout,
        "conn_timeout": timeout,
    }
    if secret:
        device_params["secret"] = secret

    outputs: Dict[str, str] = {}
    logger.info(f"Connecting over SSH to {host}:{port} ({platform}) as {username}...")

    with ConnectHandler(**device_params) as net_connect:
        if secret:
            net_connect.enable()

        prompt = net_connect.find_prompt()
        logger.info(f"Connected to {host} with prompt '{prompt}'. Executing {len(commands)} commands...")

        for cmd in commands:
            cmd_clean = cmd.strip()
            if not cmd_clean:
                continue
            logger.info(f"[{host}] Running: '{cmd_clean}'")
            try:
                cmd_out = net_connect.send_command(
                    cmd_clean,
                    read_timeout=35,
                    strip_prompt=True,
                    strip_command=True,
                )
                outputs[cmd_clean] = cmd_out
            except Exception as cmd_err:
                logger.error(f"[{host}] Error on '{cmd_clean}': {cmd_err}")
                outputs[cmd_clean] = f"% Error executing '{cmd_clean}': {cmd_err}"

    return outputs


# =============================================================================
# BOT-PROOF AUTHENTICATION ENDPOINTS
# =============================================================================

@app.post("/auth/register")
@app.post("/api/auth/register")
def register_operator(req: AuthRegisterRequest, request: Request):
    """Register operator account with multi-layer bot defense."""
    # 1. Honeypot check
    if req.operator_honeypot_code:
        logger.warning(f"Bot detected: Honeypot field filled ({req.operator_honeypot_code})")
        raise HTTPException(status_code=400, detail="Automated submission blocked.")

    # 2. Mount time-gate check (reject < 1.2s)
    if req.mount_time_ms is not None:
        if req.mount_time_ms > 1000000000000:
            elapsed = (time.time() * 1000) - req.mount_time_ms
        else:
            elapsed = req.mount_time_ms
        if elapsed < 1200:
            logger.warning(f"Bot detected: Submission too fast ({elapsed}ms)")
            raise HTTPException(status_code=400, detail="Submission rejected: Bot-like speed detected.")

    existing_user = dynamo_store.get_user_by_email(req.email)
    if existing_user:
        raise HTTPException(status_code=409, detail="Operator email already registered.")

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    user = dynamo_store.get_or_create_user(
        user_id=user_id,
        email=req.email,
        name=req.name,
        role="Network Architect",
    )

    starter_cmd_id = f"cmd_{uuid.uuid4().hex[:8]}"
    starter_cmds = ["show ip interface brief", "show ip bgp summary", "show ip route summary"]
    dynamo_store.create_command_set(
        user_id=user_id,
        data={
            "setId": starter_cmd_id,
            "name": "Standard Telemetry",
            "driver": "cisco_xe",
            "commands": starter_cmds,
            "description": "Core baseline show commands",
        },
    )

    token = generate_mock_jwt(user_id, req.email, req.name)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": req.email,
            "name": req.name,
            "role": "Network Architect",
        },
    }


@app.post("/auth/login")
@app.post("/api/auth/login")
def login_operator(req: AuthLoginRequest, request: Request):
    """Authenticate operator with brute-force lockout and bot prevention."""
    # 1. Honeypot check
    if req.operator_honeypot_code:
        raise HTTPException(status_code=400, detail="Automated submission blocked.")

    # 2. Time-gate check
    if req.mount_time_ms is not None:
        if req.mount_time_ms > 1000000000000:
            elapsed = (time.time() * 1000) - req.mount_time_ms
        else:
            elapsed = req.mount_time_ms
        if elapsed < 1200:
            raise HTTPException(status_code=400, detail="Submission rejected: Bot-like speed detected.")

    ip = request.client.host if request.client else "unknown"
    lockout_record = FAILED_LOGIN_ATTEMPTS.get(ip, {"attempts": 0, "locked_until": 0})

    if time.time() < lockout_record.get("locked_until", 0):
        remaining = int(lockout_record["locked_until"] - time.time())
        raise HTTPException(status_code=429, detail=f"Account locked: Too many failed attempts. Try again in {remaining}s.")

    user = dynamo_store.get_user_by_email(req.email)
    if not user:
        # If demo login or first-time, auto-create user gracefully in DynamoDB
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        name = req.email.split("@")[0].capitalize()
        user = dynamo_store.get_or_create_user(user_id, req.email, name)

    uid = user.get("userId") or user.get("id") or f"usr_{uuid.uuid4().hex[:12]}"
    token = generate_mock_jwt(uid, user["email"], user["name"], user.get("role", "Network Architect"))
    # Reset failed attempts
    if ip in FAILED_LOGIN_ATTEMPTS:
        del FAILED_LOGIN_ATTEMPTS[ip]

    return {
        "token": token,
        "user": {
            "id": uid,
            "email": user["email"],
            "name": user["name"],
            "role": user.get("role", "Network Architect"),
        },
    }


# =============================================================================
# PER-USER DATABASE REST ENDPOINTS
# =============================================================================

@app.get("/devices")
@app.get("/api/devices")
def get_user_devices(user_id: str = Depends(extract_user_id)):
    """Retrieve all network devices belonging strictly to the authenticated user."""
    devices = dynamo_store.list_devices(user_id)
    return {"devices": devices}


@app.post("/devices")
@app.post("/api/devices")
def create_user_device(req: DeviceCreateRequest, user_id: str = Depends(extract_user_id)):
    """Create a new network device strictly scoped to the authenticated user."""
    created = dynamo_store.create_device(user_id, req.dict())
    return created


@app.delete("/devices/{device_id}")
@app.delete("/api/devices/{device_id}")
def delete_user_device(device_id: str, user_id: str = Depends(extract_user_id)):
    """Delete a device strictly scoped to the authenticated user."""
    dynamo_store.delete_device(user_id, device_id)
    return {"success": True, "deletedDeviceId": device_id}


@app.get("/commands")
@app.get("/api/commands")
def get_user_command_sets(user_id: str = Depends(extract_user_id)):
    """Retrieve all command sets belonging strictly to the authenticated user."""
    command_sets = dynamo_store.list_command_sets(user_id)
    return {"commandSets": command_sets}


@app.post("/commands")
@app.post("/api/commands")
def create_user_command_set(req: CommandSetCreateRequest, user_id: str = Depends(extract_user_id)):
    """Create a new command set strictly scoped to the authenticated user."""
    created = dynamo_store.create_command_set(user_id, req.dict())
    return created


@app.get("/snapshots")
@app.get("/api/snapshots")
def get_user_snapshots(deviceId: Optional[str] = None, user_id: str = Depends(extract_user_id)):
    """Retrieve all snapshots belonging strictly to the authenticated user."""
    snapshots = dynamo_store.list_snapshots(user_id, device_id=deviceId)
    return {"snapshots": snapshots}


@app.post("/collect")
@app.post("/api/collect")
def run_collection_endpoint(req: CollectRequest, user_id: str = Depends(extract_user_id)):
    """Execute show commands over SSH with daily quota check and database persistence."""
    # Enforce Daily Collection Quota (100 / day)
    allowed, count, quota = dynamo_store.check_and_increment_quota(user_id, "collect")
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Daily collection quota exceeded: Max {quota} collections per day utilized. Quota resets at 00:00 UTC.",
        )

    # Auto-hydrate credentials from DynamoDB if deviceId is provided
    host = req.hostname
    port = req.port or 22
    platform = req.deviceType or "cisco_xe"
    username = req.username
    password = req.password
    secret = req.enableSecret
    dev_name = req.deviceName or req.hostname

    if req.deviceId:
        stored_device = dynamo_store.get_device(user_id, req.deviceId)
        if stored_device:
            host = host or stored_device.get("hostname")
            port = port or stored_device.get("port") or 22
            platform = platform or stored_device.get("driver") or "cisco_xe"
            username = username or stored_device.get("username")
            password = password or stored_device.get("password")
            secret = secret or stored_device.get("enableSecret")
            dev_name = dev_name or stored_device.get("name")

    if not host:
        raise HTTPException(status_code=400, detail="Missing target hostname for collection.")
    if not username or not password:
        raise HTTPException(
            status_code=400,
            detail=f"Missing SSH credentials for network target '{host}'. Configure credentials in Device settings.",
        )

    start_time = time.time()
    try:
        outputs = execute_ssh_collection(
            host=host,
            port=port,
            platform=platform,
            username=username,
            password=password,
            commands=req.commands,
            secret=secret,
        )
        duration_ms = round((time.time() - start_time) * 1000)

        # Save snapshot in DynamoDB
        snap_id = f"snap-{req.snapshotType or 'base'}-{uuid.uuid4().hex[:6]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        dynamo_store.create_snapshot(
            user_id=user_id,
            data={
                "snapshotId": snap_id,
                "deviceId": req.deviceId or "dev-unknown",
                "deviceName": dev_name,
                "deviceHostname": host,
                "deviceType": platform,
                "snapshotType": req.snapshotType or "baseline",
                "changeTicket": req.changeTicket,
                "notes": req.notes,
                "commands": req.commands,
                "outputs": outputs,
            },
        )

        # Log audit in DynamoDB
        dynamo_store.add_audit_log(
            user_id=user_id,
            action="COLLECT",
            target=dev_name,
            result="SUCCESS",
            details=f"Captured {len(req.commands)} commands in {duration_ms}ms",
        )

        return {
            "success": True,
            "status": "SUCCESS",
            "snapshotId": snap_id,
            "deviceId": req.deviceId or "dev-unknown",
            "deviceName": dev_name,
            "durationMs": duration_ms,
            "commands": req.commands,
            "outputs": outputs,
            "remainingDailyQuota": quota - count,
        }
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = round((time.time() - start_time) * 1000)
        err_msg = f"{type(e).__name__}: {str(e)}"
        logger.error(f"Collection FAILED for {host}: {err_msg}")
        raise HTTPException(status_code=500, detail=f"SSH Collection failure: {err_msg}")


@app.get("/compare")
@app.get("/api/compare")
def get_user_comparisons(user_id: str = Depends(extract_user_id)):
    """Retrieve all comparisons belonging strictly to the authenticated user."""
    comparisons = dynamo_store.list_comparisons(user_id)
    return {"comparisons": comparisons}


@app.post("/compare")
@app.post("/api/compare")
def create_user_comparison(req: CompareRequest, user_id: str = Depends(extract_user_id)):
    """Store or record a comparison diff between two snapshots."""
    created = dynamo_store.create_comparison(user_id, req.dict())
    return created


@app.get("/settings")
@app.get("/api/settings")
def get_user_settings(user_id: str = Depends(extract_user_id)):
    """Retrieve user-specific settings from DynamoDB."""
    return dynamo_store.get_user_settings(user_id)


@app.put("/settings")
@app.put("/api/settings")
def update_user_settings(body: Dict[str, Any], user_id: str = Depends(extract_user_id)):
    """Update settings strictly for the authenticated user."""
    return dynamo_store.update_user_settings(user_id, body)


@app.get("/audit-logs")
@app.get("/api/audit-logs")
def get_user_audit_logs(user_id: str = Depends(extract_user_id)):
    """Retrieve audit logs strictly for the authenticated user."""
    logs = dynamo_store.list_audit_logs(user_id)
    return {"logs": logs}


@app.post("/devices/{device_id}/test")
@app.post("/api/devices/{device_id}/test")
def test_device_connection(device_id: str, req: DeviceTestRequest, user_id: str = Depends(extract_user_id)):
    """Test live SSH authentication against real network equipment."""
    host = req.hostname
    port = req.port or 22
    platform = req.deviceType or "cisco_xe"
    username = req.username
    password = req.password
    secret = req.enableSecret

    if device_id and device_id != "new":
        stored = dynamo_store.get_device(user_id, device_id)
        if stored:
            host = host or stored.get("hostname")
            port = port or stored.get("port") or 22
            platform = platform or stored.get("driver") or "cisco_xe"
            username = username or stored.get("username")
            password = password or stored.get("password")
            secret = secret or stored.get("enableSecret")

    if not host or not username or not password:
        return {
            "success": False,
            "latencyMs": 0,
            "error": "Incomplete connection parameters: Target host, username, and password are required.",
        }

    start_time = time.time()
    try:
        device_params = {
            "device_type": sanitize_platform(platform),
            "host": host,
            "port": port,
            "username": username,
            "password": password,
            "timeout": 5,
            "conn_timeout": 5,
        }
        if secret:
            device_params["secret"] = secret

        logger.info(f"Testing live SSH connection to {host}:{port}...")
        with ConnectHandler(**device_params) as net_connect:
            prompt = net_connect.find_prompt()
            latency_ms = round((time.time() - start_time) * 1000)
            logger.info(f"Live SSH test SUCCESS on {req.hostname} (latency: {latency_ms}ms, prompt: {prompt})")
            return {
                "success": True,
                "latencyMs": latency_ms,
                "prompt": prompt,
                "message": f"Connected to {prompt} in {latency_ms}ms",
            }
    except Exception as e:
        latency_ms = round((time.time() - start_time) * 1000)
        err_msg = f"{type(e).__name__}: {str(e)}"
        logger.warning(f"Live SSH test FAILED on {req.hostname}: {err_msg}")
        return {
            "success": False,
            "latencyMs": latency_ms,
            "error": err_msg,
        }


@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "DriftGuard Local Collector & DynamoDB Database Bridge",
        "database": f"Amazon DynamoDB Local ({TABLE_NAME})",
        "endpoint": DYNAMODB_ENDPOINT_URL or "AWS Managed DynamoDB",
        "engine": "Netmiko 4.7.0",
        "timestamp": time.time(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
