"""Encrypts and stores each tenant's Gmail refresh token — the one
credential that powers both reading and replying to their inbox, reusing
the existing integration_configs row per (tenant_id, channel).
"""

from datetime import datetime, timezone
from functools import lru_cache

from cryptography.fernet import Fernet

from app.config import settings
from app.exceptions import ValidationError
from app.repositories import tenant_repo
from app.services import gmail_oauth_service

CHANNEL = "email"


@lru_cache
def _fernet() -> Fernet:
    if not settings.ENCRYPTION_KEY:
        raise RuntimeError("ENCRYPTION_KEY must be set in .env before email credentials can be stored.")
    return Fernet(settings.ENCRYPTION_KEY.encode())


def save_gmail_connection(tenant_id: str, email: str, refresh_token: str) -> dict:
    # Two tenants connecting the same Gmail inbox would each poll and
    # auto-reply to the same incoming messages independently, so the second
    # claim is refused instead of silently allowed (mirrors connect_whatsapp's
    # phone_number_id conflict check in tenant_service.py).
    conflict = next(
        (
            row
            for row in tenant_repo.get_email_integrations_by_address(email)
            if row["tenant_id"] != tenant_id
        ),
        None,
    )
    if conflict:
        raise ValidationError(
            "That Gmail account is already connected to another account. "
            "Disconnect it there first, or use a different Gmail account."
        )

    config = {
        "provider": "gmail",
        "email": email,
        "refresh_token_encrypted": _fernet().encrypt(refresh_token.encode()).decode(),
    }
    return tenant_repo.upsert_integration(tenant_id, CHANNEL, {
        "status": "connected",
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "config": config,
    })


def get_status(tenant_id: str) -> dict:
    row = tenant_repo.get_integration(tenant_id, CHANNEL)
    if not row:
        return {"status": "disconnected", "connected_at": None, "email": None}
    return {
        "status": row["status"],
        "connected_at": row.get("connected_at"),
        "email": (row.get("config") or {}).get("email"),
    }


def disconnect(tenant_id: str) -> dict:
    tenant_repo.upsert_integration(tenant_id, CHANNEL, {"status": "disconnected", "connected_at": None})
    return {"status": "disconnected", "connected_at": None, "email": None}


def mark_expired(tenant_id: str) -> None:
    """Flags a connection whose refresh_token was genuinely rejected
    (invalid_grant — revoked by the user, or long-unused), so the UI can
    prompt a reconnect. The poller still retries "error" accounts and
    self-heals them if the token starts working again.
    """
    tenant_repo.upsert_integration(tenant_id, CHANNEL, {"status": "error"})


def get_valid_access_token(tenant_id: str) -> str:
    """A short-lived Gmail API access token, freshly exchanged from the
    tenant's stored refresh_token — Gmail access tokens expire in ~1 hour, so
    every call gets a new one rather than caching and tracking expiry.

    Accepts an "error"-status connection too: if the token turns out to still
    work, the status is healed back to "connected" so a transient failure
    doesn't require a manual reconnect.
    """
    row = tenant_repo.get_integration(tenant_id, CHANNEL)
    if not row or row["status"] not in ("connected", "error"):
        raise ValidationError("No connected email account for this tenant")

    refresh_token = _fernet().decrypt(row["config"]["refresh_token_encrypted"].encode()).decode()
    token = gmail_oauth_service.get_access_token(refresh_token)

    if row["status"] == "error":
        tenant_repo.upsert_integration(tenant_id, CHANNEL, {"status": "connected"})

    return token
