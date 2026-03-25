"""Centralized exception handlers for ProSell SaaS API."""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from prosell.domain.exceptions.auth_exceptions import (
    AccountLockedException,
    AuthDomainException,
    BackupCodesExhaustedException,
    EmailAlreadyExistsException,
    EmailNotVerifiedException,
    Invalid2FACodeException,
    InvalidCredentialsException,
    UserNotFoundException,
)


async def auth_domain_exception_handler(
    _request: Request, exc: AuthDomainException
) -> JSONResponse:
    """
    Handle all authentication domain exceptions.

    Provides consistent error responses for all auth-related errors.
    """
    status_code = status.HTTP_400_BAD_REQUEST

    # Map specific exceptions to appropriate status codes
    if isinstance(exc, EmailAlreadyExistsException):
        status_code = status.HTTP_409_CONFLICT
    elif isinstance(exc, UserNotFoundException):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, InvalidCredentialsException):
        status_code = status.HTTP_401_UNAUTHORIZED
    elif isinstance(exc, EmailNotVerifiedException | AccountLockedException):
        status_code = status.HTTP_403_FORBIDDEN
    elif isinstance(exc, Invalid2FACodeException):
        status_code = status.HTTP_401_UNAUTHORIZED
    elif isinstance(exc, BackupCodesExhaustedException):
        status_code = status.HTTP_400_BAD_REQUEST

    return JSONResponse(
        status_code=status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "details": exc.details,
        },
    )


async def integrity_error_handler(_request: Request, exc: IntegrityError) -> JSONResponse:
    """
    Handle SQLAlchemy integrity errors (unique violations, foreign keys, etc.).

    Converts database integrity errors into user-friendly messages.
    """
    # Extract error details from the exception
    error_message = str(exc.orig) if hasattr(exc, "orig") else str(exc)

    # Common integrity errors
    if "unique constraint" in error_message.lower() or "duplicate key" in error_message.lower():
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "DuplicateEntry",
                "message": "A record with this information already exists.",
            },
        )

    if "foreign key constraint" in error_message.lower():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "InvalidReference",
                "message": "Referenced record does not exist.",
            },
        )

    # Generic database error
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "DatabaseError",
            "message": "A database error occurred. Please try again.",
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle all unhandled exceptions.

    Provides a generic error response for unexpected errors.
    Always adds CORS headers to prevent browser rejection.
    """
    import logging

    logger = logging.getLogger(__name__)
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    # Get origin from request for CORS
    origin = request.headers.get("origin")
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]

    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred. Please try again later.",
            "detail": str(exc) if logger.isEnabledFor(logging.DEBUG) else None,
        },
    )

    # Add CORS headers for error responses
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"

    return response
