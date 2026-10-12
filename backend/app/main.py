import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.middleware.error_handler import register_exception_handlers
from app.repositories import tenant_repo
from app.routes import (
    analytics,
    auth,
    billing,
    conversations,
    documents,
    email_channel,
    health,
    messages,
    public_chat,
    rag,
    tenants,
    whatsapp_channel,
    whatsapp_webhook,
)
from app.services.email_inbound_service import fetch_new_emails

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

EMAIL_POLL_INTERVAL_SECONDS = 10
DISABLE_EMAIL_POLL = os.getenv("DISABLE_EMAIL_POLL", "false").lower() == "true"


async def _poll_connected_email_inboxes() -> None:
    """Background loop: checks every connected tenant's Gmail inbox for new mail.

    Runs for the lifetime of the process: errors for one tenant (revoked
    token, a slow Gmail API response, ...) are logged and skipped so they
    never take down polling for everyone else. Tenants are polled
    concurrently rather than one at a time, so a backlog-heavy inbox on one
    tenant can't delay the others behind it in the same cycle.
    """
    while True:
        try:
            tenants_connected = await asyncio.to_thread(
                tenant_repo.get_tenants_with_connected_integration, "email"
            )
            await asyncio.gather(
                *(_poll_one_tenant(tenant["tenant_id"]) for tenant in tenants_connected),
                return_exceptions=True,
            )
        except Exception:
            logger.exception("Email poll cycle failed")
        await asyncio.sleep(EMAIL_POLL_INTERVAL_SECONDS)


async def _poll_one_tenant(tenant_id: str) -> None:
    try:
        await fetch_new_emails(tenant_id)
    except Exception:
        logger.exception("Email poll failed for tenant %s", tenant_id)


@asynccontextmanager
async def lifespan(app: FastAPI):
    poll_task = None
    if DISABLE_EMAIL_POLL:
        logger.info("Email polling disabled locally (DISABLE_EMAIL_POLL=true)")
    else:
        poll_task = asyncio.create_task(_poll_connected_email_inboxes())
    yield
    if poll_task:
        poll_task.cancel()


app = FastAPI(title="ReplyMind API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",                       # local dev
        "https://replymindai.netlify.app",             # production frontend (Netlify)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(auth.router)
# Registered before tenants.router so its static /channels/email/* paths win
# over the generic /channels/{channel_type}/* routes for the email channel.
app.include_router(email_channel.router)
# Same reasoning as email_channel: static /channels/whatsapp/* wins over the
# generic /channels/{channel_type}/* routes in tenants.router.
app.include_router(whatsapp_channel.router)
app.include_router(tenants.router)
app.include_router(documents.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(rag.router)
app.include_router(analytics.router)
app.include_router(billing.router)
app.include_router(public_chat.router)
app.include_router(whatsapp_webhook.router)
