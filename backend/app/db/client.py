"""Shared, lazily-built Supabase client reused across all repositories."""

from functools import lru_cache

from supabase import create_client, Client
from app.config.settings import SUPABASE_URL, SUPABASE_SERVICE_KEY


@lru_cache
def get_supabase() -> Client:
    """Return a shared Supabase client, built once and reused for the life of the process.

    Every repository calls this instead of holding its own client, so caching it
    here (rather than constructing a new client on every call) avoids the cost of
    re-establishing the underlying HTTP session on every single database query.
    We validate the credentials here too, so a missing .env value fails fast with
    a clear message instead of a confusing error from deep inside supabase-py.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env before the app can reach the database."
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
