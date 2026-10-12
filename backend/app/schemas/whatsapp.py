"""Request/response models for connecting the WhatsApp channel (mirrors email)."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.tenant import IntegrationStatus


class WhatsAppConnectRequest(BaseModel):
    # The business WhatsApp number the owner is connecting (shown back in settings).
    phone_number: str = Field(min_length=3, max_length=32)
    # Meta's phone_number_id for that number. Optional in the single-number demo —
    # defaults to the app's configured WHATSAPP_PHONE_NUMBER_ID, which is what
    # inbound webhooks are actually keyed on.
    phone_number_id: str | None = None


class WhatsAppChannelStatus(BaseModel):
    status: IntegrationStatus
    connected_at: datetime | None = None
    phone_number: str | None = None
