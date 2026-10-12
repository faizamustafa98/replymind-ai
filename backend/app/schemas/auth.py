"""Request/response models for the OAuth signup-status and registration routes."""

from pydantic import BaseModel, Field


class UserOut(BaseModel):
    id: str
    email: str | None = None
    full_name: str | None = None
    role: str | None = None
    tenant_id: str | None = None


class AuthStatusOut(BaseModel):
    registered: bool          # does a profile row exist for this authenticated user?
    needs_signup: bool        # true for a brand-new user who must complete signup
    tenant_id: str | None = None
    user: UserOut | None = None


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    business_name: str | None = Field(default=None, max_length=120)
