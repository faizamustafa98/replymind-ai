"""Supabase queries for tenants and their per-channel integration configs."""

import logging
import time

from app.config.settings import TENANT_CACHE_TTL_SECONDS
from app.db.client import get_supabase
from app.exceptions import NotFoundError, UpstreamServiceError

logger = logging.getLogger("replymind")

# In-process cache for get_tenant(): tenant rows (business_name, bot_persona,
# rag_confidence_threshold, ...) are read on every inbound message but change
# rarely, so repeated Supabase reads for the same tenant are pure overhead.
# update_tenant()/delete_tenant() below refresh or drop a tenant's entry
# immediately, so the TTL only bounds staleness from writes made outside this
# module (e.g. a direct DB edit) — not from the normal settings-save path.
_tenant_cache: dict[str, tuple[dict, float]] = {}


def get_tenant(tenant_id: str) -> dict:
    cached = _tenant_cache.get(tenant_id)
    if cached is not None and time.monotonic() - cached[1] < TENANT_CACHE_TTL_SECONDS:
        return cached[0]
    try:
        response = (
            get_supabase().table("tenants").select("*").eq("id", tenant_id).limit(1).execute()
        )
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to fetch tenant: {exc}") from exc
    if not response.data:
        raise NotFoundError(f"Tenant {tenant_id} not found")
    tenant = response.data[0]
    _tenant_cache[tenant_id] = (tenant, time.monotonic())
    return tenant


def create_tenant(fields: dict) -> dict:
    try:
        response = get_supabase().table("tenants").insert(fields).execute()
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to create tenant: {exc}") from exc
    if not response.data:
        raise UpstreamServiceError("Tenant creation returned no data")
    return response.data[0]


def delete_tenant(tenant_id: str) -> None:
    try:
        get_supabase().table("tenants").delete().eq("id", tenant_id).execute()
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to delete tenant: {exc}") from exc
    _tenant_cache.pop(tenant_id, None)


def update_tenant(tenant_id: str, fields: dict) -> dict:
    try:
        response = get_supabase().table("tenants").update(fields).eq("id", tenant_id).execute()
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to update tenant: {exc}") from exc
    if not response.data:
        raise NotFoundError(f"Tenant {tenant_id} not found")
    tenant = response.data[0]
    _tenant_cache[tenant_id] = (tenant, time.monotonic())
    return tenant


def get_integrations(tenant_id: str) -> list[dict]:
    try:
        response = (
            get_supabase()
            .table("integration_configs")
            .select("*")
            .eq("tenant_id", tenant_id)
            .execute()
        )
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to fetch integrations: {exc}") from exc
    return response.data or []


def get_integration(tenant_id: str, channel: str) -> dict | None:
    try:
        response = (
            get_supabase()
            .table("integration_configs")
            .select("*")
            .eq("tenant_id", tenant_id)
            .eq("channel", channel)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to fetch integration: {exc}") from exc
    return response.data[0] if response.data else None


def get_whatsapp_integrations(phone_number_id: str | None = None) -> list[dict]:
    """Live WhatsApp integration rows, optionally narrowed to one phone_number_id.

    Ordered by connected_at so callers that must pick one row pick the same one
    every time rather than whatever order Supabase happened to return.
    """
    try:
        rows = (
            get_supabase()
            .table("integration_configs")
            .select("tenant_id, config, status, connected_at")
            .eq("channel", "whatsapp")
            .in_("status", ["connected", "error"])
            .order("connected_at")
            .execute()
            .data
        ) or []
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to look up WhatsApp tenant: {exc}") from exc

    if phone_number_id is None:
        return rows
    return [r for r in rows if (r.get("config") or {}).get("phone_number_id") == phone_number_id]


def get_email_integrations_by_address(email: str) -> list[dict]:
    """Tenants currently connected to a specific Gmail address on the email channel.

    Mirrors get_whatsapp_integrations: fetched broadly and filtered in Python
    since config is an opaque jsonb blob, not a queryable column. Used to stop
    the same inbox being connected to two tenants — each would poll and
    auto-reply to the same messages independently otherwise.
    """
    try:
        rows = (
            get_supabase()
            .table("integration_configs")
            .select("tenant_id, config, status")
            .eq("channel", "email")
            .eq("status", "connected")
            .execute()
            .data
        ) or []
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to look up email tenant: {exc}") from exc
    return [r for r in rows if (r.get("config") or {}).get("email") == email]


def get_tenant_by_whatsapp_number(phone_number_id: str | None) -> dict | None:
    """The tenant that owns an incoming WhatsApp message's phone_number_id.

    Prefers an integration_configs row whose config.phone_number_id matches the
    incoming number. Falls back to the single connected WhatsApp tenant so a
    one-number demo works without per-tenant number config — but only when there
    is exactly one, since with several the "fallback" was really a coin flip that
    delivered messages into an unrelated tenant's inbox. Returns None if no
    tenant owns the number.
    """
    rows = get_whatsapp_integrations()
    if not rows:
        return None

    matches = [r for r in rows if (r.get("config") or {}).get("phone_number_id") == phone_number_id]
    if len(matches) > 1:
        logger.error(
            "WhatsApp phone_number_id=%s is claimed by %d tenants (%s) — routing to the "
            "earliest-connected one; disconnect the others to remove the ambiguity",
            phone_number_id,
            len(matches),
            ", ".join(r["tenant_id"] for r in matches),
        )
    if matches:
        return get_tenant(matches[0]["tenant_id"])

    if len(rows) == 1:
        return get_tenant(rows[0]["tenant_id"])
    logger.warning(
        "No tenant claims WhatsApp phone_number_id=%s and %d tenants are connected — "
        "refusing to guess",
        phone_number_id,
        len(rows),
    )
    return None


def get_tenants_with_connected_integration(channel: str) -> list[dict]:
    """Tenants the poller should check. Includes "error" alongside "connected"
    so an account whose token failed once isn't sidelined forever — the poller
    retries it and self-heals the status back to "connected" if the token
    works again. Only a genuinely revoked token stays in "error".
    """
    try:
        response = (
            get_supabase()
            .table("integration_configs")
            .select("tenant_id")
            .eq("channel", channel)
            .in_("status", ["connected", "error"])
            .execute()
        )
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to list tenants connected on '{channel}': {exc}") from exc
    return response.data or []


def upsert_integration(tenant_id: str, channel: str, fields: dict) -> dict:
    """Insert-or-update the one row for (tenant_id, channel).

    No unique constraint is assumed on the table, so this looks the row up
    first rather than relying on a DB-level upsert.
    """
    try:
        existing = (
            get_supabase()
            .table("integration_configs")
            .select("id")
            .eq("tenant_id", tenant_id)
            .eq("channel", channel)
            .limit(1)
            .execute()
        )
        if existing.data:
            response = (
                get_supabase()
                .table("integration_configs")
                .update(fields)
                .eq("id", existing.data[0]["id"])
                .execute()
            )
        else:
            response = (
                get_supabase()
                .table("integration_configs")
                .insert({**fields, "tenant_id": tenant_id, "channel": channel})
                .execute()
            )
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to update integration: {exc}") from exc
    if not response.data:
        raise UpstreamServiceError("Integration upsert returned no data")
    return response.data[0]
