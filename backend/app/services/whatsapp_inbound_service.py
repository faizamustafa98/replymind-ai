"""Handles inbound WhatsApp webhook events: stores the message, runs the same
RAG draft pipeline the email channel uses, and — when the draft clears the
tenant's auto-reply threshold — sends it back on WhatsApp automatically.
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.config import settings
from app.repositories import conversation_repo, message_repo, tenant_repo
from app.services import rag_pipeline_service, whatsapp_service

logger = logging.getLogger("replymind")


def ingest_message(payload: dict) -> tuple[str, str] | None:
    """Store one inbound WhatsApp text as a message row.

    Returns (tenant_id, message_id) to draft against, or None if the event was
    ignored (status-update / non-text), a duplicate, or couldn't be routed to a
    tenant. Uses synchronous Supabase calls, so run it off the event loop.
    """
    normalized = whatsapp_service.normalize_inbound(payload)
    if not normalized:
        return None

    tenant = tenant_repo.get_tenant_by_whatsapp_number(normalized.get("phone_number_id"))
    if not tenant:
        logger.warning(
            "No tenant connected for WhatsApp phone_number_id=%s — ignoring message",
            normalized.get("phone_number_id"),
        )
        return None
    tenant_id = tenant["id"]

    # Meta re-delivers the same message id on retry; the channel-id dedup keeps
    # it from being stored (and drafted) twice.
    if message_repo.message_exists_by_channel_id(tenant_id, normalized["channel_message_id"]):
        return None

    conversation = conversation_repo.get_or_create_conversation(
        tenant_id,
        whatsapp_service.CHANNEL,
        normalized["customer_identifier"],
        normalized.get("customer_name"),
    )
    message = message_repo.insert_message(
        tenant_id,
        conversation["id"],
        "inbound",
        normalized["content"],
        normalized["channel_message_id"],
    )
    return tenant_id, message["id"]


async def draft_and_autosend(tenant_id: str, message_id: str) -> None:
    """Generate the AI draft for a stored WhatsApp message and, if it clears the
    tenant's auto-reply threshold, send it back on WhatsApp. Mirrors the email
    channel's _process_message so both channels behave identically.
    """
    try:
        result = await rag_pipeline_service.generate_draft_for_message(tenant_id, message_id)
    except Exception:
        logger.exception("WhatsApp draft generation failed for message=%s", message_id)
        return

    tenant = await asyncio.to_thread(tenant_repo.get_tenant, tenant_id)
    threshold = settings.AUTO_REPLY_THRESHOLDS.get(tenant.get("auto_reply_level"))
    if not result["generated"] or threshold is None or result["rag_confidence"] < threshold:
        return  # draft stays in the inbox for the owner to review/approve

    message = await asyncio.to_thread(message_repo.fetch_message_by_id, message_id, tenant_id)
    conversation = await asyncio.to_thread(
        conversation_repo.fetch_conversation_by_id, message["conversation_id"], tenant_id
    )

    try:
        await asyncio.to_thread(
            whatsapp_service.send_whatsapp_reply, conversation["customer_identifier"], result["draft"]
        )
    except Exception:
        logger.exception("WhatsApp auto-send failed for message=%s", message_id)
        return

    # The reply becomes a real outbound row in the thread; the inbound row just
    # records that it was answered (same as the email channel).
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
