"""
KMS encrypt/decrypt utility functions.
Used for field-level encryption of device credentials and OpenAI API keys.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import os

import boto3

from shared.constants import KMS_KEY_ID

logger = logging.getLogger(__name__)

_kms_client = None
_DEV_FERNET = None


def _get_dev_fernet():
    """Deterministic local encryption vault for development without AWS KMS."""
    global _DEV_FERNET
    if _DEV_FERNET is None:
        try:
            from cryptography.fernet import Fernet
            seed = os.environ.get("DRIFTGUARD_DEV_KEY", "driftguard-local-vault-master-key-seed")
            derived_key = base64.urlsafe_b64encode(hashlib.sha256(seed.encode("utf-8")).digest())
            _DEV_FERNET = Fernet(derived_key)
        except Exception as e:
            logger.warning(f"Could not initialize Fernet cipher: {e}")
            _DEV_FERNET = None
    return _DEV_FERNET


def get_kms_client():
    """Get or create KMS client (connection reuse)."""
    global _kms_client
    if _kms_client is None:
        _kms_client = boto3.client("kms")
    return _kms_client


def encrypt_value(plaintext: str) -> str:
    """
    Encrypt a plaintext string using KMS or local dev vault fallback.
    Returns base64-encoded ciphertext for storage in DynamoDB.
    """
    if not plaintext:
        return ""

    if KMS_KEY_ID == "local" or not KMS_KEY_ID:
        fernet = _get_dev_fernet()
        if fernet:
            return "local:" + fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")
        return "b64:" + base64.b64encode(plaintext.encode("utf-8")).decode("utf-8")

    try:
        kms = get_kms_client()
        response = kms.encrypt(
            KeyId=KMS_KEY_ID,
            Plaintext=plaintext.encode("utf-8"),
        )
        ciphertext = base64.b64encode(response["CiphertextBlob"]).decode("utf-8")
        logger.debug("Encrypted value successfully with AWS KMS")
        return ciphertext
    except Exception as e:
        logger.warning(f"AWS KMS encrypt failed ({e}); using local dev vault fallback.")
        fernet = _get_dev_fernet()
        if fernet:
            return "local:" + fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")
        return "b64:" + base64.b64encode(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_value(ciphertext_b64: str) -> str:
    """
    Decrypt a base64-encoded ciphertext string using KMS or local dev vault fallback.
    Returns the original plaintext.
    """
    if not ciphertext_b64:
        return ""

    if ciphertext_b64.startswith("local:"):
        fernet = _get_dev_fernet()
        if fernet:
            return fernet.decrypt(ciphertext_b64[6:].encode("utf-8")).decode("utf-8")
        return ""

    if ciphertext_b64.startswith("b64:"):
        return base64.b64decode(ciphertext_b64[4:]).decode("utf-8")

    try:
        kms = get_kms_client()
        ciphertext_blob = base64.b64decode(ciphertext_b64)
        response = kms.decrypt(
            CiphertextBlob=ciphertext_blob,
        )
        plaintext = response["Plaintext"].decode("utf-8")
        logger.debug("Decrypted value successfully with AWS KMS")
        return plaintext
    except Exception as e:
        logger.warning(f"AWS KMS decrypt failed ({e}); attempting local fallback.")
        fernet = _get_dev_fernet()
        if fernet:
            try:
                return fernet.decrypt(ciphertext_b64.encode("utf-8")).decode("utf-8")
            except Exception as fernet_err:
                logger.debug(f"Fernet decrypt fallback attempt: {fernet_err}")
        try:
            return base64.b64decode(ciphertext_b64).decode("utf-8")
        except (ValueError, TypeError):
            return ciphertext_b64


def encrypt_credentials(
    username: str,
    password: str,
    enable_secret: str | None = None,
) -> dict[str, str]:
    """
    Encrypt device SSH credentials.
    Returns dict with encrypted field names.
    """
    result = {
        "usernameEncrypted": encrypt_value(username),
        "passwordEncrypted": encrypt_value(password),
    }

    if enable_secret:
        result["enableSecretEncrypted"] = encrypt_value(enable_secret)

    return result


def decrypt_credentials(item: dict) -> dict[str, str]:
    """
    Decrypt device SSH credentials from a DynamoDB item.
    Returns dict with plaintext username, password, and optional enable_secret.
    """
    result = {
        "username": decrypt_value(item.get("usernameEncrypted", "")),
        "password": decrypt_value(item.get("passwordEncrypted", "")),
    }

    if item.get("enableSecretEncrypted"):
        result["enable_secret"] = decrypt_value(item["enableSecretEncrypted"])

    return result
