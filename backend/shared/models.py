"""
Pydantic models for all DeltaNet entities.
Used for input validation, serialization, and DynamoDB item construction.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


# ============================================================
# Enums
# ============================================================

class Platform(str, Enum):
    CISCO_IOS = "cisco_ios"
    CISCO_XE = "cisco_xe"
    CISCO_XR = "cisco_xr"
    CISCO_NXOS = "cisco_nxos"
    CISCO_ASA = "cisco_asa"
    ARISTA_EOS = "arista_eos"
    JUNIPER_JUNOS = "juniper_junos"


class CollectionLabel(str, Enum):
    PRE_CHANGE = "pre-change"
    POST_CHANGE = "post-change"


class JobStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class DeviceCollectionStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFORMATIONAL = "INFORMATIONAL"


class AnalysisStrategy(str, Enum):
    SINGLE_PASS = "single-pass"
    PER_COMMAND = "per-command"
    CHUNKED = "chunked"


# ============================================================
# Helper
# ============================================================

def generate_id(prefix: str = "") -> str:
    """Generate a short unique ID with optional prefix."""
    short_id = uuid.uuid4().hex[:12]
    return f"{prefix}{short_id}" if prefix else short_id


def utc_now() -> str:
    """Return current UTC timestamp as ISO 8601 string."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ============================================================
# Request Models (input validation)
# ============================================================

class CreateDeviceRequest(BaseModel):
    deviceName: str = Field(..., min_length=1, max_length=100)
    managementIp: str = Field(..., min_length=7, max_length=253)
    sshPort: int = Field(default=22, ge=1, le=65535)
    platform: Platform
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)
    enableSecret: Optional[str] = Field(default=None, max_length=200)
    timeoutSeconds: int = Field(default=30, ge=5, le=120)
    tags: list[str] = Field(default_factory=list, max_length=20)
    commandSetId: Optional[str] = None

    @field_validator("managementIp")
    @classmethod
    def validate_ip(cls, v: str) -> str:
        import ipaddress
        try:
            ipaddress.ip_address(v)
        except ValueError:
            # Could also be a hostname
            if not all(c.isalnum() or c in ".-_" for c in v):
                raise ValueError("Invalid IP address or hostname")
        return v

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str]) -> list[str]:
        return [tag.strip().lower() for tag in v if tag.strip()]


class UpdateDeviceRequest(BaseModel):
    deviceName: Optional[str] = Field(default=None, min_length=1, max_length=100)
    managementIp: Optional[str] = Field(default=None, min_length=7, max_length=253)
    sshPort: Optional[int] = Field(default=None, ge=1, le=65535)
    platform: Optional[Platform] = None
    username: Optional[str] = Field(default=None, min_length=1, max_length=100)
    password: Optional[str] = Field(default=None, min_length=1, max_length=200)
    enableSecret: Optional[str] = Field(default=None, max_length=200)
    timeoutSeconds: Optional[int] = Field(default=None, ge=5, le=120)
    tags: Optional[list[str]] = None
    commandSetId: Optional[str] = None


class CreateCommandSetRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    commands: list[str] = Field(..., min_length=1, max_length=20)
    isDefault: bool = False

    @field_validator("commands")
    @classmethod
    def validate_commands(cls, v: list[str]) -> list[str]:
        from shared.validators import validate_commands
        return validate_commands(v)


class UpdateCommandSetRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    commands: Optional[list[str]] = Field(default=None, min_length=1, max_length=20)
    isDefault: Optional[bool] = None

    @field_validator("commands")
    @classmethod
    def validate_commands(cls, v: list[str] | None) -> list[str] | None:
        if v is not None:
            from shared.validators import validate_commands
            return validate_commands(v)
        return v


class UpdateSettingsRequest(BaseModel):
    openaiApiKey: Optional[str] = None
    openaiModel: Optional[str] = Field(default=None, pattern=r"^gpt-")
    openaiMaxTokens: Optional[int] = Field(default=None, ge=256, le=128000)
    defaultCommandSetId: Optional[str] = None


class CreateCollectionRequest(BaseModel):
    deviceIds: list[str] = Field(..., min_length=1, max_length=50)
    label: CollectionLabel
    changeLabel: Optional[str] = Field(default=None, max_length=200)


class CreateComparisonRequest(BaseModel):
    preSnapshotSK: str = Field(..., min_length=1)
    postSnapshotSK: str = Field(..., min_length=1)


# ============================================================
# Response / Entity Models
# ============================================================

class DeviceResponse(BaseModel):
    deviceId: str
    deviceName: str
    managementIp: str
    sshPort: int
    platform: str
    timeoutSeconds: int
    tags: list[str]
    commandSetId: Optional[str] = None
    createdAt: str
    updatedAt: str

    # NOTE: credentials are NEVER included in responses


class CommandSetResponse(BaseModel):
    setId: str
    name: str
    commands: list[str]
    isDefault: bool
    createdAt: str
    updatedAt: str


class UserSettingsResponse(BaseModel):
    hasApiKey: bool
    openaiModel: str = "gpt-4o"
    openaiMaxTokens: int = 4096
    defaultCommandSetId: Optional[str] = None
    createdAt: str
    updatedAt: str


class DeviceResult(BaseModel):
    deviceId: str
    status: DeviceCollectionStatus
    snapshotId: Optional[str] = None
    error: Optional[str] = None
    durationMs: Optional[int] = None


class CollectionJobResponse(BaseModel):
    jobId: str
    label: str
    changeLabel: Optional[str] = None
    status: JobStatus
    totalDevices: int
    successCount: int = 0
    failureCount: int = 0
    pendingCount: int = 0
    deviceResults: dict[str, DeviceResult] = {}
    startedAt: str
    completedAt: Optional[str] = None


class CommandOutputMeta(BaseModel):
    inline: Optional[str] = None
    s3Key: Optional[str] = None
    sizeBytes: int = 0
    lineCount: int = 0


class SnapshotResponse(BaseModel):
    snapshotSK: str
    deviceId: str
    deviceName: str
    jobId: str
    label: str
    changeLabel: Optional[str] = None
    timestamp: str
    commandOutputs: dict[str, CommandOutputMeta] = {}
    collectionDurationMs: Optional[int] = None
    platform: str


class DiffStats(BaseModel):
    totalCommands: int = 0
    commandsWithChanges: int = 0
    commandsIdentical: int = 0
    totalLinesAdded: int = 0
    totalLinesRemoved: int = 0


class CommandDiff(BaseModel):
    command: str
    hasChanges: bool
    unifiedDiff: str = ""
    changes: list[dict[str, Any]] = []
    stats: dict[str, int] = {}


class ComparisonResponse(BaseModel):
    comparisonId: str
    deviceId: str
    deviceName: str
    preSnapshotSK: str
    postSnapshotSK: str
    preLabel: str
    postLabel: str
    changeLabel: Optional[str] = None
    diffSummary: DiffStats
    diffs: dict[str, CommandDiff] = {}
    analysisId: Optional[str] = None
    createdAt: str


class AIAnalysisResponse(BaseModel):
    analysisId: str
    comparisonId: str
    deviceId: str
    deviceName: str
    changeLabel: Optional[str] = None
    model: str
    promptTokens: int = 0
    completionTokens: int = 0
    totalTokens: int = 0
    severity: Severity
    riskScore: int = 0
    summary: str
    impactAnalysis: str = ""
    risks: list[Any] = []
    conflictsDetected: list[str] = []
    recommendations: list[str] = []
    commandBreakdown: list[dict[str, Any]] = []
    processingStrategy: AnalysisStrategy
    createdAt: str


class AuditLogEntry(BaseModel):
    eventId: str
    action: str
    resourceType: str
    resourceId: str
    details: dict[str, Any] = {}
    timestamp: str


class UpdateSettingsRequest(BaseModel):
    aiBaseUrl: Optional[str] = "https://openrouter.ai/api/v1"
    aiApiKey: Optional[str] = None
    aiModel: Optional[str] = "anthropic/claude-3.5-sonnet"
    aiMaxTokens: Optional[int] = 4096
    defaultTimeoutSeconds: Optional[int] = 30
    maskSecretsInDiffs: Optional[bool] = True
    normalizeDynamicCounters: Optional[bool] = True
    defaultCommandSetId: Optional[str] = None


class UserSettingsResponse(BaseModel):
    aiBaseUrl: str = "https://openrouter.ai/api/v1"
    hasApiKey: bool = False
    aiModel: str = "anthropic/claude-3.5-sonnet"
    aiMaxTokens: int = 4096
    defaultTimeoutSeconds: int = 30
    maskSecretsInDiffs: bool = True
    normalizeDynamicCounters: bool = True
    defaultCommandSetId: Optional[str] = None
    createdAt: str = ""
    updatedAt: str = ""

