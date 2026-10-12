"""Maps an authenticated Supabase user id to their tenant id, and reads/creates
the app-side user profile row used by the signup flow."""

from typing import Optional

from app.db.client import get_supabase
from app.exceptions import UpstreamServiceError


class UserRepository:

    def __init__(self):
        self.sb = get_supabase()

    def get_tenant_id_by_user_id(self, user_id: str) -> Optional[str]:
        result = (
            self.sb.table("users")
            .select("tenant_id")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return result.data.get("tenant_id") if result.data else None


def get_user(user_id: str) -> dict | None:
    try:
        result = (
            get_supabase().table("users").select("*").eq("id", user_id).maybe_single().execute()
        )
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to fetch user: {exc}") from exc
    return result.data if result else None


def create_user(fields: dict) -> dict:
    try:
        result = get_supabase().table("users").insert(fields).execute()
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to create user: {exc}") from exc
    if not result.data:
        raise UpstreamServiceError("User creation returned no data")
    return result.data[0]


def update_user(user_id: str, fields: dict) -> dict | None:
    try:
        result = get_supabase().table("users").update(fields).eq("id", user_id).execute()
    except Exception as exc:
        raise UpstreamServiceError(f"Failed to update user: {exc}") from exc
    return result.data[0] if result.data else None
