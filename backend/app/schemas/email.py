"""Response model describing a tenant's Gmail (email channel) connection status."""

from datetime import datetime

from pydantic import BaseModel

from app.schemas.tenant import IntegrationStatus


class EmailChannelStatus(BaseModel):
    status: IntegrationStatus
    connected_at: datetime | None = None
    email: str | None = None
