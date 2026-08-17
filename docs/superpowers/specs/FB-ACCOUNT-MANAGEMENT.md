# FB Account Management & Marketplace Integration

**Status**: IMPLEMENTED (merged 2026-07-29, latest commit eb379a90)
**Author**: Claude + User
**Created**: 2026-07-29
**Merged**: 2026-07-29

---

## Problem Statement

El flujo actual de publicación a FB Marketplace tiene estos problemas:

1. **Credenciales inseguras**: Las cuentas FB están en `config.ini` en texto plano
2. **Sin visibilidad**: ProSell no sabe qué cuentas existen hasta que el bot reporta
3. **Sin control**: No se puede asignar una cuenta específica a un producto
4. **Grupos sin identificar**: Se guardan posiciones (1,2,3) en vez de IDs de FB
5. **Sin UI de gestión**: El admin no puede ver/administrar cuentas ni publicaciones

---

## Goals

1. ProSell como **única fuente de verdad** para cuentas FB
2. **Credenciales encriptadas** en base de datos
3. **Asignación explícita** de cuenta a producto
4. **Dashboard** de publicaciones por cuenta/grupo
5. Bot **lee cuentas desde API** (no config.ini)

---

## Non-Goals (v1)

- Publicación automática desde ProSell (sigue siendo el bot)
- OAuth con Facebook (sigue siendo login manual en el bot)
- Renovación automática de sesiones FB
- **Cálculo de comisiones** (se trackea la cuenta, pero no se calculan comisiones aún)
- **Dealers externos** (ProSell maneja todo centralmente por ahora)

## Context: ProSell Central Model

En esta fase, **ProSell opera centralmente**:

```
ProSell (empresa)
    │
    ├── Vendedores (personas individuales empleados/colaboradores de ProSell)
    │   ├── Juan Pérez      → cuenta FB: juan.vendedor@gmail.com
    │   ├── María García    → cuenta FB: maria.vendedor@gmail.com
    │   └── Pedro López     → cuenta FB: pedro.vendedor@gmail.com
    │
    └── Inventario centralizado (ProSell administra todo)
        └── Productos → se publican via cuentas de los vendedores
```

- Las cuentas de FB son **personales de cada vendedor** (no de empresas/dealers)
- ProSell administra todo el inventario centralmente
- El tracking de qué cuenta publicó sirve para **futuras comisiones**:
  - Lead llega por publicación de Juan → comisión a Juan
  - Se concreta cita/venta → comisión al vendedor de esa cuenta

**Futuro** (no ahora):

- Dealers externos tendrán acceso a la plataforma
- Vendedores publicarán directamente desde su dashboard
- Sistema de comisiones automático

---

## Data Model

### Key Decisions from User

1. **Múltiples cuentas SÍ pueden publicar el mismo producto** (mayor cobertura)
2. **Historial completo** de publicaciones (no solo la última)
3. **Republicación tracking** - fechas, contador, requiere eliminar primero
4. **Grupos categorizados** - vehículos, productos generales, etc.
5. **Cuenta ↔ Vendedor (Broker)** - para comisiones de venta
6. **Estado de cuenta visible** - admin ve si está suspendida

### New Tables

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- CUENTAS DE FACEBOOK
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE fb_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    -- Vendedor de ProSell dueño de esta cuenta (para tracking de comisiones futuras)
    -- Cuando un lead llega por publicación de esta cuenta → comisión al vendedor
    broker_id UUID REFERENCES brokers(id),  -- NULL = cuenta compartida/sin asignar

    -- Identificación
    email VARCHAR(255) NOT NULL,
    alias VARCHAR(100),  -- "Cuenta Juan", "Cuenta María"

    -- Credenciales (encriptadas con Fernet)
    password_encrypted BYTEA NOT NULL,

    -- Configuración del bot
    browser VARCHAR(20) DEFAULT 'chrome',  -- chrome, firefox
    language VARCHAR(10) DEFAULT 'es',
    time_to_sleep DECIMAL(3,1) DEFAULT 0.7,

    -- Estado de la cuenta
    status VARCHAR(20) DEFAULT 'active',
    -- active: funcionando normal
    -- disabled: deshabilitada por admin
    -- suspended: suspendida por FB (detectado por bot)
    -- restricted: restricción temporal FB

    -- Métricas
    last_used_at TIMESTAMPTZ,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    total_publications INT DEFAULT 0,
    total_failures INT DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, email)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- GRUPOS DE FACEBOOK POR CUENTA
-- ═══════════════════════════════════════════════════════════════════════════

-- Categorías de grupos (para filtrar qué productos van a qué grupos)
CREATE TYPE fb_group_category AS ENUM (
    'vehicles',      -- Solo vehículos
    'general',       -- Productos generales
    'real_estate',   -- Bienes raíces
    'electronics',   -- Electrónicos
    'other'          -- Otros
);

CREATE TABLE fb_account_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fb_account_id UUID NOT NULL REFERENCES fb_accounts(id) ON DELETE CASCADE,

    -- Identificación del grupo
    position INT NOT NULL,           -- 1, 2, 3... (orden en FB, max ~10)
    fb_group_id VARCHAR(50),         -- ID real de FB (extraído por bot)
    name VARCHAR(255),               -- Nombre del grupo (extraído por bot)

    -- Categorización
    category fb_group_category DEFAULT 'general',

    -- Estado
    is_active BOOLEAN DEFAULT true,

    -- Métricas
    total_posts INT DEFAULT 0,
    last_post_at TIMESTAMPTZ,

    UNIQUE(fb_account_id, position)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- HISTORIAL DE PUBLICACIONES (reemplaza marketplace_publications simple)
-- ═══════════════════════════════════════════════════════════════════════════

-- Cada publicación es un evento inmutable en el historial
CREATE TABLE fb_publication_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    -- Relaciones
    product_id UUID NOT NULL REFERENCES products(id),
    fb_account_id UUID NOT NULL REFERENCES fb_accounts(id),

    -- Tipo de evento
    event_type VARCHAR(20) NOT NULL,
    -- 'published': publicado exitosamente
    -- 'failed': falló al publicar
    -- 'deleted': eliminado de FB
    -- 'expired': venció automáticamente (7 días)
    -- 'republished': republicado (después de eliminar)

    -- Detalles de publicación
    fb_post_id VARCHAR(100),         -- ID del post en FB
    fb_groups_posted JSONB,          -- [{position, fb_group_id, name}]
    groups_count INT DEFAULT 0,

    -- Error info (si failed)
    error_message TEXT,
    error_code VARCHAR(50),

    -- Timestamps
    event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,          -- Cuándo vence en FB (7 días)

    -- Para tracking de republicaciones
    publication_number INT DEFAULT 1, -- 1ra vez, 2da vez, etc.
    previous_publication_id UUID REFERENCES fb_publication_history(id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ESTADO ACTUAL DE PUBLICACIÓN (vista consolidada)
-- ═══════════════════════════════════════════════════════════════════════════

-- Para saber rápido: ¿Este producto está activo en esta cuenta?
CREATE TABLE fb_publication_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    product_id UUID NOT NULL REFERENCES products(id),
    fb_account_id UUID NOT NULL REFERENCES fb_accounts(id),

    -- Estado actual
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending': marcado para publicar, bot no lo ha tomado
    -- 'active': publicado y activo en FB
    -- 'deleted': eliminado de FB
    -- 'expired': venció
    -- 'failed': último intento falló

    -- Referencia al último evento
    last_event_id UUID REFERENCES fb_publication_history(id),
    last_event_at TIMESTAMPTZ,

    -- Contadores
    publication_count INT DEFAULT 0,  -- Cuántas veces se ha publicado
    failure_count INT DEFAULT 0,      -- Cuántas veces ha fallado

    -- Timestamps
    first_published_at TIMESTAMPTZ,
    last_published_at TIMESTAMPTZ,
    last_deleted_at TIMESTAMPTZ,

    -- Constraint: un producto solo puede tener UN estado por cuenta
    UNIQUE(product_id, fb_account_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- MODIFICACIONES A PRODUCTS
-- ═══════════════════════════════════════════════════════════════════════════

-- Ya existe: published_to_marketplace (bool)
-- Agregar: lista de cuentas asignadas (puede ser múltiples o vacío = todas)
CREATE TABLE product_fb_account_assignments (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    fb_account_id UUID NOT NULL REFERENCES fb_accounts(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (product_id, fb_account_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX ix_fb_accounts_tenant ON fb_accounts(tenant_id);
CREATE INDEX ix_fb_accounts_status ON fb_accounts(status);
CREATE INDEX ix_fb_accounts_broker ON fb_accounts(broker_id);

CREATE INDEX ix_fb_account_groups_account ON fb_account_groups(fb_account_id);
CREATE INDEX ix_fb_account_groups_category ON fb_account_groups(category);

CREATE INDEX ix_fb_pub_history_product ON fb_publication_history(product_id);
CREATE INDEX ix_fb_pub_history_account ON fb_publication_history(fb_account_id);
CREATE INDEX ix_fb_pub_history_event_at ON fb_publication_history(event_at DESC);

CREATE INDEX ix_fb_pub_status_product ON fb_publication_status(product_id);
CREATE INDEX ix_fb_pub_status_account ON fb_publication_status(fb_account_id);
CREATE INDEX ix_fb_pub_status_status ON fb_publication_status(status);
```

### Encryption Strategy

```python
# Usar Fernet (symmetric encryption) con clave por tenant
# La clave maestra está en variable de entorno

from cryptography.fernet import Fernet
import os

MASTER_KEY = os.environ["FB_ENCRYPTION_KEY"]  # Must be 32 url-safe base64 bytes

def encrypt_password(password: str, tenant_id: str) -> bytes:
    """Encrypt password with tenant-derived key."""
    # Derive per-tenant key from master + tenant_id
    key = derive_key(MASTER_KEY, tenant_id)
    f = Fernet(key)
    return f.encrypt(password.encode())

def decrypt_password(encrypted: bytes, tenant_id: str) -> str:
    """Decrypt password."""
    key = derive_key(MASTER_KEY, tenant_id)
    f = Fernet(key)
    return f.decrypt(encrypted).decode()
```

---

## API Endpoints

### FB Accounts Management

```yaml
# CRUD de cuentas (requiere ADMIN o MARKETPLACE_MANAGE permission)

POST /api/v1/fb-accounts
  body:
    email: string (required)
    password: string (required, se encripta antes de guardar)
    alias: string (optional)
    browser: "chrome" | "firefox"
    language: "es" | "en"
    time_to_sleep: number
  response: { id, email, alias, status, created_at }

GET /api/v1/fb-accounts
  response: [{ id, email, alias, status, groups_count, last_used_at }]
  # NUNCA devuelve password

GET /api/v1/fb-accounts/{id}
  response: { id, email, alias, browser, language, groups, status }

PATCH /api/v1/fb-accounts/{id}
  body: { alias?, browser?, language?, status? }
  # Para cambiar password: endpoint separado

POST /api/v1/fb-accounts/{id}/change-password
  body: { new_password: string }
  # Solo actualiza password

DELETE /api/v1/fb-accounts/{id}
  # Soft delete: status = 'deleted'

# Grupos de una cuenta
GET /api/v1/fb-accounts/{id}/groups
  response: [{ id, position, fb_group_id, name, is_active }]

POST /api/v1/fb-accounts/{id}/groups
  body: { position, fb_group_id?, name? }

PATCH /api/v1/fb-accounts/{id}/groups/{group_id}
  body: { name?, is_active?, fb_group_id? }
```

### FB Sync (Bot endpoints)

```yaml
# ═══════════════════════════════════════════════════════════════════════════
# AUTENTICACIÓN DEL BOT
# ═══════════════════════════════════════════════════════════════════════════

# Obtener credenciales de una cuenta específica
GET /api/v1/fb-sync/account-config
  query: { email: string }
  headers: { X-Bot-Token: string }  # Token de autenticación del bot
  response:
    id: uuid
    email: string
    password: string  # Decrypted (solo para el bot autenticado)
    browser: string
    language: string
    time_to_sleep: number
    groups: [{ position, fb_group_id, name, category }]

# Listar todas las cuentas activas (para que el bot sepa cuáles procesar)
GET /api/v1/fb-sync/accounts
  headers: { X-Bot-Token: string }
  response:
    accounts: [{ id, email, alias, status, groups_count }]

# ═══════════════════════════════════════════════════════════════════════════
# PRODUCTOS PENDIENTES
# ═══════════════════════════════════════════════════════════════════════════

GET /api/v1/fb-sync/pending
  query:
    account_email: string (required)
    category: string (optional) # "vehicles" para filtrar por tipo de grupo
    limit: int
  response:
    products: [...]
    # Incluye productos donde:
    # 1. status = 'published' (en ProSell)
    # 2. published_to_marketplace = true
    # 3. Y una de estas:
    #    a) No hay asignaciones (cualquier cuenta puede tomarlo)
    #    b) Esta cuenta está asignada al producto
    # 4. Y NO tiene status 'active' en fb_publication_status para esta cuenta

# ═══════════════════════════════════════════════════════════════════════════
# CALLBACKS DEL BOT
# ═══════════════════════════════════════════════════════════════════════════

# Reportar publicación exitosa
POST /api/v1/fb-sync/callback
  body:
    product_id: uuid
    status: "published" | "failed"
    account_email: string
    fb_groups: [{ position, fb_group_id?, name? }]
    fb_post_id: string (if published)
    error: string (if failed)
    error_code: string (if failed) # "rate_limit", "suspended", "post_limit", etc.
  effects:
    - Crea entrada en fb_publication_history
    - Actualiza fb_publication_status (status, counters)
    - Actualiza fb_account (last_used_at, total_publications)
    - Actualiza fb_account_groups (nombres, IDs si vienen)
    - Si error_code = "suspended" → actualiza fb_account.status

# Reportar eliminación
POST /api/v1/fb-sync/callback/delete
  body:
    product_id: uuid
    account_email: string
    fb_post_id: string (optional)
  effects:
    - Crea entrada en fb_publication_history (event_type = 'deleted')
    - Actualiza fb_publication_status (status = 'deleted', last_deleted_at)

# Reportar estado de cuenta (heartbeat / health check)
POST /api/v1/fb-sync/account-status
  body:
    account_email: string
    status: "active" | "suspended" | "restricted"
    error: string (if not active)
  effects:
    - Actualiza fb_account.status
    - Si suspendida → puede disparar notificación al admin
```

---

## UI Screens

### 1. FB Accounts List (`/admin/fb-accounts`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Cuentas de Facebook Marketplace                          [+ Nueva cuenta]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📧 juan.vendedor@gmail.com                                            │   │
│  │ Alias: Cuenta Principal                                         │   │
│  │ Grupos: 5 activos · Última publicación: hace 2 horas            │   │
│  │ Estado: ● Activa                                    [⚙️] [🗑️]   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📧 maria.vendedor@gmail.com                                            │   │
│  │ Alias: Cuenta Backup                                            │   │
│  │ Grupos: 3 activos · Última publicación: hace 1 día              │   │
│  │ Estado: ● Activa                                    [⚙️] [🗑️]   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📧 suspended@gmail.com                                          │   │
│  │ Alias: Cuenta Suspendida FB                                     │   │
│  │ Error: "Account temporarily restricted"                         │   │
│  │ Estado: ⚠️ Suspendida                               [⚙️] [🗑️]   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. FB Account Detail/Edit (`/admin/fb-accounts/{id}`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Cuentas                                                               │
│                                                                         │
│ Editar cuenta de Facebook                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─── Información básica ───────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  Email *                        Alias                            │  │
│  │  ┌─────────────────────────┐    ┌─────────────────────────────┐  │  │
│  │  │ juan.vendedor@gmail.com       │    │ Cuenta Juan                 │  │  │
│  │  └─────────────────────────┘    └─────────────────────────────┘  │  │
│  │                                                                   │  │
│  │  Vendedor asignado              Estado                           │  │
│  │  ┌─────────────────────────┐    ┌─────────────────────────────┐  │  │
│  │  │ Juan Pérez          ▼  │    │ ● Activa              ▼    │  │  │
│  │  │ (Sin asignar)           │    │ ○ Deshabilitada             │  │  │
│  │  │ María García            │    │ ⚠️ Suspendida               │  │  │
│  │  │ Pedro López             │    │ ⚠️ Restringida              │  │  │
│  │  └─────────────────────────┘    └─────────────────────────────┘  │  │
│  │                                                                   │  │
│  │  💡 Si la venta se concreta via esta cuenta, la comisión futura  │  │
│  │     irá al vendedor asignado.                                    │  │
│  │                                                                   │  │
│  │  Contraseña                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │ ••••••••••••••••••••••••••••••••••••••••••  [Cambiar]       │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  │  💡 La contraseña se guarda encriptada. Nunca se muestra.        │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─── Configuración del bot ────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  Navegador              Idioma              Delay (segundos)     │  │
│  │  ┌───────────────┐      ┌───────────────┐   ┌───────────────┐    │  │
│  │  │ Chrome    ▼   │      │ Español   ▼   │   │ 0.7           │    │  │
│  │  └───────────────┘      └───────────────┘   └───────────────┘    │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─── Grupos de Facebook ───────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  #   Nombre del grupo              Categoría      ID FB   Activo │  │
│  │  ─────────────────────────────────────────────────────────────   │  │
│  │  1   Cars for Sale Orlando         🚗 Vehículos   123456   [✓]   │  │
│  │  2   Florida Car Deals             🚗 Vehículos   234567   [✓]   │  │
│  │  3   Miami Used Cars               🚗 Vehículos   345678   [✓]   │  │
│  │  4   Tampa Bay Marketplace         📦 General     —        [ ]   │  │
│  │  5   Jacksonville Electronics      📱 Electrónico —        [ ]   │  │
│  │                                                                   │  │
│  │  [+ Agregar grupo]                                                │  │
│  │                                                                   │  │
│  │  💡 Los nombres e IDs se actualizan automáticamente cuando       │  │
│  │     el bot publica. La categoría determina qué productos van     │  │
│  │     a cada grupo (vehículos solo a grupos de vehículos).         │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│                                          [Cancelar]  [Guardar cambios]  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Product Form - FB Section

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Editar producto                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ... (campos existentes: título, precio, descripción, etc.) ...         │
│                                                                         │
│  ┌─── Facebook Marketplace ─────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  [✓] Publicar en Facebook Marketplace                            │  │
│  │                                                                   │  │
│  │  Cuenta preferida (opcional)                                      │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │ Cualquier cuenta disponible                             ▼   │ │  │
│  │  ├─────────────────────────────────────────────────────────────┤ │  │
│  │  │ ○ Cualquier cuenta disponible                               │ │  │
│  │  │ ○ juan.vendedor@gmail.com (Cuenta Principal) - 5 grupos           │ │  │
│  │  │ ○ maria.vendedor@gmail.com (Cuenta Backup) - 3 grupos              │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  │  💡 Si no seleccionás cuenta, el producto se publicará con      │  │
│  │     la primera cuenta disponible que lo tome.                    │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4. Product Detail - FB History Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Toyota Camry 2020                                                       │
│ [General] [Imágenes] [Atributos] [FB Marketplace]                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─── Estado por cuenta ────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  juan.vendedor@gmail.com (Juan)                                        │  │
│  │  Estado: ● Activo en 3 grupos · Publicado: 2 veces               │  │
│  │  Última pub: 29/07/2026 15:30 · Vence: 05/08/2026                │  │
│  │  [Ver historial] [Eliminar de FB]                                │  │
│  │                                                                   │  │
│  │  maria.vendedor@gmail.com (María)                                       │  │
│  │  Estado: ◐ Pendiente (marcado, bot no lo ha tomado)              │  │
│  │  [Cancelar]                                                       │  │
│  │                                                                   │  │
│  │  pedro.vendedor@gmail.com (Pedro)                                       │  │
│  │  Estado: — No asignado                                           │  │
│  │  [Asignar a esta cuenta]                                         │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─── Historial completo ───────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  29/07/2026 15:30  ● Publicado   juan.vendedor@gmail.com  3 grupos     │  │
│  │  25/07/2026 10:15  ✗ Eliminado   juan.vendedor@gmail.com               │  │
│  │  20/07/2026 14:00  ● Publicado   juan.vendedor@gmail.com  3 grupos     │  │
│  │  18/07/2026 09:30  ✗ Fallido     maria.vendedor@gmail.com               │  │
│  │                    └─ Error: "Post limit reached"                 │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5. FB Publications Dashboard (`/admin/fb-publications`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Publicaciones en Facebook Marketplace                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─── Filtros ──────────────────────────────────────────────────────┐  │
│  │  Cuenta: [Todas ▼]  Vendedor: [Todos ▼]  Estado: [Todos ▼]       │  │
│  │  Fecha: [Últimos 7 días ▼]                                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─── Resumen por estado ───────────────────────────────────────────┐  │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │   │    47    │  │    12    │  │     3    │  │     2    │        │  │
│  │   │ Activas  │  │Pendientes│  │ Fallidas │  │ Vencidas │        │  │
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────┘        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─── Alertas de cuentas ───────────────────────────────────────────┐  │
│  │  ⚠️ pedro.vendedor@gmail.com (Pedro) — Suspendida hace 2 horas          │  │
│  │     Último error: "Account temporarily restricted"               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─── Publicaciones ────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  Producto            Vendedor    Cuenta            Grupos  Estado│  │
│  │  ───────────────────────────────────────────────────────────────  │  │
│  │  Toyota Camry 2020   Juan        juan@gmail     3       ● 2x  │  │
│  │  Toyota Camry 2020   María       maria@gmail     3       ● 1x  │  │
│  │  Honda Civic 2021    Juan        juan@gmail     2       ● 1x  │  │
│  │  Ford Explorer 2020  María       maria@gmail     3       ● 1x  │  │
│  │  Nissan Altima 2019  Juan        juan@gmail     —       ✗     │  │
│  │    └─ Error: "Post limit reached for today"                      │  │
│  │  Chevrolet Malibu    —           (pendiente)       —       ◐     │  │
│  │                                                                   │  │
│  │  ● Activa  ◐ Pendiente  ✗ Fallida  ○ Eliminada  ◌ Vencida       │  │
│  │  2x = Republicado 2 veces                                        │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5. Bulk Actions in Product List

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Productos                                           [Acciones ▼]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [✓] Seleccionar todos (3 seleccionados)                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Acciones en lote:                                                │   │
│  │  ├─ Enviar a revisión (DRAFT → PENDING)                         │   │
│  │  ├─ Aprobar seleccionados (PENDING → PUBLISHED)                 │   │
│  │  ├─ Marcar para FB Marketplace                                   │   │
│  │  ├─ Quitar de FB Marketplace                                     │   │
│  │  └─ Asignar cuenta FB...                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [✓] Toyota Camry 2020      $16,500   PUBLISHED   [FB: Pendiente]      │
│  [✓] Honda Civic 2021       $21,000   PUBLISHED   [FB: —]              │
│  [✓] Ford Explorer 2020     $17,800   DRAFT       [FB: —]              │
│  [ ] Nissan Altima 2019     $14,200   PUBLISHED   [FB: ● dealer1]      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Bot Changes (fb-auto-post)

### Nueva opción: API mode

```ini
[PROSELL]
enabled = true
api_url = https://api.prosell.com
# Ya no necesita email/password aquí
# El bot obtiene las credenciales desde la API

# Token de autenticación del bot
bot_token = sk_bot_xxxxxxxxxxxxx

# Modo: "config" (legacy) o "api" (nuevo)
mode = api
```

### Nuevo flujo del bot

```python
# 1. Obtener lista de cuentas activas desde ProSell
accounts = prosell_api.get_accounts(bot_token)

# 2. Para cada cuenta:
for account in accounts:
    # Obtener credenciales
    config = prosell_api.get_account_config(account.email)

    # Login a Facebook
    browser.login(config.email, config.password)

    # Obtener productos pendientes para ESTA cuenta
    products = prosell_api.get_pending(account_email=account.email)

    # Publicar
    for product in products:
        result = publish_to_fb(product, config.groups)

        # Reportar resultado con info de grupos
        prosell_api.callback(
            product_id=product.id,
            status="published" if result.ok else "failed",
            account_email=account.email,
            fb_groups=[
                {"position": g.pos, "fb_group_id": g.id, "name": g.name}
                for g in result.groups
            ],
            fb_post_id=result.post_id,
            error=result.error
        )
```

---

## Security Considerations

1. **Encryption at rest**: Passwords encriptados con Fernet (AES-128)
2. **Key per tenant**: Cada tenant tiene una clave derivada
3. **Bot authentication**: Token único por instalación del bot
4. **Password never in logs**: El password decrypted solo viaja al bot autenticado
5. **Audit trail**: Toda acción en fb_accounts se loguea

---

## Migration Path

### Phase 1: Backend (sin cambios en bot)

1. Crear tablas `fb_accounts`, `fb_account_groups`
2. Agregar `preferred_fb_account_id` a products
3. Implementar endpoints CRUD
4. El bot sigue funcionando con config.ini

### Phase 2: UI

1. Crear pantallas de gestión de cuentas
2. Agregar sección FB en form de producto
3. Crear dashboard de publicaciones

### Phase 3: Bot Migration

1. Agregar endpoint `/fb-sync/account-config`
2. Bot puede leer credenciales desde API
3. Bot reporta info de grupos enriquecida

### Phase 4: Deprecate config.ini

1. Marcar mode=config como deprecated
2. Documentar migración
3. Eventualmente remover soporte

---

## Implementation Tasks

### Phase 1: Backend - Data Model

- [ ] Migración: crear tipo ENUM fb_group_category
- [ ] Migración: crear tabla fb_accounts (con broker_id)
- [ ] Migración: crear tabla fb_account_groups (con category)
- [ ] Migración: crear tabla fb_publication_history
- [ ] Migración: crear tabla fb_publication_status
- [ ] Migración: crear tabla product_fb_account_assignments
- [ ] Model: FBAccountModel
- [ ] Model: FBAccountGroupModel
- [ ] Model: FBPublicationHistoryModel
- [ ] Model: FBPublicationStatusModel

### Phase 1: Backend - Services & Encryption

- [ ] Utils: encryption.py (Fernet encrypt/decrypt con key derivation)
- [ ] Service: FBAccountService (CRUD + encryption)
- [ ] Service: FBPublicationService (historial, estado, métricas)
- [ ] Tests: encryption unit tests
- [ ] Tests: service unit tests

### Phase 1: Backend - API Endpoints

- [ ] Router: fb_account_router.py (CRUD cuentas)
- [ ] Router: fb_publication_router.py (dashboard data)
- [ ] Actualizar: fb_sync_router.py
  - [ ] GET /fb-sync/accounts (lista para bot)
  - [ ] GET /fb-sync/account-config (credenciales para bot)
  - [ ] GET /fb-sync/pending (filtrar por asignaciones + status)
  - [ ] POST /fb-sync/callback (crear historial, actualizar status)
  - [ ] POST /fb-sync/callback/delete (marcar eliminado)
  - [ ] POST /fb-sync/account-status (reportar estado cuenta)

### Phase 2: Frontend - Cuentas

- [ ] Página: /admin/fb-accounts (lista)
- [ ] Página: /admin/fb-accounts/new (crear)
- [ ] Página: /admin/fb-accounts/[id] (editar)
- [ ] Componente: FBAccountCard
- [ ] Componente: FBAccountForm
- [ ] Componente: FBGroupsEditor (con categorías)
- [ ] Componente: PasswordInput (con cambiar/ocultar)
- [ ] API client: useFBAccounts, useFBAccount

### Phase 2: Frontend - Productos

- [ ] Sección: FB Marketplace en UnifiedProductForm
- [ ] Componente: FBAccountAssignment (multi-select de cuentas)
- [ ] Tab: FB History en detalle de producto
- [ ] Componente: FBPublicationTimeline (historial visual)
- [ ] Acciones bulk: marcar FB, asignar cuentas

### Phase 2: Frontend - Dashboard

- [ ] Página: /admin/fb-publications (dashboard)
- [ ] Componente: FBPublicationStats (cards resumen)
- [ ] Componente: FBAccountAlerts (cuentas suspendidas)
- [ ] Componente: FBPublicationTable (con filtros)

### Phase 3: Bot (fb-auto-post)

- [ ] Config: modo "api" vs "config" (legacy)
- [ ] Client: prosell_api.get_accounts()
- [ ] Client: prosell_api.get_account_config()
- [ ] Client: prosell_api.report_delete()
- [ ] Client: prosell_api.report_account_status()
- [ ] Extraer: fb_group_id de la URL del grupo
- [ ] Extraer: nombre del grupo del DOM
- [ ] Mejorar: callback con info enriquecida de grupos

### Phase 4: Deprecation

- [ ] Documentar: migración de config.ini a API
- [ ] Warning: log cuando se usa mode=config
- [ ] Eventual: remover soporte config.ini

---

## Resolved Questions

1. **¿Múltiples cuentas pueden publicar el mismo producto?**
   → **SÍ**, para mayor cobertura. Cada cuenta puede publicar el mismo producto en sus grupos.

2. **¿Límite de grupos por cuenta?**
   → FB permite ~10 grupos. Los grupos están categorizados (vehicles, general, etc.) para que vehículos solo vayan a grupos de vehículos.

3. **¿Rotación automática de cuentas?**
   → **NO**. Las cuentas pertenecen a vendedores de ProSell. No hay rotación automática.

4. **¿Notificaciones de estado de cuenta?**
   → **SÍ**. El admin debe ver claramente si una cuenta está suspendida/restringida.

5. **¿Comisiones ahora?**
   → **NO**. Solo tracking de qué cuenta publicó. Las comisiones se implementan después cuando:
   - Lead llega por publicación específica
   - Se concreta cita/venta
   - Comisión va al vendedor dueño de esa cuenta

## Open Questions

1. ¿Email automático al admin cuando una cuenta se suspende?
2. ¿Límite de republicaciones por producto por cuenta?
3. ¿Cómo conectar un lead con la cuenta que generó la publicación? (para comisiones futuras)
