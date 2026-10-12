"""Tenant profile, business-info, and channel-config read/update logic."""

from datetime import datetime, timezone

from app.config import settings
from app.exceptions import ValidationError
from app.repositories import tenant_repo

# UI-facing channel name -> integration_configs.channel enum value.
# "widget" is the UI's name for the "livechat" channel_type.
CHANNEL_DB_NAME = {"whatsapp": "whatsapp", "email": "email", "widget": "livechat"}


def get_tenant(tenant_id: str) -> dict:
    tenant = tenant_repo.get_tenant(tenant_id)
    tenant["channels"] = get_channels(tenant_id)
    return tenant


def update_tenant(tenant_id: str, patch: dict) -> dict:
    """Applies only the fields the client actually sent.

    business_profile is a jsonb blob holding free-form fields (operating
    hours, location, delivery options, ...) — it's shallow-merged rather
    than overwritten so patching one key doesn't wipe the others.
    """
    fields = {key: value for key, value in patch.items() if key != "business_profile"}

    # fetched once and reused below for both the business_profile merge and the
    # drafting/auto-reply cross-field check, since either may need the prior state
    needs_current = "business_profile" in patch or "draft_frequency" in patch or "auto_reply_level" in patch
    current = tenant_repo.get_tenant(tenant_id) if needs_current else None

    if "business_profile" in patch:
        fields["business_profile"] = {
            **current.get("business_profile", {}),
            **patch["business_profile"],
        }

    if "draft_frequency" in patch or "auto_reply_level" in patch:
        # auto-reply can only be on while drafting is on — validate the *resulting*
        # state, not just the patch, since a client may only send one of the two fields
        draft_frequency = fields.get("draft_frequency", current.get("draft_frequency"))
        auto_reply_level = fields.get("auto_reply_level", current.get("auto_reply_level"))
        if draft_frequency == "off" and auto_reply_level != "never":
            raise ValidationError("Auto-reply requires drafting to be enabled")

    if not fields:
        return get_tenant(tenant_id)

    updated = tenant_repo.update_tenant(tenant_id, fields)
    updated["channels"] = get_channels(tenant_id)
    return updated


def get_business_info(tenant_id: str) -> dict:
    """Return the whole business_profile so every field the client stored (from
    onboarding or profile edits) is shown — not just a hardcoded subset."""
    return tenant_repo.get_tenant(tenant_id).get("business_profile") or {}


def update_business_info(tenant_id: str, patch: dict) -> dict:
    """Shallow-merge whatever business-info keys the client sends into
    business_profile (so editing one field doesn't wipe the others), and return
    the full merged blob."""
    if not patch:
        return get_business_info(tenant_id)

    current = tenant_repo.get_tenant(tenant_id)
    merged_profile = {**current.get("business_profile", {}), **patch}
    tenant_repo.update_tenant(tenant_id, {"business_profile": merged_profile})
    return merged_profile


def get_channels(tenant_id: str) -> dict:
    rows_by_channel = {row["channel"]: row for row in tenant_repo.get_integrations(tenant_id)}
    return {
        ui_name: _channel_out(rows_by_channel.get(db_name))
        for ui_name, db_name in CHANNEL_DB_NAME.items()
    }


def connect_channel(tenant_id: str, ui_channel: str, config: dict) -> dict:
    # No real handshake yet — this marks the channel connected immediately.
    # Once actual WhatsApp/email integration exists, swap status to
    # "pending_verification" here and flip it to "connected" from that
    # verification callback instead.
    row = tenant_repo.upsert_integration(
        tenant_id,
        CHANNEL_DB_NAME[ui_channel],
        {"status": "connected", "connected_at": datetime.now(timezone.utc).isoformat(), "config": config},
    )
    return _channel_out(row)


def disconnect_channel(tenant_id: str, ui_channel: str) -> dict:
    row = tenant_repo.upsert_integration(
        tenant_id,
        CHANNEL_DB_NAME[ui_channel],
        {"status": "disconnected", "connected_at": None},
    )
    return _channel_out(row)


def connect_whatsapp(tenant_id: str, phone_number: str, phone_number_id: str | None = None) -> dict:
    """Connect the WhatsApp channel for a tenant.

    Stores the phone_number_id inbound webhooks are keyed on (defaults to the
    app's configured business number in the single-number demo) plus the
    owner-facing display number, and marks the channel connected so inbound
    messages route to this tenant's inbox.
    """
    number = (phone_number or "").strip()
    if not number:
        raise ValidationError("A WhatsApp number is required to connect")

    resolved_id = phone_number_id or settings.WHATSAPP_PHONE_NUMBER_ID
    # Inbound webhooks are keyed on phone_number_id alone, so two tenants holding
    # the same one makes routing ambiguous — their messages would land in
    # whichever inbox won the tie. Refuse the second claim instead.
    conflict = next(
        (
            row
            for row in tenant_repo.get_whatsapp_integrations(resolved_id)
            if row["tenant_id"] != tenant_id
        ),
        None,
    )
    if conflict:
        raise ValidationError(
            "That WhatsApp number is already connected to another account. "
            "Disconnect it there first, or use a different number."
        )

    config = {
        "phone_number_id": resolved_id,
        "display_number": number,
    }
    row = tenant_repo.upsert_integration(
        tenant_id,
        "whatsapp",
        {"status": "connected", "connected_at": datetime.now(timezone.utc).isoformat(), "config": config},
    )
    return _whatsapp_status_out(row)


def get_whatsapp_status(tenant_id: str) -> dict:
    return _whatsapp_status_out(tenant_repo.get_integration(tenant_id, "whatsapp"))


def disconnect_whatsapp(tenant_id: str) -> dict:
    row = tenant_repo.upsert_integration(
        tenant_id, "whatsapp", {"status": "disconnected", "connected_at": None}
    )
    return _whatsapp_status_out(row)


def _whatsapp_status_out(row: dict | None) -> dict:
    if not row:
        return {"status": "disconnected", "connected_at": None, "phone_number": None}
    return {
        "status": row["status"],
        "connected_at": row.get("connected_at"),
        "phone_number": (row.get("config") or {}).get("display_number"),
    }


def _channel_out(row: dict | None) -> dict:
    if not row:
        return {"status": "disconnected", "connected_at": None, "config": {}}
    return {
        "status": row["status"],
        "connected_at": row.get("connected_at"),
        "config": row.get("config") or {},
    }
