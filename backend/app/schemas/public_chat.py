"""Request model for the public, unauthenticated landing-page chat widget."""

from pydantic import BaseModel, Field

MAX_PUBLIC_MESSAGE_LENGTH = 500


class PublicChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_PUBLIC_MESSAGE_LENGTH)
