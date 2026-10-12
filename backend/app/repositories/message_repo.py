"""Supabase queries for the messages table (fetch, insert, draft/status updates)."""

import logging
from app.db.client import get_supabase
from app.middleware.exceptions import DatabaseError

logger = logging.getLogger(__name__)


def fetch_messages_for_conversation(conversation_id: str, tenant_id: str):
    try:
        supabase = get_supabase()
        response = (
            supabase.table("messages")
            .select("*")
            .eq("conversation_id", conversation_id)
            .eq("tenant_id", tenant_id)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data
    except Exception as e:
        logger.error("fetch_messages_for_conversation failed for %s/%s: %s", conversation_id, tenant_id, e)
        raise DatabaseError(str(e)) from e


def message_exists_by_channel_id(tenant_id: str, channel_message_id: str) -> bool:
    """Whether an inbound email with this Gmail message id was already stored.
    Lets the poller dedupe: an email that couldn't be marked read (so it keeps
    showing up as unread) is only ever ingested once.
    """
    try:
        supabase = get_supabase()
        response = (
            supabase.table("messages")
            .select("id")
            .eq("tenant_id", tenant_id)
            .eq("channel_message_id", channel_message_id)
            .limit(1)
            .execute()
        )
        return bool(response.data)
    except Exception as e:
        logger.error("message_exists_by_channel_id failed for tenant=%s: %s", tenant_id, e)
        raise DatabaseError(str(e)) from e


def insert_message(tenant_id: str, conversation_id: str, direction: str, content: str, channel_message_id: str | None = None):
    try:
        supabase = get_supabase()
        fields = {
            "tenant_id": tenant_id,
            "conversation_id": conversation_id,
            "direction": direction,
            "content": content,
            "channel_message_id": channel_message_id,
            "draft_status": "pending",
        }
        if direction == "inbound":
            fields["is_question"] = True
        response = (
            supabase.table("messages")
            .insert(fields)
            .execute()
        )
        return response.data[0]
    except Exception as e:
        logger.error("insert_message failed for tenant=%s conversation=%s: %s", tenant_id, conversation_id, e)
        raise DatabaseError(str(e)) from e


def fetch_recent_messages_before(conversation_id: str, tenant_id: str, before_created_at: str, limit: int):
    """The `limit` messages immediately preceding one message in its thread.

    Returned oldest-first, which is the order a chat transcript needs. The query
    itself sorts newest-first so the database returns the *most recent* window
    rather than the oldest, then the slice is reversed here.

    Filtering on created_at rather than excluding by id keeps a redraft
    deterministic: re-running the pipeline on an old message reconstructs the
    history as it stood then, not as it stands now.
    """
    try:
        supabase = get_supabase()
        response = (
            supabase.table("messages")
            .select("direction, content, created_at")
            .eq("conversation_id", conversation_id)
            .eq("tenant_id", tenant_id)
            .lt("created_at", before_created_at)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return list(reversed(response.data or []))
    except Exception as e:
        logger.error("fetch_recent_messages_before failed for %s/%s: %s", conversation_id, tenant_id, e)
        raise DatabaseError(str(e)) from e


def fetch_undrafted_inbound_messages(tenant_id: str):
    """Inbound messages that never got an AI draft — typically because no
    knowledge base existed yet when they first arrived. Used to retry drafting
    once a new document finishes indexing.
    """
    try:
        supabase = get_supabase()
        response = (
            supabase.table("messages")
            .select("id")
            .eq("tenant_id", tenant_id)
            .eq("direction", "inbound")
            .eq("draft_status", "pending")
            .is_("ai_draft", "null")
            .execute()
        )
        return response.data
    except Exception as e:
        logger.error("fetch_undrafted_inbound_messages failed for tenant %s: %s", tenant_id, e)
        raise DatabaseError(str(e)) from e


def fetch_latest_messages_for_tenant(tenant_id: str):
    """Latest *inbound* message per conversation — used to sort a conversation
    into Inbox vs Rejected by its is_question flag, which is only ever set on
    inbound (customer) messages. Outbound replies are excluded so a just-
    answered conversation doesn't fall out of Inbox because its newest row
    (the reply) has no is_question value of its own.
    """
    try:
        supabase = get_supabase()
        response = (
            supabase.table("messages")
            .select("conversation_id, content, is_question, created_at")
            .eq("tenant_id", tenant_id)
            .eq("direction", "inbound")
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        logger.error("fetch_latest_messages_for_tenant failed for tenant %s: %s", tenant_id, e)
        raise DatabaseError(str(e)) from e


def fetch_message_by_id(message_id: str, tenant_id: str):
    try:
        supabase = get_supabase()
        response = (
            supabase.table("messages")
            .select("*")
            .eq("id", message_id)
            .eq("tenant_id", tenant_id)
            .maybe_single()
            .execute()
        )
        return response.data if response else None
    except Exception as e:
        logger.error("fetch_message_by_id failed for %s/%s: %s", message_id, tenant_id, e)
        raise DatabaseError(str(e)) from e


def set_latest_inbound_is_question(conversation_id: str, tenant_id: str, is_question: bool):
    """Flip the is_question flag on a conversation's most recent inbound message.

    is_question is the flag that sorts a conversation into Inbox (True) vs
    Rejected (False), so this is how a manual reject/unreject moves a whole
    conversation between the two views. Returns None if the conversation has no
    inbound message.
    """
    try:
        supabase = get_supabase()
        latest = (
            supabase.table("messages")
            .select("id")
            .eq("conversation_id", conversation_id)
            .eq("tenant_id", tenant_id)
            .eq("direction", "inbound")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not latest.data:
            return None
        return (
            supabase.table("messages")
            .update({"is_question": is_question})
            .eq("id", latest.data[0]["id"])
            .eq("tenant_id", tenant_id)
            .execute()
        )
    except Exception as e:
        logger.error("set_latest_inbound_is_question failed for %s/%s: %s", conversation_id, tenant_id, e)
        raise DatabaseError(str(e)) from e


def update_message_status_in_db(message_id: str, tenant_id: str, update_data: dict):
    try:
        supabase = get_supabase()
        response = (
            supabase.table("messages")
            .update(update_data)
            .eq("id", message_id)
            .eq("tenant_id", tenant_id)
            .execute()
        )
        return response.data
    except Exception as e:
        logger.error("update_message_status_in_db failed for %s/%s: %s", message_id, tenant_id, e)
        raise DatabaseError(str(e)) from e
