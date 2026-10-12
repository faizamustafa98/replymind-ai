"""Reads/writes the tenants table's plan and Stripe-subscription columns."""

import asyncio

from app.db.client import get_supabase

# Reads and writes the "tenants" table's plan/subscription columns; Stripe is the
# source of truth for payment state, this just mirrors the result of that state.
# See analytics_repo.py for why calls are wrapped in asyncio.to_thread:
# supabase-py is a sync client, so this keeps blocking I/O off the event loop.


async def get_subscription(tenant_id: str) -> dict | None:
    supabase = get_supabase()
    result = await asyncio.to_thread(
        lambda: supabase.table("tenants")
        .select("plan_tier, stripe_subscription_id, plan_expires_at")
        .eq("id", tenant_id)
        .execute()
    )
    if not result.data:
        return None

    subscription = result.data[0]
    subscription["status"] = "active" if subscription.get("plan_tier") else "inactive"
    return subscription


async def update_plan(tenant_id: str, plan_tier: str, stripe_subscription_id: str) -> dict:
    supabase = get_supabase()
    result = await asyncio.to_thread(
        lambda: supabase.table("tenants")
        .update({"plan_tier": plan_tier, "stripe_subscription_id": stripe_subscription_id})
        .eq("id", tenant_id)
        .execute()
    )
    if not result.data:
        # No row matched tenant_id - fail loudly instead of returning a fake success.
        raise ValueError(f"No tenant found with id '{tenant_id}'; plan update skipped")
    return result.data[0]
