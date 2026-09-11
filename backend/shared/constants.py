"""
Constants and environment configuration for DeltaNet.
All environment-specific values are read from Lambda environment variables.
"""

import os

# DynamoDB
TABLE_NAME = os.environ.get("TABLE_NAME", "DeltaNet-dev")

# S3
BUCKET_NAME = os.environ.get("BUCKET_NAME", "deltanet-snapshots-dev")

# KMS
KMS_KEY_ID = os.environ.get("KMS_KEY_ID", "")

# Step Functions
STATE_MACHINE_ARN = os.environ.get("STATE_MACHINE_ARN", "")

# Environment
ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")

# DynamoDB Entity Prefixes
class EntityPrefix:
    USER = "USER#"
    DEVICE = "DEVICE#"
    COMMAND_SET = "CMDSET#"
    JOB = "JOB#"
    SNAPSHOT = "SNAP#"
    COMPARISON = "COMP#"
    ANALYSIS = "ANALYSIS#"
    AUDIT = "AUDIT#"
    SETTINGS = "SETTINGS"


# GSI Names
GSI1 = "GSI1"
GSI2 = "GSI2"

# GSI Key Prefixes
class GSIPrefix:
    DEVICES = "#DEVICES"
    JOBS = "#JOBS"
    SNAPS = "#SNAPS#"
    COMPS = "#COMPS"
    ANALYSES = "#ANALYSES"
    SEVERITY = "#SEV"


# S3 Key Prefixes
class S3Prefix:
    SNAPSHOTS = "snapshots/"
    DIFFS = "diffs/"


# Inline vs S3 threshold (bytes)
INLINE_THRESHOLD = 4096  # 4 KB

# Collection defaults
MAX_CONCURRENCY = 10
DEFAULT_SSH_TIMEOUT = 30
DEFAULT_COMMANDS = [
    "show running-config",
    "show ip interface brief",
    "show ip route",
    "show version",
]

# Command safety
BLOCKED_COMMAND_PATTERNS = [
    "configure",
    "conf t",
    "conf terminal",
    "no ",
    "enable",
    "reload",
    "write",
    "copy",
    "delete",
    "erase",
    "format",
    "squeeze",
    "clear",
    "debug",
    "undebug",
    "shutdown",
    "terminal length",
]

MAX_COMMANDS_PER_SET = 20

# Supported platforms
SUPPORTED_PLATFORMS = [
    "cisco_ios",
    "cisco_xe",
    "cisco_xr",
    "cisco_nxos",
    "cisco_asa",
    "arista_eos",
    "juniper_junos",
]

# AI Analysis
SEVERITY_LEVELS = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]
TOKEN_THRESHOLD_SINGLE = 8000
TOKEN_THRESHOLD_CHUNKED = 32000

# Audit log TTL (90 days in seconds)
AUDIT_TTL_DAYS = 90
