"""Response models for the conversation list and the conversation-detail view."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.message import MessageOut

class ConversationSummary(BaseModel):
    id: str
    customer_name: Optional[str]
    customer_identifier: str
    channel: str
    status: str
    message_count: int
    unread_count: int
    last_message_at: Optional[datetime]
    last_message_preview: Optional[str] = None

class ConversationDetail(BaseModel):
    conversation: ConversationSummary
    messages: List[MessageOut]
