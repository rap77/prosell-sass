# OAuth Backend Callbacks - PRP

**Status**: ⏳ IN PROGRESS
**Sprint**: Sprint 1-2 Completion
**Branch**: `feature/oauth-backend-callbacks`
**Created**: 2026-02-28
**Last Updated**: 2026-02-28

## Overview

Completar el sistema OAuth 2.0 backend agregando los endpoints de autorización y callback para Google y Facebook. Actualmente existe el `OAuthLoginUseCase` pero faltan los endpoints que implementan el flujo OAuth 2.0 completo (Authorization Code Flow).

**Estado Actual**: 80% completado
- ✅ OAuthLoginUseCase implementado
- ✅ OAuthRepository (domain + infrastructure) implementado
- ✅ OAuthAccount model implementado
- ✅ Endpoint `/auth/oauth/{provider}` (recibe datos ya procesados)
- ❌ **FALTAN**: Endpoints de authorize y callback para Google
- ❌ **FALTAN**: Endpoints de authorize y callback para Facebook
- ❌ **FALTAN**: Integración con `requests-oauthlib` para OAuth handshake

## Referencias

- **Documentación OAuth Backend**: `docs/technical-debt/oauth-external-setup.md`
- **Auth System PRP**: `docs/prps/auth-system.md`
- **OAuth2 RFC 6749**: https://datatracker.ietf.org/doc/html/rfc6749
- **Google OAuth 2.0**: https://developers.google.com/identity/protocols/oauth2
- **Facebook OAuth 2.0**: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OAuth 2.0 Authorization Code Flow                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Frontend → GET /auth/oauth/{provider}/authorize                         │
│     └─> Backend genera state_token, redirect a provider                     │
│                                                                             │
│  2. User autentica en Google/Facebook                                       │
│     └─> Provider redirige a: GET /auth/oauth/{provider}/callback           │
│            ?code=AUTHORIZATION_CODE&state=STATE_TOKEN                       │
│                                                                             │
│  3. Backend → POST https://oauth2.googleapis.com/token (Google)            │
│              o POST https://graph.facebook.com/v18.0/oauth/access_token     │
│     └─> Intercambia code por access_token                                   │
│                                                                             │
│  4. Backend → GET https://www.googleapis.com/oauth2/v2/userinfo (Google)   │
│              o GET https://graph.facebook.com/me?fields=... (Facebook)     │
│     └─> Obtiene user info con el access_token                               │
│                                                                             │
│  5. Backend → OAuthLoginUseCase.execute()                                   │
│     └─> Crea/actualiza usuario, genera JWT tokens                          │
│                                                                             │
│  6. Backend → Frontend (redirect con tokens en cookies)                     │
│     └─> httpOnly cookies: access_token, refresh_token, user_data           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Componentes a Implementar

### 1. Configuración OAuth

**Archivo**: `apps/api/src/prosell/core/config.py`

```python
# OAuth Settings
class OAuthSettings(BaseSettings):
    """OAuth provider credentials."""

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/oauth/google/callback"

    facebook_app_id: str = ""
    facebook_app_secret: str = ""
    facebook_redirect_uri: str = "http://localhost:8000/api/v1/auth/oauth/facebook/callback"

    # Frontend URLs para redirect después del login
    frontend_success_url: str = "http://localhost:3000/dashboard"
    frontend_failure_url: str = "http://localhost:3000/auth/login?error="

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
```

### 2. OAuth Service (Domain Layer Port)

**Archivo**: `apps/api/src/prosell/domain/ports/i_oauth_service.py`

```python
"""OAuth service interface (Port in Clean Architecture)."""

from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class OAuthUserInfo:
    """User info from OAuth provider."""
    provider_user_id: str
    email: str
    full_name: str
    avatar_url: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: datetime | None = None

@dataclass
class OAuthAuthorizeResult:
    """Result of OAuth authorize initiation."""
    authorization_url: str
    state_token: str

@dataclass
class OAuthCallbackResult:
    """Result of OAuth callback processing."""
    user_info: OAuthUserInfo
    provider: str

class IOAuthService(ABC):
    """
    OAuth service interface.

    This is a Port in Clean Architecture terminology.
    Handles OAuth 2.0 authorization code flow.
    """

    @abstractmethod
    async def initiate_authorization(
        self,
        provider: str,
        redirect_uri: str,
    ) -> OAuthAuthorizeResult:
        """
        Initiate OAuth authorization flow.

        Generates authorization URL and state token for CSRF protection.

        Args:
            provider: "google" or "facebook"
            redirect_uri: Callback URL registered with OAuth provider

        Returns:
            Authorization URL and state token
        """
        pass

    @abstractmethod
    async def process_callback(
        self,
        provider: str,
        code: str,
        state: str,
        redirect_uri: str,
    ) -> OAuthCallbackResult:
        """
        Process OAuth callback.

        Exchanges authorization code for access token,
        then fetches user info from provider.

        Args:
            provider: "google" or "facebook"
            code: Authorization code from provider
            state: State token for CSRF validation
            redirect_uri: Callback URL (must match authorize)

        Returns:
            User info from OAuth provider

        Raises:
            HTTPException: If OAuth flow fails
        """
        pass

    @abstractmethod
    async def validate_state(self, state: str) -> bool:
        """
        Validate OAuth state token for CSRF protection.

        Args:
            state: State token to validate

        Returns:
            True if valid, False otherwise
        """
        pass
```

### 3. OAuth Service Implementation

**Archivo**: `apps/api/src/prosell/infrastructure/services/oauth_service_impl.py`

```python
"""OAuth service implementation using requests-oauthlib."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import httpx
from jose import jwt

from prosell.core.config import OAuthSettings
from prosell.domain.ports.i_oauth_service import (
    IOAuthService,
    OAuthAuthorizeResult,
    OAuthCallbackResult,
    OAuthUserInfo,
)

class OAuthServiceImpl(IOAuthService):
    """OAuth service implementation using httpx for HTTP requests."""

    def __init__(self, settings: OAuthSettings) -> None:
        self.settings = settings
        # State tokens storage (in production, use Redis)
        self._state_tokens: dict[str, datetime] = {}

    async def initiate_authorization(
        self,
        provider: str,
        redirect_uri: str,
    ) -> OAuthAuthorizeResult:
        """Initiate OAuth authorization flow."""
        if provider == "google":
            return await self._initiate_google_authorization(redirect_uri)
        elif provider == "facebook":
            return await self._initiate_facebook_authorization(redirect_uri)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    async def _initiate_google_authorization(
        self,
        redirect_uri: str,
    ) -> OAuthAuthorizeResult:
        """Initiate Google OAuth authorization."""
        base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        state = str(uuid4())

        # Store state token for validation (expires in 10 minutes)
        self._state_tokens[state] = datetime.now(UTC) + timedelta(minutes=10)

        params = {
            "client_id": self.settings.google_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
        }

        # Build authorization URL
        auth_url = f"{base_url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"

        return OAuthAuthorizeResult(
            authorization_url=auth_url,
            state_token=state,
        )

    async def _initiate_facebook_authorization(
        self,
        redirect_uri: str,
    ) -> OAuthAuthorizeResult:
        """Initiate Facebook OAuth authorization."""
        base_url = "https://www.facebook.com/v18.0/dialog/oauth"
        state = str(uuid4())

        # Store state token for validation
        self._state_tokens[state] = datetime.now(UTC) + timedelta(minutes=10)

        params = {
            "client_id": self.settings.facebook_app_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "email,public_profile",
            "state": state,
        }

        auth_url = f"{base_url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"

        return OAuthAuthorizeResult(
            authorization_url=auth_url,
            state_token=state,
        )

    async def process_callback(
        self,
        provider: str,
        code: str,
        state: str,
        redirect_uri: str,
    ) -> OAuthCallbackResult:
        """Process OAuth callback."""
        # Validate state token
        if not await self.validate_state(state):
            raise HTTPException(status_code=400, detail="Invalid or expired state token")

        # Remove used state token
        self._state_tokens.pop(state, None)

        if provider == "google":
            return await self._process_google_callback(code, redirect_uri)
        elif provider == "facebook":
            return await self._process_facebook_callback(code, redirect_uri)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    async def _process_google_callback(
        self,
        code: str,
        redirect_uri: str,
    ) -> OAuthCallbackResult:
        """Process Google OAuth callback."""
        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": self.settings.google_client_id,
                    "client_secret": self.settings.google_client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()

        # Fetch user info
        async with httpx.AsyncClient() as client:
            user_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={
                    "Authorization": f"Bearer {token_data['access_token']}",
                },
            )
            user_response.raise_for_status()
            user_data = user_response.json()

        return OAuthCallbackResult(
            user_info=OAuthUserInfo(
                provider_user_id=user_data["id"],
                email=user_data["email"],
                full_name=user_data["name"],
                avatar_url=user_data.get("picture"),
                access_token=token_data.get("access_token"),
                refresh_token=token_data.get("refresh_token"),
                expires_at=datetime.now(UTC) + timedelta(seconds=int(token_data.get("expires_in", 3600))),
            ),
            provider="google",
        )

    async def _process_facebook_callback(
        self,
        code: str,
        redirect_uri: str,
    ) -> OAuthCallbackResult:
        """Process Facebook OAuth callback."""
        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            token_response = await client.get(
                "https://graph.facebook.com/v18.0/oauth/access_token",
                params={
                    "code": code,
                    "client_id": self.settings.facebook_app_id,
                    "client_secret": self.settings.facebook_app_secret,
                    "redirect_uri": redirect_uri,
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()

        # Fetch user info
        async with httpx.AsyncClient() as client:
            user_response = await client.get(
                "https://graph.facebook.com/me",
                params={
                    "fields": "id,email,name,picture.width(512)",
                    "access_token": token_data["access_token"],
                },
            )
            user_response.raise_for_status()
            user_data = user_response.json()

        avatar_url = None
        if user_data.get("picture"):
            avatar_url = user_data["picture"]["data"]["url"]

        return OAuthCallbackResult(
            user_info=OAuthUserInfo(
                provider_user_id=user_data["id"],
                email=user_data.get("email", ""),
                full_name=user_data.get("name", ""),
                avatar_url=avatar_url,
                access_token=token_data.get("access_token"),
            ),
            provider="facebook",
        )

    async def validate_state(self, state: str) -> bool:
        """Validate OAuth state token."""
        if state not in self._state_tokens:
            return False

        # Check if expired
        expiry = self._state_tokens[state]
        if datetime.now(UTC) > expiry:
            self._state_tokens.pop(state, None)
            return False

        return True
```

### 4. Nuevos Endpoints en Auth Router

**Archivo**: `apps/api/src/prosell/infrastructure/api/routers/auth_router.py`

```python
# Agregar imports
from fastapi import Query
from fastapi.responses import RedirectResponse
from prosell.domain.ports.i_oauth_service import IOAuthService
from prosell.infrastructure.api.dependencies import get_oauth_service

# Agregar endpoints

@router.get("/oauth/{provider}/authorize")
async def oauth_authorize(
    provider: str,
    oauth_service: Annotated[IOAuthService, Depends(get_oauth_service)],
) -> RedirectResponse:
    """
    Initiate OAuth authorization flow.

    Redirects user to OAuth provider (Google/Facebook) for authentication.

    Path params:
        provider: "google" or "facebook"

    Returns:
        Redirect to OAuth provider authorization page
    """
    redirect_uri = f"{settings.api_base_url}/api/v1/auth/oauth/{provider}/callback"

    result = await oauth_service.initiate_authorization(
        provider=provider,
        redirect_uri=redirect_uri,
    )

    # Redirect user to OAuth provider
    return RedirectResponse(url=result.authorization_url, status_code=302)


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str = Query(..., description="Authorization code from OAuth provider"),
    state: str = Query(..., description="State token for CSRF protection"),
    error: str | None = Query(None, description="Error from OAuth provider (if failed)"),
    response: Response = None,
    oauth_service: Annotated[IOAuthService, Depends(get_oauth_service)],
    oauth_use_case: Annotated[OAuthLoginUseCase, Depends(get_oauth_login_use_case)],
) -> RedirectResponse:
    """
    OAuth callback endpoint.

    Called by OAuth provider after user authentication.
    Processes authorization code, fetches user info, and logs in user.

    Path params:
        provider: "google" or "facebook"

    Query params:
        code: Authorization code (if successful)
        state: State token for CSRF validation
        error: Error description (if failed)

    Returns:
        Redirect to frontend with auth cookies (success) or error page (failure)
    """
    # Handle OAuth error from provider
    if error:
        error_url = f"{settings.frontend_failure_url}{error}"
        return RedirectResponse(url=error_url, status_code=302)

    try:
        # Process callback: exchange code for user info
        redirect_uri = f"{settings.api_base_url}/api/v1/auth/oauth/{provider}/callback"
        callback_result = await oauth_service.process_callback(
            provider=provider,
            code=code,
            state=state,
            redirect_uri=redirect_uri,
        )

        # Login using OAuthLoginUseCase
        oauth_uc_request = OAuthLoginUCRequest(
            provider=callback_result.provider,
            provider_user_id=callback_result.user_info.provider_user_id,
            email=callback_result.user_info.email,
            full_name=callback_result.user_info.full_name,
            avatar_url=callback_result.user_info.avatar_url,
            access_token=callback_result.user_info.access_token,
            refresh_token=callback_result.user_info.refresh_token,
            expires_at=callback_result.user_info.expires_at,
        )

        login_result = await oauth_use_case.execute(oauth_uc_request)

        # Set httpOnly cookies
        access_token_expiry = datetime.now(UTC) + timedelta(minutes=15)
        refresh_token_expiry = datetime.now(UTC) + timedelta(days=7)

        response.set_cookie(
            key="access_token",
            value=login_result.access_token,
            expires=access_token_expiry,
            httponly=True,
            secure=True,
            samesite="strict",
        )

        response.set_cookie(
            key="refresh_token",
            value=login_result.refresh_token,
            expires=refresh_token_expiry,
            httponly=True,
            secure=True,
            samesite="strict",
        )

        response.set_cookie(
            key="user_data",
            value=login_result.user.model_dump_json(),
            expires=refresh_token_expiry,
            httponly=True,
            secure=True,
            samesite="strict",
        )

        # Redirect to frontend on success
        return RedirectResponse(
            url=settings.frontend_success_url,
            status_code=302,
        )

    except HTTPException as e:
        # OAuth flow failed
        error_url = f"{settings.frontend_failure_url}{e.detail}"
        return RedirectResponse(url=error_url, status_code=302)

    except Exception as e:
        # Unexpected error
        logger.error(f"OAuth callback error: {e}")
        error_url = f"{settings.frontend_failure_url}internal_error"
        return RedirectResponse(url=error_url, status_code=302)
```

### 5. Dependency Injection

**Archivo**: `apps/api/src/prosell/infrastructure/api/dependencies.py`

```python
# Agregar
from prosell.domain.ports.i_oauth_service import IOAuthService
from prosell.infrastructure.services.oauth_service_impl import OAuthServiceImpl
from prosell.core.config import OAuthSettings

# Settings
def get_oauth_settings() -> OAuthSettings:
    """Get OAuth settings."""
    return OAuthSettings()

# Service
def get_oauth_service(
    settings: Annotated[OAuthSettings, Depends(get_oauth_settings)],
) -> IOAuthService:
    """Get OAuth service."""
    return OAuthServiceImpl(settings=settings)
```

### 6. Environment Variables

**Archivo**: `.env.example`

```bash
# ... existing config ...

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/oauth/google/callback

# OAuth - Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:8000/api/v1/auth/oauth/facebook/callback

# Frontend URLs
FRONTEND_SUCCESS_URL=http://localhost:3000/dashboard
FRONTEND_FAILURE_URL=http://localhost:3000/auth/login?error=
```

### 7. Frontend Integration

**Archivo**: `apps/web/src/components/oauth-login-button.tsx`

```typescript
"use client";

import { Button } from "@/components/ui/button";

interface OAuthLoginButtonProps {
  provider: "google" | "facebook";
  icon: React.ReactNode;
  label: string;
}

export function OAuthLoginButton({ provider, icon, label }: OAuthLoginButtonProps) {
  const handleOAuthLogin = () => {
    // Redirect to backend OAuth authorize endpoint
    window.location.href = `/api/v1/auth/oauth/${provider}/authorize`;
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleOAuthLogin}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </Button>
  );
}
```

## Checklist de Implementación

### Phase 1: Domain Layer
- [ ] Crear `domain/ports/i_oauth_service.py` - Interface IOAuthService
- [ ] Agregar OAuthSettings a `core/config.py`
- [ ] Crear DTOs OAuthAuthorizeResult, OAuthCallbackResult, OAuthUserInfo

### Phase 2: Infrastructure Layer
- [ ] Crear `infrastructure/services/oauth_service_impl.py` - Implementación IOAuthService
- [ ] Implementar `_initiate_google_authorization()` - Generar URL de Google OAuth
- [ ] Implementar `_initiate_facebook_authorization()` - Generar URL de Facebook OAuth
- [ ] Implementar `_process_google_callback()` - Exchange code + fetch user info
- [ ] Implementar `_process_facebook_callback()` - Exchange code + fetch user info
- [ ] Implementar `validate_state()` - Validar state token (CSRF protection)

### Phase 3: API Layer
- [ ] Agregar `get_oauth_service()` a `infrastructure/api/dependencies.py`
- [ ] Agregar `GET /auth/oauth/{provider}/authorize` endpoint
- [ ] Agregar `GET /auth/oauth/{provider}/callback` endpoint
- [ ] Implementar redirect con cookies httpOnly
- [ ] Manejo de errores con redirect a frontend

### Phase 4: Frontend Integration
- [ ] Crear `OAuthLoginButton` component
- [ ] Integrar botones en `/auth/login` page
- [ ] Agregar handling de redirect exitoso
- [ ] Agregar handling de redirect con error

### Phase 5: Configuration
- [ ] Agregar OAuthSettings a `.env.example`
- [ ] Documentar cómo obtener credenciales de Google OAuth
- [ ] Documentar cómo obtener credenciales de Facebook OAuth
- [ ] Actualizar `docs/technical-debt/oauth-external-setup.md`

### Phase 6: Testing
- [ ] Unit tests para `OAuthServiceImpl`
- [ ] Integration tests para endpoints authorize/callback
- [ ] E2E tests con mock OAuth provider
- [ ] Manual testing con Google OAuth playground
- [ ] Manual testing con Facebook OAuth playground

### Phase 7: Security & Polish
- [ ] Validar state token para CSRF protection
- [ ] Implementar expiración de state tokens (10 min)
- [ ] Rate limiting en `/authorize` endpoint
- [ ] Logging de OAuth flows (sin sensitive data)
- [ ] Error handling robusto con mensajes claros

## Tests

### Unit Tests

**Archivo**: `apps/api/tests/unit/test_oauth_service.py`

```python
"""Unit tests for OAuth service."""

import pytest
from datetime import UTC, datetime, timedelta

from prosell.infrastructure.services.oauth_service_impl import OAuthServiceImpl
from prosell.core.config import OAuthSettings


@pytest.fixture
def oauth_settings():
    """Fixture for OAuth settings."""
    return OAuthSettings(
        google_client_id="test-google-client-id",
        google_client_secret="test-google-secret",
        google_redirect_uri="http://localhost:8000/api/v1/auth/oauth/google/callback",
        facebook_app_id="test-facebook-app-id",
        facebook_app_secret="test-facebook-secret",
        facebook_redirect_uri="http://localhost:8000/api/v1/auth/oauth/facebook/callback",
    )


@pytest.fixture
def oauth_service(oauth_settings):
    """Fixture for OAuth service."""
    return OAuthServiceImpl(settings=oauth_settings)


class TestOAuthServiceInitiate:
    """Tests for OAuth authorization initiation."""

    @pytest.mark.asyncio
    async def test_initiate_google_authorization_generates_valid_url(
        self, oauth_service
    ):
        """Test that Google authorization URL is correctly formatted."""
        result = await oauth_service.initiate_authorization(
            provider="google",
            redirect_uri="http://localhost:8000/api/v1/auth/oauth/google/callback",
        )

        assert result.authorization_url.startswith("https://accounts.google.com/o/oauth2/v2/auth")
        assert "client_id=test-google-client-id" in result.authorization_url
        assert "response_type=code" in result.authorization_url
        assert "scope=openid" in result.authorization_url
        assert result.state_token is not None
        assert len(result.state_token) > 0

    @pytest.mark.asyncio
    async def test_initiate_facebook_authorization_generates_valid_url(
        self, oauth_service
    ):
        """Test that Facebook authorization URL is correctly formatted."""
        result = await oauth_service.initiate_authorization(
            provider="facebook",
            redirect_uri="http://localhost:8000/api/v1/auth/oauth/facebook/callback",
        )

        assert result.authorization_url.startswith("https://www.facebook.com/v18.0/dialog/oauth")
        assert "client_id=test-facebook-app-id" in result.authorization_url
        assert "response_type=code" in result.authorization_url
        assert result.state_token is not None


class TestOAuthServiceState:
    """Tests for state token validation."""

    @pytest.mark.asyncio
    async def test_valid_state_passes_validation(self, oauth_service):
        """Test that valid state token passes validation."""
        # Initiate to create state token
        result = await oauth_service.initiate_authorization("google", "http://localhost:8000/callback")

        # Validate should succeed
        is_valid = await oauth_service.validate_state(result.state_token)
        assert is_valid is True

    @pytest.mark.asyncio
    async def test_invalid_state_fails_validation(self, oauth_service):
        """Test that invalid state token fails validation."""
        is_valid = await oauth_service.validate_state("non-existent-state")
        assert is_valid is False

    @pytest.mark.asyncio
    async def test_expired_state_fails_validation(self, oauth_service):
        """Test that expired state token fails validation."""
        # Initiate to create state token
        result = await oauth_service.initiate_authorization("google", "http://localhost:8000/callback")

        # Manually expire the state token
        oauth_service._state_tokens[result.state_token] = datetime.now(UTC) - timedelta(minutes=1)

        # Validate should fail
        is_valid = await oauth_service.validate_state(result.state_token)
        assert is_valid is False

    @pytest.mark.asyncio
    async def test_state_is_consumed_after_validation(self, oauth_service):
        """Test that state token is consumed after callback processing."""
        # Initiate to create state token
        result = await oauth_service.initiate_authorization("google", "http://localhost:8000/callback")

        # Consume state token (simulating callback)
        oauth_service._state_tokens.pop(result.state_token, None)

        # Validate should fail (state no longer exists)
        is_valid = await oauth_service.validate_state(result.state_token)
        assert is_valid is False
```

### Integration Tests

**Archivo**: `apps/api/tests/integration/test_oauth_callback.py`

```python
"""Integration tests for OAuth callback endpoints."""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
class TestOAuthAuthorize:
    """Tests for OAuth authorize endpoint."""

    async def test_google_authorize_redirects_to_google(self, client: AsyncClient):
        """Test that authorize endpoint redirects to Google."""
        response = await client.get(
            "/api/v1/auth/oauth/google/authorize",
            follow_redirects=False,
        )

        assert response.status_code == 302
        assert response.headers["location"].startswith("https://accounts.google.com/o/oauth2/v2/auth")


@pytest.mark.asyncio
class TestOAuthCallback:
    """Tests for OAuth callback endpoint."""

    async def test_google_callback_with_valid_code_logs_in_user(
        self, client: AsyncClient, oauth_mock_responses
    ):
        """Test that callback with valid code logs in user."""
        # Mock httpx responses for token and userinfo
        with patch("httpx.AsyncClient.post", new=oauth_mock_responses["token"]), \
             patch("httpx.AsyncClient.get", new=oauth_mock_responses["userinfo"]):

            response = await client.get(
                "/api/v1/auth/oauth/google/callback",
                params={
                    "code": "valid-auth-code",
                    "state": "valid-state-token",
                },
                follow_redirects=False,
            )

            # Should redirect to frontend
            assert response.status_code == 302
            assert response.headers["location"].startswith("http://localhost:3000")

            # Should set auth cookies
            cookies = response.cookies
            assert "access_token" in cookies
            assert "refresh_token" in cookies
            assert "user_data" in cookies

    async def test_callback_with_error_redirects_to_login(self, client: AsyncClient):
        """Test that callback with error redirects to login."""
        response = await client.get(
            "/api/v1/auth/oauth/google/callback",
            params={
                "error": "access_denied",
                "state": "some-state",
            },
            follow_redirects=False,
        )

        assert response.status_code == 302
        assert "access_denied" in response.headers["location"]
        assert "localhost:3000" in response.headers["location"]
```

## Manejo de Errores

| Error | Causa | Solución |
|-------|-------|----------|
| `invalid_client` | Client ID/Secret incorrectos | Verificar `.env` y Google Cloud Console |
| `redirect_uri_mismatch` | Redirect URI no coincide | Verificar URI configurada en Google/Facebook |
| `invalid_state` | State token inválido o expirado | Reiniciar flow, generar nuevo state |
| `access_denied` | Usuario denegó permisos | Redirect a login con mensaje de error |
| `exchange_failed` | Error intercambiando code por token | Retry o mostrar error genérico |

## Seguridad

1. **State Token**: Protección CSRF - token único que debe coincidir en authorize y callback
2. **PKCE** (Opcional): Code Verifier/Challenge para apps móviles (no requerido para backend)
3. **httpOnly Cookies**: Tokens no accesibles desde JavaScript
4. **Secure Flag**: Cookies solo transmitidas por HTTPS
5. **SameSite=Strict**: Protección CSRF
6. **Rate Limiting**: Prevenir abuso del endpoint `/authorize`
7. **Token Expiration**: State tokens expiran en 10 minutos

## Cronograma Estimado

| Tarea | Tiempo Estimado |
|-------|-----------------|
| Phase 1: Domain Layer | 1 hora |
| Phase 2: Infrastructure | 3 horas |
| Phase 3: API Layer | 2 horas |
| Phase 4: Frontend Integration | 1 hora |
| Phase 5: Configuration | 1 hora |
| Phase 6: Testing | 3 horas |
| Phase 7: Security & Polish | 1 hora |
| **Total** | **12 horas** |

## Referencias Útiles

- **requests-oauthlib**: https://requests-oauthlib.readthedocs.io/
- **httpx (AsyncClient)**: https://www.python-httpx.org/
- **Google OAuth 2.0 Playground**: https://developers.google.com/oauthplayground/
- **Facebook Access Token Debugger**: https://developers.facebook.com/tools/debug-accesstoken/

## Decisiones Arquitectónicas

1. **httpx en lugar de requests-oauthlib**: httpx tiene async nativo y mejor API moderna
2. **State tokens en memoria**: Para MVP usar dict, en producción usar Redis
3. **Redirect desde backend**: Simplifica el flujo, el backend maneja todo el handshake OAuth
4. **Cookies en callback**: El redirect response incluye las cookies httpOnly
5. **Separación de concern**: IOAuthService es un Port, implementación es un Adapter

## Notas de Implementación

- El endpoint `/oauth/{provider}` existente NO se modifica - sigue siendo útil para testing y OAuth no-redirect flows
- Los nuevos endpoints siguen el patrón Authorization Code Flow de OAuth 2.0
- El frontend solo necesita hacer redirect a `/authorize`, todo lo demás lo maneja el backend
- Las credenciales OAuth están en `.env` - NUNCA commitear `.env` con secrets reales

---

**Última actualización**: 2026-02-28
**Próxima revisión**: Después de completar Phase 2
