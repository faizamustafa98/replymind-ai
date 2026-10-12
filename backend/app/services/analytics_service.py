"""Builds the analytics dashboard summary (with a mock-data mode for demos)."""

import asyncio
import os
from datetime import datetime, timedelta, timezone

from app.repositories import analytics_repo
from app.schemas.analytics import AnalyticsSummary

# The RAG pipeline (which creates real conversations/messages) isn't built yet,
# so the tables this reads from stay empty in dev/demo environments. Setting
# ANALYTICS_MOCK_MODE=true returns realistic placeholder numbers instead of
# real (currently-empty) counts. No other code needs to change when RAG ships -
# just unset this flag and live queries take over automatically.
MOCK_MODE = os.getenv("ANALYTICS_MOCK_MODE", "false").lower() == "true"

_MOCK_COUNTS = {
    "total_conversations": 128,
    "pending_review_count": 14,
    "resolved_count": 96,
}


async def get_dashboard_summary(tenant_id: str) -> AnalyticsSummary:
    period_end = datetime.now(timezone.utc)
    period_start = period_end - timedelta(days=30)

    if MOCK_MODE:
        return AnalyticsSummary(
            **_MOCK_COUNTS,
            total_messages=_MOCK_COUNTS["pending_review_count"] + _MOCK_COUNTS["resolved_count"],
            period_start=period_start,
            period_end=period_end,
            is_mock=True,
        )

    try:
        # Independent counts - run concurrently instead of one after another.
        total_conversations, pending_count, resolved_count = await asyncio.gather(
            analytics_repo.count_conversations(tenant_id),
            analytics_repo.count_messages_by_status(tenant_id, ["ready"]),
            analytics_repo.count_messages_by_status(
                tenant_id, ["auto_sent", "approved_sent", "manually_sent"]
            ),
        )
    except Exception as exc:
        raise RuntimeError(f"Failed to load analytics for tenant '{tenant_id}'") from exc

    return AnalyticsSummary(
        total_conversations=total_conversations,
        pending_review_count=pending_count,
        resolved_count=resolved_count,
        total_messages=pending_count + resolved_count,
        period_start=period_start,
        period_end=period_end,
        is_mock=False,
    )