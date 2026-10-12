"""Auth API routes: signup-status check and new-user registration for the
Google/OAuth sign-in flow (Supabase Auth handles the credential itself)."""

from fastapi import APIRouter, Depends

from app.middleware.auth import get_current_auth_user
from app.schemas.auth import AuthStatusOut, RegisterRequest
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me", response_model=AuthStatusOut)
def get_me(auth_user: dict = Depends(get_current_auth_user)):
    """After a Google sign-in, tell the frontend whether this user already has a
    profile (route to the app) or is new (route to the signup form)."""
    return auth_service.get_signup_status(auth_user["id"])


@router.post("/register", response_model=AuthStatusOut)
def register(payload: RegisterRequest, auth_user: dict = Depends(get_current_auth_user)):
    """Complete signup for a new authenticated user: create their tenant + profile
    using the name they provide and the email they authenticated with."""
    return auth_service.register(
        auth_user["id"], auth_user["email"], payload.full_name, payload.business_name
    )
