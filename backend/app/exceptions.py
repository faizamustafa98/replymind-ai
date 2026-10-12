"""App-wide error types (with HTTP status codes) raised by services and repositories."""


class AppError(Exception):
    """Base class for errors that should be translated into an HTTP response.

    Raised from repository/service code; caught once, globally, in main.py
    so routers never need their own try/except blocks.
    """

    status_code = 500
    detail = "Internal server error"

    def __init__(self, detail: str | None = None):
        if detail:
            self.detail = detail
        super().__init__(self.detail)


class NotFoundError(AppError):
    status_code = 404
    detail = "Resource not found"


class ValidationError(AppError):
    status_code = 400
    detail = "Invalid request"


class UnauthorizedError(AppError):
    status_code = 401
    detail = "Missing or invalid tenant context"


class UnsupportedMediaTypeError(AppError):
    status_code = 415
    detail = "Unsupported file type"


class PayloadTooLargeError(AppError):
    status_code = 413
    detail = "File too large"


class UpstreamServiceError(AppError):
    """Supabase (DB or Storage) call failed or returned an unexpected shape."""

    status_code = 502
    detail = "Upstream service error"


class ChannelSendError(AppError):
    """A channel provider (Meta / Gmail) refused to deliver a reply.

    Deliberately a 4xx, not a 5xx: the cause is nearly always something the
    owner can act on (recipient outside the 24-hour window, number not on the
    test-recipient list, expired token), and the AppError handler only passes
    the real detail through to the client below 500.
    """

    status_code = 422
    detail = "The reply could not be delivered on this channel"
