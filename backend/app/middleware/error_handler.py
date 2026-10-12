"""Registers app-wide exception handlers that map errors to JSON HTTP responses."""

import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

from app.exceptions import AppError
from app.middleware.exceptions import DatabaseError, NotFoundError

logger = logging.getLogger("replymind")


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"message": exc.detail, "status_code": exc.status_code}},
        )

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        """Translate service/repository errors into their declared HTTP status."""
        message = exc.detail if exc.status_code < 500 else "Upstream service error"
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"message": message, "status_code": exc.status_code}},
        )

    @app.exception_handler(NotFoundError)
    async def not_found_error_handler(request: Request, exc: NotFoundError):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": {"message": str(exc), "status_code": status.HTTP_404_NOT_FOUND}},
        )

    @app.exception_handler(DatabaseError)
    async def database_error_handler(request: Request, exc: DatabaseError):
        # DatabaseError is our own repo-layer wrapper around a failed Supabase call
        # (see app/repositories/conversation_repo.py and message_repo.py). It's
        # handled the same way as a raw postgrest APIError below: log the real
        # cause for us, but only tell the client "database error", not internals.
        logger.error("Database error on %s: %s", request.url.path, exc)
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"error": {"message": "Database error", "status_code": status.HTTP_502_BAD_GATEWAY}},
        )

    @app.exception_handler(APIError)
    async def supabase_api_error_handler(request: Request, exc: APIError):
        logger.error("Supabase error on %s: %s", request.url.path, exc)
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"error": {"message": "Database error", "status_code": status.HTTP_502_BAD_GATEWAY}},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s", request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": {"message": "Internal server error", "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR}},
        )
