"""Read-only count queries against Supabase backing the analytics dashboard."""

import asyncio

from app.db.client import get_supabase

# Read-only count queries backing the analytics dashboard summary.
# supabase-py's client is synchronous under the hood. Calling .execute() directly
# from an `async def` would block the whole FastAPI event loop for every other
# in-flight request while waiting on the network. asyncio.to_thread offloads the
# blocking call to a worker thread so other requests keep being served.


async def count_conversations(tenant_id: str) -> int:
    supabase = get_supabase()
    result = await asyncio.to_thread(
        lambda: supabase.table("conversations")
        .select("id", count="exact")
        .eq("tenant_id", tenant_id)
        .execute()
    )
    return result.count


async def count_messages_by_status(tenant_id: str, statuses: list[str]) -> int:
    supabase = get_supabase()
    result = await asyncio.to_thread(
        lambda: supabase.table("messages")
        .select("id", count="exact")
        .eq("tenant_id", tenant_id)
        .in_("draft_status", statuses)
        .execute()
    )
    return result.count