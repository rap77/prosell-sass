# Runbook — Promote a Producción

> **Modelo de deploy**: staging es **automático** (`.github/workflows/deploy.yml` corre solo
> cuando CI termina verde en `main`). Producción es **100% manual** y SOLO se mueve cuando
> vos disparás `.github/workflows/promote-prod.yml` y tipeás `deploy`.
>
> Este runbook es el paso a paso de ESE día. Está pensado para ejecutarse a mano.
> Relacionado: [`docs/SECRET_ROTATION.md`](./SECRET_ROTATION.md).

---

## Contexto / por qué existe este runbook

El host de prod (DigitalOcean, droplet `prosellweb-prod`) quedó **parado varios commits atrás**.
En ese estado viejo, las keys JWT (`apps/api/keys/*.pem`) todavía estaban **trackeadas en git**.
En `main` ya **NO** lo están (están `untracked` + en `.gitignore` — verificado).

Consecuencia: el primer `git pull origin main` en el host **ABORTA** con un error tipo:

```
error: Your local changes to the following files would be overwritten by merge:
        apps/api/keys/private.pem
        apps/api/keys/public.pem
Please commit your changes or stash them before you merge.
```

Como el workflow `promote-prod.yml` hace `git pull origin main` internamente, **fallaría**.
Por eso primero hacemos un **sync manual (one-time)** que desactiva la bomba, y recién
después usamos el gate normal. Una vez hecho, no vuelve a pasar nunca (las keys ya quedan
gitignoreadas en el host).

---

## PARTE 0 — Pre-vuelo (desde tu PC, sin tocar prod)

```bash
# 1. main local al día y CI verde
git checkout main && git pull --ff-only
gh run list --branch main --limit 3

# 2. Confirmá QUÉ vas a promover (el último commit de main)
git log --oneline -5
```

✅ **Verificación**: el último CI de `main` está en `completed / success`.
Si CI no está verde, **PARÁ acá** — no se promueve un main rojo.

---

## PARTE A — Sync one-time del host (SSH, manual)

> Esto se hace **UNA sola vez**. Desactiva la bomba de las keys y deja el host limpio en `main`.

### A.1 — Entrar al host y ubicar el repo

```bash
ssh <usuario>@<PROD_HOST>

# Confirmá el path REAL del repo. El workflow usa /prosell — verificá cuál existe:
ls -d /prosell /opt/prosell 2>/dev/null
```

⚠️ **DECISIÓN IMPORTANTE — leé esto:**
El workflow `promote-prod.yml` hace `cd /prosell`. Si el repo real está en **`/opt/prosell`**
(y NO existe `/prosell`), el workflow **va a fallar en el primer `cd`**. Dos salidas:

- **Quick-fix (host)**: crear un symlink → `sudo ln -s /opt/prosell /prosell`
- **Fix limpio (código, recomendado)**: avisame y parametrizo el workflow con un secret
  `PROD_REPO_PATH` (igual que `deploy.yml` hace con `STAGING_REPO_PATH`). Es 1 línea.

Anotá el path real y usalo abajo donde dice `<REPO>`.

### A.2 — Backup de las keys reales (NO te las saltees)

```bash
cd <REPO>
BK=~/prosell-keys-backup-$(date +%F-%H%M)
mkdir -p "$BK"
cp apps/api/keys/*.pem "$BK"/
ls -la "$BK"          # ✅ deben verse private.pem y public.pem
```

### A.3 — Destrabar el pull y sincronizar a main

```bash
# Restaura los .pem a la versión vieja del repo, para que el pull no aborte.
# (Tranquilo: las reales ya están en $BK)
git checkout -- apps/api/keys/private.pem apps/api/keys/public.pem

# Ahora sí sincronizá. El commit de main borra esos .pem del tracking.
git pull origin main

# Restaurá las keys REALES de prod a su lugar.
cp "$BK"/*.pem apps/api/keys/
```

### A.4 — Verificar que la bomba quedó desactivada

```bash
git status
```

✅ **Verificación — TODOS deben cumplirse:**

- `On branch main` y `up to date with origin/main`
- **NO** aparece `apps/api/keys/private.pem` ni `public.pem` en la salida
  (ni en "modified" ni en "untracked" — están gitignoreadas).
- `git check-ignore apps/api/keys/private.pem` → imprime la ruta (= ignorada ✅)
- Las keys siguen físicamente en disco: `ls -la apps/api/keys/*.pem`

Si todo eso da OK, la bomba está **desactivada para siempre**. Salí del host (`exit`).

---

## PARTE B — Disparar el Promote (GitHub UI o CLI)

Con el host ya en `main`, el `git pull` del workflow ya no choca. Disparás el gate:

### Opción B.1 — Desde la web (recomendado, es el gate visual)

1. GitHub → pestaña **Actions** → workflow **"Promote to Production"**
2. Botón **"Run workflow"** (rama `main`)
3. En el input **confirm** escribí exactamente: `deploy`
4. **Run workflow**

### Opción B.2 — Desde la CLI

```bash
gh workflow run promote-prod.yml -f confirm=deploy
gh run watch   # seguí el progreso en vivo
```

> El workflow hace, vía SSH al host: `git pull origin main` →
> `docker compose -f docker/docker-compose.prod.yml up -d --build` → `docker system prune -f` →
> health check contra `https://api.prosellweb.com/health`.

---

## PARTE C — Verificación post-deploy

### C.1 — El propio workflow

✅ El job **"Promote to Production"** termina en verde. Incluye un paso
`Health check post-deploy` que hace `curl -f https://api.prosellweb.com/health` con reintentos.
Si ese paso pasa, el API ya responde.

### C.2 — Verificación manual (desde tu PC)

```bash
# Health externo (a través de Caddy / HTTPS)
curl -fsS https://api.prosellweb.com/health && echo "  ✅ health OK"

# Login real (smoke test del flujo crítico — usá credenciales reales de prod)
# Debe devolver 200 y setear cookies httpOnly access_token/refresh_token.
```

### C.3 — Verificación en el host (SSH)

```bash
ssh <usuario>@<PROD_HOST>
cd <REPO>

# Todos los containers UP y healthy
docker compose -f docker/docker-compose.prod.yml ps

# Health interno del api (sin pasar por Caddy)
docker exec prosell-prod-api curl -fsS http://localhost:8000/api/v1/health && echo "  ✅ api OK"

# Logs sin errores de arranque (últimas líneas)
docker logs --tail 40 prosell-prod-api
docker logs --tail 20 prosell-prod-worker
```

✅ **Verificación final — checklist:**

- [ ] Workflow "Promote to Production" en verde (incluido el health check step)
- [ ] `prosell-prod-{db,redis,api,worker,web,caddy}` → todos `Up` / `healthy`
- [ ] `https://api.prosellweb.com/health` responde 200
- [ ] Login real funciona (cookies httpOnly seteadas)
- [ ] `git rev-parse HEAD` en el host == HEAD de `origin/main`
- [ ] Sin errores en logs de `api` y `worker`

---

## PARTE D — Rollback (si algo sale mal)

Si el health check falla o la app no levanta, volvé al commit anterior **en el host**:

```bash
ssh <usuario>@<PROD_HOST>
cd <REPO>

# Ver a qué commit volver (el de la línea de abajo del HEAD actual)
git log --oneline -5

# Volvé al commit estable previo (reemplazá <SHA_ANTERIOR>)
git reset --hard <SHA_ANTERIOR>

# Rebuild con el código viejo
docker compose -f docker/docker-compose.prod.yml up -d --build

# Verificá que volvió
docker exec prosell-prod-api curl -fsS http://localhost:8000/api/v1/health && echo "  ✅ rollback OK"
```

> Las keys (`apps/api/keys/*.pem`) ya están gitignoreadas → el `git reset --hard` **NO** las toca.
> Tus secrets en `.env.*` del host tampoco (están gitignoreados).

---

## Notas / recordatorios

- **`.env` de prod en el host**: el compose interpola `${VAR}` desde el `.env` que vive en el
  host (gitignored). Si rotaste algún secret, sincronizá ese archivo ANTES de promover.
  Ver [`docs/SECRET_ROTATION.md`](./SECRET_ROTATION.md).
- **`RESEND_API_KEY`**: si no está seteada en el `.env` de prod, el mail cae a `LoggingSender`
  (silencioso). Verificá que esté antes de prometer entregas de mail reales.
- **El symlink/path** (Parte A.1) y **el sync de keys** (Parte A.2–A.4) son one-time.
  De la segunda promoción en adelante, saltás directo a **PARTE B**.
