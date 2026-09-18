"""
DriftGuard SQLite Database Engine.
Provides real relational database persistence, schema migrations, and per-user tenant isolation.
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("driftguard.database")

DB_FILE = os.environ.get("DRIFTGUARD_DB_PATH", os.path.join(os.path.dirname(__file__), "driftguard.db"))


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize database tables with complete per-user isolation schemas."""
    conn = get_connection()
    try:
        with conn:
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'Network Architect',
                created_at TEXT NOT NULL,
                daily_ai_count INTEGER DEFAULT 0,
                daily_collect_count INTEGER DEFAULT 0,
                quota_reset_date TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                hostname TEXT NOT NULL,
                port INTEGER DEFAULT 22,
                driver TEXT NOT NULL,
                status TEXT DEFAULT 'ONLINE',
                auth_mode TEXT DEFAULT 'Password',
                username TEXT,
                encrypted_password TEXT,
                enable_secret TEXT,
                group_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS command_sets (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                driver TEXT NOT NULL,
                commands_json TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS snapshots (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                device_name TEXT NOT NULL,
                device_hostname TEXT,
                device_type TEXT,
                snapshot_type TEXT NOT NULL,
                change_ticket TEXT,
                notes TEXT,
                commands_json TEXT NOT NULL,
                outputs_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS comparisons (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                device_name TEXT NOT NULL,
                pre_snapshot_id TEXT NOT NULL,
                post_snapshot_id TEXT NOT NULL,
                change_label TEXT,
                command_diffs_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS ai_analyses (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                comparison_id TEXT NOT NULL,
                severity TEXT NOT NULL,
                risk_score INTEGER NOT NULL,
                summary TEXT NOT NULL,
                impact_analysis TEXT,
                findings_json TEXT NOT NULL,
                suggested_rollback TEXT,
                command_breakdown_json TEXT NOT NULL,
                tokens_used INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS user_settings (
                user_id TEXT PRIMARY KEY,
                ai_base_url TEXT DEFAULT 'https://openrouter.ai/api/v1',
                default_model TEXT DEFAULT 'google/gemini-2.0-flash-lite:free',
                default_timeout INTEGER DEFAULT 30,
                mask_secrets INTEGER DEFAULT 1,
                normalize_counters INTEGER DEFAULT 1,
                daily_ai_quota INTEGER DEFAULT 50,
                daily_collect_quota INTEGER DEFAULT 100,
                api_key TEXT,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                action TEXT NOT NULL,
                target TEXT NOT NULL,
                result TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
            CREATE INDEX IF NOT EXISTS idx_command_sets_user ON command_sets(user_id);
            CREATE INDEX IF NOT EXISTS idx_snapshots_user ON snapshots(user_id);
            CREATE INDEX IF NOT EXISTS idx_comparisons_user ON comparisons(user_id);
            CREATE INDEX IF NOT EXISTS idx_analyses_user ON ai_analyses(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
            """)
        logger.info("DriftGuard SQLite database initialized successfully.")
    finally:
        conn.close()

    purge_legacy_mock_data()


def purge_legacy_mock_data() -> None:
    """Purge all legacy mock devices, mock snapshots, and simulated records."""
    conn = get_connection()
    try:
        with conn:
            # Delete legacy simulated devices
            conn.execute("""
                DELETE FROM devices
                WHERE hostname IN ('10.200.1.1', '192.168.100.1', '10.200.1.2')
                   OR name IN ('cr01.iad01.core', 'CORE-SW-01', 'AGG-SW-01', 'EDGE-RTR-01', 'BORDER-GW-01')
                   OR id LIKE 'dev-00%'
                   OR id LIKE 'dev-mock%'
                   OR id LIKE 'dev-sample%'
            """)
            # Delete legacy mock snapshots and comparisons
            conn.execute("""
                DELETE FROM snapshots
                WHERE id LIKE 'snap-mock%'
                   OR id LIKE 'snap-pre-00%'
                   OR id LIKE 'snap-post-00%'
                   OR device_hostname IN ('10.200.1.1', '192.168.100.1')
            """)
            conn.execute("""
                DELETE FROM comparisons
                WHERE id LIKE 'cmp-mock%'
                   OR pre_snapshot_id LIKE 'snap-pre-00%'
                   OR post_snapshot_id LIKE 'snap-post-00%'
            """)
        logger.info("Purged all legacy mockups and simulated records from SQLite.")
    except Exception as e:
        logger.warning(f"Note during legacy mock cleanup: {e}")
    finally:
        conn.close()


def get_current_utc_date() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def get_or_create_user(user_id: str, email: str = "operator@driftguard.local", name: str = "Network Architect") -> Dict[str, Any]:
    """Retrieve or create a user with initialized daily quotas."""
    conn = get_connection()
    today = get_current_utc_date()
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
        if row:
            user = dict(row)
            # Reset daily quota if new day
            if user.get("quota_reset_date") != today:
                cur.execute(
                    "UPDATE users SET daily_ai_count = 0, daily_collect_count = 0, quota_reset_date = ? WHERE id = ?",
                    (today, user_id),
                )
                conn.commit()
                user["daily_ai_count"] = 0
                user["daily_collect_count"] = 0
                user["quota_reset_date"] = today
            return user
        else:
            cur.execute(
                """
                INSERT INTO users (id, email, name, password_hash, role, created_at, daily_ai_count, daily_collect_count, quota_reset_date)
                VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
                """,
                (user_id, email, name, "hashed_pw", "Network Architect", now_iso, today),
            )
            cur.execute(
                """
                INSERT OR IGNORE INTO user_settings (user_id, updated_at)
                VALUES (?, ?)
                """,
                (user_id, now_iso),
            )
            conn.commit()
            return {
                "id": user_id,
                "email": email,
                "name": name,
                "role": "Network Architect",
                "daily_ai_count": 0,
                "daily_collect_count": 0,
                "quota_reset_date": today,
            }
    finally:
        conn.close()


def check_and_increment_quota(user_id: str, quota_type: str) -> Tuple[bool, int, int]:
    """
    Check if user is within daily quota and increment if permitted.
    quota_type: 'collect' or 'ai'
    Returns: (is_allowed, current_count, max_quota)
    """
    user = get_or_create_user(user_id)
    conn = get_connection()
    today = get_current_utc_date()

    try:
        cur = conn.cursor()
        cur.execute("SELECT daily_ai_quota, daily_collect_quota FROM user_settings WHERE user_id = ?", (user_id,))
        settings_row = cur.fetchone()
        daily_ai_quota = settings_row["daily_ai_quota"] if settings_row else 50
        daily_collect_quota = settings_row["daily_collect_quota"] if settings_row else 100

        if quota_type == "collect":
            current = user.get("daily_collect_count", 0)
            if current >= daily_collect_quota:
                return False, current, daily_collect_quota
            cur.execute("UPDATE users SET daily_collect_count = daily_collect_count + 1 WHERE id = ?", (user_id,))
            conn.commit()
            return True, current + 1, daily_collect_quota

        elif quota_type == "ai":
            current = user.get("daily_ai_count", 0)
            if current >= daily_ai_quota:
                return False, current, daily_ai_quota
            cur.execute("UPDATE users SET daily_ai_count = daily_ai_count + 1 WHERE id = ?", (user_id,))
            conn.commit()
            return True, current + 1, daily_ai_quota

        return True, 0, 100
    finally:
        conn.close()


# Initialize database on module load
init_db()
