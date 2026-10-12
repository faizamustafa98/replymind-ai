"""Stripe subscription/billing logic and webhook signature verification."""

import os

import stripe
from dotenv import load_dotenv

from app.repositories import billing_repo

load_dotenv()

# Same rationale as analytics_service: lets billing be demoed before every
# tenant has a real Stripe subscription wired up. Live Stripe/Supabase calls
# take over automatically once BILLING_MOCK_MODE is unset.
MOCK_MODE = os.getenv("BILLING_MOCK_MODE", "false").lower() == "true"

_MOCK_SUBSCRIPTION = {
    "plan_tier": "pro",
    "status": "active",
    "stripe_subscription_id": "sub_mock_demo",
    "plan_expires_at": None,
    "is_mock": True,
}
_MOCK_CHECKOUT_URL = "https://checkout.stripe.com/mock-session"

_PLAN_PRICE_ENV_KEYS = {
    "pro": "STRIPE_PRICE_PRO",
    "basic": "STRIPE_PRICE_BASIC",
}


async def get_subscription(tenant_id: str) -> dict | None:
    if MOCK_MODE:
        return dict(_MOCK_SUBSCRIPTION)

    subscription = await billing_repo.get_subscription(tenant_id)
    if subscription is not None:
        subscription["is_mock"] = False
    return subscription


async def create_checkout_session(tenant_id: str, target_plan: str) -> str:
    """Create a Stripe checkout session and return the URL to redirect the user to."""
    if MOCK_MODE:
        return _MOCK_CHECKOUT_URL

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe.api_key:
        raise RuntimeError("STRIPE_SECRET_KEY must be set in .env")

    price_env_key = _PLAN_PRICE_ENV_KEYS.get(target_plan)
    price_id = os.getenv(price_env_key) if price_env_key else None
    if not price_id:
        raise ValueError(f"Unsupported or unconfigured billing plan: {target_plan}")

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url="https://replymind.app/billing/success",
            cancel_url="https://replymind.app/billing/cancel",
            client_reference_id=tenant_id,
            # Recorded so the webhook handler can read back which plan this
            # checkout was for once Stripe confirms payment.
            metadata={"target_plan": target_plan},
        )
    except stripe.error.StripeError as exc:
        # Never leak raw Stripe internals to the client - wrap in our own error.
        raise RuntimeError(f"Stripe checkout session creation failed: {exc.user_message or exc}") from exc

    return session.url


def verify_webhook_signature(payload: bytes, signature: str) -> stripe.Event:
    """Verify a webhook request actually came from Stripe.

    Without this, anyone could POST a fake "payment succeeded" event to this
    endpoint and upgrade a tenant's plan for free - Stripe signs every real
    webhook with a secret only Stripe and this server know.
    """
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET must be set in .env")

    try:
        return stripe.Webhook.construct_event(payload, signature, webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError) as exc:
        raise ValueError("Invalid Stripe webhook signature") from exc


async def handle_successful_payment(tenant_id: str, plan_tier: str, subscription_id: str) -> None:
    """Apply a confirmed Stripe payment to the tenant's plan."""
    await billing_repo.update_plan(tenant_id, plan_tier, subscription_id)
