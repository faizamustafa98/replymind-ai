"""FastAPI auth dependencies: resolve a Supabase token to the caller's tenant id."""

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.client import get_supabase
from app.repositories.user_repo import UserRepository

security = HTTPBearer()


def _verify_token(token: str) -> str:
    """Resolves a Supabase access token to a user id, or raises 401."""
    try:
        response = get_supabase().auth.get_user(token)
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user_id = getattr(response.user, "id", None) if response and response.user else None
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing user ID")
    return user_id


def _tenant_for_user(user_id: str) -> str:
    tenant_id = UserRepository().get_tenant_id_by_user_id(user_id)
    if not tenant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not linked to this user")
    return tenant_id


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    return _verify_token(credentials.credentials)


def get_current_auth_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Resolve a Supabase token to the caller's id and (Google/OAuth-verified)
    email, without requiring a linked tenant yet — used by the signup flow,
    where a brand-new user has authenticated but has no profile row.
    """
    try:
        response = get_supabase().auth.get_user(credentials.credentials)
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user = response.user if response and response.user else None
    user_id = getattr(user, "id", None)
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing user ID")
    return {"id": user_id, "email": getattr(user, "email", None)}


def get_current_tenant_id(
    user_id: str = Depends(get_current_user_id)
) -> str:
    return _tenant_for_user(user_id)


def get_tenant_id_from_query_token(token: str = Query(...)) -> str:
    """Same as get_current_tenant_id, but for endpoints a browser navigates
    to directly (full-page redirects, e.g. starting the Gmail OAuth flow) —
    those can't carry a custom Authorization header, so the token travels as
    a query parameter instead.
    """
    return _tenant_for_user(_verify_token(token))
