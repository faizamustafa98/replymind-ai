"""Repo/service-layer exception types translated to HTTP responses by error_handler."""


class NotFoundError(Exception):
    """Raised when a requested resource doesn't exist (or isn't visible to this tenant)."""


class DatabaseError(Exception):
    """Raised when a database/network operation fails unexpectedly."""
