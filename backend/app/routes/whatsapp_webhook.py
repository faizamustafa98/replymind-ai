"""Public WhatsApp webhook endpoints (Meta Cloud API). Two responsibilities:
1. GET  — Meta's one-time verification handshake when the webhook URL is registered.
2. POST — inbound message events, delivered continuously afterwards.

Neither route uses tenant auth (Meta can't send our JWTs). Trust comes from the
GET verify-token check and the POST HMAC signature check instead. The POST stores
the message and returns 200 fast, then drafts in the background so Meta doesn't
time out and retry.
"""

import asyncio
import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse

from app.config import settings
from app.services import whatsapp_inbound_service, whatsapp_service

logger = logging.getLogger("replymind")
router = APIRouter(prefix="/webhooks/whatsapp", tags=["whatsapp-webhook"])


@router.get("")
async def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
):
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN:
        return PlainTextResponse(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    raw_body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    if not whatsapp_service.verify_signature(raw_body, signature):
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload = await request.json()
    stored = await asyncio.to_thread(whatsapp_inbound_service.ingest_message, payload)
    if not stored:
        return {"status": "ignored"}

    tenant_id, message_id = stored
    background_tasks.add_task(whatsapp_inbound_service.draft_and_autosend, tenant_id, message_id)
    return {"status": "received"}
