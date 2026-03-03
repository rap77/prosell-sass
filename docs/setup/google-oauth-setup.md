# Google OAuth 2.0 Setup Guide

## Prerrequisitos

- Cuenta de Google (personal o de G Suite)
- Acceso a Google Cloud Console

---

## Paso 1: Crear Proyecto en Google Cloud Console

1. Ir a https://console.cloud.google.com/apis/credentials
2. Click en **"Select a project"** → **"NEW PROJECT"**
3. Nombre: `ProSell SaaS Development` (o similar)
4. Click **"CREATE"**

---

## Paso 2: Habilitar Google+ API

1. En el menú: **APIs & Services** → **Library**
2. Buscar: "Google+ API" o "Google Identity"
3. Click en **"Enable"**

---

## Paso 3: Crear Credenciales OAuth 2.0

1. Ir a: **APIs & Services** → **Credentials**
2. Click **"CONFIGURE CONSENT SCREEN"**
3. Elegir **"External"** → Click **"CREATE"**
4. Completar:
   - App name: `ProSell SaaS`
   - User support email: tu email
   - Developer contact: tu email
5. Click **"SAVE AND CONTINUE"** (puedes omitir scopes y test users por ahora)

---

## Paso 4: Crear OAuth Client ID

1. En **Credentials**, click **"CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Application type: **"Web application"**
3. Nombre: `ProSell Web Client`
4. Authorized redirect URIs (**IMPORTANTE**):

```
http://localhost:8000/api/auth/oauth/google/callback
```

Para producción (cuando tengas dominio):

```
https://api.prosell.saas/api/auth/oauth/google/callback
https://staging-api.prosell.saas/api/auth/oauth/google/callback
```

5. Click **"CREATE"**

---

## Paso 5: Copiar Credenciales

Google te mostrará un popup con:

```
Client ID: XXXXXXXXXX.apps.googleusercontent.com
Client secret: GOCSPX-XXXXXXXXXXXXXXXX
```

**COPIAR AMBOS** - no podrás ver el secret otra vez.

---

## Paso 6: Configurar en `.env`

Agregar al archivo `apps/api/.env`:

```bash
# Google OAuth 2.0 Credentials
GOOGLE_OAUTH_CLIENT_ID=XXXXXXX.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-XXXXXXXXXXXXXXXX
```

Las otras variables ya están configuradas:
```bash
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/oauth/google/callback
```

---

## Paso 7: Verificar

1. Reiniciar el backend:
```bash
cd apps/api
fastapi dev src/prosell/infrastructure/api/main.py --reload
```

2. Verificar que cargó las credenciales:
```bash
curl http://localhost:8000/api/v1/auth/oauth/google/authorize
```

Si devuelve error de configuración, faltan credenciales.
Si devuelve redirect a Google, ¡está funcionando!

---

## Paso 8: Probar el Flow Completo

1. Ir a http://localhost:3000/auth/login
2. Click **"Continue with Google"**
3. Autenticarse con Google
4. Debería redirigir a http://localhost:3000/dashboard

---

## Troubleshooting

### Error: redirect_uri_mismatch

**Causa**: El redirect URI en Google Console no coincide con el código.

**Solución**: Verificar que EXACTAMENTE coincida:
- En Google Console: `http://localhost:8000/api/auth/oauth/google/callback`
- En .env: `GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/oauth/google/callback`
- **NO incluir barra al final**

### Error: invalid_client

**Causa**: Client ID o Secret incorrectos.

**Solución**: Verificar que el Client ID termine en `.apps.googleusercontent.com` y el Secret empiece con `GOCSPX-`.

### Error: access_denied

**Causa**: Usuario canceló el login o no tiene permisos.

**Solución**: Normal en desarrollo. Asegúrate de estar logueado en Google.

---

## Producción - Cambios Requeridos

Cuando deployes a producción:

1. **Agregar redirect URIs de producción** en Google Console:
```
https://api.prosell.saas/api/auth/oauth/google/callback
https://staging-api.prosell.saas/api/auth/oauth/google/callback
```

2. **Actualizar .env**:
```bash
GOOGLE_OAUTH_REDIRECT_URI=https://api.prosell.saas/api/auth/oauth/google/callback
OAUTH_FRONTEND_SUCCESS_URL=https://prosell.saas/dashboard
OAUTH_FRONTEND_FAILURE_URL=https://prosell.saas/auth/login?error=
```

3. **Verificar frontend NEXT_PUBLIC_API_URL**:
```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=https://api.prosell.saas
```

---

## Seguridad - Best Practices

1. **NUNCA commitear** `GOOGLE_OAUTH_CLIENT_SECRET` en el repo
2. **Usar variables de entorno** diferentes para dev/staging/prod
3. **Rotar secrets** periódicamente (cada 6 meses)
4. **Monitorear** usage en Google Cloud Console
5. **Limitar scopes** a solo lo necesario (email, profile)

---

## Referencias

- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- [ProSell OAuth Implementation](../implementation/oauth-backend-callbacks-complete.md)
