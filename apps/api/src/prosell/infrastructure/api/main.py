"""FastAPI application entry point for ProSell SaaS."""

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy.exc import IntegrityError
from starlette.middleware.base import RequestResponseEndpoint

from prosell.core.config import settings
from prosell.domain.exceptions.auth_exceptions import AuthDomainException
from prosell.infrastructure.api.middleware import limiter
from prosell.infrastructure.api.middleware.exception_handlers import (
    auth_domain_exception_handler,
    generic_exception_handler,
    integrity_error_handler,
    pydantic_validation_error_handler,
)
from prosell.infrastructure.api.routers import (
    admin_router,
    auth_router,
    branch_router,
    category_router,
    facebook_router,
    health_router,
    image_router,
    lead_router,
    org_router,
    product_router,
    publisher_router,
    team_router,
    user_branch_router,
    vehicle_router,
    wallet_router,
)
from prosell.infrastructure.api.routers.appointment_router import router as appointment_router
from prosell.infrastructure.api.routers.test_router import router as test_router
from prosell.infrastructure.api.routers.vendedor_router import router as vendedor_router
from prosell.infrastructure.api.routers.webhook_router import router as webhook_router


# Response Models
class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    environment: str


class RootResponse(BaseModel):
    """Root endpoint response."""

    message: str
    version: str
    docs: str


app = FastAPI(
    title="ProSell SaaS API",
    description="Vehicle market analysis platform",
    version="2.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)


# =============================================================================
# EXCEPTION HANDLERS (Centralized)
# =============================================================================

app.add_exception_handler(AuthDomainException, auth_domain_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(ValidationError, pydantic_validation_error_handler)  # type: ignore[arg-type]
app.add_exception_handler(IntegrityError, integrity_error_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, generic_exception_handler)


# Rate limit exception handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(_request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom handler for rate limit exceeded."""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "RateLimitExceeded",
            "message": "Too many requests. Please try again later.",
            "retry_after": str(getattr(exc, "retry_after", 60)),
        },
    )


# =============================================================================
# RATE LIMITING
# =============================================================================

# Register rate limiter with the app
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


# =============================================================================
# SECURITY HEADERS MIDDLEWARE (Enhanced)
# =============================================================================


@app.middleware("http")
async def security_headers_middleware(
    request: Request,
    call_next: RequestResponseEndpoint,
) -> Response:
    """Add comprehensive security headers to all responses."""
    response = await call_next(request)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Content Security Policy (basic - enhance as needed)
    # SECURITY: 'unsafe-inline' allows inline scripts/styles which is vulnerable to XSS.
    # For production, MUST migrate to nonce/hash-based CSP:
    # - Generate nonce per request: nonce = base64.b64encode(os.urandom(16)).decode()
    # - Pass to templates: return templates.TemplateResponse(..., context={"nonce": nonce})
    # - Use in CSP: f"script-src 'self' 'nonce-{nonce}';"
    # - Use in templates: <script nonce="{{ nonce }}">
    # Track: https://github.com/rap77/prosell-sass/issues/SECURITY-001
    # Allow Swagger UI CDN for API docs (development only)
    # In production, consider bundling Swagger UI assets locally
    csp_base = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "img-src 'self' data: https:; "
        "font-src 'self' https://cdn.jsdelivr.net; "
        "connect-src 'self' https://cdn.jsdelivr.net; "
        "frame-ancestors 'none';"
    )
    response.headers["Content-Security-Policy"] = csp_base

    # Referrer Policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Permissions Policy (restrict browser features)
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    # Remove server header (don't expose technology stack)
    if "Server" in response.headers:
        del response.headers["Server"]

    return response


# =============================================================================
# CORS MIDDLEWARE
# NOTE: Must be added AFTER @app.middleware("http") decorators so that
# CORSMiddleware becomes the OUTERMOST middleware (added last = outermost in
# Starlette's LIFO add_middleware stack). This ensures CORSMiddleware
# intercepts OPTIONS preflights before any other middleware processes them.
# =============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# INCLUDE ROUTERS
# =============================================================================

# Auth router with /api/v1/ prefix for consistency
app.include_router(
    auth_router,
    prefix="/api/v1/auth",
    tags=["Authentication"],
)

app.include_router(
    org_router,
    prefix="/api/v1/org",
    tags=["Organizations"],
)

app.include_router(
    branch_router,
    prefix="/api/v1/branches",
    tags=["Branchs"],
)

app.include_router(user_branch_router)

app.include_router(
    team_router,
    prefix="/api/v1/teams",
    tags=["Teams"],
)

app.include_router(
    vendedor_router,
    prefix="/api/v1/vendedores",
    tags=["Vendedores"],
)

app.include_router(
    wallet_router,
    prefix="/api/v1/wallet",
    tags=["Wallets"],
)

app.include_router(
    category_router,
    prefix="/api/v1/categories",
    tags=["Categories"],
)

app.include_router(
    product_router,
    prefix="/api/v1/products",
    tags=["Products"],
)

app.include_router(
    vehicle_router,
    prefix="/api/v1/vehicles",
    tags=["Vehicles"],
)

app.include_router(
    image_router,
    prefix="/api/v1",
    tags=["Images"],
)

app.include_router(
    health_router,
    prefix="/api/v1",
    tags=["Health"],
)

app.include_router(
    facebook_router,
    prefix="/api/v1",
    tags=["Facebook Marketplace"],
)

app.include_router(
    publisher_router,
    prefix="/api/v1",
    tags=["Publisher"],
)

app.include_router(
    admin_router,
    prefix="/api/v1/admin",
    tags=["Admin"],
)

app.include_router(
    lead_router,
    prefix="/api/v1/leads",
    tags=["Leads"],
)

app.include_router(
    appointment_router,
    prefix="/api/v1/appointments",
    tags=["Appointments"],
)

app.include_router(
    webhook_router,
    prefix="/api/v1",
    tags=["Webhooks"],
)

# Test utilities router (ONLY in development/testing)
if settings.environment in ["development", "testing"]:
    app.include_router(
        test_router,
        prefix="/api/v1",
        tags=["Test Utilities"],
    )


# =============================================================================
# HEALTH CHECK (no rate limiting)
# =============================================================================


@app.get("/health")
async def health_check() -> JSONResponse:
    """Health check endpoint (not rate limited)."""
    return JSONResponse(
        content={
            "status": "healthy",
            "environment": "staging",  # hardcoded test
        }
    )


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint (not rate limited)."""
    return {
        "message": "ProSell SaaS API",
        "version": "2.0.0",
        "docs": "/docs" if settings.debug else "Documentation disabled in production",
    }
