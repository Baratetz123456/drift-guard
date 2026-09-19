#!/usr/bin/env python3
"""
DriftGuard - Severity Impact Testing Scenarios Seeder
====================================================
Seeds local Amazon DynamoDB with realistic Cisco IOS-XE pre/post maintenance
snapshot pairs and deterministic CLI diffs across all five severity tiers:
  1. Critical      (95/100) — Core Default Route Loss, BGP Transit Drop, Crash Reload
  2. High          (80/100) — Redundant BGP Peer Loss, HSRP Gateway Role Flip, Uplink Down
  3. Medium        (50/100) — VLAN 40 Provisioning, Static Route with Next-Hop, OSPF Cost Metric Shift
  4. Low           (20/100) — Port Description Update, Secondary NTP Server Swap, MOTD Audit
  5. Informational (0/100)  — Monotonic Elapsed Uptime & Packet Counters (Layer 1 Pre-Filter Invariant)

This script is strictly non-invasive and does not modify any application source code.

Usage:
    python backend/scripts/seed_severity_scenarios.py
    python backend/scripts/seed_severity_scenarios.py --clean
    python backend/scripts/seed_severity_scenarios.py --endpoint http://localhost:8000
"""

from __future__ import annotations

import argparse
import difflib
import logging
import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

# Ensure backend/vendor is available for boto3 and dependencies
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_CURRENT_DIR)
_VENDOR_DIR = os.path.join(_BACKEND_DIR, "vendor")
if _VENDOR_DIR not in sys.path:
    sys.path.insert(0, _VENDOR_DIR)

import boto3
from boto3.dynamodb.conditions import Key

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("driftguard.seed_scenarios")

DEFAULT_ENDPOINT = "http://localhost:8000"
DEFAULT_REGION = "ap-southeast-1"
DEFAULT_TABLE = "DeltaNet-local"

GROUP_ID = "grp-severity-test-suite"
GROUP_NAME = "Severity Test Suite"

# =============================================================================
# SCENARIO CLI TELEMETRY DATA
# =============================================================================

SCENARIOS: List[Dict[str, Any]] = [
    # -------------------------------------------------------------------------
    # 1. CRITICAL SEVERITY (Target Risk Score: 95/100)
    # -------------------------------------------------------------------------
    {
        "severity": "Critical",
        "expectedScore": 95,
        "deviceId": "dev-sim-crit-rtr01",
        "deviceName": "sim-crit-rtr01.lab",
        "hostname": "198.51.100.254",
        "driver": "cisco_xe",
        "site": "Primary Core Datacenter",
        "changeTicket": "CHG-9001-CRIT",
        "description": "Core BGP Default Route Drop, Primary WAN Down & Crash Reload",
        "commands": {
            "show version": (
                # Pre-Change
                """Cisco IOS XE Software, Version 17.09.04a
Cisco c8000 Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version 17.9.4a
Technical Support: http://www.cisco.com/techsupport
Compiled Thu 23-Mar-23 04:12 by mcpre

sim-crit-rtr01 uptime is 42 weeks, 3 days, 14 hours, 22 minutes
Uptime for this control processor is 42 weeks, 3 days, 14 hours, 24 minutes
System returned to ROM by power-on
System image file is "bootflash:c8000-universalk9.17.09.04a.SPA.bin"
Last reload reason: Normal Reload""",
                # Post-Change: Uptime reset to 12 minutes (Crash Reload!)
                """Cisco IOS XE Software, Version 17.09.04a
Cisco c8000 Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version 17.9.4a
Technical Support: http://www.cisco.com/techsupport
Compiled Thu 23-Mar-23 04:12 by mcpre

sim-crit-rtr01 uptime is 12 minutes
Uptime for this control processor is 14 minutes
System returned to ROM by reload at 03:41:10 UTC Sat Sep 19 2026
System image file is "bootflash:c8000-universalk9.17.09.04a.SPA.bin"
Last reload reason: Critical Process kernel panic (Segmentation fault)""",
            ),
            "show ip route summary": (
                # Pre-Change
                """IP routing table name is default (0x0)
Route Source    Networks    Subnets     Replicates  Overhead    Memory (bytes)
connected       0           4           0           384         960
static          1           0           0           96          240
bgp 64512       1           849999      0           81600000    204000000
  External: 850000 Internal: 0 Local: 0
internal        84                                              97440
Total           2           850003      0           81600480    204098640

Gateway of last resort is 198.51.100.1 to network 0.0.0.0
B*    0.0.0.0/0 [20/0] via 198.51.100.1, 42w3d, GigabitEthernet0/0/0""",
                # Post-Change: Default route completely missing!
                """IP routing table name is default (0x0)
Route Source    Networks    Subnets     Replicates  Overhead    Memory (bytes)
connected       0           3           0           288         720
static          0           0           0           0           0
bgp 64512       0           0           0           0           0
  External: 0 Internal: 0 Local: 0
internal        12                                              13920
Total           0           3           0           288         14640

Gateway of last resort is not set""",
            ),
            "show ip bgp summary": (
                # Pre-Change
                """BGP router identifier 10.255.0.1, local AS number 64512
BGP table version is 14920412, main routing table version 14920412
850000 network entries using 204000000 bytes of memory
1 BGP neighbor entries using 2160 bytes of memory.

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
198.51.100.1    4        64512  941021  940982 14920412    0    0 42w3d         850000""",
                # Post-Change: BGP Peer down in Active state!
                """BGP router identifier 10.255.0.1, local AS number 64512
BGP table version is 1, main routing table version 1
0 network entries using 0 bytes of memory
1 BGP neighbor entries using 2160 bytes of memory.

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
198.51.100.1    4        64512      14      12        1    0    0 00:08:42 Active""",
            ),
            "show ip interface brief": (
                # Pre-Change
                """Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0/0   198.51.100.254  YES manual up                    up      
GigabitEthernet0/0/1   10.100.1.1      YES manual up                    up      
Loopback0              10.255.0.1      YES manual up                    up      """,
                # Post-Change: Uplink down/down
                """Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0/0   198.51.100.254  YES manual administratively down down    
GigabitEthernet0/0/1   10.100.1.1      YES manual up                    up      
Loopback0              10.255.0.1      YES manual up                    up      """,
            ),
        },
    },

    # -------------------------------------------------------------------------
    # 2. HIGH SEVERITY (Target Risk Score: 80/100)
    # -------------------------------------------------------------------------
    {
        "severity": "High",
        "expectedScore": 80,
        "deviceId": "dev-sim-high-sw01",
        "deviceName": "sim-high-sw01.lab",
        "hostname": "10.10.0.1",
        "driver": "cisco_xe",
        "site": "Regional Core Aggregation",
        "changeTicket": "CHG-9002-HIGH",
        "description": "Secondary BGP Peer Loss, HSRP Gateway Role Flip, Uplink Down",
        "commands": {
            "show ip bgp summary": (
                # Pre-Change
                """BGP router identifier 10.10.0.1, local AS number 65000
Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.10.1.1       4        65000   45102   45098   94210    0    0 18w2d          1420
203.0.113.5     4        64520   12040   12015   94210    0    0 04w1d         45000""",
                # Post-Change: Secondary transit peer lost (Connect state)
                """BGP router identifier 10.10.0.1, local AS number 65000
Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.10.1.1       4        65000   45120   45115   94210    0    0 18w2d          1420
203.0.113.5     4        64520   12040   12015       0    0    0 00:04:12 Connect""",
            ),
            "show standby brief": (
                # Pre-Change: Active HSRP Gateway
                """                     P indicates configured to preempt.
                     |
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Vlan10      10   110 P Active  local           10.10.10.3      10.10.10.1
Vlan20      20   110 P Active  local           10.10.20.3      10.10.20.1""",
                # Post-Change: HSRP Role Flipped to Standby
                """                     P indicates configured to preempt.
                     |
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Vlan10      10   110 P Standby 10.10.10.3      local           10.10.10.1
Vlan20      20   110 P Standby 10.10.20.3      local           10.10.20.1""",
            ),
            "show ip interface brief": (
                # Pre-Change
                """Interface              IP-Address      OK? Method Status                Protocol
TenGigabitEthernet1/0/1 10.10.1.1      YES manual up                    up      
TenGigabitEthernet1/0/2 203.0.113.6     YES manual up                    up      
Vlan10                 10.10.10.2      YES manual up                    up      
Vlan20                 10.10.20.2      YES manual up                    up      """,
                # Post-Change: Secondary trunk TenGigabitEthernet1/0/2 down/down
                """Interface              IP-Address      OK? Method Status                Protocol
TenGigabitEthernet1/0/1 10.10.1.1      YES manual up                    up      
TenGigabitEthernet1/0/2 203.0.113.6     YES manual down                  down    
Vlan10                 10.10.10.2      YES manual up                    up      
Vlan20                 10.10.20.2      YES manual up                    up      """,
            ),
        },
    },

    # -------------------------------------------------------------------------
    # 3. MEDIUM SEVERITY (Target Risk Score: 50/100)
    # -------------------------------------------------------------------------
    {
        "severity": "Medium",
        "expectedScore": 50,
        "deviceId": "dev-sim-med-dist01",
        "deviceName": "sim-med-dist01.lab",
        "hostname": "10.20.0.1",
        "driver": "cisco_xe",
        "site": "Campus Distribution Layer",
        "changeTicket": "CHG-9003-MED",
        "description": "VLAN 40 Provisioning, Static Route with Next-Hop, OSPF Cost Metric Shift",
        "commands": {
            "show vlan brief": (
                # Pre-Change
                """VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Gi1/0/1, Gi1/0/2
10   USERS-DATA                       active    Gi1/0/3, Gi1/0/4
20   VOICE-TRAFFIC                    active    Gi1/0/5, Gi1/0/6
30   SERVERS-MGMT                     active    Gi1/0/7, Gi1/0/8""",
                # Post-Change: VLAN 40 added
                """VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Gi1/0/1, Gi1/0/2
10   USERS-DATA                       active    Gi1/0/3, Gi1/0/4
20   VOICE-TRAFFIC                    active    Gi1/0/5, Gi1/0/6
30   SERVERS-MGMT                     active    Gi1/0/7, Gi1/0/8
40   LAB-TESTING-VLAN                 active    Gi1/0/9, Gi1/0/10""",
            ),
            "show ip route summary": (
                # Pre-Change
                """IP routing table name is default (0x0)
Route Source    Networks    Subnets     Replicates  Overhead    Memory (bytes)
connected       0           4           0           384         960
static          2           0           0           192         480
ospf 100        14          22          0           3456        8640
Total           16          26          0           4032        10080""",
                # Post-Change: Static route added for 10.250.0.0/16
                """IP routing table name is default (0x0)
Route Source    Networks    Subnets     Replicates  Overhead    Memory (bytes)
connected       0           5           0           480         1200
static          3           0           0           288         720
ospf 100        14          22          0           3456        8640
Total           17          27          0           4224        10560

S    10.250.0.0/16 [1/0] via 10.20.0.254, Vlan40""",
            ),
            "show ip interface brief": (
                # Pre-Change
                """Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet1/0/1   10.20.0.1       YES manual up                    up      
GigabitEthernet1/0/2   10.20.0.2       YES manual up                    up      
Vlan10                 10.20.10.1      YES manual up                    up      
Vlan20                 10.20.20.1      YES manual up                    up      """,
                # Post-Change: Vlan40 interface up
                """Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet1/0/1   10.20.0.1       YES manual up                    up      
GigabitEthernet1/0/2   10.20.0.2       YES manual up                    up      
Vlan10                 10.20.10.1      YES manual up                    up      
Vlan20                 10.20.20.1      YES manual up                    up      
Vlan40                 10.20.40.1      YES manual up                    up      """,
            ),
        },
    },

    # -------------------------------------------------------------------------
    # 4. LOW SEVERITY (Target Risk Score: 20/100)
    # -------------------------------------------------------------------------
    {
        "severity": "Low",
        "expectedScore": 20,
        "deviceId": "dev-sim-low-acc01",
        "deviceName": "sim-low-acc01.lab",
        "hostname": "10.30.0.1",
        "driver": "cisco_xe",
        "site": "Campus Access Floor 2",
        "changeTicket": "CHG-9004-LOW",
        "description": "Port Description Update, Secondary NTP Server Swap, MOTD Audit",
        "commands": {
            "show interfaces status": (
                # Pre-Change
                """Port      Name               Status       Vlan       Duplex  Speed Type
Gi1/0/1   UPLINK-DIST01      connected    trunk      a-full a-1000 1000BaseTX
Gi1/0/11  OFFICE-PC-201      connected    10         a-full   a-100 1000BaseTX
Gi1/0/12  PRINTER-FLOOR-2    connected    10         a-full   a-100 1000BaseTX
Gi1/0/13  AP-CORRIDOR-2      connected    30         a-full a-1000 1000BaseTX""",
                # Post-Change: Port 12 description changed
                """Port      Name               Status       Vlan       Duplex  Speed Type
Gi1/0/1   UPLINK-DIST01      connected    trunk      a-full a-1000 1000BaseTX
Gi1/0/11  OFFICE-PC-201      connected    10         a-full   a-100 1000BaseTX
Gi1/0/12  PRINTER-KYOCERA-F2 connected    10         a-full   a-100 1000BaseTX
Gi1/0/13  AP-CORRIDOR-2      connected    30         a-full a-1000 1000BaseTX""",
            ),
            "show ntp status": (
                # Pre-Change
                """Clock is synchronized, stratum 2, reference is 192.168.1.50
nominal freq is 250.0000 Hz, actual freq is 250.0001 Hz, precision is 2**18
ntp server 192.168.1.50 prefer
ntp server 192.168.1.51""",
                # Post-Change: Secondary NTP server swapped to .55
                """Clock is synchronized, stratum 2, reference is 192.168.1.50
nominal freq is 250.0000 Hz, actual freq is 250.0001 Hz, precision is 2**18
ntp server 192.168.1.50 prefer
ntp server 192.168.1.55""",
            ),
            "show banner motd": (
                # Pre-Change
                """****************************************************************
* UNCLASSIFIED // AUTHORIZED ACCESS ONLY - LAB POD A            *
****************************************************************""",
                # Post-Change: Audit tag updated
                """****************************************************************
* UNCLASSIFIED // AUTHORIZED ACCESS ONLY - LAB POD A (REV 2026) *
****************************************************************""",
            ),
        },
    },

    # -------------------------------------------------------------------------
    # 5. INFORMATIONAL SEVERITY (Target Risk Score: 0/100)
    # -------------------------------------------------------------------------
    {
        "severity": "Informational",
        "expectedScore": 0,
        "deviceId": "dev-sim-info-core01",
        "deviceName": "sim-info-core01.lab",
        "hostname": "10.0.0.1",
        "driver": "cisco_xe",
        "site": "Enterprise Core Backbone",
        "changeTicket": "CHG-9005-INFO",
        "description": "Monotonic Elapsed Uptime & Packet Counters (Layer 1 Pre-Filter Invariant)",
        "commands": {
            "show version": (
                # Pre-Change
                """Cisco IOS XE Software, Version 17.09.04a
sim-info-core01 uptime is 18 weeks, 2 days, 4 hours, 10 minutes
Uptime for this control processor is 18 weeks, 2 days, 4 hours, 12 minutes
System image file is "bootflash:c8000-universalk9.17.09.04a.SPA.bin"
cisco C8300-1N1S-6T (1RU) processor with 3591410K/6147K bytes of memory.""",
                # Post-Change: Monotonic uptime elapsed (15 minutes forward)
                """Cisco IOS XE Software, Version 17.09.04a
sim-info-core01 uptime is 18 weeks, 2 days, 4 hours, 25 minutes
Uptime for this control processor is 18 weeks, 2 days, 4 hours, 27 minutes
System image file is "bootflash:c8000-universalk9.17.09.04a.SPA.bin"
cisco C8300-1N1S-6T (1RU) processor with 3591410K/6147K bytes of memory.""",
            ),
            "show interfaces status": (
                # Pre-Change
                """Port      Name               Status       Vlan       Duplex  Speed Type
Gi0/0/0   CORE-TRUNK-01      connected    trunk      a-full a-1000 1000BaseTX
Gi0/0/1   CORE-TRUNK-02      connected    trunk      a-full a-1000 1000BaseTX
Loopback0 ROUTER-ID          connected    routed     full   1000   N/A""",
                # Post-Change: Identical
                """Port      Name               Status       Vlan       Duplex  Speed Type
Gi0/0/0   CORE-TRUNK-01      connected    trunk      a-full a-1000 1000BaseTX
Gi0/0/1   CORE-TRUNK-02      connected    trunk      a-full a-1000 1000BaseTX
Loopback0 ROUTER-ID          connected    routed     full   1000   N/A""",
            ),
            "show ip route summary": (
                # Pre-Change
                """IP routing table name is default (0x0)
Route Source    Networks    Subnets     Replicates  Overhead    Memory (bytes)
connected       0           3           0           288         720
static          1           0           0           96          240
ospf 1          48          120         0           16128       40320
bgp 65000       1           1250        0           120096      300240
Total           50          1373        0           136608      341520""",
                # Post-Change: Identical
                """IP routing table name is default (0x0)
Route Source    Networks    Subnets     Replicates  Overhead    Memory (bytes)
connected       0           3           0           288         720
static          1           0           0           96          240
ospf 1          48          120         0           16128       40320
bgp 65000       1           1250        0           120096      300240
Total           50          1373        0           136608      341520""",
            ),
        },
    },
]


def generate_diff(pre: str, post: str, command: str) -> Dict[str, Any]:
    """Generate a clean unified diff and stats for pre/post CLI outputs."""
    pre_lines = [l for l in pre.splitlines(keepends=True)]
    post_lines = [l for l in post.splitlines(keepends=True)]

    diff_gen = difflib.unified_diff(
        pre_lines,
        post_lines,
        fromfile=f"pre/{command}",
        tofile=f"post/{command}",
        lineterm="",
    )
    diff_text = "\n".join(diff_gen)

    additions = 0
    deletions = 0
    for line in diff_text.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            additions += 1
        elif line.startswith("-") and not line.startswith("---"):
            deletions += 1

    has_diff = (additions > 0 or deletions > 0)
    return {
        "command": command,
        "hasDiff": has_diff,
        "additions": additions,
        "deletions": deletions,
        "unifiedDiff": diff_text if has_diff else "",
        "preOutput": pre,
        "postOutput": post,
    }


def seed_scenarios(endpoint: str, clean_first: bool = False, user_id: str = "user_default") -> None:
    """Seed test devices, snapshots, and comparisons into local DynamoDB."""
    logger.info(f"Connecting to DynamoDB at {endpoint}...")
    dynamodb = boto3.resource(
        "dynamodb",
        endpoint_url=endpoint,
        region_name=DEFAULT_REGION,
        aws_access_key_id="test",
        aws_secret_access_key="test",
    )

    table = dynamodb.Table(DEFAULT_TABLE)
    try:
        table.load()
    except Exception as e:
        logger.error(f"Failed to access table '{DEFAULT_TABLE}' at {endpoint}: {e}")
        logger.error("Ensure DynamoDB local is running (`npm run docker:up` or docker-compose up).")
        sys.exit(1)

    now_iso = datetime.now(timezone.utc).isoformat()

    # Discover all target user accounts to seed (e.g. user_default and any signed-up operators)
    target_users = {user_id}
    try:
        resp = table.scan(
            ProjectionExpression="PK, SK, userId, email",
            Limit=100,
        )
        for item in resp.get("Items", []):
            u = item.get("userId")
            if u:
                target_users.add(u)
    except Exception as e:
        logger.warning(f"Could not scan existing users, defaulting to {user_id}: {e}")

    logger.info(f"Target users for scenario deployment: {list(target_users)}")

    for uid in target_users:
        logger.info(f"\n=======================================================")
        logger.info(f"Deploying Severity Test Suite for user: {uid}")
        logger.info(f"=======================================================")

        pk = f"USER#{uid}"

        if clean_first:
            logger.info(f"Cleaning previous Severity Test Suite entities for {uid}...")
            # Delete device group
            table.delete_item(Key={"PK": pk, "SK": f"GROUP#{GROUP_ID}"})

            # Delete devices, snapshots, comparisons
            for sc in SCENARIOS:
                dev_id = sc["deviceId"]
                table.delete_item(Key={"PK": pk, "SK": f"DEVICE#{dev_id}"})

                # Query and delete snapshots for this device
                snaps = table.query(
                    KeyConditionExpression=Key("PK").eq(pk) & Key("SK").begins_with("SNAP#")
                ).get("Items", [])
                for s in snaps:
                    if s.get("deviceId") == dev_id:
                        table.delete_item(Key={"PK": pk, "SK": s["SK"]})

                # Query and delete comparisons for this device
                comps = table.query(
                    KeyConditionExpression=Key("PK").eq(pk) & Key("SK").begins_with("COMP#")
                ).get("Items", [])
                for c in comps:
                    if c.get("deviceId") == dev_id:
                        table.delete_item(Key={"PK": pk, "SK": c["SK"]})

            logger.info("Clean completed.")

        # 1. Register Device Group: "Severity Test Suite"
        device_ids = [sc["deviceId"] for sc in SCENARIOS]
        group_item = {
            "PK": pk,
            "SK": f"GROUP#{GROUP_ID}",
            "GSI1PK": f"{pk}#GROUPS",
            "GSI1SK": now_iso,
            "groupId": GROUP_ID,
            "userId": uid,
            "name": GROUP_NAME,
            "description": "Deterministic change verification test suite representing all 5 severity levels.",
            "deviceIds": device_ids,
            "createdAt": now_iso,
            "updatedAt": now_iso,
        }
        table.put_item(Item=group_item)
        logger.info(f"[GROUP] Created '{GROUP_NAME}' ({GROUP_ID}) with {len(device_ids)} devices.")

        # 2. Deploy Scenarios (Devices, Snapshots, and Comparisons)
        for sc in SCENARIOS:
            dev_id = sc["deviceId"]
            dev_name = sc["deviceName"]
            sev = sc["severity"]
            score = sc["expectedScore"]
            ticket = sc["changeTicket"]

            logger.info(f"\n--- Provisioning Tier: [{sev.upper()}] ({score}/100) on {dev_name} ---")

            # 2a. Device Entity
            dev_item = {
                "PK": pk,
                "SK": f"DEVICE#{dev_id}",
                "GSI1PK": pk,
                "GSI1SK": "#DEVICES",
                "deviceId": dev_id,
                "userId": uid,
                "name": dev_name,
                "hostname": sc["hostname"],
                "deviceType": sc["driver"],
                "site": sc["site"],
                "role": "Edge/Core Test Node",
                "status": "online",
                "credentialRef": "vault:simulated",
                "createdAt": now_iso,
                "updatedAt": now_iso,
            }
            table.put_item(Item=dev_item)
            logger.info(f"  [DEVICE] {dev_name} ({dev_id}) registered.")

            # 2b. Pre-Change Snapshot (Baseline)
            pre_snap_id = f"snap-base-{sev.lower()}-{uuid.uuid4().hex[:6]}"
            pre_outputs = {cmd: pair[0] for cmd, pair in sc["commands"].items()}
            pre_snap_item = {
                "PK": pk,
                "SK": f"SNAP#{pre_snap_id}",
                "GSI1PK": f"{pk}#DEVICE#{dev_id}#SNAPSHOTS",
                "GSI1SK": now_iso,
                "snapshotId": pre_snap_id,
                "userId": uid,
                "deviceId": dev_id,
                "deviceName": dev_name,
                "deviceHostname": sc["hostname"],
                "deviceType": sc["driver"],
                "snapshotType": "baseline",
                "changeTicket": ticket,
                "notes": f"Pre-maintenance baseline capture for {dev_name} ({sev} test scenario)",
                "commands": list(sc["commands"].keys()),
                "outputs": pre_outputs,
                "createdAt": now_iso,
            }
            table.put_item(Item=pre_snap_item)
            logger.info(f"  [SNAPSHOT PRE]  {pre_snap_id} (baseline) created.")

            # 2c. Post-Change Snapshot (Verification)
            post_snap_id = f"snap-verify-{sev.lower()}-{uuid.uuid4().hex[:6]}"
            post_outputs = {cmd: pair[1] for cmd, pair in sc["commands"].items()}
            post_snap_item = {
                "PK": pk,
                "SK": f"SNAP#{post_snap_id}",
                "GSI1PK": f"{pk}#DEVICE#{dev_id}#SNAPSHOTS",
                "GSI1SK": now_iso,
                "snapshotId": post_snap_id,
                "userId": uid,
                "deviceId": dev_id,
                "deviceName": dev_name,
                "deviceHostname": sc["hostname"],
                "deviceType": sc["driver"],
                "snapshotType": "post_change",
                "changeTicket": ticket,
                "notes": f"Post-maintenance verification capture for {dev_name} ({sev} test scenario)",
                "commands": list(sc["commands"].keys()),
                "outputs": post_outputs,
                "createdAt": now_iso,
            }
            table.put_item(Item=post_snap_item)
            logger.info(f"  [SNAPSHOT POST] {post_snap_id} (verification) created.")

            # 2d. Pre-compute unified command diffs
            cmd_diffs: Dict[str, Any] = {}
            total_add = 0
            total_del = 0
            changed_cmds = 0
            identical_cmds = 0

            for cmd, (pre_txt, post_txt) in sc["commands"].items():
                d_res = generate_diff(pre_txt, post_txt, cmd)
                cmd_diffs[cmd] = d_res
                if d_res["hasDiff"]:
                    changed_cmds += 1
                    total_add += d_res["additions"]
                    total_del += d_res["deletions"]
                else:
                    identical_cmds += 1

            # 2e. Comparison Diff Entity
            cmp_id = f"cmp-{sev.lower()}-{uuid.uuid4().hex[:6]}"
            cmp_item = {
                "PK": pk,
                "SK": f"COMP#{cmp_id}",
                "GSI1PK": f"{pk}#COMPARISONS",
                "GSI1SK": now_iso,
                "comparisonId": cmp_id,
                "userId": uid,
                "deviceId": dev_id,
                "deviceName": dev_name,
                "preSnapshotId": pre_snap_id,
                "postSnapshotId": post_snap_id,
                "preTimestamp": now_iso,
                "postTimestamp": now_iso,
                "changeLabel": f"[{sev.upper()}] {sc['description']}",
                "diffSummary": {
                    "totalCommands": len(sc["commands"]),
                    "changedCommands": changed_cmds,
                    "identicalCommands": identical_cmds,
                    "totalAdditions": total_add,
                    "totalDeletions": total_del,
                },
                "commandDiffs": cmd_diffs,
                "createdAt": now_iso,
            }
            table.put_item(Item=cmp_item)
            logger.info(
                f"  [COMPARISON]    {cmp_id} created "
                f"(+{total_add}/-{total_del} lines in {changed_cmds} commands)."
            )

            # 2f. Pre-seeded AI Analysis Entity (Guarantees immediate offline inspection)
            ana_id = f"ana-{sev.lower()}-{uuid.uuid4().hex[:6]}"
            
            # Scenario-calibrated diagnostic findings
            findings_data = []
            suggested_rollback = None
            if sev == "Critical":
                summary_text = f"AI analysis suggests catastrophic routing blackhole and unplanned kernel reload detected on {dev_name}. Verify against raw output before approval."
                impact_text = "Core default route 0.0.0.0/0 was withdrawn from the local RIB and external BGP peer 198.51.100.1 transitioned to Active state. Combined with a device crash reload (uptime reset to 12 minutes), all campus outbound internet and cloud forwarding is entirely blackholed."
                findings_data = [
                    {
                        "title": "Core Default Route 0.0.0.0/0 Dropped",
                        "category": "ROUTING",
                        "severity": "Critical",
                        "description": "Default route 0.0.0.0/0 via transit gateway 198.51.100.1 has been completely removed from the routing table.",
                        "potentialImpact": "Immediate loss of outbound WAN and Internet reachability for all campus subnets.",
                        "recommendation": "Inspect BGP neighbor 198.51.100.1 peering and restore static/BGP default route advertisement.",
                        "evidence": [{"command": "show ip route summary", "excerpt": "-B*    0.0.0.0/0 [20/0] via 198.51.100.1, 42w3d, GigabitEthernet0/0/0"}],
                    },
                    {
                        "title": "BGP Transit Peer Down in Active State",
                        "category": "ROUTING",
                        "severity": "Critical",
                        "description": "External BGP peer 198.51.100.1 (AS 64512) transitioned from Established (850,000 routes) to Active state (0 routes).",
                        "potentialImpact": "Complete loss of full internet routing table.",
                        "recommendation": "Check physical interface status and verify BGP session timers.",
                        "evidence": [{"command": "show ip bgp summary", "excerpt": "+198.51.100.1    4        64512      14      12        1    0    0 00:08:42 Active"}],
                    },
                    {
                        "title": "Unplanned System Reload (Kernel Panic)",
                        "category": "SYSTEM",
                        "severity": "Critical",
                        "description": "Device uptime reset to 12 minutes with reload cause 'Critical Process kernel panic'.",
                        "potentialImpact": "Complete forwarding plane reset during maintenance window.",
                        "recommendation": "Extract crashinfo from bootflash and open Cisco TAC case.",
                        "evidence": [{"command": "show version", "excerpt": "+sim-crit-rtr01 uptime is 12 minutes"}],
                    },
                ]
                suggested_rollback = "1. Verify console reachability on sim-crit-rtr01.lab.\n2. Bring up GigabitEthernet0/0/0 with 'no shutdown'.\n3. Validate BGP neighbor 198.51.100.1 session establishment.\n4. Confirm default route presence with 'show ip route 0.0.0.0'."
            elif sev == "High":
                summary_text = f"AI analysis suggests secondary BGP transit failure and unplanned HSRP gateway role flip on {dev_name}. Verify against raw output before approval."
                impact_text = "Secondary ISP peering (AS 64520) dropped to Connect state, eliminating BGP transit redundancy. Concurrently, HSRP VIP 10.10.10.1 and 10.10.20.1 transitioned from Active to Standby, forcing campus traffic onto the secondary core switch."
                findings_data = [
                    {
                        "title": "Secondary BGP Peer Down (Connect State)",
                        "category": "ROUTING",
                        "severity": "High",
                        "description": "BGP neighbor 203.0.113.5 transitioned from Established (45,000 prefixes) to Connect state.",
                        "potentialImpact": "Loss of ISP transit path redundancy; single point of failure on primary transit.",
                        "recommendation": "Verify IP reachability and BGP authentication with secondary provider.",
                        "evidence": [{"command": "show ip bgp summary", "excerpt": "+203.0.113.5     4        64520   12040   12015       0    0    0 00:04:12 Connect"}],
                    },
                    {
                        "title": "HSRP Gateway Role Flipped to Standby",
                        "category": "SYSTEM",
                        "severity": "High",
                        "description": "HSRP gateway priority degraded, causing role change from Active to Standby for Vlan10 and Vlan20.",
                        "potentialImpact": "Asymmetric routing and suboptimal traffic path through secondary chassis.",
                        "recommendation": "Inspect interface tracking and restore HSRP priority to 110.",
                        "evidence": [{"command": "show standby brief", "excerpt": "+Vlan10      10   110 P Standby 10.10.10.3      local           10.10.10.1"}],
                    },
                ]
                suggested_rollback = "1. Troubleshoot TenGigabitEthernet1/0/2 physical transceiver.\n2. Re-establish BGP neighbor 203.0.113.5.\n3. Verify HSRP preemption state with 'show standby brief'."
            elif sev == "Medium":
                summary_text = f"AI analysis suggests contained VLAN provisioning and static route addition on {dev_name}. Verify against raw output before approval."
                impact_text = "New lab VLAN 40 added to VLAN database with reachable next-hop 10.20.0.254. Traffic engineering shift on secondary OSPF link is contained with no core path disruption."
                findings_data = [
                    {
                        "title": "Static Route Added for Lab Subnet",
                        "category": "ROUTING",
                        "severity": "Medium",
                        "description": "New static route 10.250.0.0/16 via 10.20.0.254 added to routing table.",
                        "potentialImpact": "Routing table expansion with reachable next-hop in Vlan40.",
                        "recommendation": "Confirm next-hop ping reachability and redistribution policy.",
                        "evidence": [{"command": "show ip route summary", "excerpt": "+S    10.250.0.0/16 [1/0] via 10.20.0.254, Vlan40"}],
                    },
                    {
                        "title": "VLAN 40 Provisioned in Database",
                        "category": "SYSTEM",
                        "severity": "Medium",
                        "description": "VLAN 40 (LAB-TESTING-VLAN) created on switchports Gi1/0/9 and Gi1/0/10.",
                        "potentialImpact": "Broadcast domain provisioned for isolated testing.",
                        "recommendation": "Validate trunk allowance on distribution uplinks.",
                        "evidence": [{"command": "show vlan brief", "excerpt": "+40   LAB-TESTING-VLAN                 active    Gi1/0/9, Gi1/0/10"}],
                    },
                ]
                suggested_rollback = "1. Remove static route with 'no ip route 10.250.0.0 255.255.0.0 10.20.0.254'.\n2. Decommission VLAN 40 with 'no vlan 40'."
            elif sev == "Low":
                summary_text = f"AI analysis suggests minor administrative port description and NTP configuration updates on {dev_name}. Verify against raw output before approval."
                impact_text = "Access port description on Gi1/0/12 updated to reflect printer replacement. Secondary NTP server updated to 192.168.1.55. Zero forwarding or forwarding state impact."
                findings_data = [
                    {
                        "title": "Access Port Description Updated",
                        "category": "INTERFACE",
                        "severity": "Low",
                        "description": "Interface GigabitEthernet1/0/12 description updated to PRINTER-KYOCERA-F2.",
                        "potentialImpact": "Cosmetic naming change only; zero forwarding impact.",
                        "recommendation": "Verify port operational speed and duplex remain unchanged.",
                        "evidence": [{"command": "show interfaces status", "excerpt": "+Gi1/0/12  PRINTER-KYOCERA-F2 connected    10         a-full   a-100 1000BaseTX"}],
                    },
                    {
                        "title": "Secondary NTP Server Address Swapped",
                        "category": "SYSTEM",
                        "severity": "Low",
                        "description": "NTP peer 192.168.1.51 replaced with 192.168.1.55.",
                        "potentialImpact": "Minor time synchronization peer adjustment.",
                        "recommendation": "Verify NTP synchronization status with 'show ntp associations'.",
                        "evidence": [{"command": "show ntp status", "excerpt": "+ntp server 192.168.1.55"}],
                    },
                ]
                suggested_rollback = "1. Restore previous port description: 'interface Gi1/0/12' -> 'description PRINTER-FLOOR-2'.\n2. Revert NTP peer to 192.168.1.51."
            else: # Informational
                summary_text = "AI analysis suggests no functional configuration changes detected. Verify against raw output before approval."
                impact_text = "All command outputs are congruent with baseline. Volatile counter drift and 15-minute monotonic uptime advance screened as expected operational noise."
                findings_data = []
                suggested_rollback = None

            ana_item = {
                "PK": pk,
                "SK": f"ANALYSIS#{ana_id}",
                "GSI1PK": f"{pk}#ANALYSES",
                "GSI1SK": now_iso,
                "GSI2PK": f"COMP#{cmp_id}",
                "GSI2SK": f"ANALYSIS#{now_iso}",
                "analysisId": ana_id,
                "comparisonId": cmp_id,
                "userId": uid,
                "deviceId": dev_id,
                "overallRisk": sev,
                "riskScore": score,
                "summary": summary_text,
                "impactAnalysis": impact_text,
                "findings": findings_data,
                "conflictsDetected": [],
                "recommendations": [f["recommendation"] for f in findings_data] if findings_data else ["Safe to approve: configuration and state congruent with baseline."],
                "commandBreakdown": [
                    {
                        "command": cmd,
                        "changeType": "modified" if diff["hasDiff"] else "no-change",
                        "details": f"+{diff['additions']}/-{diff['deletions']} lines" if diff["hasDiff"] else "No changes detected",
                    }
                    for cmd, diff in cmd_diffs.items()
                ],
                "suggestedRollbackPlan": suggested_rollback,
                "modelUsed": "DriftGuard AI Model",
                "tokenUsage": {
                    "promptTokens": 1150 if score > 0 else 0,
                    "completionTokens": 520 if score > 0 else 0,
                    "totalTokens": 1670 if score > 0 else 0,
                },
                "createdAt": now_iso,
            }
            table.put_item(Item=ana_item)
            logger.info(f"  [AI ANALYSIS]   {ana_id} ({sev}, score: {score}/100) recorded.")

    # 3. Export browser localStorage loader fixture to frontend/public/seed_analyses.json
    export_browser_fixture(table)

    logger.info("\n=======================================================")
    logger.info("SEVERITY IMPACT TEST SUITE & AI ANALYSES READY!")
    logger.info("=======================================================")
    logger.info("All 5 severity tiers are available in the DriftGuard Web UI:")
    logger.info("1. Open http://localhost:5173 in your browser.")
    logger.info("2. Paste this single command into DevTools Console (F12) to populate AI Reports:")
    logger.info("   fetch('/seed_analyses.json').then(r=>r.json()).then(d=>{for(const[k,v]of Object.entries(d)){localStorage.setItem(k,JSON.stringify(v));}location.reload();});")
    logger.info("3. Now open 'Analysis' -> 'Comparisons' or 'AI Analysis' to inspect all 5 reports:")
    logger.info("   - Critical:      Core default route removed & reload (Score: 95/100, Red)")
    logger.info("   - High:          Secondary BGP peer lost & HSRP flip (Score: 80/100, Orange)")
    logger.info("   - Medium:        VLAN 40 added & OSPF cost adjusted  (Score: 50/100, Amber)")
    logger.info("   - Low:           Port description & NTP server swap  (Score: 20/100, Blue)")
    logger.info("   - Informational: Elapsed uptime & counters only      (Score: 0/100, Voltage Safe)")


def export_browser_fixture(table) -> None:
    """Export complete comparisons and AI analyses into frontend/public/seed_analyses.json."""
    import json
    public_dir = os.path.join(_BACKEND_DIR, "..", "frontend", "public")
    if not os.path.isdir(public_dir):
        return

    fixture_path = os.path.join(public_dir, "seed_analyses.json")
    try:
        # Scan comparisons and analyses
        scan_res = table.scan(Limit=500).get("Items", [])
        
        user_analyses: Dict[str, List[Any]] = {}
        user_comparisons: Dict[str, List[Any]] = {}

        for item in scan_res:
            sk = item.get("SK", "")
            uid = item.get("userId")
            if not uid:
                continue

            if sk.startswith("ANALYSIS#"):
                user_analyses.setdefault(uid, []).append(item)
            elif sk.startswith("COMP#"):
                user_comparisons.setdefault(uid, []).append(item)

        export_map: Dict[str, Any] = {}
        for uid, ana_list in user_analyses.items():
            export_map[f"driftguard_{uid}_analyses"] = ana_list
            export_map["driftguard_analyses"] = ana_list

        for uid, comp_list in user_comparisons.items():
            export_map[f"driftguard_{uid}_comparisons"] = comp_list

        with open(fixture_path, "w", encoding="utf-8") as f:
            json.dump(export_map, f, indent=2, default=str)
        logger.info(f"[FIXTURE] Exported browser localStorage fixture to {fixture_path}")
    except Exception as e:
        logger.warning(f"Could not export browser fixture: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Seed DriftGuard local DynamoDB with severity testing scenarios."
    )
    parser.add_argument(
        "--endpoint",
        default=DEFAULT_ENDPOINT,
        help=f"DynamoDB endpoint URL (default: {DEFAULT_ENDPOINT})",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Wipe previous Severity Test Suite entities before re-seeding",
    )
    parser.add_argument(
        "--user-id",
        default="user_default",
        help="Primary user ID to seed (default: user_default)",
    )
    args = parser.parse_args()

    seed_scenarios(endpoint=args.endpoint, clean_first=args.clean, user_id=args.user_id)


if __name__ == "__main__":
    main()

