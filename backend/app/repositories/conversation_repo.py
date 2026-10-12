"""Supabase queries for the conversations table (list, fetch, status updates)."""

import logging
from app.db.client import get_supabase
from app.middleware.exceptions import DatabaseError

logger = logging.getLogger(__name__)


def fetch_all_conversations(tenant_id: str):
    try:
        supabase = get_supabase()
        response = (
            supabase.table("conversations")
            .select("*")
            .eq("tenant_id", tenant_id)
            .order("last_message_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        logger.error("fetch_all_conversations failed for tenant %s: %s", tenant_id, e)
        raise DatabaseError(str(e)) from e


def get_or_create_conversation(tenant_id: str, channel: str, customer_identifier: str, customer_name: str | None = None):
    """Looks up the open conversation for this (tenant, channel, customer), creating one if none exists."""
    try:
        supabase = get_supabase()
        existing = (
            supabase.table("conversations")
            .select("*")
            .eq("tenant_id", tenant_id)
            .eq("channel", channel)
            .eq("customer_identifier", customer_identifier)
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing.data[0]

        response = (
            supabase.table("conversations")
            .insert({
                "tenant_id": tenant_id,
                "channel": channel,
                "customer_identifier": customer_identifier,
                "customer_name": customer_name,
                "status": "open",
            })
            .execute()
        )
        return response.data[0]
    except Exception as e:
        logger.error("get_or_create_conversation failed for tenant=%s channel=%s: %s", tenant_id, channel, e)
        raise DatabaseError(str(e)) from e


def mark_conversation_as_read(conversation_id: str, tenant_id: str):
    try:
        supabase = get_supabase()
        response = (
            supabase.table("conversations")
            .update({"unread_count": 0})
            .eq("id", conversation_id)
            .eq("tenant_id", tenant_id)
            .execute()
        )
        return response.data
    except Exception as e:
        logger.error("mark_conversation_as_read failed for %s/%s: %s", conversation_id, tenant_id, e)
        raise DatabaseError(str(e)) from e


def fetch_conversation_by_id(conversation_id: str, tenant_id: str):
    try:
        supabase = get_supabase()
        response = (
            supabase.table("conversations")
            .select("*")
            .eq("id", conversation_id)
            .eq("tenant_id", tenant_id)
            .maybe_single()
            .execute()
        )
        return response.data if response else None
    except Exception as e:
        logger.error("fetch_conversation_by_id failed for %s/%s: %s", conversation_id, tenant_id, e)
        raise DatabaseError(str(e)) from e
