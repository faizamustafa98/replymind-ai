# schemas/billing.py
from typing import Literal, Optional

from pydantic import BaseModel


class SubscriptionResponse(BaseModel):
    """A tenant's current plan/subscription status."""

    plan_tier: str
    status: str
    stripe_subscription_id: Optional[str] = None
    plan_expires_at: Optional[str] = None
    # True when BILLING_MOCK_MODE is on, i.e. this is demo data, not a real Stripe subscription.
    is_mock: bool = False


class CheckoutSessionRequest(BaseModel):
    """Sent by the frontend when a user clicks "Upgrade"."""

    # Restricting to known plans rejects typos/unsupported plans at the request
    # boundary (422) instead of surfacing a confusing Stripe error later.
    target_plan: Literal["pro", "basic"]