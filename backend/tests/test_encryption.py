"""
KMS & local envelope encryption security tests.
Validates that SSH credentials and secrets are encrypted before persistence
and cannot be accessed in plaintext.
"""

import pytest
from shared.kms import (
    encrypt_value,
    decrypt_value,
    encrypt_credentials,
    decrypt_credentials,
)


class TestCredentialEncryption:
    """Validates field-level encryption for device credentials and secrets."""

    def test_encrypt_and_decrypt_value(self):
        """Plaintext must be encrypted into ciphertext and cleanly decrypted back."""
        plaintext = "SuperSecretNetworkPassword2026!"
        ciphertext = encrypt_value(plaintext)

        assert ciphertext != plaintext
        assert len(ciphertext) > 0

        decrypted = decrypt_value(ciphertext)
        assert decrypted == plaintext

    def test_empty_string_handling(self):
        """Empty plaintext or ciphertext handles gracefully without exception."""
        assert encrypt_value("") == ""
        assert decrypt_value("") == ""

    def test_device_credentials_encryption(self):
        """Device credentials dict fields are encrypted individually."""
        creds = {
            "username": "netops_admin",
            "password": "TacacsSecret999!",
            "enable_secret": "CiscoEnable123!",
        }

        encrypted = encrypt_credentials(
            username=creds["username"],
            password=creds["password"],
            enable_secret=creds["enable_secret"],
        )

        assert "usernameEncrypted" in encrypted
        assert "passwordEncrypted" in encrypted
        assert "enableSecretEncrypted" in encrypted

        # Must not contain cleartext
        assert encrypted["usernameEncrypted"] != creds["username"]
        assert encrypted["passwordEncrypted"] != creds["password"]
        assert encrypted["enableSecretEncrypted"] != creds["enable_secret"]

        # Decrypt roundtrip
        decrypted = decrypt_credentials(encrypted)
        assert decrypted["username"] == creds["username"]
        assert decrypted["password"] == creds["password"]
        assert decrypted["enable_secret"] == creds["enable_secret"]

    def test_device_credentials_without_enable_secret(self):
        """Device credentials without enable_secret omit the enableSecretEncrypted field."""
        encrypted = encrypt_credentials(
            username="admin",
            password="password",
        )
        assert "enableSecretEncrypted" not in encrypted
        decrypted = decrypt_credentials(encrypted)
        assert decrypted["username"] == "admin"
        assert decrypted["password"] == "password"
        assert "enable_secret" not in decrypted
