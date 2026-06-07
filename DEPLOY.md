# ProSell SaaS — Guía de Deploy a Producción

**Dominio**: prosellweb.com
**API**: api.prosellweb.com
**Infraestructura**: Digital Ocean Droplet + Docker Compose + Caddy (SSL automático)

---

## Requisitos previos

- Droplet Ubuntu 22.04/24.04 con al menos 2 GB RAM
- Dominio `prosellweb.com` en Hostinger
- Acceso SSH al Droplet
- Repo clonado localmente con los últimos cambios

---

## Paso 1 — Configurar DNS en Hostinger

En el panel de Hostinger, en la zona DNS de `prosellweb.com`, agregá estos registros A:

| Host | Tipo | Valor | TTL |
|------|------|-------|-----|
| `@` | A | `IP_DEL_DROPLET` | 3600 |
| `www` | A | `IP_DEL_DROPLET` | 3600 |
| `api` | A | `IP_DEL_DROPLET` | 3600 |

> La propagación puede tardar hasta 24h, pero generalmente son minutos.

---

## Paso 2 — Preparar el Droplet

Conectate por SSH y ejecutá:

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Instalar Docker Compose plugin
apt install -y docker-compose-plugin

# Verificar
docker --version
docker compose version

# Reiniciar sesión para que el grupo docker tome efecto
exit
```

Reconectate y continuá.

---

## Paso 3 — Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/prosell-sass.git /opt/prosell
cd /opt/prosell
```

---

## Paso 4 — Generar claves JWT

Si no tenés las claves ya generadas:

```bash
mkdir -p apps/api/keys
openssl genrsa -out apps/api/keys/private.pem 2048
openssl rsa -in apps/api/keys/private.pem -pubout -out apps/api/keys/public.pem
chmod 600 apps/api/keys/private.pem
```

> Si ya tenés las claves del staging, copialas al Droplet:
> ```bash
> scp -r apps/api/keys/ usuario@IP_DROPLET:/opt/prosell/apps/api/keys/
> ```

---

## Paso 5 — Crear el archivo .env.prod

```bash
cd /opt/prosell
cp .env.prod.example .env.prod
nano .env.prod
```

Completá los valores:
- `DB_PASSWORD` — generá uno seguro: `openssl rand -base64 32`
- `REDIS_PASSWORD` — generá uno seguro: `openssl rand -base64 32`
- `GOOGLE_OAUTH_CLIENT_ID` y `GOOGLE_OAUTH_CLIENT_SECRET` — de Google Cloud Console
- `SENDGRID_API_KEY` — de tu cuenta SendGrid

> Asegurate de actualizar el Redirect URI en Google Cloud Console:
> `https://api.prosellweb.com/api/auth/oauth/google/callback`

---

## Paso 6 — Primer deploy

```bash
cd /opt/prosell

# Build + levantar todos los servicios
docker compose -f docker/docker-compose.prod.yml --env-file .env.prod up -d --build

# Ver logs mientras levanta (Ctrl+C para salir)
docker compose -f docker/docker-compose.prod.yml logs -f
```

El primer build tarda ~5-10 minutos. Caddy obtiene el certificado SSL automáticamente.

---

## Paso 7 — Migrar base de datos y sembrar datos iniciales

```bash
# Ejecutar migraciones Alembic
docker exec prosell-prod-api uv run alembic upgrade head

# Sembrar admin + org inicial
docker exec prosell-prod-api uv run python /app/scripts/init_data.py
```

---

## Paso 8 — Verificar

```bash
# Estado de containers
docker compose -f docker/docker-compose.prod.yml ps

# Health checks
curl https://api.prosellweb.com/api/v1/health
curl https://prosellweb.com
```

Deberías ver:
- `prosellweb.com` → app Next.js con SSL ✅
- `api.prosellweb.com/api/v1/health` → `{"status": "ok"}` ✅

---

## Deploys posteriores (actualización de código)

**Usá el script automatizado** — tiene pre-flight checks, backup de DB, detección de migraciones pendientes, health checks por dominio público, y muestra el plan de rollback al final:

```bash
cd /opt/prosell
./scripts/deploy-production.sh
```

El script exige que tipees literalmente `deploy-prod` para confirmar. Flags útiles:

| Flag | Cuándo |
|------|--------|
| `--skip-build` | Solo reiniciar containers (ej: cambiar config de Caddy sin código nuevo) |
| `--branch <name>` | Deploy desde otra branch (default: `main`) |
| `--no-backup` | Saltar backup de DB — **NO recomendado** |

**Deploy manual** (si el script no aplica a tu caso):

```bash
cd /opt/prosell

# Traer cambios
git pull origin main

# Rebuild y reiniciar (zero-downtime parcial con Caddy)
docker compose -f docker/docker-compose.prod.yml --env-file .env.prod up -d --build

# Si hay migraciones nuevas
docker exec prosell-prod-api uv run alembic upgrade head
```

---

## Comandos útiles

```bash
# Ver logs de un servicio específico
docker compose -f docker/docker-compose.prod.yml logs -f api
docker compose -f docker/docker-compose.prod.yml logs -f web
docker compose -f docker/docker-compose.prod.yml logs -f caddy

# Reiniciar un servicio
docker compose -f docker/docker-compose.prod.yml restart api

# Shell en el container de la API
docker exec -it prosell-prod-api sh

# Detener todo
docker compose -f docker/docker-compose.prod.yml down

# Detener y borrar volúmenes (CUIDADO: borra la DB)
docker compose -f docker/docker-compose.prod.yml down -v
```

---

## Credenciales iniciales

Después del `init_data.py`:

- **Email**: `admin@prosell.saas`
- **Password**: `Admin123!`

Cambialo inmediatamente desde Settings → Seguridad.

---

## Firewall (UFW)

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

---

## Próximo paso — GitHub Actions (CD automático)

Una vez que el deploy manual esté estable, el siguiente paso es configurar GitHub Actions para deploy automático en cada push a `main`. Ver `.github/workflows/ci.yml` como punto de partida.
