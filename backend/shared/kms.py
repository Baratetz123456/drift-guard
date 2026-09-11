"""
KMS encrypt/decrypt utility functions.
Used for field-level encryption of device credentials and OpenAI API keys.
"""

from __future__ import annotations

import base64
import logging
from typing import Optional

import boto3

from shared.constants import KMS_KEY_ID

logger = logging.getLogger(__name__)

_kms_client = None


def get_kms_client():
    """Get or create KMS client (connection reuse)."""
    global _kms_client
    if _kms_client is None:
        _kms_client = boto3.client("kms")
    return _kms_client


def encrypt_value(plaintext: str) -> str:
    """
    Encrypt a plaintext string using KMS.
    Returns base64-encoded ciphertext for storage in DynamoDB.
    """
    if not plaintext:
        return ""

    kms = get_kms_client()
    response = kms.encrypt(
        KeyId=KMS_KEY_ID,
        Plaintext=plaintext.encode("utf-8"),
    )

    ciphertext = base64.b64encode(response["CiphertextBlob"]).decode("utf-8")
    logger.debug("Encrypted value successfully")
    return ciphertext


def decrypt_value(ciphertext_b64: str) -> str:
    """
    Decrypt a base64-encoded ciphertext string using KMS.
    Returns the original plaintext.
    """
    if not ciphertext_b64:
        return ""

    kms = get_kms_client()
    ciphertext_blob = base64.b64decode(ciphertext_b64)

    response = kms.decrypt(
        CiphertextBlob=ciphertext_blob,
    )

    plaintext = response["Plaintext"].decode("utf-8")
    logger.debug("Decrypted value successfully")
    return plaintext


def encrypt_credentials(
    username: str,
    password: str,
    enable_secret: Optional[str] = None,
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
