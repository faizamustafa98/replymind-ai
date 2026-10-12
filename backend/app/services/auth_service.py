"""Signup-status checks and new-user provisioning for OAuth (Google) sign-in.

Supabase Auth handles the actual credential (Google login / password); this
layer owns the app-side profile: whether an authenticated user already has a
users row + tenant (existing user) or still needs to complete signup (new user),
and creating those rows when they do.
"""

from app.exceptions import ValidationError
from app.repositories import tenant_repo, user_repo

# Defaults for a freshly-provisioned tenant, matching the columns a normal
# signup creates. onboarding/profile flags start False so the frontend can walk
# the new user through onboarding.
_NEW_TENANT_DEFAULTS = {
    "bot_persona": "friendly",
    "bot_language": "en",
    "plan_tier": "free",
    "auto_reply_level": "average",
    "draft_frequency": "off",
    "rag_confidence_threshold": 0.3,
    "rag_context_window": 10,
    "business_profile": {},
    "onboarding_completed": False,
    "profile_completed": False,
    "documents_uploaded": False,
}


def get_signup_status(user_id: str) -> dict:
    """Whether this authenticated user already has a profile (existing user) or
    still needs to complete signup (new user). The frontend calls this right
    after a Google sign-in to decide: send to the app, or to the signup form.
    """
    user = user_repo.get_user(user_id)
    if not user:
        return {"registered": False, "needs_signup": True, "tenant_id": None, "user": None}
    needs_signup = not (user.get("full_name") or "").strip()
    return {
        "registered": True,
        "needs_signup": needs_signup,
        "tenant_id": user.get("tenant_id"),
        "user": user,
    }


def register(user_id: str, email: str | None, full_name: str, business_name: str | None = None) -> dict:
    """Provision a new user: create their tenant + users row. Idempotent — if a
    profile already exists (e.g. created by a prior call), it's returned as-is
    (only filling in a missing name), so this can't duplicate or overwrite data.

    email comes from the verified Supabase/Google token, not the client, so it
    is always the address the user actually authenticated with.
    """
    full_name = (full_name or "").strip()
    if not full_name:
        raise ValidationError("full_name is required to complete signup")

    existing = user_repo.get_user(user_id)
    if existing:
        if not (existing.get("full_name") or "").strip():
            user_repo.update_user(user_id, {"full_name": full_name})
            existing["full_name"] = full_name
        return {
            "registered": True,
            "needs_signup": False,
            "tenant_id": existing.get("tenant_id"),
            "user": existing,
        }

    tenant = tenant_repo.create_tenant(
        {"business_name": business_name or "New Business", **_NEW_TENANT_DEFAULTS}
    )
    try:
        user = user_repo.create_user(
            {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "tenant_id": tenant["id"],
                "role": "owner",
            }
        )
    except Exception:
        # The tenant was created a step before the user; don't leave it orphaned
        # if the user insert fails (e.g. the id isn't a real auth user).
        tenant_repo.delete_tenant(tenant["id"])
        raise
    return {"registered": True, "needs_signup": False, "tenant_id": tenant["id"], "user": user}
