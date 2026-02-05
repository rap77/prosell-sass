# 📋 DOCUMENTO DE REQUISITOS (PRD) - PROSELL SAAS v2.0

**Proyecto**: ProSell SaaS - Plataforma Multiproducto de E-commerce, Análisis y Automatización
**Versión**: 2.0
**Fecha**: Febrero 2026
**Estado**: Planificación

---

## 1. VISIÓN Y OBJETIVOS

### 1.1 Propuesta de Valor

**ProSell SaaS** es una plataforma integral que combina:
- **E-commerce Multiproducto**: Marketplace para organizaciones/dealers
- **Sistema de Ventas Avanzado**: Citas, comisiones, equipos MLM
- **Análisis de Mercado**: Scraping + Inteligencia de precios
- **Agentes IA**: Asistentes conversacionales
- **Sistema de Prepago**: Billetera virtual con tokens

### 1.2 Objetivos Q4 2026

| Métrica | Objetivo |
|---------|----------|
| Organizaciones activas | 300 |
| Productos en catálogo | 100,000 |
| Usuarios mensuales | 50,000 |
| Ingresos mensuales | $100,000 |

---

## 2. SISTEMA DE ROLES Y PERMISOS

### 2.1 Jerarquía de Roles

```
MASTER (ProSell)
├── MANAGER (Gestiona equipo, asignado a orgs)
│   └── SELLER_PROSELL (Vende de todas las orgs)
│
ORGANIZATION
├── ORG_ADMIN (Admin de su org)
│   └── ORG_SELLER (Vende de su org)
│
PUBLIC
└── CLIENT (Comprador)
```

### 2.2 Permisos por Rol

| Acción | Master | Manager | Seller PS | Org Admin | Org Seller | Client |
|--------|--------|---------|-----------|-----------|------------|--------|
| Crear organización | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Aprobar productos | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver todos los productos | ✅ | ✅* | ✅ | ❌ | ❌ | 🌐 |
| Crear producto | ✅ | ❌ | ❌ | ✅** | ❌ | ❌ |
| Crear cita | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Registrar venta | ✅ | ✅* | ❌ | ✅** | ❌ | ❌ |
| Ver comisiones propias | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Editar % comisiones | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gestionar equipos | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

*Solo orgs asignadas | **Solo su org | 🌐Solo público

---

## 3. ÉPICAS Y FUNCIONALIDADES MVP

### 3.1 Sprint 1-2: Autenticación (Semanas 1-4)

**US-001: Registro de Usuario**
- Registro con email/contraseña
- Verificación de email
- Validaciones de seguridad
- Captcha anti-bots

**US-002: Login**
- Login email/contraseña
- Opción "Recordarme"
- Bloqueo tras 5 intentos
- Recuperación de contraseña

**US-003: OAuth Social**
- Login con Google
- Login con Facebook
- Vinculación de cuentas

**US-004: 2FA**
- TOTP (Google Authenticator)
- Códigos de respaldo
- Obligatorio para Admin

**US-005: Sistema RBAC**
- 6 roles predefinidos
- Matriz de permisos
- Middleware de autorización

---

### 3.2 Sprint 3-4: Organizaciones (Semanas 5-8)

**US-010: CRUD Organizaciones**
- Crear con datos completos
- Logo y banner
- Información de contacto
- Dirección

**US-011: Verificación**
- Estado: PENDING → VERIFIED/REJECTED
- Documentación requerida
- Notificación al admin

**US-012: Configuración de Org**
- Auto-publicar Sí/No
- Límites (productos, usuarios, imágenes)
- Comisiones personalizadas

**US-013: Equipos ProSell**
- Crear equipo con manager
- Asignar vendedores (máx 10)
- Asignar organizaciones
- Promoción vendedor → manager

---

### 3.3 Sprint 5-6: Productos (Semanas 9-12)

**US-020: CRUD Productos**
- Formulario dinámico por categoría
- Campos base + específicos
- Validaciones
- Estados: DRAFT, PENDING, PUBLISHED, PAUSED, SOLD

**US-021: Categorías Dinámicas**

Estructura jerárquica:
```
Vehículos
├── Autos/Camionetas
├── Motos
├── Comercial (Camiones, Tractores)
├── PowerSport (ATVs, Motos de agua)
├── Botes
├── RV & Campers
└── Trailers

Inmuebles
├── Casas
├── Apartamentos
└── Terrenos

Electrónicos, Maquinaria, Otros...
```

**Campos Vehículos:**
```
- VIN (con decoder)
- Año, Marca, Modelo, Trim
- Millas
- Combustible, Transmisión, Tracción
- Color exterior/interior
- Tipo de carrocería
```

**US-022: Galería de Imágenes**
- Hasta 20 imágenes por producto
- Drag & drop para ordenar
- Imagen principal
- Crop/resize automático
- Almacenamiento en DO Spaces

**US-023: Carga Masiva CSV**
- Plantilla por categoría
- Validación pre-importación
- Reporte de errores
- Procesamiento async

**US-024: VIN Decoder**
- Integración NHTSA API
- Auto-completar campos
- Guardar datos raw

**US-025: Aprobación de Publicaciones**
- Cola de pendientes
- Aprobar/Rechazar con razón
- Auto-aprobar si configurado
- Aprobar en lote

---

### 3.4 Sprint 7-8: Catálogo Público (Semanas 13-16)

**US-030: Listado de Productos**
- Vista grid/lista
- Paginación (20/página)
- Ordenamiento múltiple
- Responsive design

**US-031: Búsqueda Avanzada**
- Búsqueda full-text
- Filtros por categoría
- Filtros específicos (marca, modelo, año, precio, millas)
- Filtro por ubicación

**US-032: Detalle de Producto**
- Galería con lightbox
- Especificaciones completas
- Análisis precio vs mercado
- Info del vendedor
- Productos similares
- Botones de contacto

**US-033: Comparador**
- Hasta 5 productos
- Tabla comparativa
- Destacar diferencias
- Exportar PDF

---

### 3.5 Sprint 9-10: Ventas (Semanas 17-20)

**US-040: Sistema de Citas**

Tipos:
1. Cliente externo (WhatsApp 24/7 → Admin asigna → Vendedor contacta)
2. Cliente interno (Vendedor crea directamente)

Funcionalidades:
- Crear cita con datos cliente
- Generar código QR
- Enviar por canal preferido
- Recordatorios automáticos
- Reprogramar/cancelar

**US-041: Registro de Venta**
- Seleccionar producto y vendedor
- Precio final (editable)
- Calcular comisiones
- Cambiar estado a SOLD
- Notificar interesados
- Enviar notificación WhatsApp

**US-042: Sistema de Comisiones**

Distribución default:
- Vendedor: 40%
- Manager: 20%
- ProSell: 40%

Reglas:
- % editables por Master
- Manager puede vender (recibe % vendedor)
- Comisiones PENDING → PAID

---

### 3.6 Sprint 11-12: Wallet (Semanas 21-24)

**US-050: Billetera Virtual**
- Balance en USD
- Historial de transacciones
- Facturación electrónica

**US-051: Recarga**
- Stripe (automático)
- Zelle (manual)
- Efectivo (manual)

**US-052: Sistema de Tokens**

| Token | Precio Sugerido |
|-------|-----------------|
| PHOTO_UPLOAD | $0.10/foto |
| VEHICLE_LISTING | $5.00/listing |
| WHATSAPP_MSG | $0.05/msg |
| MAINTENANCE_FEE | $10.00/mes |
| FEATURED_LISTING | $15.00/7días |
| VIN_DECODE | $0.50/consulta |

**US-053: Paquetes**

| Paquete | Contenido | Precio |
|---------|-----------|--------|
| Starter | 10 listings + 100 fotos | $50 |
| Professional | 30 listings + 300 fotos | $120 |
| Enterprise | 100 listings + 1000 fotos | $350 |

---

## 4. REQUISITOS NO FUNCIONALES

### 4.1 Rendimiento
- Carga inicial: < 3 segundos
- API Response (p95): < 200ms
- Usuarios concurrentes: 200

### 4.2 Disponibilidad
- Uptime: 99.9%
- RTO: < 1 hora
- RPO: < 5 minutos

### 4.3 Seguridad
- HTTPS obligatorio
- JWT + Refresh tokens
- Bcrypt para passwords
- RBAC middleware
- Rate limiting

### 4.4 Compatibilidad
- Chrome, Firefox, Safari, Edge (últimas 2 versiones)
- Responsive: Desktop, Tablet, Mobile
- PWA: Instalable, offline básico

---

## 5. INTEGRACIONES

| Servicio | Uso |
|----------|-----|
| Meta APIs | WhatsApp Business, Messenger |
| Stripe | Pagos, facturación |
| NHTSA | Decodificación VIN |
| DigitalOcean Spaces | Almacenamiento imágenes |
| Anthropic Claude | Agentes IA |

---

## 6. KPIs DE ÉXITO

### Técnicos
- Uptime > 99.9%
- API Latency < 200ms
- Test Coverage > 90%

### Producto
- Organizaciones activas: 300
- Productos: 100,000
- MAU: 50,000
- Retention 30d: 85%

### Negocio
- MRR: $100,000
- Ventas/mes: 1,000
- LTV:CAC: 7.5:1

---

## 7. RIESGOS

| Riesgo | Mitigación |
|--------|------------|
| Bloqueo scraping | Proxies rotativos, rate limiting |
| Baja adopción | Piloto gratis, onboarding dedicado |
| Performance escala | Cache, read replicas, CDN |
| Seguridad | Auditorías, pentesting, encryption |

---

**Documentos relacionados:**
- [Arquitectura del Sistema](./01_ARQUITECTURA_PROSELL_SAAS_V2.md)
- [Roadmap de Desarrollo](./04_ROADMAP_PROSELL_SAAS_V2.md)
- [Lista de Tareas](./05_TAREAS_SPRINT_PROSELL_SAAS_V2.md)
