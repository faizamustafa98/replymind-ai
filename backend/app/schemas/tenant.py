"""Tenant, channel, and business-info models plus their shared enum literals."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

# Mirrors the Postgres enum types on the tenants / integration_configs tables
AutoReplyLevel = Literal["always", "most", "average", "less", "never"]
DraftFrequency = Literal["off", "most", "average", "less"]
IntegrationStatus = Literal["connected", "pending_verification", "disconnected", "error"]
ChannelType = Literal["whatsapp", "email", "widget"]


class ChannelStatus(BaseModel):
    status: IntegrationStatus
    connected_at: datetime | None = None
    config: dict[str, Any] = {}


class ChannelsOut(BaseModel):
    whatsapp: ChannelStatus
    email: ChannelStatus
    widget: ChannelStatus


class ChannelConnectRequest(BaseModel):
    """Placeholder for real handshake data (e.g. WhatsApp phone_number_id) until
    the actual integration flow exists — for now the caller can pass anything.
    """

    config: dict[str, Any] = {}


class TenantOut(BaseModel):
    id: str
    business_name: str
    business_type: str | None = None
    bot_persona: str
    bot_language: str
    plan_tier: str
    auto_reply_level: AutoReplyLevel
    draft_frequency: DraftFrequency
    rag_context_window: int
    rag_confidence_threshold: float
    business_profile: dict[str, Any] = {}
    channels: ChannelsOut
    onboarding_completed: bool
    profile_completed: bool
    documents_uploaded: bool
    created_at: datetime
    updated_at: datetime


class TenantUpdate(BaseModel):
    """All fields optional — PATCH only touches fields the client sends."""

    business_name: str | None = None
    business_type: str | None = None
    bot_persona: str | None = None
    bot_language: str | None = None
    auto_reply_level: AutoReplyLevel | None = None
    draft_frequency: DraftFrequency | None = None
    rag_context_window: int | None = None
    rag_confidence_threshold: float | None = None
    business_profile: dict[str, Any] | None = None


class BusinessInfoOut(BaseModel):
    """The business_profile blob the "Core Business Information" UI shows.

    extra="allow" so every key the client/onboarding stores (address,
    opening_hours, website_url, phone_number, ...) is returned as-is, instead of
    being filtered down to a fixed few and appearing to "vanish" on the profile.
    """

    model_config = ConfigDict(extra="allow")

    operating_hours: str | None = None
    location: str | None = None
    delivery_options: str | None = None


class BusinessInfoUpdate(BaseModel):
    """All fields optional — PATCH only touches fields the client sends.

    extra="allow" so arbitrary business-info keys are accepted and persisted,
    instead of Pydantic silently dropping any field not named here (which is why
    profile edits weren't saving).
    """

    model_config = ConfigDict(extra="allow")

    operating_hours: str | None = None
    location: str | None = None
    delivery_options: str | None = None
