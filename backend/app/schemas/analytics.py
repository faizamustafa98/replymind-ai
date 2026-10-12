# schemas/analytics.py
from datetime import datetime

from pydantic import BaseModel, Field


class AnalyticsSummary(BaseModel):
    """Summary numbers shown at the top of the analytics dashboard."""

    total_conversations: int = Field(ge=0)
    pending_review_count: int = Field(ge=0)
    resolved_count: int = Field(ge=0)
    total_messages: int = Field(ge=0)
    period_start: datetime
    period_end: datetime
    # True when ANALYTICS_MOCK_MODE is on, so the frontend can flag this as demo
    # data instead of presenting it as a real tenant's activity.
    is_mock: bool = False