# 🏗️ ARQUITECTURA DEL SISTEMA - PROSELL SAAS v2.0

**Proyecto**: ProSell SaaS - Plataforma Multiproducto de E-commerce, Análisis y Automatización
**Versión**: 2.0
**Fecha**: Febrero 2026
**Audiencia**: Arquitectos de Software, Tech Leads, Desarrolladores

---

## 📋 TABLA DE CONTENIDOS

1. [Visión General](#1-visión-general)
2. [Principios Arquitectónicos](#2-principios-arquitectónicos)
3. [Arquitectura de Alto Nivel](#3-arquitectura-de-alto-nivel)
4. [Arquitectura de Capas](#4-arquitectura-de-capas)
5. [Modelo de Dominio](#5-modelo-de-dominio)
6. [Sistema de Roles y Permisos](#6-sistema-de-roles-y-permisos)
7. [Arquitectura de Microservicios](#7-arquitectura-de-microservicios)
8. [Modelo de Datos](#8-modelo-de-datos)
9. [Arquitectura de Eventos](#9-arquitectura-de-eventos)
10. [Integraciones Externas](#10-integraciones-externas)
11. [Infraestructura y DevOps](#11-infraestructura-y-devops)
12. [Stack Tecnológico](#12-stack-tecnológico)
13. [Seguridad](#13-seguridad)
14. [Escalabilidad](#14-escalabilidad)

---

## 1. VISIÓN GENERAL

### 1.1 Descripción del Sistema

**ProSell SaaS** es una plataforma integral que combina:

1. **E-commerce Multiproducto**: Marketplace público para organizaciones/dealers
2. **Sistema de Ventas**: Gestión de citas, comisiones y equipos de venta
3. **Análisis de Mercado**: Inteligencia de precios con scraping automatizado
4. **Agentes IA**: Asistentes conversacionales para ventas y análisis
5. **Sistema de Prepago**: Billetera virtual con tokens para servicios

### 1.2 Diagrama de Contexto

```mermaid
C4Context
    title Diagrama de Contexto - ProSell SaaS

    Person(master, "ProSell Master", "Administrador principal")
    Person(manager, "Manager", "Gestiona equipo de vendedores")
    Person(seller, "Vendedor ProSell", "Vende productos de todas las orgs")
    Person(orgAdmin, "Admin Organización", "Administra su dealer/negocio")
    Person(orgSeller, "Vendedor Org", "Vende productos de su org")
    Person(client, "Cliente", "Comprador público")

    System(prosell, "ProSell SaaS", "Plataforma de E-commerce y Análisis")

    System_Ext(meta, "Meta APIs", "WhatsApp, Messenger, Facebook")
    System_Ext(stripe, "Stripe", "Pagos y facturación")
    System_Ext(marketplaces, "Marketplaces", "FB, eBay, Craigslist, etc.")
    System_Ext(ai, "Anthropic Claude", "Agentes IA")
    System_Ext(storage, "DigitalOcean Spaces", "Almacenamiento de imágenes")
    System_Ext(nhtsa, "NHTSA API", "Decodificación VIN")

    Rel(master, prosell, "Administra")
    Rel(manager, prosell, "Gestiona equipos")
    Rel(seller, prosell, "Vende y gestiona citas")
    Rel(orgAdmin, prosell, "Administra inventario")
    Rel(orgSeller, prosell, "Vende")
    Rel(client, prosell, "Navega y compra")

    Rel(prosell, meta, "Notificaciones y chat")
    Rel(prosell, stripe, "Procesa pagos")
    Rel(prosell, marketplaces, "Extrae datos")
    Rel(prosell, ai, "Análisis y chat")
    Rel(prosell, storage, "Almacena imágenes")
    Rel(prosell, nhtsa, "Decodifica VIN")
```

### 1.3 Características Clave

| Característica | Descripción |
|---------------|-------------|
| **Multi-tenant** | Cada organización es un tenant aislado |
| **Multi-categoría** | Vehículos, inmuebles, electrónicos, etc. |
| **Responsive/PWA** | Adaptable a todos los dispositivos |
| **Event-Driven** | Arquitectura basada en eventos |
| **AI-Powered** | Agentes inteligentes integrados |
| **Prepago/Tokens** | Sistema de billetera virtual |

---

## 2. PRINCIPIOS ARQUITECTÓNICOS

### 2.1 Clean Architecture (Hexagonal)

```mermaid
graph TB
    subgraph "Presentation Layer"
        API[FastAPI REST]
        WS[WebSocket]
        WEB[Frontend React/Next.js]
    end

    subgraph "Application Layer"
        UC[Use Cases]
        ORCH[Orchestrators]
        DTO[DTOs/Schemas]
    end

    subgraph "Domain Layer"
        ENT[Entities]
        AGG[Aggregates]
        VS[Value Objects]
        DS[Domain Services]
        EV[Domain Events]
        INT[Interfaces/Ports]
    end

    subgraph "Infrastructure Layer"
        REPO[Repositories]
        EXT[External Services]
        DB[(PostgreSQL)]
        CACHE[(Redis)]
        QUEUE[Message Queue]
        SCRAPER[Scrapers]
    end

    API --> UC
    WS --> UC
    WEB --> API
    UC --> ENT
    UC --> INT
    ORCH --> UC
    INT -.-> REPO
    INT -.-> EXT
    REPO --> DB
    EXT --> CACHE
    EXT --> QUEUE
```

### 2.2 Principios SOLID

| Principio | Aplicación en ProSell |
|-----------|----------------------|
| **SRP** | Cada clase tiene una única responsabilidad (ej: `FacebookListingExtractor` solo extrae) |
| **OCP** | Sistema de categorías extensible sin modificar código base |
| **LSP** | Todas las implementaciones son sustituibles por sus interfaces |
| **ISP** | Interfaces pequeñas y específicas (3-7 métodos) |
| **DIP** | Dependencias inyectadas, dominio no depende de infraestructura |

### 2.3 Regla de Dependencias

```
Presentation → Application → Domain ← Infrastructure
```

- **Domain**: Centro del sistema, CERO dependencias externas
- **Application**: Solo depende de Domain
- **Infrastructure**: Implementa interfaces del Domain
- **Presentation**: Depende de Application

---

## 3. ARQUITECTURA DE ALTO NIVEL

### 3.1 Diagrama de Contenedores

```mermaid
graph TB
    subgraph "Clientes"
        MOBILE[📱 Mobile PWA]
        DESKTOP[💻 Desktop Web]
        DEALER[🏪 Dealer App]
    end

    subgraph "API Gateway"
        NGINX[Nginx + Rate Limiting]
    end

    subgraph "Backend Services"
        API[🔧 API Principal<br/>FastAPI]
        AUTH[🔐 Auth Service<br/>JWT + OAuth]
        NOTIF[📬 Notification Service<br/>Meta APIs]
        SCRAPER[🕷️ Scraper Service<br/>Playwright]
        AI[🤖 AI Agent Service<br/>Claude]
        WALLET[💰 Wallet Service<br/>Prepago]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Principal)]
        REDIS[(Redis<br/>Cache + Sessions)]
        ES[(OpenSearch<br/>Búsquedas)]
        S3[(DO Spaces<br/>Imágenes)]
    end

    subgraph "Message Queue"
        RABBIT[Redis Streams<br/>Events + Jobs]
    end

    subgraph "External Services"
        META[Meta APIs]
        STRIPE[Stripe]
        NHTSA[NHTSA]
        CLAUDE[Anthropic]
    end

    MOBILE --> NGINX
    DESKTOP --> NGINX
    DEALER --> NGINX

    NGINX --> API
    NGINX --> AUTH

    API --> PG
    API --> REDIS
    API --> ES
    API --> S3
    API --> RABBIT

    AUTH --> PG
    AUTH --> REDIS

    NOTIF --> META
    NOTIF --> RABBIT

    SCRAPER --> RABBIT
    SCRAPER --> PG

    AI --> CLAUDE
    AI --> RABBIT

    WALLET --> PG
    WALLET --> STRIPE

    RABBIT --> NOTIF
    RABBIT --> SCRAPER
    RABBIT --> AI
```

### 3.2 Flujo de Datos Principal

```mermaid
sequenceDiagram
    participant C as Cliente
    participant N as Nginx
    participant A as API
    participant DB as PostgreSQL
    participant R as Redis
    participant Q as Redis Streams
    participant S as Services

    C->>N: Request HTTP/WS
    N->>N: Rate Limit Check
    N->>A: Forward Request
    A->>R: Check Cache
    alt Cache Hit
        R-->>A: Cached Data
    else Cache Miss
        A->>DB: Query Data
        DB-->>A: Result
        A->>R: Update Cache
    end
    A->>Q: Publish Event
    Q->>S: Process Async
    A-->>C: Response
```

---

## 4. ARQUITECTURA DE CAPAS

### 4.1 Estructura de Directorios

```
prosell-saas/
├── src/
│   └── prosell/
│       ├── domain/                      # 🎯 CAPA DE DOMINIO
│       │   ├── entities/                # Entidades y Agregados
│       │   │   ├── user/
│       │   │   │   ├── user.py
│       │   │   │   ├── role.py
│       │   │   │   └── permission.py
│       │   │   ├── organization/
│       │   │   │   ├── organization.py
│       │   │   │   └── team.py
│       │   │   ├── product/
│       │   │   │   ├── product.py       # Base genérica
│       │   │   │   ├── vehicle.py       # Extensión vehículos
│       │   │   │   ├── real_estate.py   # Extensión inmuebles
│       │   │   │   └── category.py
│       │   │   ├── sales/
│       │   │   │   ├── appointment.py
│       │   │   │   ├── sale.py
│       │   │   │   └── commission.py
│       │   │   └── wallet/
│       │   │       ├── wallet.py
│       │   │       └── transaction.py
│       │   ├── value_objects/           # Value Objects
│       │   │   ├── money.py
│       │   │   ├── email.py
│       │   │   ├── phone.py
│       │   │   └── address.py
│       │   ├── events/                  # Domain Events
│       │   │   ├── user_events.py
│       │   │   ├── product_events.py
│       │   │   ├── sale_events.py
│       │   │   └── wallet_events.py
│       │   ├── interfaces/              # Ports (Interfaces)
│       │   │   ├── repositories/
│       │   │   ├── services/
│       │   │   └── gateways/
│       │   ├── services/                # Domain Services
│       │   └── exceptions/              # Domain Exceptions
│       │
│       ├── application/                 # 🔄 CAPA DE APLICACIÓN
│       │   ├── use_cases/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── organizations/
│       │   │   ├── products/
│       │   │   ├── sales/
│       │   │   ├── wallet/
│       │   │   ├── scraping/
│       │   │   └── analytics/
│       │   ├── services/                # Application Services
│       │   ├── schemas/                 # DTOs
│       │   └── orchestrators/           # Complex Workflows
│       │
│       └── infrastructure/              # 🔧 CAPA DE INFRAESTRUCTURA
│           ├── http/                    # FastAPI
│           │   ├── routers/
│           │   ├── middleware/
│           │   └── dependencies/
│           ├── websocket/               # WebSocket handlers
│           ├── repositories/            # SQLAlchemy implementations
│           ├── services/                # External service implementations
│           │   ├── auth/
│           │   ├── notifications/
│           │   ├── storage/
│           │   ├── ai/
│           │   └── payments/
│           ├── scrapers/                # Web scrapers
│           │   ├── facebook/
│           │   ├── ebay/
│           │   └── craigslist/
│           ├── models/                  # SQLAlchemy models
│           ├── database/                # DB config & migrations
│           ├── cache/                   # Redis implementations
│           ├── queue/                   # Redis Streams handlers
│           └── config/                  # Configuration
│
├── frontend/                            # 🎨 FRONTEND
│   └── src/
│       ├── app/                         # Next.js App Router
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── stores/
│
├── tests/
├── scripts/
├── docker/
└── docs/
```

### 4.2 Responsabilidades por Capa

| Capa | Responsabilidad | Tecnologías |
|------|-----------------|-------------|
| **Domain** | Lógica de negocio pura, reglas, invariantes | Python puro, Pydantic |
| **Application** | Orquestación, casos de uso, workflows | Python, DTOs |
| **Infrastructure** | Implementaciones, I/O, persistencia | FastAPI, SQLAlchemy, Redis |
| **Presentation** | UI, API REST, WebSocket | Next.js, React, TailwindCSS |

---

## 5. MODELO DE DOMINIO

### 5.1 Diagrama de Entidades Principal

```mermaid
erDiagram
    USER ||--o{ USER_ROLE : has
    USER ||--o| WALLET : owns
    USER }o--|| ORGANIZATION : belongs_to
    USER }o--o| TEAM : member_of

    ROLE ||--o{ USER_ROLE : assigned
    ROLE ||--o{ ROLE_PERMISSION : has
    PERMISSION ||--o{ ROLE_PERMISSION : granted

    ORGANIZATION ||--o{ PRODUCT : owns
    ORGANIZATION ||--o{ USER : employs
    ORGANIZATION ||--o{ TEAM : has
    ORGANIZATION ||--|| WALLET : has
    ORGANIZATION ||--o| ORG_CONFIG : configured_by

    TEAM ||--|| USER : managed_by
    TEAM ||--o{ USER : contains

    PRODUCT ||--o{ PRODUCT_IMAGE : has
    PRODUCT ||--o{ PRODUCT_ATTRIBUTE : has
    PRODUCT }o--|| CATEGORY : categorized
    PRODUCT ||--o{ APPOINTMENT : scheduled
    PRODUCT ||--o| SALE : sold_as

    CATEGORY ||--o{ CATEGORY_FIELD : defines
    CATEGORY ||--o| CATEGORY : parent

    APPOINTMENT ||--|| USER : created_by
    APPOINTMENT ||--|| USER : assigned_to
    APPOINTMENT }o--|| PRODUCT : for

    SALE ||--|| PRODUCT : of
    SALE ||--|| USER : sold_by
    SALE ||--o{ COMMISSION : generates

    COMMISSION ||--|| USER : paid_to
    COMMISSION ||--|| SALE : from

    WALLET ||--o{ TRANSACTION : has
    WALLET ||--o{ TOKEN_BALANCE : contains

    TRANSACTION ||--|| WALLET : belongs_to

    SCRAPED_LISTING ||--o{ PRICE_HISTORY : tracks
    SCRAPED_LISTING }o--|| MARKETPLACE_SOURCE : from
```

### 5.2 Entidades Principales

#### User (Usuario)

```python
@dataclass
class User:
    id: UUID
    email: Email
    phone: Phone
    full_name: str
    avatar_url: str | None
    organization_id: UUID | None
    team_id: UUID | None
    is_active: bool
    is_verified: bool
    created_at: datetime

    # Computed
    roles: list[Role]
    permissions: set[Permission]
    wallet: Wallet
```

#### Organization (Organización/Dealer)

```python
@dataclass
class Organization:
    id: UUID
    name: str
    slug: str
    type: OrganizationType  # DEALER, BUSINESS, INDIVIDUAL
    logo_url: str | None
    banner_url: str | None
    contact_info: ContactInfo
    address: Address
    status: OrgStatus  # PENDING, VERIFIED, SUSPENDED
    auto_publish: bool  # Configuración de publicación automática
    created_at: datetime

    # Relations
    wallet: Wallet
    config: OrgConfig
```

#### Product (Producto Base)

```python
@dataclass
class Product:
    id: UUID
    organization_id: UUID
    category_id: UUID
    title: str
    description: str
    price: Money
    status: ProductStatus  # DRAFT, PENDING, PUBLISHED, PAUSED, SOLD
    condition: Condition  # NEW, USED, REFURBISHED
    location: Address
    views_count: int
    created_at: datetime
    published_at: datetime | None

    # Polimorfismo
    attributes: dict[str, Any]  # Campos dinámicos por categoría
    images: list[ProductImage]
```

#### Vehicle (Extensión de Producto)

```python
@dataclass
class Vehicle(Product):
    vin: str | None
    year: int
    make: str
    model: str
    trim: str | None
    mileage: int
    fuel_type: FuelType
    transmission: TransmissionType
    drivetrain: Drivetrain
    body_style: BodyStyle
    exterior_color: str
    interior_color: str
    engine: str | None

    # VIN Decoded data
    vin_data: dict | None
```

---

## 6. SISTEMA DE ROLES Y PERMISOS

### 6.1 Jerarquía de Roles

```mermaid
graph TB
    subgraph "ProSell Platform"
        MASTER[🔑 MASTER<br/>Control Total]
        MANAGER[👔 MANAGER<br/>Gestiona Equipos]
        SELLER[💼 SELLER PROSELL<br/>Vende Todo]
    end

    subgraph "Organization Level"
        ORG_ADMIN[🏢 ORG ADMIN<br/>Admin de Org]
        ORG_SELLER[👤 ORG SELLER<br/>Vende su Org]
    end

    subgraph "Public"
        CLIENT[🛒 CLIENT<br/>Comprador]
    end

    MASTER --> MANAGER
    MANAGER --> SELLER
    SELLER -.->|"Puede convertirse"| MANAGER

    ORG_ADMIN --> ORG_SELLER

    CLIENT -.->|"Puede ser"| SELLER
    CLIENT -.->|"Puede ser"| ORG_SELLER
```

### 6.2 Matriz de Permisos

| Permiso | Master | Manager | Seller PS | Org Admin | Org Seller | Client |
|---------|--------|---------|-----------|-----------|------------|--------|
| **Organizaciones** |
| Crear organización | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver todas las orgs | ✅ | ✅* | ✅* | ❌ | ❌ | ❌ |
| Editar org | ✅ | ❌ | ❌ | ✅** | ❌ | ❌ |
| Suspender org | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Productos** |
| Ver todos | ✅ | ✅* | ✅ | ❌ | ❌ | 🌐 |
| Crear producto | ✅ | ❌ | ❌ | ✅** | ❌ | ❌ |
| Editar producto | ✅ | ❌ | ❌ | ✅** | ❌ | ❌ |
| Aprobar publicación | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Pausar producto | ✅ | ❌ | ❌ | ✅** | ❌ | ❌ |
| Marcar vendido | ✅ | ✅* | ❌ | ✅** | ❌ | ❌ |
| **Ventas** |
| Crear cita | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver todas las citas | ✅ | ✅* | ❌ | ✅** | ❌ | ❌ |
| Registrar venta | ✅ | ✅* | ❌ | ✅** | ❌ | ❌ |
| **Equipos** |
| Crear equipo | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Asignar vendedores | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver equipo | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Comisiones** |
| Ver todas | ✅ | ✅* | ❌ | ✅** | ❌ | ❌ |
| Ver propias | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Editar % | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Wallet** |
| Ver todas | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Recargar | ✅ | ❌ | ❌ | ✅** | ❌ | ❌ |
| Consumir tokens | ✅ | ❌ | ❌ | ✅** | ❌ | ❌ |

*Solo organizaciones asignadas
**Solo su organización
🌐 Solo productos públicos

### 6.3 Sistema de Equipos (MLM Simplificado)

```mermaid
graph TB
    subgraph "Estructura de Comisiones"
        SALE[Venta: $10,000<br/>Comisión Total: $300]

        PROSELL[ProSell<br/>40% = $120]
        MANAGER_COM[Manager<br/>20% = $60]
        SELLER_COM[Vendedor<br/>40% = $120]
    end

    SALE --> PROSELL
    SALE --> MANAGER_COM
    SALE --> SELLER_COM

    subgraph "Reglas"
        R1[Porcentajes editables por Master]
        R2[Vendedor que recluta → Manager]
        R3[Manager máximo 10 vendedores]
        R4[Manager puede vender directamente]
    end
```

---

## 7. ARQUITECTURA DE MICROSERVICIOS

### 7.1 Servicios Principales

```mermaid
graph TB
    subgraph "API Gateway"
        GW[Nginx]
    end

    subgraph "Core Services"
        AUTH[Auth Service<br/>Puerto: 8001]
        API[Main API<br/>Puerto: 8000]
        WS[WebSocket Service<br/>Puerto: 8002]
    end

    subgraph "Background Services"
        NOTIF[Notification Service<br/>Puerto: 8003]
        SCRAPER[Scraper Service<br/>Puerto: 8004]
        AI[AI Agent Service<br/>Puerto: 8005]
        WALLET[Wallet Service<br/>Puerto: 8006]
        ANALYTICS[Analytics Service<br/>Puerto: 8007]
    end

    subgraph "Data Services"
        SYNC[Data Sync Service<br/>PG ↔ OpenSearch]
    end

    GW --> AUTH
    GW --> API
    GW --> WS

    API --> NOTIF
    API --> SCRAPER
    API --> AI
    API --> WALLET
    API --> ANALYTICS
```

### 7.2 Comunicación Entre Servicios

| Tipo | Protocolo | Uso |
|------|-----------|-----|
| Síncrono | REST/HTTP | Queries, operaciones inmediatas |
| Asíncrono | Redis Streams | Eventos, jobs largos |
| Real-time | WebSocket | Notificaciones, chat |
| Cache | Redis Pub/Sub | Invalidación de cache |

---

## 8. MODELO DE DATOS

### 8.1 Esquema Principal (PostgreSQL)

```mermaid
erDiagram
    users {
        uuid id PK
        string email UK
        string phone
        string password_hash
        string full_name
        string avatar_url
        uuid organization_id FK
        uuid team_id FK
        boolean is_active
        boolean is_verified
        timestamp created_at
        timestamp updated_at
    }

    roles {
        uuid id PK
        string name UK
        string description
        string level "PLATFORM, ORGANIZATION"
        jsonb permissions
        timestamp created_at
    }

    user_roles {
        uuid id PK
        uuid user_id FK
        uuid role_id FK
        uuid organization_id FK "nullable, para roles de org"
        timestamp assigned_at
    }

    organizations {
        uuid id PK
        string name
        string slug UK
        string type "DEALER, BUSINESS, INDIVIDUAL"
        string logo_url
        string banner_url
        jsonb contact_info
        jsonb address
        string status "PENDING, VERIFIED, SUSPENDED"
        boolean auto_publish
        timestamp created_at
        timestamp updated_at
    }

    org_configs {
        uuid id PK
        uuid organization_id FK UK
        int max_products
        int max_users
        int max_images_per_product
        jsonb notification_settings
        jsonb commission_rates
        timestamp created_at
    }

    teams {
        uuid id PK
        string name
        uuid manager_id FK
        uuid organization_id FK "nullable, null = ProSell team"
        int max_members
        timestamp created_at
    }

    team_assignments {
        uuid id PK
        uuid team_id FK
        uuid user_id FK
        uuid[] assigned_orgs "Organizaciones asignadas"
        timestamp assigned_at
    }

    categories {
        uuid id PK
        string name
        string slug UK
        uuid parent_id FK
        string icon
        int sort_order
        boolean is_active
        timestamp created_at
    }

    category_fields {
        uuid id PK
        uuid category_id FK
        string field_name
        string field_type "TEXT, NUMBER, SELECT, BOOLEAN, DATE"
        jsonb options "Para SELECT: opciones disponibles"
        boolean is_required
        int sort_order
        timestamp created_at
    }

    products {
        uuid id PK
        uuid organization_id FK
        uuid category_id FK
        string title
        text description
        decimal price
        string currency
        string status "DRAFT, PENDING, PUBLISHED, PAUSED, SOLD, RESERVED"
        string condition "NEW, USED, REFURBISHED"
        jsonb location
        jsonb attributes "Campos dinámicos según categoría"
        int views_count
        uuid approved_by FK
        timestamp created_at
        timestamp published_at
        timestamp updated_at
    }

    product_images {
        uuid id PK
        uuid product_id FK
        string url
        string thumbnail_url
        int sort_order
        boolean is_primary
        timestamp created_at
    }

    vehicles {
        uuid id PK
        uuid product_id FK UK
        string vin UK
        int year
        string make
        string model
        string trim
        int mileage
        string fuel_type
        string transmission
        string drivetrain
        string body_style
        string exterior_color
        string interior_color
        string engine
        jsonb vin_decoded_data
        timestamp created_at
    }

    appointments {
        uuid id PK
        uuid product_id FK
        uuid client_user_id FK
        uuid seller_user_id FK
        uuid created_by_user_id FK
        string status "PENDING, CONFIRMED, COMPLETED, CANCELLED, RESCHEDULED"
        timestamp scheduled_at
        string qr_code UK
        jsonb offer_details "Pre-negociaciones"
        string source "WEB, WHATSAPP, MESSENGER, INSTAGRAM"
        text notes
        timestamp created_at
        timestamp updated_at
    }

    sales {
        uuid id PK
        uuid product_id FK UK
        uuid seller_user_id FK
        uuid appointment_id FK
        decimal listed_price
        decimal final_price
        string currency
        string payment_method
        text notes
        timestamp sold_at
        timestamp created_at
    }

    commissions {
        uuid id PK
        uuid sale_id FK
        uuid user_id FK
        string role "SELLER, MANAGER, PLATFORM"
        decimal percentage
        decimal amount
        string currency
        string status "PENDING, PAID"
        timestamp paid_at
        timestamp created_at
    }

    wallets {
        uuid id PK
        uuid owner_id FK "User o Organization"
        string owner_type "USER, ORGANIZATION"
        decimal balance
        string currency
        timestamp created_at
        timestamp updated_at
    }

    token_balances {
        uuid id PK
        uuid wallet_id FK
        string token_type "PHOTO_UPLOAD, WHATSAPP_MSG, VEHICLE_LISTING, MAINTENANCE"
        int quantity
        timestamp updated_at
    }

    transactions {
        uuid id PK
        uuid wallet_id FK
        string type "DEPOSIT, WITHDRAW, PURCHASE, REFUND"
        decimal amount
        string currency
        string payment_method "STRIPE, ZELLE, CASH"
        string status "PENDING, COMPLETED, FAILED"
        jsonb metadata
        string reference_id
        timestamp created_at
    }

    scraped_listings {
        uuid id PK
        string marketplace_source
        string external_id UK
        string url
        string title
        decimal price
        string currency
        jsonb raw_data
        jsonb parsed_data
        string content_hash
        timestamp scraped_at
        timestamp created_at
    }

    price_history {
        uuid id PK
        uuid scraped_listing_id FK
        decimal price
        timestamp recorded_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        string type
        string channel "EMAIL, WHATSAPP, SMS, MESSENGER, PUSH"
        string status "PENDING, SENT, FAILED"
        jsonb content
        timestamp sent_at
        timestamp created_at
    }

    users ||--o{ user_roles : has
    roles ||--o{ user_roles : assigned
    users }o--|| organizations : belongs_to
    users }o--o| teams : member_of
    organizations ||--o{ products : owns
    organizations ||--|| org_configs : configured_by
    teams ||--o{ team_assignments : has
    users ||--o{ team_assignments : assigned
    categories ||--o{ category_fields : defines
    categories ||--o| categories : parent_of
    products }o--|| categories : categorized_as
    products ||--o{ product_images : has
    products ||--o| vehicles : extended_by
    products ||--o{ appointments : scheduled
    products ||--o| sales : sold_as
    appointments }o--|| users : client
    appointments }o--|| users : seller
    sales ||--|| users : sold_by
    sales ||--o{ commissions : generates
    commissions }o--|| users : paid_to
    wallets ||--o{ transactions : has
    wallets ||--o{ token_balances : contains
    scraped_listings ||--o{ price_history : tracks
    users ||--o{ notifications : receives
```

### 8.2 Índices Recomendados

```sql
-- Búsquedas frecuentes
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_organization ON products(organization_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_location ON products USING GIN(location);
CREATE INDEX idx_products_attributes ON products USING GIN(attributes);

-- Vehículos
CREATE INDEX idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX idx_vehicles_year ON vehicles(year);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);

-- Búsqueda full-text
CREATE INDEX idx_products_search ON products USING GIN(
    to_tsvector('english', title || ' ' || description)
);

-- Usuarios y roles
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_team ON users(team_id);

-- Citas y ventas
CREATE INDEX idx_appointments_seller ON appointments(seller_user_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_sales_seller ON sales(seller_user_id);
CREATE INDEX idx_commissions_user ON commissions(user_id);
```

---

## 9. ARQUITECTURA DE EVENTOS

### 9.1 Event-Driven Design

```mermaid
graph LR
    subgraph "Producers"
        API[API Service]
        SCRAPER[Scraper Service]
        WALLET[Wallet Service]
    end

    subgraph "Event Bus"
        Redis Streams[Redis Streams]
    end

    subgraph "Consumers"
        NOTIF[Notification Handler]
        ANALYTICS[Analytics Handler]
        SYNC[Search Sync Handler]
        AI_PROC[AI Processor]
    end

    API -->|ProductCreated| RS
    API -->|SaleCompleted| RS
    API -->|AppointmentScheduled| RS
    SCRAPER -->|ListingsScraped| RS
    WALLET -->|BalanceUpdated| RS

    RS -->|notify| NOTIF
    RS -->|track| ANALYTICS
    RS -->|index| SYNC
    RS -->|analyze| AI_PROC
```

### 9.2 Eventos del Dominio

| Evento | Payload | Consumers |
|--------|---------|-----------|
| `UserRegistered` | user_id, email, role | Notifications, Analytics |
| `OrganizationCreated` | org_id, name, owner_id | Notifications |
| `ProductCreated` | product_id, org_id, category | Search Sync, Analytics |
| `ProductPublished` | product_id, approved_by | Notifications, Search Sync |
| `ProductSold` | product_id, sale_id, seller_id | Notifications, Commissions |
| `AppointmentScheduled` | appointment_id, client_id, seller_id | Notifications |
| `AppointmentCompleted` | appointment_id | Analytics |
| `SaleCompleted` | sale_id, commissions[] | Wallet, Notifications |
| `WalletRecharged` | wallet_id, amount | Notifications |
| `TokensConsumed` | wallet_id, token_type, quantity | Analytics |
| `ListingsScraped` | source, count, timestamp | Analytics, AI |
| `PriceAlertTriggered` | listing_id, user_id, threshold | Notifications |

---

## 10. INTEGRACIONES EXTERNAS

### 10.1 Diagrama de Integraciones

```mermaid
graph TB
    subgraph "ProSell Core"
        API[API Service]
        NOTIF[Notification Service]
        SCRAPER[Scraper Service]
        AI[AI Service]
        PAY[Payment Service]
    end

    subgraph "Meta Platform"
        WA[WhatsApp Business API]
        MSG[Messenger API]
        FB[Facebook Graph API]
    end

    subgraph "Payments"
        STRIPE[Stripe API]
        ZELLE[Zelle<br/>Manual]
    end

    subgraph "AI/ML"
        CLAUDE[Anthropic Claude API]
    end

    subgraph "Vehicle Data"
        NHTSA[NHTSA vPIC API]
    end

    subgraph "Storage"
        DO[DigitalOcean Spaces]
    end

    subgraph "Marketplaces"
        FBM[Facebook Marketplace]
        EBAY[eBay Motors]
        CL[Craigslist]
        CARedis Streams[Cars.com]
    end

    NOTIF --> WA
    NOTIF --> MSG
    SCRAPER --> FB
    SCRAPER --> FBM
    SCRAPER --> EBAY
    SCRAPER --> CL
    SCRAPER --> CARS
    AI --> CLAUDE
    PAY --> STRIPE
    API --> NHTSA
    API --> DO
```

### 10.2 Configuración de Integraciones

| Servicio | Credenciales Requeridas | Límites |
|----------|------------------------|---------|
| **WhatsApp Business** | Phone Number ID, Access Token, Webhook Secret | 1000 msgs/día (tier 1) |
| **Messenger** | Page Access Token, App Secret | 200 msgs/día por página |
| **Stripe** | Secret Key, Webhook Secret | Sin límite |
| **Anthropic Claude** | API Key | Por tokens consumidos |
| **NHTSA** | Ninguna (pública) | 5 req/segundo |
| **DigitalOcean Spaces** | Access Key, Secret Key | Por almacenamiento |

### 10.3 API NHTSA - VIN Decoder

```python
# Endpoint: https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{VIN}?format=json

# Campos extraídos:
vin_data = {
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "body_class": "Sedan/Saloon",
    "engine_cylinders": 4,
    "engine_displacement_l": 2.5,
    "fuel_type": "Gasoline",
    "transmission": "Automatic",
    "drive_type": "FWD",
    "plant_city": "Georgetown",
    "plant_country": "USA"
}
```

---

## 11. INFRAESTRUCTURA Y DEVOPS

### 11.1 Arquitectura en DigitalOcean

```mermaid
graph TB
    subgraph "Internet"
        USERedis Streams[Users]
        CDN[DigitalOcean CDN]
    end

    subgraph "DigitalOcean"
        subgraph "Load Balancer"
            LB[DO Load Balancer]
        end

        subgraph "App Platform / Droplets"
            subgraph "Web Tier"
                WEB1[Web Server 1]
                WEB2[Web Server 2]
            end

            subgraph "API Tier"
                API1[API Server 1]
                API2[API Server 2]
            end

            subgraph "Worker Tier"
                WORKER1[Worker 1<br/>Scraping]
                WORKER2[Worker 2<br/>Notifications]
            end
        end

        subgraph "Managed Services"
            PG[(Managed PostgreSQL)]
            REDIS[(Managed Redis)]
            SPACES[(Spaces<br/>Object Storage)]
        end

        subgraph "Self-Managed"
            Redis Streams[Redis Streams<br/>Droplet]
            ES[OpenSearch<br/>Droplet]
        end
    end

    USERS --> CDN
    CDN --> LB
    LB --> WEB1
    LB --> WEB2
    WEB1 --> API1
    WEB2 --> API2
    API1 --> PG
    API2 --> PG
    API1 --> REDIS
    API2 --> REDIS
    API1 --> RS
    RS --> WORKER1
    RS --> WORKER2
    WORKER1 --> PG
    API1 --> ES
    API1 --> SPACES
```

### 11.2 Docker Compose (Desarrollo)

```yaml
version: '3.8'

services:
  # API Principal
  api:
    build:
      context: .
      dockerfile: docker/api/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://prosell:secret@postgres:5432/prosell
      - REDIS_URL=redis://redis:6379/0
      - RABBITMQ_URL=amqp://prosell:secret@redis_streams:5672/
    depends_on:
      - postgres
      - redis
      - redis_streams
    volumes:
      - ./src:/app/src
    networks:
      - prosell-network

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - api
    networks:
      - prosell-network

  # Workers
  worker-scraper:
    build:
      context: .
      dockerfile: docker/worker/Dockerfile
    command: celery -A prosell.infrastructure.queue.celery_app worker -Q scraping -c 2
    depends_on:
      - redis_streams
      - postgres
    networks:
      - prosell-network

  worker-notifications:
    build:
      context: .
      dockerfile: docker/worker/Dockerfile
    command: celery -A prosell.infrastructure.queue.celery_app worker -Q notifications -c 4
    depends_on:
      - redis_streams
    networks:
      - prosell-network

  # Databases
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=prosell
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=prosell
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - prosell-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - prosell-network

  redis_streams:
    image: redis_streams:3-management-alpine
    environment:
      - RABBITMQ_DEFAULT_USER=prosell
      - RABBITMQ_DEFAULT_PASS=secret
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - redis_streams_data:/var/lib/redis_streams
    networks:
      - prosell-network

  opensearch:
    image: opensearchproject/opensearch:2.11.0
    environment:
      - discovery.type=single-node
      - DISABLE_SECURITY_PLUGIN=true
    ports:
      - "9200:9200"
    volumes:
      - opensearch_data:/usr/share/opensearch/data
    networks:
      - prosell-network

volumes:
  postgres_data:
  redis_data:
  redis_streams_data:
  opensearch_data:

networks:
  prosell-network:
    driver: bridge
```

### 11.3 CI/CD Pipeline

```mermaid
graph LR
    subgraph "Development"
        DEV[Developer]
        GIT[GitHub]
    end

    subgraph "CI - GitHub Actions"
        LINT[Lint & Format]
        TEST[Run Tests]
        BUILD[Build Images]
        SCAN[Security Scan]
    end

    subgraph "CD"
        STAGING[Deploy Staging]
        E2E[E2E Tests]
        PROD[Deploy Production]
    end

    DEV -->|push| GIT
    GIT -->|trigger| LINT
    LINT --> TEST
    TEST --> BUILD
    BUILD --> SCAN
    SCAN -->|auto| STAGING
    STAGING --> E2E
    E2E -->|manual approval| PROD
```

---

## ### 12.1 Backend

| Componente | Tecnología | Versión | Justificación |
|------------|------------|---------|---------------|
| **Framework** | FastAPI | 0.115+ | Async, OpenAPI, Python 3.14 support |
| **ORM** | SQLAlchemy | 2.0.36+ | Async nativo con asyncpg |
| **Migrations** | Alembic | 1.14+ | Flexible migrations |
| **Validation** | Pydantic | 2.12+ | 5-50x más rápido que v1 |
| **Task Queue** | SAQ/Celery | 5.4+ | Simple Async Queue / Distributed tasks |
| **Message Broker** | Redis Streams | 7.4+ | Lightweight, nativo de Redis |
| **Cache** | Redis | 7.4+ | Redis Stack, sessions, cache |
| **Web Scraping** | Playwright | 1.49+ | Async headless browser |
| **Auth** | JWT + OAuth2 + TOTP | - | 2FA con TOTP |

### 12.2 Frontend

| Componente | Tecnología | Versión | Justificación |
|------------|------------|---------|---------------|
| **Framework** | Next.js | 16.1+ | Turbopack default, Cache Components |
| **Runtime** | React | 19.2 | Server Components, Compiler estable |
| **Language** | TypeScript | 5.5+ | Strict mode |
| **Styling** | TailwindCSS | 4.0 | Nueva engine |
| **State** | Zustand | 5.x | Simple state management |
| **Data Fetching** | TanStack Query | v5 | Server state management |
| **Forms** | React Hook Form + Zod | 7+ / 3.x | Performant forms |
| **Charts** | Recharts | 2+ | React-native charts |
| **UI Components** | shadcn/ui | latest | Accessible, customizable |

### 12.3 Bases de Datos

| Componente | Tecnología | Uso |
|------------|------------|-----|
| **Principal** | PostgreSQL 17 | Datos transaccionales, JSON_TABLE, incremental backup |
| **Búsqueda** | PostgreSQL Full-Text + pgvector | Full-text search, embeddings |
| **Cache** | Redis 7.4+ | Sessions, cache, pub/sub |
| **Object Storage** | DO Spaces (S3) | Imágenes, archivos |

### 12.4 DevOps

| Componente | Tecnología | Versión/Uso |
|------------|------------|-------------|
| **Containerización** | Docker | Empaquetado |
| **Orquestación** | Docker Compose / K8s | Dev / Prod |
| **CI/CD** | GitHub Actions | Automatización |
| **Hosting** | DigitalOcean App Platform / K8s | Cloud |
| **CDN** | DO CDN / Cloudflare | Static assets |
| **Python Linting** | Ruff | 0.8+ (Rust-based) |
| **Python Type Check** | Pyright | 1.1+ strict |
| **Package Manager Python** | uv | 10-100x más rápido que pip |
| **Package Manager JS** | pnpm | 9.x |
| **Monorepo** | Turborepo | Orquestación de builds |

---

#### 13. SEGURIDAD

### 13.1 Autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant A as Auth Service
    participant DB as Database
    participant R as Redis

    U->>F: Login (email, password)
    F->>A: POST /auth/login
    A->>DB: Verify credentials
    DB-->>A: User data
    A->>A: Generate JWT (access + refresh)
    A->>R: Store refresh token
    A-->>F: {access_token, refresh_token}
    F->>F: Store tokens

    Note over U,R: Subsequent requests
    F->>A: Request + Bearer token
    A->>A: Validate JWT
    A->>R: Check token not revoked
    A-->>F: Response
```

### 13.2 Configuración JWT

```python
# Token configuration
JWT_CONFIG = {
    "access_token": {
        "expire_minutes": 60,  # 1 hora
        "algorithm": "HS256"
    },
    "refresh_token": {
        "expire_days": 7,
        "algorithm": "HS256"
    }
}
```

### 13.3 OAuth2 + Social Login

```mermaid
graph LR
    subgraph "Social Providers"
        G[Google]
        FB[Facebook]
        APPLE[Apple]
    end

    subgraph "ProSell"
        AUTH[Auth Service]
        DB[(Database)]
    end

    G -->|OAuth2| AUTH
    FB -->|OAuth2| AUTH
    APPLE -->|OAuth2| AUTH
    AUTH --> DB
```

### 13.4 2FA (Two-Factor Authentication)

- **TOTP** (Time-based One-Time Password)
- Compatible con Google Authenticator, Authy
- Obligatorio para roles Admin

### 13.5 Medidas de Seguridad

| Medida | Implementación |
|--------|----------------|
| **Password Hashing** | bcrypt con salt |
| **Rate Limiting** | 100 req/min por IP |
| **CORS** | Dominios específicos |
| **HTTPS** | Obligatorio en producción |
| **SQL Injection** | SQLAlchemy ORM |
| **XSS** | React escapes, CSP headers |
| **CSRF** | SameSite cookies, tokens |
| **Data Encryption** | AES-256 para datos sensibles |

---

## 14. ESCALABILIDAD

### 14.1 Estrategia de Escalado

```mermaid
graph TB
    subgraph "Horizontal Scaling"
        LB[Load Balancer]
        API1[API Instance 1]
        API2[API Instance 2]
        API3[API Instance N]
    end

    subgraph "Database Scaling"
        PG_PRIMARY[(PostgreSQL Primary)]
        PG_READ1[(Read Replica 1)]
        PG_READ2[(Read Replica 2)]
    end

    subgraph "Cache Layer"
        REDIS_CLUSTER[Redis Cluster]
    end

    LB --> API1
    LB --> API2
    LB --> API3

    API1 -->|Write| PG_PRIMARY
    API1 -->|Read| PG_READ1
    API2 -->|Read| PG_READ2

    API1 --> REDIS_CLUSTER
    API2 --> REDIS_CLUSTER
```

### 14.2 Puntos de Escalado

| Componente | Estrategia | Trigger |
|------------|------------|---------|
| **API Servers** | Horizontal (auto-scale) | CPU > 70% |
| **Workers** | Horizontal | Queue depth > 1000 |
| **PostgreSQL** | Read replicas | Read ops > 10k/s |
| **Redis** | Cluster mode | Memory > 80% |
| **OpenSearch** | Sharding | Documents > 10M |

### 14.3 Capacidad Estimada

| Métrica | Inicial | 6 meses | 12 meses |
|---------|---------|---------|----------|
| **Usuarios Concurrentes** | 20 | 200 | 1,000 |
| **Requests/segundo** | 50 | 500 | 2,000 |
| **Productos** | 1,000 | 50,000 | 500,000 |
| **Imágenes (TB)** | 0.1 | 1 | 10 |
| **DB Size (GB)** | 5 | 50 | 200 |

---

## 📚 DOCUMENTOS RELACIONADOS

- [Documento de Requisitos (PRD)](./02_REQUISITOS_PROSELL_SAAS_V2.md)
- [Modelo de Datos Detallado](./03_MODELO_DATOS_PROSELL_SAAS_V2.md)
- [Roadmap de Desarrollo](./04_ROADMAP_PROSELL_SAAS_V2.md)
- [Lista de Tareas por Sprint](./05_TAREAS_SPRINT_PROSELL_SAAS_V2.md)

---

**Versión**: 2.0
**Última Actualización**: Febrero 2026
**Autor**: ProSell Architecture Team
