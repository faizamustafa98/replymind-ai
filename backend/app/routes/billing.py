"""Billing API routes: checkout sessions, subscription status, and Stripe webhook."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.middleware.auth import get_current_tenant_id
from app.schemas.billing import CheckoutSessionRequest, SubscriptionResponse
from app.services import billing_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(tenant_id: str = Depends(get_current_tenant_id)):
    subscription = await billing_service.get_subscription(tenant_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")
    return subscription


@router.post("/checkout")
async def create_checkout(
    payload: CheckoutSessionRequest,
    tenant_id: str = Depends(get_current_tenant_id),
):
    try:
        checkout_url = await billing_service.create_checkout_session(tenant_id, payload.target_plan)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"checkout_url": checkout_url}


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Called directly by Stripe when a checkout/payment event happens.

    No tenant auth dependency here - Stripe doesn't have a tenant JWT. Trust is
    established instead by verifying Stripe's request signature below.
    """
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")

    try:
        event = billing_service.verify_webhook_signature(payload, signature)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        tenant_id = session.get("client_reference_id")
        subscription_id = session.get("subscription")
        plan_tier = (session.get("metadata") or {}).get("target_plan")

        if tenant_id and plan_tier:
            try:
                await billing_service.handle_successful_payment(tenant_id, plan_tier, subscription_id)
            except ValueError as exc:
                # Don't fail the webhook (Stripe would retry indefinitely) - log and move on.
                logger.error("Stripe webhook: failed to apply plan update for tenant %s: %s", tenant_id, exc)

    return {"received": True}
