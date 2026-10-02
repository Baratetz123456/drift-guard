"""
API endpoints & security route guard tests.
Validates HTTP status codes, missing auth header 401 rejection,
bot speed/honeypot trap defenses, and device CRUD endpoints.
"""

import base64
import json
import time

import pytest
from fastapi.testclient import TestClient

from local_collector import app


@pytest.fixture
def client():
    """Create a FastAPI TestClient."""
    return TestClient(app)


def make_mock_token(user_id: str, email: str) -> str:
    """Generate mock JWT id token mimicking Cognito structure."""
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(
        json.dumps({
            "sub": user_id,
            "email": email,
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
            "token_use": "id",
        }).encode()
    ).decode().rstrip("=")
    signature = base64.urlsafe_b64encode(b"mock_signature").decode().rstrip("=")
    return f"{header}.{payload}.{signature}"


class TestAPIEndpointsSecurity:
    """Validates security invariants across REST endpoints."""

    def test_health_check(self, client):
        """Health check returns status ok without requiring authentication."""
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json().get("status") == "ok"

    def test_unauthenticated_devices_returns_401(self, client):
        """Accessing /api/devices without Bearer token strictly returns 401 Unauthorized."""
        resp = client.get("/api/devices")
        assert resp.status_code == 401
        assert "Authentication required" in resp.json().get("detail", "")

    def test_unauthenticated_command_sets_returns_401(self, client):
        """Accessing /api/commands without Bearer token strictly returns 401 Unauthorized."""
        resp = client.get("/api/commands")
        assert resp.status_code == 401

    def test_authenticated_devices_list(self, client):
        """Accessing /api/devices with valid token returns list partitioned by user."""
        token = make_mock_token("usr_test_api_user", "api_tester@driftguard.local")
        resp = client.get(
            "/api/devices",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "devices" in data
        assert isinstance(data["devices"], list)

    def test_honeypot_bot_defense_rejection(self, client):
        """Submitting non-empty honeypot field in login returns 400 Bad Request."""
        resp = client.post(
            "/api/auth/login",
            json={
                "email": "bot@spammer.net",
                "password": "Password123!",
                "operator_honeypot_code": "iamabot",
                "mount_time_ms": int(time.time() * 1000) - 2000,
            },
        )
        assert resp.status_code == 400
        assert "Automated submission blocked" in resp.json().get("detail", "")

    def test_speed_trap_bot_defense(self, client):
        """Submitting login too fast (<500ms) is rejected by bot defense."""
        resp = client.post(
            "/api/auth/login",
            json={
                "email": "speedbot@spammer.net",
                "password": "Password123!",
                "operator_honeypot_code": "",
                "mount_time_ms": int(time.time() * 1000) - 50,  # 50ms elapsed is too fast
            },
        )
        assert resp.status_code == 400
        assert "Bot-like speed detected" in resp.json().get("detail", "")

    def test_unregistered_operator_login_rejected_401(self, client):
        """Unregistered operator login strictly returns 401 requiring registration in database."""
        resp = client.post(
            "/api/auth/login",
            json={
                "email": "unregistered_operator@enterprise.net",
                "password": "AnyPassword123!",
                "operator_honeypot_code": "",
                "mount_time_ms": int(time.time() * 1000) - 1500,
            },
        )
        assert resp.status_code == 401
        assert "Operator account not found" in resp.json().get("detail", "")

    def test_register_and_login_with_database_verification(self, client):
        """Registering operator stores credentials in DB, and login verifies against DB."""
        unique_email = f"neteng_{int(time.time())}@enterprise.net"
        password = "VeryStrongPassword2026!"

        # Register
        reg_resp = client.post(
            "/api/auth/register",
            json={
                "name": "Alex Vance",
                "email": unique_email,
                "password": password,
                "operator_honeypot_code": "",
                "mount_time_ms": int(time.time() * 1000) - 2000,
            },
        )
        assert reg_resp.status_code == 200
        assert "token" in reg_resp.json()

        # Login with wrong password -> 401
        bad_login = client.post(
            "/api/auth/login",
            json={
                "email": unique_email,
                "password": "WrongPassword999!",
                "operator_honeypot_code": "",
                "mount_time_ms": int(time.time() * 1000) - 2000,
            },
        )
        assert bad_login.status_code == 401
        assert "Invalid operator credentials" in bad_login.json().get("detail", "")

        # Login with correct password -> 200 with user profile and token
        good_login = client.post(
            "/api/auth/login",
            json={
                "email": unique_email,
                "password": password,
                "operator_honeypot_code": "",
                "mount_time_ms": int(time.time() * 1000) - 2000,
            },
        )
        assert good_login.status_code == 200
        data = good_login.json()
        assert "token" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["name"] == "Alex Vance"

    def test_demo_operator_login_success(self, client):
        """Demo operator account logs in with standard demo password."""
        resp = client.post(
            "/api/auth/login",
            json={
                "email": "operator@driftguard.local",
                "password": "••••••••••••",
                "operator_honeypot_code": "",
                "mount_time_ms": int(time.time() * 1000) - 2000,
            },
        )
        assert resp.status_code == 200
        assert "token" in resp.json()
        assert resp.json()["user"]["email"] == "operator@driftguard.local"


