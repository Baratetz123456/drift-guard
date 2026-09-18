"""
DriftGuard Local Collector Bridge.
Executes authentic Cisco show commands over SSH (Netmiko) and returns real device output to DriftGuard.
Listens on http://localhost:3000 to receive requests proxied from Vite or direct API calls.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from netmiko import ConnectHandler
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("driftguard.collector")

app = FastAPI(
    title="DriftGuard Local Collector Bridge",
    description="Real SSH collector bridge for Cisco network telemetry",
    version="1.0.0",
)

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


class DeviceTestRequest(BaseModel):
    hostname: str
    port: Optional[int] = 22
    deviceType: Optional[str] = "cisco_xe"
    username: str
    password: str
    enableSecret: Optional[str] = None


class CollectRequest(BaseModel):
    deviceId: Optional[str] = None
    deviceName: Optional[str] = None
    hostname: str
    port: Optional[int] = 22
    deviceType: Optional[str] = "cisco_xe"
    username: str
    password: str
    enableSecret: Optional[str] = None
    commands: List[str]
    snapshotType: Optional[str] = "baseline"
    changeTicket: Optional[str] = None


def sanitize_platform(device_type: Optional[str]) -> str:
    """Map frontend device types to valid Netmiko device types."""
    mapping = {
        "cisco_xe": "cisco_xe",
        "cisco_ios": "cisco_ios",
        "cisco_nxos": "cisco_nxos",
        "cisco_xr": "cisco_xr",
        "cisco_asa": "cisco_asa",
    }
    return mapping.get(device_type or "cisco_xe", "cisco_xe")


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
    """Execute real show commands via Netmiko with strict read-only enforcement."""
    # Verify zero mutating commands
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


@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "DriftGuard Local Collector Bridge",
        "engine": "Netmiko 4.7.0",
        "timestamp": time.time(),
    }


# Support both /devices/{id}/test (proxied) and /api/devices/{id}/test (direct)
@app.post("/devices/{device_id}/test")
@app.post("/api/devices/{device_id}/test")
def test_device_connection(device_id: str, req: DeviceTestRequest):
    """Test live SSH authentication against real network equipment."""
    start_time = time.time()
    try:
        device_params = {
            "device_type": sanitize_platform(req.deviceType),
            "host": req.hostname,
            "port": req.port or 22,
            "username": req.username,
            "password": req.password,
            "timeout": 20,
            "conn_timeout": 20,
        }
        if req.enableSecret:
            device_params["secret"] = req.enableSecret

        logger.info(f"Testing live SSH connection to {req.hostname}:{req.port or 22}...")
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


# Support both /collect (proxied) and /api/collect (direct)
@app.post("/collect")
@app.post("/api/collect")
def run_collection(req: CollectRequest):
    """Execute show commands over SSH against real device and return actual terminal output."""
    start_time = time.time()
    try:
        outputs = execute_ssh_collection(
            host=req.hostname,
            port=req.port or 22,
            platform=req.deviceType or "cisco_xe",
            username=req.username,
            password=req.password,
            commands=req.commands,
            secret=req.enableSecret,
        )
        duration_ms = round((time.time() - start_time) * 1000)
        logger.info(f"Successfully collected {len(outputs)} show commands in {duration_ms}ms from {req.hostname}")

        return {
            "status": "SUCCESS",
            "deviceId": req.deviceId or "dev-unknown",
            "deviceName": req.deviceName or req.hostname,
            "durationMs": duration_ms,
            "commands": req.commands,
            "outputs": outputs,
        }
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = round((time.time() - start_time) * 1000)
        err_msg = f"{type(e).__name__}: {str(e)}"
        logger.error(f"Collection FAILED for {req.hostname}: {err_msg}")
        raise HTTPException(
            status_code=500,
            detail=f"SSH Collection failure: {err_msg}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
