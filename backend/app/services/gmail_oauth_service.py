"""Google OAuth2 for the Gmail channel — plain REST calls against Google's
token endpoint, no google-auth SDK. gmail.send + gmail.readonly are the only
scopes requested: enough to read and reply to a tenant's own inbox.
"""

import base64
import json
from urllib.parse import urlencode

import requests

from app.config import settings
from app.exceptions import UpstreamServiceError


class TokenExpiredError(UpstreamServiceError):
    """The stored refresh_token no longer works — revoked by the user, or
    expired from six months of inactivity on a Testing-mode app.
    """

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile"
# gmail.readonly can't modify labels — marking a message read (removing the
# UNREAD label) needs gmail.modify, which is a superset covering both read
# and label writes. gmail.send is listed too for clarity even though modify
# already implies it.
SCOPES = "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send"
REQUEST_TIMEOUT_SECONDS = 10


def build_auth_url(tenant_id: str, return_path: str | None = None) -> str:
    """Google's consent-screen URL, carrying the tenant_id (and an optional
    post-connect return path, e.g. the onboarding channels step) through `state`.
    """
    params = {
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",  # required to receive a refresh_token
        "prompt": "consent",  # forces a refresh_token on every connect, not just the first
        "state": encode_state(tenant_id, return_path),
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def encode_state(tenant_id: str, return_path: str | None) -> str:
    """Pack tenant_id + optional return path into the OAuth `state` string. Falls
    back to the bare tenant_id when there's no return path (backwards compatible).
    """
    if not return_path:
        return tenant_id
    raw = json.dumps({"t": tenant_id, "r": return_path}).encode()
    return base64.urlsafe_b64encode(raw).decode()


def decode_state(state: str) -> tuple[str, str | None]:
    """Inverse of encode_state -> (tenant_id, return_path). A plain (un-encoded)
    state is treated as just the tenant_id."""
    try:
        raw = base64.urlsafe_b64decode(state.encode())
        data = json.loads(raw)
        return data["t"], data.get("r")
    except Exception:
        return state, None


def exchange_code_for_refresh_token(code: str) -> str:
    """Trades a one-time authorization code for a long-lived refresh_token."""
    response = _post_token({
        "code": code,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        "grant_type": "authorization_code",
    })
    refresh_token = response.get("refresh_token")
    if not refresh_token:
        # Happens if the user has already granted consent before without
        # "prompt=consent" forcing a new one — Google only issues a
        # refresh_token on the first authorization for a given client+scope.
        raise UpstreamServiceError("Google did not return a refresh token — revoke prior access and reconnect")
    return refresh_token


def get_access_token(refresh_token: str) -> str:
    """Trades a stored refresh_token for a fresh, short-lived access_token."""
    response = _post_token({"refresh_token": refresh_token, "grant_type": "refresh_token"})
    return response["access_token"]


def fetch_gmail_address(access_token: str) -> str:
    response = requests.get(
        PROFILE_URL, headers=auth_header(access_token), timeout=REQUEST_TIMEOUT_SECONDS
    )
    if not response.ok:
        raise UpstreamServiceError(f"Failed to fetch Gmail profile: {response.text}")
    return response.json()["emailAddress"]


def _post_token(extra_fields: dict) -> dict:
    response = requests.post(
        TOKEN_URL,
        data={
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
            **extra_fields,
        },
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    if response.status_code in (400, 401) and "invalid_grant" in response.text:
        raise TokenExpiredError("Gmail authorization has been revoked or expired")
    if not response.ok:
        raise UpstreamServiceError(f"Google OAuth request failed: {response.text}")
    return response.json()


def auth_header(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}
