# Runbook — Promote a Producción

> **Modelo de deploy**: staging es **automático** (`.github/workflows/deploy.yml` corre solo
> cuando CI termina verde en `main`). Producción es **100% manual** y SOLO se mueve cuando
> vos disparás `.github/workflows/promote-prod.yml` y tipeás `deploy`.
>
> Este runbook es el paso a paso de ESE día. Está pensado para ejecutarse a mano.
> Relacionado: [`docs/SECRET_ROTATION.md`](./SECRET_ROTATION.md).

---

## TL;DR — Si ya promoviste antes

1. `git checkout main && git pull --ff-only` (en tu PC).
2. GH → Actions → "Promote to Production" → Run workflow → tipear `deploy`.
3. Esperá el run verde. `https://api.prosellweb.com/api/v1/health/` debe devolver 200.
4. Si falla el health check → ver PARTE D (Rollback).

Si es la **primera vez** (o las JWT keys todavía están trackeadas en el host), seguí la
**PARTE A** (one-time sync). Si no, saltá a **PARTE B** directo.

---

## Pre-vuelo — Cosas a verificar ANTES de promover

### Desde tu PC (sin tocar prod)

```bash
# 1. main local al día
git checkout main && git pull --ff-only

# 2. CI verde en main (OBLIGATORIO — no promociones un main rojo)
gh run list --branch main --limit 3

# 3. Confirmá QUÉ vas a promover (el commit que se promueve = HEAD de main)
git log --oneline -1 origin/main
```

✅ **Verificación**: el último CI de `main` está en `completed / success`.
Si CI no está verde, **PARÁ acá** — no se promueve un main rojo.

### Secrets de GitHub Actions (REQUERIDOS para que el workflow corra)

El workflow `promote-prod.yml` usa estos 5 secrets. Si falta alguno, el run falla
con error críptico en el primer step.

Verificá en **github.com/rap77/prosell-sass → Settings → Secrets and variables → Actions**:

| Secret            | Descripción                                                             | Default si falta                     |
| ----------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| `PROD_HOST`       | IP o hostname del droplet (`prosellweb.com` o `204.48.26.215`)          | ❌ FALLA el workflow                 |
| `SSH_USER`        | Usuario SSH en el host (ej: `deploy`)                                   | ❌ FALLA el workflow                 |
| `SSH_PRIVATE_KEY` | Contenido COMPLETO de la private key (incluyendo `-----BEGIN/END-----`) | ❌ FALLA el workflow                 |
| `PROD_REPO_PATH`  | Path del repo en el host (recomendado: `/opt/prosell`)                  | Fallback a `/prosell` (puede fallar) |
| `WEBHOOK_URL`     | (Opcional) Webhook para notificar post-deploy                           | Skip silencioso si falta             |

```bash
# Verificación rápida desde la CLI (requiere gh auth con permisos de admin)
gh secret list --repo rap77/prosell-sass | grep -E "PROD_HOST|SSH_USER|SSH_PRIVATE_KEY|PROD_REPO_PATH"
```

---

## PARTE A — Sync one-time del host

> **Cuándo**: SOLO la primera vez, o si las JWT keys (`apps/api/keys/*.pem`) están
> trackeadas en git en el host (estado viejo, pre-fix de seguridad).
>
> **Cómo detectar si lo necesitás**: SSH al host (ver § "Acceso al host" abajo) y corré
> `git -C <REPO> ls-files apps/api/keys/`. Si lista `private.pem` y `public.pem`, las
> keys están trackeadas y necesitás esta parte.

### A.0 — Acceso al host (SSH o DO Droplet Console)

El host de prod es accesible de **dos maneras**. Si SSH está bloqueado por firewall
de DigitalOcean (puede pasar — el `service ssh status` muestra active pero el puerto
22 puede no estar reachable desde internet), usá la Droplet Console como fallback.

```bash
# Opción 1: SSH normal (si el firewall de DO lo permite)
ssh <SSH_USER>@prosellweb.com   # o @<PROD_HOST>

# Opción 2: DO Droplet Console (web terminal en el dashboard de DO)
#   cloud.digitalocean.com → Droplets → prosellweb-prod → tab "Console"
#   bypassea el firewall de DO completamente
```

### A.1 — Ubicar el repo y verificar el path

El path REAL del repo en prod es `/opt/prosell` (NO `/prosell`). El workflow tiene
un fallback a `/prosell` para backward-compat, pero el path canónico es `/opt/prosell`.

```bash
# Verificá cuál existe (recomendado: eza, no ls)
test -d /opt/prosell && echo "/opt/prosell EXISTE ✅" || echo "/opt/prosell MISSING ❌"
test -d /prosell && echo "/prosell EXISTE (fallback)" || echo "/prosell MISSING (OK)"

# Anotá el path real. Lo usás como <REPO> en el resto.
REPO=/opt/prosell
```

⚠️ **Si el repo está en `/opt/prosell` y el secret `PROD_REPO_PATH` está vacío**,
el workflow va a usar el fallback `/prosell` y va a fallar. **Seteá el secret a
`/opt/prosell` antes de promover.** Settings → Secrets → `PROD_REPO_PATH=/opt/prosell`.

### A.2 — Backup de las keys reales (NO te las saltees)

```bash
cd <REPO>
BK=~/prosell-keys-backup-$(date +%F-%H%M)
mkdir -p "$BK"
cp apps/api/keys/*.pem "$BK"/
test -f "$BK/private.pem" && test -f "$BK/public.pem" && echo "✅ backup OK" || echo "❌ backup FALLÓ"
```

### A.3 — Destrabar el pull y sincronizar a main

⚠️ **No asumas que SOLO las JWT keys están modificadas.** Cualquier archivo
tracked con cambios locales hace que `git pull` aborte. La estrategia robusta es
listar TODOS los archivos modificados y resolverlos uno por uno.

```bash
# 1. Ver QUÉ hay de modified/untracked que pueda chocar con el pull
git status --porcelain

# 2. Para CADA archivo modified listado arriba, aplicá la regla correspondiente:
#
#    a) Si es una JWT key (apps/api/keys/private.pem o public.pem):
#       # Las reales ya están respaldadas en $BK. Restaurá la versión vieja
#       # del repo (main las borra del tracking, pero están gitignoreadas
#       # así que el `git pull` no las toca en disco).
#       git checkout -- apps/api/keys/private.pem apps/api/keys/public.pem
#
#    b) Si es CUALQUIER OTRO archivo (ej: .env.prod, scripts/):
#       # NO los borres. Stasheá TODO lo no-key, restaurá después del pull.
#       git stash push -m "pre-promote-stash-$(date +%s)" --include-untracked
#
#    IMPORTANTE: si usaste stash, las JWT keys NO se stashean (porque las
#    manejamos con checkout en (a)). El stash solo guarda lo no-key.

# 3. Ahora sí sincronizá
git pull origin main

# 4. Si usaste stash en el paso 2, restaurá tus cambios
git stash pop

# 5. Restaurá las keys REALES de prod
cp "$BK"/*.pem apps/api/keys/
```

### A.4 — Verificar que la bomba quedó desactivada

```bash
git status
```

✅ **TODOS deben cumplirse:**

- `On branch main` y `up to date with origin/main`
- `git check-ignore apps/api/keys/private.pem` → imprime la ruta (= ignorada ✅)
- `git check-ignore apps/api/keys/public.pem` → imprime la ruta (= ignorada ✅)
- Las keys siguen físicamente en disco: `test -f apps/api/keys/private.pem && echo OK`

Si todo da OK, la bomba está **desactivada para siempre**. **De la segunda promoción
en adelante, saltá a PARTE B directo.**

### A.5 — Verificar acceso a github desde el host (pre-check)

El `git pull` que va a hacer el workflow requiere acceso a github.com. Si el host está
bloqueado, el workflow falla tarde. Verificá ahora:

```bash
# ¿Puede llegar a github?
git ls-remote origin main | head -3
# Si devuelve SHAs de commits = OK
# Si timeout o "Could not resolve host" = el host no tiene internet a github
```

Si falla, abrí un ticket con DO support para que abran el puerto 443 outbound a github.com.

---

## PARTE B — Disparar el Promote (GitHub UI o CLI)

Con el host ya en `main` y las keys no-trackeadas, el `git pull` del workflow ya no
choca. Disparás el gate:

### Opción B.1 — Desde la web (recomendado, es el gate visual)

1. GitHub → pestaña **Actions** → workflow **"Promote to Production"**
2. Botón **"Run workflow"** (rama `main`)
3. En el input **confirm** escribí exactamente: `deploy`
4. **Run workflow**

### Opción B.2 — Desde la CLI

```bash
# Verificá auth primero
gh auth status

# Dispará el workflow
gh workflow run promote-prod.yml -f confirm=deploy
gh run watch   # seguí el progreso en vivo
```

> El workflow hace vía SSH al host: `cd $PROD_REPO_PATH` → `git pull origin main` →
> `docker compose -f docker/docker-compose.prod.yml up -d --build` → `docker system prune -f` →
> health check contra `https://api.prosellweb.com/api/v1/health/` (con `-L` para seguir
> el redirect 307 del endpoint).

---

## PARTE C — Verificación post-deploy

### C.1 — El propio workflow

✅ El job **"Promote to Production"** termina en verde, incluido el health check
post-deploy (que pega contra `/api/v1/health/` con `-L` para seguir el redirect).
Si ese step pasa, el API ya responde.

### C.2 — Verificación manual (desde tu PC)

```bash
# Health externo (a través de Caddy / HTTPS) — usar path COMPLETO con /api/v1/health/
# -L sigue redirects (el endpoint redirige a la versión con / final)
curl -fSL https://api.prosellweb.com/api/v1/health/ && echo "  ✅ health OK"

# Login real (smoke test del flujo crítico — usá credenciales reales de prod)
# Debe devolver 200 y setear cookies httpOnly access_token/refresh_token.
```

### C.3 — Verificación en el host (SSH o DO Console)

```bash
# Entrá al host (ver § A.0 si SSH bloqueado)
cd <REPO>

# Todos los containers UP y healthy (6 esperados: db, redis, api, worker, web, caddy)
docker compose -f docker/docker-compose.prod.yml ps

# Health interno del api (sin pasar por Caddy) — -L para seguir redirect
docker exec prosell-prod-api curl -fSL http://localhost:8000/api/v1/health/ && echo "  ✅ api OK"

# Logs sin errores de arranque
docker logs --tail 40 prosell-prod-api
docker logs --tail 20 prosell-prod-worker
docker logs --tail 20 prosell-prod-caddy
```

✅ **Checklist final — TODOS deben cumplirse:**

- [ ] Workflow "Promote to Production" verde (o falló SOLO en health check step — ver B.2)
- [ ] `prosell-prod-db`, `prosell-prod-redis`, `prosell-prod-api`, `prosell-prod-worker`, `prosell-prod-web`, `prosell-prod-caddy` → todos `Up` / `healthy`
- [ ] `https://api.prosellweb.com/api/v1/health/` responde 200 (con `-L` para el redirect)
- [ ] Login real funciona (cookies httpOnly seteadas)
- [ ] `git -C <REPO> rev-parse HEAD` == HEAD de `origin/main` en tu PC
- [ ] Sin errores en logs de `api`, `worker`, `caddy`

---

## PARTE D — Rollback (si algo sale mal)

Si los containers arrancan pero la app no responde, o el login falla, volvé al
commit anterior **en el host**:

```bash
cd <REPO>

# Ver commits disponibles
git log --oneline -5

# Volvé al commit estable previo (reemplazá <SHA_ANTERIOR>)
git reset --hard <SHA_ANTERIOR>

# Re-deploy con el código viejo
docker compose -f docker/docker-compose.prod.yml up -d --build

# Verificá
docker exec prosell-prod-api curl -fSL http://localhost:8000/api/v1/health/ && echo "  ✅ rollback OK"
```

> Las keys (`apps/api/keys/*.pem`) están gitignoreadas en el main actual → el
> `git reset --hard` NO las toca (mientras el SHA objetivo también las tenga
> gitignored). Tus secrets en `.env.prod` del host tampoco (está gitignored).
>
> ⚠️ **CUIDADO con SHA pre-#28**: si el SHA al que volvés es de ANTES que las
> keys se gitignoraran (commits muy viejos), `git reset --hard` las va a RECREAR
> con el contenido VIEJO commiteado. Después del reset, ANTES de
> `docker compose up -d --build`:
>
> - Restaurá las keys reales desde tu backup: `cp $BK/*.pem apps/api/keys/`
> - O regenerá con el script correspondiente (ver [`docs/SECRET_ROTATION.md`](./SECRET_ROTATION.md))
> - Si no lo hacés, el api arranca con keys incorrectas y los JWT emitidos
>   por el deploy previo quedan inválidos.

⚠️ **Cuidado con el rollback**: si el commit al que volvés también tenía un bug
conosciDO, el rollback "exitoso" reintroduce el bug. Verificá con `git show <SHA>`
qué cambios trae antes de hacer reset.

---

## Notas / recordatorios

- **`.env.prod` en el host**: el compose interpola `${VAR}` desde el `.env.prod` que
  vive en el host (gitignored). Si rotaste algún secret, sincronizá ese archivo
  ANTES de promover. Ver [`docs/SECRET_ROTATION.md`](./SECRET_ROTATION.md).
- **`RESEND_API_KEY`**: si no está seteada en el `.env.prod`, el mail cae a
  `LoggingSender` (silencioso). Verificá que esté antes de prometer entregas reales.
- **El sync de keys (PARTE A)** es one-time. De la segunda promoción en adelante,
  saltá directo a **PARTE B**.
- **El worker no tiene healthcheck** (Taskiq no expone HTTP probe). Su liveness
  signal es solo `restart: unless-stopped`. Si lo ves `Restarting`, mirá los logs
  antes de alarmarte.
- **Si SSH a prod está bloqueado por firewall de DO**: usá DO Droplet Console
  (cloud.digitalocean.com → tu droplet → tab "Console"). Bypassea el firewall
  completamente.
