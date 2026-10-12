"""Polls a tenant's Gmail inbox via the Gmail API for new messages, stores
them, feeds each one into the RAG draft-generation pipeline, and — when the
resulting draft clears the tenant's auto-reply threshold — sends it back
automatically.
"""

import asyncio
import base64
import logging
from datetime import datetime, timezone
from email.utils import parseaddr

import requests

from app.config import settings
from app.repositories import conversation_repo, message_repo, tenant_repo
from app.services import email_credentials_service, email_outbound_service, gmail_oauth_service, rag_pipeline_service

logger = logging.getLogger("replymind")

CHANNEL = "email"
GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
REQUEST_TIMEOUT_SECONDS = 10
MAX_UNREAD_PER_POLL = 10


async def fetch_new_emails(tenant_id: str) -> int:
    """Fetches unread Gmail messages for one tenant and triggers draft
    generation for each. Messages are inserted sequentially (cheap DB
    writes), but drafting — classification, RAG retrieval, generation, one
    AI round-trip each — runs concurrently across the batch so a backlog
    of unread mail doesn't serialize behind itself.

    Returns the number of emails processed.
    """
    try:
        access_token = await asyncio.to_thread(email_credentials_service.get_valid_access_token, tenant_id)
    except gmail_oauth_service.TokenExpiredError:
        await asyncio.to_thread(email_credentials_service.mark_expired, tenant_id)
        logger.warning("Gmail token expired for tenant=%s — needs reconnect", tenant_id)
        return 0

    unread_ids = await asyncio.to_thread(_list_unread_ids, access_token)
    if not unread_ids:
        return 0

    tenant = await asyncio.to_thread(tenant_repo.get_tenant, tenant_id)
    auto_reply_threshold = settings.AUTO_REPLY_THRESHOLDS.get(tenant.get("auto_reply_level"))

    pending = []
    for gmail_id in unread_ids:
        try:
            stored = await _ingest_one(tenant_id, access_token, gmail_id)
            if stored:
                pending.append(stored)
        except Exception:
            # One bad message (odd encoding, transient Gmail error) must not
            # sink the rest of the batch — log it and move on.
            logger.exception("Failed to ingest Gmail message=%s for tenant=%s", gmail_id, tenant_id)

    await asyncio.gather(
        *(_process_message(tenant_id, mid, sender, subject, auto_reply_threshold) for mid, sender, subject in pending),
        return_exceptions=True,
    )

    return len(pending)


async def _ingest_one(tenant_id: str, access_token: str, gmail_id: str) -> tuple[str, str, str] | None:
    """Stores one Gmail message as an inbound row and returns
    (message_id, sender, subject) for the drafting stage — or None if it was
    already ingested or has no usable body.

    The message is inserted BEFORE marking it read, and marking read is
    best-effort: even if that call fails (or lacks permission), the email
    still lands in the inbox, and the channel-id dedup keeps the next poll
    from storing it twice.
    """
    if await asyncio.to_thread(message_repo.message_exists_by_channel_id, tenant_id, gmail_id):
        await asyncio.to_thread(_mark_read, access_token, gmail_id)  # retry the mark-read that likely failed before
        return None

    raw = await asyncio.to_thread(_get_message, access_token, gmail_id)
    content = _extract_body(raw["payload"]).strip()
    if not content:
        await asyncio.to_thread(_mark_read, access_token, gmail_id)
        return None

    sender = _header(raw, "From")
    subject = _header(raw, "Subject") or "Your message"

    conversation = await asyncio.to_thread(
        conversation_repo.get_or_create_conversation, tenant_id, CHANNEL, sender
    )
    message = await asyncio.to_thread(
        message_repo.insert_message, tenant_id, conversation["id"], "inbound", content, gmail_id
    )
    await asyncio.to_thread(_mark_read, access_token, gmail_id)

    return message["id"], sender, subject


async def _process_message(tenant_id: str, message_id: str, sender: str, subject: str, auto_reply_threshold: float | None) -> None:
    try:
        result = await rag_pipeline_service.generate_draft_for_message(tenant_id, message_id)
    except Exception:
        logger.exception("Draft generation failed for message=%s", message_id)
        return

    if not result["generated"] or auto_reply_threshold is None or result["rag_confidence"] < auto_reply_threshold:
        return

    to_address = parseaddr(sender)[1]
    if not to_address:
        return

    try:
        await asyncio.to_thread(email_outbound_service.send_email_reply, tenant_id, to_address, subject, result["draft"])
    except Exception:
        logger.exception("Auto-send failed for message=%s", message_id)
        return

    # The reply becomes a real outbound row in the thread. Without this the
    # auto-sent email was invisible in the UI: the inbound row flips to
    # "auto_sent" so it no longer renders as a pending draft, and nothing else
    # ever recorded what was sent. Mirrors the WhatsApp channel.
    message = await asyncio.to_thread(message_repo.fetch_message_by_id, message_id, tenant_id)
    await asyncio.to_thread(
        message_repo.insert_message, tenant_id, message["conversation_id"], "outbound", result["draft"]
    )
    await asyncio.to_thread(
        message_repo.update_message_status_in_db,
        message_id,
        tenant_id,
        {
            "draft_status": "auto_sent",
            "final_reply": result["draft"],
            "sent_at": datetime.now(timezone.utc).isoformat(),
        },
    )


def _list_unread_ids(access_token: str) -> list[str]:
    response = requests.get(
        f"{GMAIL_API}/messages",
        headers=gmail_oauth_service.auth_header(access_token),
        params={"q": "is:unread", "maxResults": MAX_UNREAD_PER_POLL},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return [m["id"] for m in response.json().get("messages", [])]


def _get_message(access_token: str, message_id: str) -> dict:
    response = requests.get(
        f"{GMAIL_API}/messages/{message_id}",
        headers=gmail_oauth_service.auth_header(access_token),
        params={"format": "full"},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def _mark_read(access_token: str, message_id: str) -> None:
    """Removing the UNREAD label keeps a message out of the next poll's
    `is:unread` search. Best-effort: if the token lacks label-write scope, or
    Gmail hiccups, we log and move on — the channel-id dedup still prevents
    the message from being ingested twice, so a failure here can't block the
    inbox or create duplicates.
    """
    try:
        response = requests.post(
            f"{GMAIL_API}/messages/{message_id}/modify",
            headers=gmail_oauth_service.auth_header(access_token),
            json={"removeLabelIds": ["UNREAD"]},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except Exception:
        logger.warning("Could not mark Gmail message=%s as read (non-fatal)", message_id)


def _header(message: dict, name: str) -> str:
    headers = message.get("payload", {}).get("headers", [])
    return next((h["value"] for h in headers if h["name"].lower() == name.lower()), "")


def _extract_body(payload: dict) -> str:
    if payload.get("mimeType") == "text/plain":
        return _decode_body(payload.get("body", {}).get("data"))

    for part in payload.get("parts") or []:
        if part.get("mimeType") == "text/plain" and not part.get("filename"):
            return _decode_body(part.get("body", {}).get("data"))
        if part.get("parts"):  # nested multipart, e.g. multipart/alternative inside multipart/mixed
            found = _extract_body(part)
            if found:
                return found
    return ""


def _decode_body(data: str | None) -> str:
    if not data:
        return ""
    padded = data + "=" * (-len(data) % 4)  # Gmail's base64url data omits padding
    return base64.urlsafe_b64decode(padded).decode(errors="ignore")
