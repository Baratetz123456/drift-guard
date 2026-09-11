"""
Custom exception hierarchy for DeltaNet.
Used across all Lambda functions for consistent error handling.
"""


class DeltaNetError(Exception):
    """Base exception for all DeltaNet errors."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class ValidationError(DeltaNetError):
    """Raised when input validation fails."""

    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class NotFoundError(DeltaNetError):
    """Raised when a requested resource does not exist."""

    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            f"{resource_type} '{resource_id}' not found",
            status_code=404,
        )
        self.resource_type = resource_type
        self.resource_id = resource_id


class ConflictError(DeltaNetError):
    """Raised when an operation conflicts with existing state."""

    def __init__(self, message: str):
        super().__init__(message, status_code=409)


class UnauthorizedError(DeltaNetError):
    """Raised when authentication fails or is missing."""

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401)


class ForbiddenError(DeltaNetError):
    """Raised when user lacks permission for the operation."""

    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status_code=403)


class DependencyError(DeltaNetError):
    """Raised when an external dependency fails (e.g., no API key configured)."""

    def __init__(self, message: str):
        super().__init__(message, status_code=424)


class ExternalServiceError(DeltaNetError):
    """Raised when an external service (OpenAI, SSH) fails."""

    def __init__(self, service: str, message: str):
        super().__init__(
            f"{service} error: {message}",
            status_code=502,
        )
        self.service = service


class DeviceConnectionError(DeltaNetError):
    """Raised when SSH connection to a network device fails."""

    def __init__(self, device_name: str, message: str):
        super().__init__(
            f"Connection to '{device_name}' failed: {message}",
            status_code=502,
        )
        self.device_name = device_name


class CommandExecutionError(DeltaNetError):
    """Raised when a show command fails on a device."""

    def __init__(self, device_name: str, command: str, message: str):
        super().__init__(
            f"Command '{command}' failed on '{device_name}': {message}",
            status_code=502,
        )
        self.device_name = device_name
        self.command = command


class UnsafeCommandError(ValidationError):
    """Raised when a command is rejected by the safety filter."""

    def __init__(self, command: str, reason: str):
        super().__init__(f"Unsafe command rejected: '{command}' — {reason}")
        self.command = command
        self.reason = reason
