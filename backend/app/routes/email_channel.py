"""Gmail OAuth connect flow plus status/disconnect for the email channel.
Registered ahead of the generic /channels/{channel_type} routes in
tenants.py so these static "email" paths take priority for this channel,
while whatsapp/widget keep going through the generic handler.
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse

from app.config import settings
from app.middleware.auth import get_current_tenant_id, get_tenant_id_from_query_token
from app.schemas.email import EmailChannelStatus
from app.services import email_credentials_service, gmail_oauth_service

router = APIRouter(prefix="/api/tenant/channels/email", tags=["email-channel"])


@router.get("/connect")
def connect_email(
    tenant_id: str = Depends(get_tenant_id_from_query_token),
    redirect: str | None = Query(default=None),
):
    """Starts the Gmail OAuth flow — a full-page redirect the frontend
    triggers with `window.location.href`, not a fetch() call, since only a
    real browser navigation can land the owner on Google's consent screen.

    `redirect` is an optional in-app path to return to after connecting (e.g.
    the onboarding channels step); without it the owner lands on settings.
    """
    return RedirectResponse(gmail_oauth_service.build_auth_url(tenant_id, redirect))


@router.get("/oauth/callback")
def oauth_callback(code: str = Query(...), state: str = Query(...)):
    """Google redirects here after consent. `state` carries the tenant_id (and an
    optional return path) set when the auth URL was built — there's no logged-in
    request context at this point, Google is the one calling us.
    """
    tenant_id, return_path = gmail_oauth_service.decode_state(state)
    refresh_token = gmail_oauth_service.exchange_code_for_refresh_token(code)
    access_token = gmail_oauth_service.get_access_token(refresh_token)
    email = gmail_oauth_service.fetch_gmail_address(access_token)

    email_credentials_service.save_gmail_connection(tenant_id, email, refresh_token)

    return RedirectResponse(f"{settings.FRONTEND_URL}{_safe_return_path(return_path)}")


def _safe_return_path(return_path: str | None) -> str:
    """Only allow an in-app relative path (guards against open redirects). Falls
    back to the settings view."""
    default = "/dashboard?view=settings&email_connected=true"
    if not return_path or not return_path.startswith("/") or return_path.startswith("//"):
        return default
    sep = "&" if "?" in return_path else "?"
    return f"{return_path}{sep}email_connected=true"


@router.get("/status", response_model=EmailChannelStatus)
def email_status(tenant_id: str = Depends(get_current_tenant_id)):
    return EmailChannelStatus(**email_credentials_service.get_status(tenant_id))


@router.post("/disconnect", response_model=EmailChannelStatus)
def disconnect_email(tenant_id: str = Depends(get_current_tenant_id)):
    return EmailChannelStatus(**email_credentials_service.disconnect(tenant_id))
