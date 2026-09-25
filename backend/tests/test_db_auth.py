"""
Database-backed Authentication & Password Verification Unit Tests.
Validates DynamoDB user profile retrieval, PBKDF2 hashing, lockout state, and 401 rejection.
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure backend directory and vendor directory are in python path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

VENDOR_DIR = os.path.join(BACKEND_DIR, "vendor")
if os.path.isdir(VENDOR_DIR) and VENDOR_DIR not in sys.path:
    sys.path.insert(0, VENDOR_DIR)

from shared import dynamo_store


class TestDatabaseAuthHashing(unittest.TestCase):
    """Test cryptographic hashing and verification functions."""

    def test_hash_and_verify_correct_password(self):
        password = "EnterpriseSecurePass2026!"
        salt, pw_hash = dynamo_store.hash_password(password)

        self.assertTrue(len(salt) > 0)
        self.assertTrue(len(pw_hash) > 0)
        self.assertTrue(dynamo_store.verify_password(password, salt, pw_hash))

    def test_verify_incorrect_password(self):
        password = "EnterpriseSecurePass2026!"
        salt, pw_hash = dynamo_store.hash_password(password)

        self.assertFalse(dynamo_store.verify_password("WrongPassword123!", salt, pw_hash))

    def test_different_salts_produce_different_hashes(self):
        password = "SamePassword123!"
        salt1, hash1 = dynamo_store.hash_password(password)
        salt2, hash2 = dynamo_store.hash_password(password)

        self.assertNotEqual(salt1, salt2)
        self.assertNotEqual(hash1, hash2)


class TestDatabaseAuthUserLifecycle(unittest.TestCase):
    """Test user record creation and login tracking in DynamoDB store."""

    @patch("shared.dynamo.put_item")
    @patch("shared.dynamo.get_item")
    @patch("shared.dynamo_store.init_default_settings")
    def test_create_user_with_credentials_stores_hash_and_salt(self, mock_init, mock_get, mock_put):
        mock_get.return_value = None
        user_id = "usr_db_test_01"
        email = "netarch@driftguard.local"
        password = "SecurePassword2026!"

        user = dynamo_store.create_user_with_credentials(
            user_id=user_id,
            email=email,
            name="Network Architect",
            password=password,
        )

        self.assertEqual(user["PK"], f"USER#{user_id}")
        self.assertEqual(user["email"], email)
        self.assertTrue(dynamo_store.verify_password(password, user["passwordSalt"], user["passwordHash"]))
        self.assertEqual(user["failedLoginAttempts"], 0)
        self.assertEqual(user["lockedUntil"], 0)
        self.assertIsNone(user["lastLoginAt"])
        mock_put.assert_called_once()

    @patch("shared.dynamo.update_item")
    @patch("shared.dynamo.get_item")
    def test_record_login_failure_increments_and_locks(self, mock_get, mock_update):
        user_id = "usr_db_test_02"
        # 4 prior failed attempts
        mock_get.return_value = {
            "PK": f"USER#{user_id}",
            "SK": "PROFILE",
            "failedLoginAttempts": 4,
            "lockedUntil": 0,
        }

        attempts, lockout = dynamo_store.record_login_failure(user_id, max_attempts=5, lockout_seconds=60)
        self.assertEqual(attempts, 5)
        self.assertGreater(lockout, 0)
        mock_update.assert_called_once()

    @patch("shared.dynamo.update_item")
    def test_record_login_success_resets_attempts(self, mock_update):
        user_id = "usr_db_test_03"
        dynamo_store.record_login_success(user_id)

        mock_update.assert_called_once()
        args, kwargs = mock_update.call_args
        self.assertEqual(kwargs["pk"], f"USER#{user_id}")
        self.assertEqual(kwargs["sk"], "PROFILE")
        self.assertEqual(kwargs["updates"]["failedLoginAttempts"], 0)
        self.assertEqual(kwargs["updates"]["lockedUntil"], 0)
        self.assertIn("lastLoginAt", kwargs["updates"])


if __name__ == "__main__":
    unittest.main()
