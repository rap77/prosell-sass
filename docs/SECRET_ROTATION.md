# Secret Rotation Runbook

> **TL;DR — Cuando un secret queda expuesto (commit, log, screenshot, ticket):**
> 1. No entres en pánico. El secret ya está en git history.
> 2. **Rotar > borrar.** Reescribir el historial es destructivo y no cambia el hecho de que un atacante que ya vio el valor va a usarlo igual. La defensa real es invalidar el valor en el provider.
> 3. Seguí esta guía en orden.

---

## Por qué rotar en vez de borrar del historial

- **Borrar del historial no es retroactivo**: cualquiera que haya leído el valor antes de la limpieza todavía lo tiene.
- **Borrar del historial es destructivo**: requiere `git filter-repo` o `BFG`, fuerza a todos los colaboradores a re-clonar, cambia todos los SHA, y rompe PRs en vuelo.
- **Rotar es suficiente**: en el momento en que el provider rechaza el valor viejo, el secret "expuesto" deja de ser un secret válido. Los commits viejos siguen ahí, pero son inocuos.

Si en algún momento necesitás reescribir el historial (por compliance, por ejemplo), avisame y lo planificamos como una operación separada con un worktree limpio.

---

## Inventario de secrets a rotar

| # | Secret | Provider | Impacto de la rotación |
|---|--------|----------|------------------------|
| 1 | `POSTGRES_PASSWORD` | DigitalOcean Managed Postgres (o container) | DB reinicia, sessions de Prisma/asyncpg reconectan. **Sin pérdida de datos.** |
| 2 | `REDIS_PASSWORD` | DigitalOcean Managed Redis (o container) | Cache se vacía, próximas requests recalientan. Sesiones JWT siguen válidas (viven en cookie, no en Redis). |
| 3 | `MINIO_ROOT_PASSWORD` | Container MinIO (staging) | No productivo. Staging solamente. |
| 4 | `JWT_PRIVATE_KEY` / `public.pem` | apps/api/keys/ en el host | **Todos los usuarios deslogueados.** Sessions existentes invalidadas. |
| 5 | `ADMIN_PASSWORD` | init_data.py (semilla del admin) | Login admin cae. Reset manual. |
| 6 | `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud Console | **Sin downtime.** Soportan secret rotativo (old + new conviven). |
| 7 | `FACEBOOK_OAUTH_APP_SECRET` | Facebook Developers Console | Igual que Google. |
| 8 | `SENDGRID_API_KEY` | SendGrid Dashboard | Igual que Google. |
| 9 | `DO_ACCESS_KEY_ID` / `DO_SECRET_ACCESS_KEY` | DO Spaces API keys | Igual que Google. |
| 10 | `NGROK_AUTHTOKEN` | ngrok dashboard | Solo dev. |

---

## Orden de rotación

**Principio**: rotar de menos-impacto a más-impacto. Si algo sale mal en el medio, el daño está contenido a una sola capa.

1. **OAuth / API keys (SendGrid, Google, FB, DO, ngrok)** — soportan secret rotativo: agregás el nuevo, deployás, verificás, y solo entonces borrás el viejo. Cero downtime.
2. **MinIO (staging)** — local, sin impacto en prod.
3. **Admin password** — podés cambiarlo manualmente desde la DB con `update users set ...` si el script falla.
4. **Redis** — `CONFIG SET requirepass` en caliente, después `redis-cli CONFIG REWRITE`. Reinicio de la API reusa la nueva pass.
5. **Postgres** — `ALTER USER postgres PASSWORD 'nuevo'` en caliente. Reinicio de la API reusa la nueva pass.
6. **JWT keys** — **AL ÚLTIMO**, porque invalida todas las sessions. Coordinar con horario de bajo tráfico (noche / finde).

---

## Procedimiento paso a paso

### 1. Generar los valores nuevos

```bash
./scripts/rotate-secrets.sh            # genera todo
# o individuales:
./scripts/rotate-secrets.sh db redis   # solo DB y Redis
./scripts/rotate-secrets.sh jwt        # solo JWT (sin prisa)
```

El script **NO escribe en ningún archivo**: imprime a stdout. Copiá los valores a tu password manager (1Password, Bitwarden, `pass`, lo que uses) ANTES de cerrar la terminal.

### 2. Rotar en el provider

| Secret | Dónde rotar |
|--------|-------------|
| Postgres | DO Console → Databases → tu DB → Users & Databases → reset password. O vía SQL: `ALTER USER postgres PASSWORD '...';` |
| Redis | DO Console → Redis → reset password. O vía CLI: `redis-cli -a OLD CONFIG SET requirepass NEW` |
| JWT | Local: `openssl genrsa -out private.pem 2048`. Ver arriba (script). |
| Admin | DB: `update users set hashed_password = $bcrypt$2a$12$... where email='admin@prosell.saas';` (generá el hash con `htpasswd -bnBC 12 "" nuevapass \| tr -d ':\n'`) |
| Google OAuth | console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client IDs → tu client → "Add secret" (old + new conviven) |
| Facebook | developers.facebook.com → tu app → Settings → Basic → "Show" en App Secret → "Generate new" |
| SendGrid | app.sendgrid.com → Settings → API Keys → "Create API Key" |
| DO Spaces | cloud.digitalocean.com → API → Spaces Keys → "Generate New Key" |
| Ngrok | dashboard.ngrok.com → Your Authtoken → reset |

### 3. Deployar los nuevos valores

```bash
# En el host de staging:
ssh staging-host
cd /path/to/prosell
$EDITOR .env.staging                # reemplazá los valores viejos
# Para JWT, también:
$EDITOR apps/api/keys/private.pem   # pegá el nuevo PEM
$EDITOR apps/api/keys/public.pem    # pegá el nuevo PEM
chmod 600 apps/api/keys/private.pem

# Dispará el deploy manualmente desde GitHub Actions:
# Actions → "Deploy Staging" → Run workflow
```

### 4. Smoke test

Después del deploy, verificá en este orden:

1. `curl https://staging.prosell.com/api/v1/health` → 200 OK
2. Login con el nuevo `ADMIN_PASSWORD` desde la web
3. Subí un producto nuevo con una imagen (testea MinIO + presigned URLs)
4. Dispará un email transaccional (registro nuevo o reset password) → confirma que SendGrid aceptó el nuevo key
5. Si rotaste JWT: hacé un OAuth login desde Google y verificá que la sesión persiste
6. Si rotaste Postgres o Redis: monitorá logs por errores de auth los primeros 30 minutos

### 5. Limpiar valores viejos (en el provider, no en git)

**Recién ahora** que verificaste que todo funciona, vas al provider y:

- Google Cloud: borrá el secret viejo
- Facebook: regenerá (FB solo permite uno a la vez — esto es OK porque ya deployaste el nuevo)
- SendGrid: revocá la API key vieja
- DO Spaces: revocá el key viejo

Para DB/Redis/JWT/Admin, los valores viejos se "invalidan solos" — el provider ya no los acepta, listo.

---

## Verificación de que el secret viejo ya no sirve

```bash
# Postgres
docker exec -it prosell-staging-db psql -U postgres -c "select 1"
# Si rotaste bien, esto va a fallar con la pass vieja.

# Redis
docker exec -it prosell-staging-redis redis-cli -a OLD_PASSWORD ping
# Tiene que devolver "NOAUTH" si la rotación funcionó.

# SendGrid
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer OLD_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@prosell.com"},"subject":"x","content":[{"type":"text/plain","value":"x"}]}'
# Tiene que devolver 401.

# Google OAuth
# No hay endpoint público simple, pero el próximo OAuth login va a fallar
# si deployaste el new y borraste el old.
```

---

## Si la rotación falla mid-camino

No pasa nada — para eso rotamos de menos a más impacto. Si algo se rompe:

1. **Revertí el .env.staging** con los valores viejos (`git diff .env.staging.example` no te ayuda, porque `.env.staging` no está en git; usá el backup que hiciste al principio).
2. Re-deployá con el workflow manual de staging (`workflow_dispatch`).
3. Debugueá. Cuando entiendas qué pasó, empezá de nuevo desde el paso 1.

**El backup de los valores viejos es CLAVE.** Antes de tocar nada:

```bash
cp .env.staging .env.staging.bak.$(date +%Y%m%d-%H%M%S)
cp -r apps/api/keys apps/api/keys.bak.$(date +%Y%m%d-%H%M%S)
```

---

## Historial de rotaciones

| Fecha | Quién | Qué se rotó | Notas |
|-------|-------|-------------|-------|
| 2026-06-11 | Rafael | (pendiente — ver commit `21b55653`) | DB / Redis / SendGrid / Google OAuth / FB OAuth / JWT / Admin — todos en el historial de git. |

> Cuando completes una rotación, anotalo acá. Después de unos meses, este log es invaluable para entender qué secrets son "viejos" y cuáles son "nuevos" — y para detectar rotaciones olvidadas.

---

## Pre-commit hook

`scripts/verify-no-secrets.sh` corre automáticamente en cada `git commit` (via `.pre-commit-config.yaml`). Si trata de commitearse un patrón que parece un secret, el commit se bloquea.

**Si el hook marca un false positive** (un test con `password=Admin123` en el código, por ejemplo), tenés dos opciones:

1. Reemplazá el valor por un placeholder: `password=ROTATE_ME_test_admin`
2. Agregá el archivo al allowlist (top del script)

**Nunca** uses `--no-verify` para saltar el hook. Si el hook se rompe y no podés commitear, arreglá el hook o el código, no la绕绕.
