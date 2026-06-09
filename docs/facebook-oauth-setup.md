# Facebook Marketplace OAuth Setup

Guía para configurar la integración OAuth 2.0 con Facebook Marketplace.

## Requisitos

- Cuenta de Facebook con acceso a [Facebook Developers](https://developers.facebook.com)
- Redis corriendo (para state tokens)
- API corriendo en `http://localhost:8000`

---

## 1. Crear App en Facebook Developers

1. Ir a https://developers.facebook.com/apps
2. Click **Create App** → Type: **Business**
3. Nombre: `ProSell Sandbox` (dev) / `ProSell` (prod)
4. En **Products**, agregar **Facebook Login**

### Configurar Facebook Login

En **Facebook Login → Settings**:

| Campo                     | Valor (dev)                                      | Valor (prod)                                            |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Valid OAuth Redirect URIs | `http://localhost:8000/api/v1/facebook/callback` | `https://api.tudominio.com/api/v1/facebook/callback`    |
| Deauthorize Callback URL  | (vacío)                                          | `https://api.tudominio.com/api/v1/facebook/deauthorize` |

### Scopes requeridos

En **App Review → Permissions**, solicitar:

- `pages_manage_posts`
- `pages_read_engagement`
- `pages_manage_metadata`
- `pages_read_user_content`
- `pages_manage_engagement`

> En desarrollo/sandbox, estos scopes funcionan sin App Review para el admin de la app.

### Obtener credenciales

En **Settings → Basic**:

- **App ID** → `FACEBOOK_OAUTH_APP_ID`
- **App Secret** → `FACEBOOK_OAUTH_APP_SECRET`

---

## 2. Variables de Entorno

Agregar al archivo `.env` de `apps/api/` (NUNCA commitear):

```bash
# Facebook OAuth
FACEBOOK_OAUTH_APP_ID=<app_id_aqui>
FACEBOOK_OAUTH_APP_SECRET=<app_secret_aqui>
FACEBOOK_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/facebook/callback

# Encriptación de access tokens (generar una vez, guardar en secrets manager)
# Generar con: python -c "import secrets; print(secrets.token_urlsafe(32))"
FACEBOOK_ENCRYPTION_KEY=<clave_32_bytes_aqui>

# URLs de redirect post-OAuth
OAUTH_FRONTEND_SUCCESS_URL=http://localhost:3000/dashboard
OAUTH_FRONTEND_FAILURE_URL=http://localhost:3000/auth/login?error=
```

### Generar encryption key

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 3. Exponer localhost con ngrok (desarrollo)

Facebook requiere HTTPS para el redirect URI en producción. En desarrollo usar ngrok:

```bash
# Docker Compose ya tiene ngrok configurado
docker compose -f docker/docker-compose.yml up ngrok

# Ver URL asignada
curl -s http://localhost:4040/api/tunnels | python3 -m json.tool | grep public_url
```

Actualizar `FACEBOOK_OAUTH_REDIRECT_URI` con la URL ngrok:

```bash
FACEBOOK_OAUTH_REDIRECT_URI=https://<tu-subdominio>.ngrok-free.app/api/v1/facebook/callback
```

Y agregar esa URL en Facebook Developers → Facebook Login → Valid OAuth Redirect URIs.

---

## 4. Flujo OAuth

```
Vendedor
  → POST /api/v1/facebook/authorize  (obtiene authorization_url)
  → Redirect a Facebook
  → Facebook pide permisos
  → Facebook redirige a GET /api/v1/facebook/callback?code=...&state=...
  → API valida state (Redis), intercambia code por token
  → API guarda FacebookAccount + FacebookPage(s) en DB
  → Redirect a frontend (/dashboard?account_id=...)
```

### Verificar flujo manualmente

```bash
# 1. Obtener JWT (login previo)
TOKEN="<jwt_del_vendedor>"
SELLER_ID="<uuid_del_vendedor>"

# 2. Iniciar autorización
curl -X POST http://localhost:8000/api/v1/facebook/authorize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "seller_user_id": "'$SELLER_ID'",
    "redirect_uri": "http://localhost:8000/api/v1/facebook/callback"
  }'
# Responde: {"authorization_url": "https://www.facebook.com/dialog/oauth?..."}

# 3. Abrir authorization_url en el browser
# 4. Después de autorizar, Facebook redirige al callback automáticamente

# 5. Verificar cuenta conectada
curl http://localhost:8000/api/v1/facebook/accounts \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Endpoints de la API

| Método   | Endpoint                                                         | Auth        | Descripción                        |
| -------- | ---------------------------------------------------------------- | ----------- | ---------------------------------- |
| `POST`   | `/api/v1/facebook/authorize`                                     | Vendedor    | Inicia OAuth, retorna URL          |
| `GET`    | `/api/v1/facebook/callback`                                      | —           | Callback de Facebook               |
| `GET`    | `/api/v1/facebook/accounts`                                      | Vendedor    | Lista cuentas conectadas           |
| `GET`    | `/api/v1/facebook/accounts/{id}/pages`                           | Vendedor    | Lista páginas de una cuenta        |
| `POST`   | `/api/v1/facebook/accounts/{acc_id}/pages/{page_id}/set-default` | Vendedor    | Establece página default           |
| `DELETE` | `/api/v1/facebook/accounts/{id}`                                 | Vendedor    | Desconecta cuenta                  |
| `POST`   | `/api/v1/facebook/admin/refresh-tokens`                          | Super Admin | Refresca tokens próximos a expirar |

---

## 6. Refresh de Tokens

Los access tokens de Facebook duran ~60 días. El endpoint admin los renueva automáticamente:

```bash
# Refrescar tokens que expiran en las próximas 48hs (default)
curl -X POST "http://localhost:8000/api/v1/facebook/admin/refresh-tokens" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Refrescar tokens que expiran en las próximas 72hs
curl -X POST "http://localhost:8000/api/v1/facebook/admin/refresh-tokens?hours_before=72" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Cron recomendado** (cada 6 horas):

```bash
0 */6 * * * curl -X POST https://api.tudominio.com/api/v1/facebook/admin/refresh-tokens \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 7. Seguridad

- **State token**: UUID v4 almacenado en Redis con TTL de 10 minutos (CSRF protection)
- **Access tokens**: Encriptados con AES-256 (`FACEBOOK_ENCRYPTION_KEY`) antes de guardar en DB
- **`FACEBOOK_OAUTH_APP_SECRET`** y **`FACEBOOK_ENCRYPTION_KEY`**: Usar secrets manager en producción (AWS Secrets Manager, Vault, etc.)
- Nunca loguear access tokens (SQLAlchemy echo deshabilitado en producción)

---

## 8. Troubleshooting

| Error                              | Causa                              | Solución                            |
| ---------------------------------- | ---------------------------------- | ----------------------------------- |
| `Facebook OAuth is not configured` | `FACEBOOK_OAUTH_APP_ID` vacío      | Setear vars de entorno              |
| `Invalid state token`              | Token Redis expiró o inválido      | Re-iniciar flujo desde `/authorize` |
| `redirect_uri_mismatch`            | URI no registrada en Facebook      | Agregar URI en Facebook Developers  |
| `ConnectionError: Redis`           | Redis no está corriendo            | `docker start prosell-redis`        |
| `400 Bad Request` en callback      | Code de Facebook inválido/expirado | El code dura ~10 min, reintentar    |
