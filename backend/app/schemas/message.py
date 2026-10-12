"""Message response model, draft-status enum, and the status-update payload."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class DraftStatus(str, Enum):
    pending = "pending"
    ready = "ready"
    auto_sent = "auto_sent"
    approved_sent = "approved_sent"
    manually_sent = "manually_sent"
    discarded = "discarded"

class MessageOut(BaseModel):
    id: str
    conversation_id: str
    content: str
    direction: str
    ai_draft: Optional[str]
    draft_status: Optional[str]
    final_reply: Optional[str]
    is_question: Optional[bool]
    rag_confidence: Optional[float]
    sent_at: Optional[datetime]
    created_at: datetime

class MessageStatusUpdate(BaseModel):
    draft_status: DraftStatus
    final_reply: Optional[str] = None
