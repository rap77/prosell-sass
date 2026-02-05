# ✅ LISTA DE TAREAS POR SPRINT - PROSELL SAAS v2.0

**Proyecto**: ProSell SaaS
**Versión**: 2.0
**Fecha**: Febrero 2026
**Uso**: Checklist para desarrolladores

---

## 📋 INSTRUCCIONES DE USO

- [ ] = Tarea pendiente
- [x] = Tarea completada
- 🔴 = Bloqueante
- 🟡 = Importante
- 🟢 = Nice to have

**Estimaciones:**
- XS = < 2 horas
- S = 2-4 horas
- M = 4-8 horas (1 día)
- L = 2-3 días
- XL = 4-5 días

---

## 🔐 SPRINT 1-2: AUTENTICACIÓN & USUARIOS

**Duración**: Semanas 1-4 (Feb 10 - Mar 9, 2026)
**Objetivo**: Sistema completo de autenticación y RBAC

### Backend - Modelo de Datos

```
📁 src/prosell/domain/entities/user/
```

- [ ] 🔴 [M] Crear entidad `User` con campos básicos
- [ ] 🔴 [M] Crear entidad `Role` (6 roles predefinidos)
- [ ] 🔴 [M] Crear entidad `Permission` (matriz de permisos)
- [ ] 🔴 [S] Crear `UserRole` (relación many-to-many)
- [ ] 🟡 [S] Crear `Session` para tracking de sesiones
- [ ] 🟡 [S] Crear `RefreshToken` entity

```
📁 src/prosell/infrastructure/models/
```

- [ ] 🔴 [L] Crear modelo SQLAlchemy `UserModel`
- [ ] 🔴 [M] Crear modelo `RoleModel`
- [ ] 🔴 [M] Crear modelo `PermissionModel`
- [ ] 🔴 [S] Crear modelo `UserRoleModel`
- [ ] 🔴 [M] Crear migración Alembic inicial

### Backend - Repositorios

```
📁 src/prosell/infrastructure/repositories/
```

- [ ] 🔴 [L] Implementar `UserRepository`
  - [ ] create()
  - [ ] get_by_id()
  - [ ] get_by_email()
  - [ ] update()
  - [ ] delete()
  - [ ] list_with_pagination()
- [ ] 🔴 [M] Implementar `RoleRepository`
- [ ] 🟡 [M] Implementar `SessionRepository`

### Backend - Casos de Uso

```
📁 src/prosell/application/use_cases/auth/
```

- [ ] 🔴 [L] `RegisterUserUseCase`
  - [ ] Validar email único
  - [ ] Hash de contraseña (bcrypt)
  - [ ] Crear usuario con rol CLIENT
  - [ ] Generar token de verificación
  - [ ] Enviar email de verificación
- [ ] 🔴 [M] `VerifyEmailUseCase`
- [ ] 🔴 [L] `LoginUserUseCase`
  - [ ] Validar credenciales
  - [ ] Verificar cuenta activa
  - [ ] Generar access_token (1h)
  - [ ] Generar refresh_token (7d)
  - [ ] Registrar sesión
- [ ] 🔴 [M] `RefreshTokenUseCase`
- [ ] 🔴 [M] `LogoutUseCase`
- [ ] 🟡 [L] `ResetPasswordUseCase`
  - [ ] Solicitar reset
  - [ ] Validar token
  - [ ] Actualizar contraseña
- [ ] 🟡 [L] `OAuthLoginUseCase`
  - [ ] Google OAuth
  - [ ] Facebook OAuth
  - [ ] Crear/vincular usuario
- [ ] 🟡 [L] `Enable2FAUseCase`
  - [ ] Generar secret TOTP
  - [ ] Verificar código
  - [ ] Guardar backup codes

### Backend - API Endpoints

```
📁 src/prosell/infrastructure/http/routers/
```

- [ ] 🔴 [XL] Crear `auth_router.py`
  - [ ] POST /api/auth/register
  - [ ] POST /api/auth/verify-email
  - [ ] POST /api/auth/login
  - [ ] POST /api/auth/refresh
  - [ ] POST /api/auth/logout
  - [ ] POST /api/auth/forgot-password
  - [ ] POST /api/auth/reset-password
  - [ ] GET /api/auth/me
  - [ ] PUT /api/auth/profile
  - [ ] POST /api/auth/oauth/google
  - [ ] POST /api/auth/oauth/facebook
  - [ ] POST /api/auth/2fa/enable
  - [ ] POST /api/auth/2fa/verify
  - [ ] POST /api/auth/2fa/disable

### Backend - Middleware & Security

```
📁 src/prosell/infrastructure/http/middleware/
```

- [ ] 🔴 [L] Crear `JWTMiddleware`
  - [ ] Extraer token de header
  - [ ] Validar firma y expiración
  - [ ] Inyectar user en request
- [ ] 🔴 [L] Crear `RBACMiddleware`
  - [ ] Decorador @require_role()
  - [ ] Decorador @require_permission()
  - [ ] Verificar permisos por ruta
- [ ] 🟡 [M] Crear `RateLimitMiddleware`
  - [ ] 100 req/min por IP
  - [ ] 5 intentos login, luego bloqueo 15min

### Backend - Servicios

```
📁 src/prosell/infrastructure/services/auth/
```

- [ ] 🔴 [M] `JWTService`
  - [ ] generate_access_token()
  - [ ] generate_refresh_token()
  - [ ] verify_token()
  - [ ] decode_token()
- [ ] 🔴 [S] `PasswordService`
  - [ ] hash_password()
  - [ ] verify_password()
- [ ] 🟡 [M] `TOTPService`
  - [ ] generate_secret()
  - [ ] verify_code()
  - [ ] generate_qr_uri()

### Frontend - Páginas

```
📁 frontend/src/app/(auth)/
```

- [ ] 🔴 [L] Página de Login
  - [ ] Formulario email/password
  - [ ] Botones OAuth
  - [ ] Link a registro
  - [ ] Link "Olvidé contraseña"
- [ ] 🔴 [L] Página de Registro
  - [ ] Formulario completo
  - [ ] Validaciones en tiempo real
  - [ ] Captcha
- [ ] 🔴 [M] Página de Verificación Email
- [ ] 🟡 [M] Página de Reset Password
- [ ] 🟡 [M] Página de 2FA Setup

### Frontend - Componentes

```
📁 frontend/src/components/auth/
```

- [ ] 🔴 [M] `LoginForm`
- [ ] 🔴 [M] `RegisterForm`
- [ ] 🔴 [S] `OAuthButtons`
- [ ] 🟡 [S] `TwoFactorInput`

### Frontend - Estado & Hooks

```
📁 frontend/src/stores/
📁 frontend/src/hooks/
```

- [ ] 🔴 [M] `useAuth` hook
- [ ] 🔴 [M] `authStore` (Zustand)
- [ ] 🔴 [M] Protección de rutas

### Tests

- [ ] 🔴 [L] Tests unitarios casos de uso auth
- [ ] 🔴 [M] Tests integración endpoints auth
- [ ] 🟡 [M] Tests E2E flujo registro/login

---

## 🏢 SPRINT 3-4: ORGANIZACIONES

**Duración**: Semanas 5-8 (Mar 10 - Abr 6, 2026)
**Objetivo**: CRUD completo de organizaciones y equipos

### Backend - Modelo de Datos

```
📁 src/prosell/domain/entities/organization/
```

- [ ] 🔴 [L] Crear entidad `Organization`
  - [ ] Campos básicos (name, slug, type)
  - [ ] Contacto (email, phone, whatsapp)
  - [ ] Dirección (address, city, state, zip)
  - [ ] Status (PENDING, VERIFIED, SUSPENDED)
  - [ ] Configuración (auto_publish, limits)
- [ ] 🔴 [M] Crear entidad `Team`
- [ ] 🔴 [M] Crear entidad `TeamAssignment`
- [ ] 🔴 [M] Crear entidad `OrgConfig`
- [ ] 🟡 [M] Crear entidad `Wallet` (básico)

```
📁 src/prosell/infrastructure/models/
```

- [ ] 🔴 [L] Modelo SQLAlchemy `OrganizationModel`
- [ ] 🔴 [M] Modelo `TeamModel`
- [ ] 🔴 [M] Modelo `TeamAssignmentModel`
- [ ] 🔴 [M] Modelo `OrgConfigModel`
- [ ] 🟡 [M] Modelo `WalletModel`
- [ ] 🔴 [M] Migraciones Alembic

### Backend - Casos de Uso

```
📁 src/prosell/application/use_cases/organizations/
```

- [ ] 🔴 [L] `CreateOrganizationUseCase`
- [ ] 🔴 [M] `UpdateOrganizationUseCase`
- [ ] 🔴 [M] `GetOrganizationUseCase`
- [ ] 🔴 [M] `ListOrganizationsUseCase`
- [ ] 🔴 [M] `VerifyOrganizationUseCase`
- [ ] 🔴 [M] `SuspendOrganizationUseCase`
- [ ] 🟡 [L] `UploadOrgMediaUseCase` (logo, banner)

```
📁 src/prosell/application/use_cases/teams/
```

- [ ] 🔴 [L] `CreateTeamUseCase`
- [ ] 🔴 [M] `AssignManagerUseCase`
- [ ] 🔴 [M] `AssignSellerToTeamUseCase`
- [ ] 🔴 [M] `AssignOrgsToTeamUseCase`
- [ ] 🟡 [M] `PromoteToManagerUseCase`

### Backend - API Endpoints

```
📁 src/prosell/infrastructure/http/routers/
```

- [ ] 🔴 [XL] Crear `organizations_router.py`
  - [ ] POST /api/organizations
  - [ ] GET /api/organizations
  - [ ] GET /api/organizations/:id
  - [ ] PUT /api/organizations/:id
  - [ ] PATCH /api/organizations/:id/status
  - [ ] POST /api/organizations/:id/logo
  - [ ] POST /api/organizations/:id/banner
  - [ ] GET /api/organizations/:id/config
  - [ ] PUT /api/organizations/:id/config

- [ ] 🔴 [L] Crear `teams_router.py`
  - [ ] POST /api/teams
  - [ ] GET /api/teams
  - [ ] GET /api/teams/:id
  - [ ] PUT /api/teams/:id
  - [ ] POST /api/teams/:id/members
  - [ ] DELETE /api/teams/:id/members/:userId
  - [ ] PUT /api/teams/:id/organizations

### Backend - Storage

```
📁 src/prosell/infrastructure/services/storage/
```

- [ ] 🔴 [L] `DOSpacesService`
  - [ ] upload_file()
  - [ ] delete_file()
  - [ ] get_presigned_url()
  - [ ] Configuración de bucket
  - [ ] Resize de imágenes

### Frontend - Páginas

```
📁 frontend/src/app/admin/organizations/
```

- [ ] 🔴 [L] Lista de organizaciones
- [ ] 🔴 [L] Formulario crear/editar organización
- [ ] 🔴 [M] Detalle de organización
- [ ] 🟡 [M] Página de verificación

```
📁 frontend/src/app/admin/teams/
```

- [ ] 🔴 [L] Lista de equipos
- [ ] 🔴 [L] Formulario crear/editar equipo
- [ ] 🔴 [M] Asignación de miembros

### Frontend - Componentes

- [ ] 🔴 [M] `OrganizationCard`
- [ ] 🔴 [M] `OrganizationForm`
- [ ] 🔴 [M] `TeamCard`
- [ ] 🔴 [M] `MemberSelector`
- [ ] 🟡 [S] `ImageUploader`

### Tests

- [ ] 🔴 [L] Tests unitarios organizaciones
- [ ] 🔴 [M] Tests integración equipos
- [ ] 🟡 [M] Tests E2E flujo completo

---

## 📦 SPRINT 5-6: PRODUCTOS

**Duración**: Semanas 9-12 (Abr 7 - May 4, 2026)
**Objetivo**: Sistema completo de productos con categorías dinámicas

### Backend - Modelo de Datos

```
📁 src/prosell/domain/entities/product/
```

- [ ] 🔴 [L] Crear entidad `Category`
  - [ ] Estructura jerárquica (parent_id)
  - [ ] Campos: name, slug, icon, sort_order
- [ ] 🔴 [L] Crear entidad `CategoryField`
  - [ ] field_name, field_type, options
  - [ ] is_required, is_searchable
  - [ ] validation rules
- [ ] 🔴 [XL] Crear entidad `Product` (base genérica)
  - [ ] Campos comunes
  - [ ] attributes (JSONB dinámico)
  - [ ] Estados del producto
- [ ] 🔴 [L] Crear entidad `Vehicle` (extensión)
- [ ] 🔴 [M] Crear entidad `ProductImage`

```
📁 src/prosell/infrastructure/models/
```

- [ ] 🔴 [L] Modelo `CategoryModel`
- [ ] 🔴 [L] Modelo `CategoryFieldModel`
- [ ] 🔴 [XL] Modelo `ProductModel`
- [ ] 🔴 [L] Modelo `VehicleModel`
- [ ] 🔴 [M] Modelo `ProductImageModel`
- [ ] 🔴 [M] Migraciones + seed de categorías

### Backend - Casos de Uso

```
📁 src/prosell/application/use_cases/products/
```

- [ ] 🔴 [XL] `CreateProductUseCase`
  - [ ] Validar campos según categoría
  - [ ] Crear producto base
  - [ ] Crear extensión si aplica
  - [ ] Estado inicial DRAFT
- [ ] 🔴 [L] `UpdateProductUseCase`
- [ ] 🔴 [M] `GetProductUseCase`
- [ ] 🔴 [L] `ListProductsUseCase`
  - [ ] Filtros dinámicos
  - [ ] Paginación
  - [ ] Ordenamiento
- [ ] 🔴 [M] `ChangeProductStatusUseCase`
- [ ] 🔴 [M] `ApproveProductUseCase`
- [ ] 🔴 [M] `RejectProductUseCase`

```
📁 src/prosell/application/use_cases/products/
```

- [ ] 🔴 [L] `UploadProductImagesUseCase`
  - [ ] Validar cantidad (máx 20)
  - [ ] Resize y optimización
  - [ ] Upload a DO Spaces
  - [ ] Guardar referencias
- [ ] 🟡 [L] `ReorderProductImagesUseCase`
- [ ] 🟡 [L] `DeleteProductImageUseCase`

```
📁 src/prosell/application/use_cases/products/
```

- [ ] 🟡 [L] `ImportProductsFromCSVUseCase`
  - [ ] Validar formato
  - [ ] Procesar en background
  - [ ] Generar reporte
- [ ] 🟡 [M] `DecodeVINUseCase`
  - [ ] Llamar NHTSA API
  - [ ] Parsear respuesta
  - [ ] Mapear a campos

### Backend - API Endpoints

```
📁 src/prosell/infrastructure/http/routers/
```

- [ ] 🔴 [M] `categories_router.py`
  - [ ] GET /api/categories (árbol)
  - [ ] GET /api/categories/:id/fields

- [ ] 🔴 [XL] `products_router.py`
  - [ ] POST /api/products
  - [ ] GET /api/products (público + admin)
  - [ ] GET /api/products/:id
  - [ ] PUT /api/products/:id
  - [ ] PATCH /api/products/:id/status
  - [ ] POST /api/products/:id/images
  - [ ] DELETE /api/products/:id/images/:imageId
  - [ ] PUT /api/products/:id/images/reorder
  - [ ] POST /api/products/:id/approve
  - [ ] POST /api/products/:id/reject
  - [ ] POST /api/products/import
  - [ ] GET /api/products/import/:jobId/status
  - [ ] POST /api/vehicles/decode-vin

### Frontend - Páginas

```
📁 frontend/src/app/dashboard/products/
```

- [ ] 🔴 [L] Lista de productos (mi org)
- [ ] 🔴 [XL] Formulario crear/editar producto
  - [ ] Selector de categoría
  - [ ] Campos dinámicos
  - [ ] Galería de imágenes
  - [ ] Preview
- [ ] 🔴 [M] Detalle de producto (admin)

```
📁 frontend/src/app/admin/approvals/
```

- [ ] 🔴 [L] Cola de aprobaciones
- [ ] 🔴 [M] Modal de revisión rápida

### Frontend - Componentes

- [ ] 🔴 [L] `CategorySelector` (jerárquico)
- [ ] 🔴 [XL] `DynamicProductForm`
- [ ] 🔴 [L] `ImageGalleryUploader`
- [ ] 🔴 [M] `ProductCard`
- [ ] 🔴 [M] `ProductTable`
- [ ] 🟡 [M] `VINDecoderInput`
- [ ] 🟡 [M] `CSVImportModal`

### Tests

- [ ] 🔴 [L] Tests unitarios productos
- [ ] 🔴 [L] Tests campos dinámicos
- [ ] 🔴 [M] Tests integración imágenes
- [ ] 🟡 [M] Tests import CSV

---

## 🛒 SPRINT 7-8: CATÁLOGO PÚBLICO

**Duración**: Semanas 13-16 (May 5 - Jun 1, 2026)
**Objetivo**: Experiencia de navegación para compradores

### Backend - Casos de Uso

```
📁 src/prosell/application/use_cases/catalog/
```

- [ ] 🔴 [L] `SearchProductsUseCase`
  - [ ] Full-text search
  - [ ] Filtros múltiples
  - [ ] Facetas (counts por filtro)
- [ ] 🔴 [M] `GetProductDetailUseCase`
  - [ ] Incluir análisis de precio
  - [ ] Productos similares
- [ ] 🟡 [M] `CompareProductsUseCase`
- [ ] 🟡 [M] `GetSimilarProductsUseCase`

### Backend - Endpoints Públicos

- [ ] 🔴 [L] GET /api/catalog (público)
- [ ] 🔴 [M] GET /api/catalog/:id (público)
- [ ] 🔴 [M] GET /api/catalog/:id/similar
- [ ] 🟡 [M] POST /api/catalog/compare

### Frontend - Páginas Públicas

```
📁 frontend/src/app/(public)/
```

- [ ] 🔴 [L] Landing page
- [ ] 🔴 [XL] Catálogo con filtros
  - [ ] Vista grid/lista
  - [ ] Sidebar de filtros
  - [ ] Ordenamiento
  - [ ] Paginación
- [ ] 🔴 [L] Página de detalle
  - [ ] Galería lightbox
  - [ ] Especificaciones
  - [ ] Análisis precio
  - [ ] Botones contacto
- [ ] 🟡 [L] Página comparador

### Frontend - Componentes

- [ ] 🔴 [L] `SearchFilters` (sidebar)
- [ ] 🔴 [M] `ProductGrid`
- [ ] 🔴 [M] `ProductList`
- [ ] 🔴 [M] `ProductDetailView`
- [ ] 🔴 [M] `ImageLightbox`
- [ ] 🔴 [M] `PriceAnalysisBadge`
- [ ] 🟡 [M] `ComparisonTable`
- [ ] 🟡 [S] `ShareButtons`

### SEO & Performance

- [ ] 🟡 [M] Meta tags dinámicos
- [ ] 🟡 [M] Sitemap.xml
- [ ] 🟡 [M] Structured data (JSON-LD)
- [ ] 🔴 [M] Image lazy loading
- [ ] 🔴 [M] Skeleton loaders

### Tests

- [ ] 🔴 [M] Tests E2E navegación catálogo
- [ ] 🔴 [M] Tests responsive
- [ ] 🟡 [M] Tests de performance (Lighthouse)

---

## 💼 SPRINT 9-10: SISTEMA DE VENTAS

**Duración**: Semanas 17-20 (Jun 2 - Jun 29, 2026)
**Objetivo**: Flujo completo de citas y registro de ventas

### Backend - Modelo de Datos

```
📁 src/prosell/domain/entities/sales/
```

- [ ] 🔴 [L] Crear entidad `Appointment`
  - [ ] Estados: PENDING, CONFIRMED, COMPLETED, CANCELLED, RESCHEDULED
  - [ ] QR code único
  - [ ] offer_details (JSONB)
- [ ] 🔴 [L] Crear entidad `Sale`
  - [ ] listed_price, final_price
  - [ ] payment_method
- [ ] 🔴 [L] Crear entidad `Commission`
  - [ ] role (SELLER, MANAGER, PLATFORM)
  - [ ] percentage, amount
  - [ ] status (PENDING, PAID)

### Backend - Casos de Uso

```
📁 src/prosell/application/use_cases/appointments/
```

- [ ] 🔴 [L] `CreateAppointmentUseCase`
  - [ ] Generar QR
  - [ ] Asignar vendedor
- [ ] 🔴 [M] `UpdateAppointmentUseCase`
- [ ] 🔴 [M] `RescheduleAppointmentUseCase`
- [ ] 🔴 [M] `CancelAppointmentUseCase`
- [ ] 🔴 [M] `CompleteAppointmentUseCase`

```
📁 src/prosell/application/use_cases/sales/
```

- [ ] 🔴 [XL] `RegisterSaleUseCase`
  - [ ] Validar producto disponible
  - [ ] Calcular comisiones
  - [ ] Crear registros
  - [ ] Actualizar estado producto
  - [ ] Notificar interesados
- [ ] 🔴 [M] `GetSalesReportUseCase`
- [ ] 🔴 [M] `GetCommissionsUseCase`

### Backend - Endpoints

- [ ] 🔴 [L] POST /api/appointments
- [ ] 🔴 [M] GET /api/appointments
- [ ] 🔴 [M] GET /api/appointments/:id
- [ ] 🔴 [M] PUT /api/appointments/:id
- [ ] 🔴 [S] PATCH /api/appointments/:id/status
- [ ] 🔴 [L] POST /api/sales
- [ ] 🔴 [M] GET /api/sales
- [ ] 🔴 [M] GET /api/commissions
- [ ] 🔴 [M] GET /api/commissions/my

### Frontend - Páginas

```
📁 frontend/src/app/dashboard/appointments/
```

- [ ] 🔴 [L] Lista de citas (calendario/lista)
- [ ] 🔴 [L] Formulario crear cita
- [ ] 🔴 [M] Modal de QR

```
📁 frontend/src/app/dashboard/sales/
```

- [ ] 🔴 [L] Formulario registrar venta
- [ ] 🔴 [M] Lista de ventas
- [ ] 🔴 [M] Dashboard de comisiones

### Frontend - Componentes

- [ ] 🔴 [M] `AppointmentCard`
- [ ] 🔴 [M] `AppointmentForm`
- [ ] 🔴 [M] `CalendarView`
- [ ] 🔴 [M] `QRCodeDisplay`
- [ ] 🔴 [M] `SaleForm`
- [ ] 🔴 [M] `CommissionsTable`

### Notificaciones

- [ ] 🔴 [L] Email: Cita creada
- [ ] 🔴 [M] Email: Recordatorio 24h
- [ ] 🔴 [M] Email: Venta completada
- [ ] 🟡 [M] Email: Producto no disponible

### Tests

- [ ] 🔴 [L] Tests flujo de citas
- [ ] 🔴 [L] Tests cálculo comisiones
- [ ] 🔴 [M] Tests E2E venta completa

---

## 💰 SPRINT 11-12: WALLET & TOKENS

**Duración**: Semanas 21-24 (Jun 30 - Jul 27, 2026)
**Objetivo**: Sistema de prepago funcional

### Backend - Modelo de Datos

```
📁 src/prosell/domain/entities/wallet/
```

- [ ] 🔴 [M] Completar entidad `Wallet`
- [ ] 🔴 [M] Crear entidad `TokenBalance`
- [ ] 🔴 [L] Crear entidad `Transaction`
  - [ ] Tipos: DEPOSIT, WITHDRAW, PURCHASE, REFUND
  - [ ] Estados: PENDING, COMPLETED, FAILED
- [ ] 🟡 [M] Crear entidad `TokenPackage`

### Backend - Integración Stripe

```
📁 src/prosell/infrastructure/services/payments/
```

- [ ] 🔴 [L] `StripeService`
  - [ ] create_checkout_session()
  - [ ] create_customer()
  - [ ] handle_webhook()
- [ ] 🔴 [L] Webhook handlers
  - [ ] checkout.session.completed
  - [ ] payment_intent.succeeded
  - [ ] payment_intent.failed

### Backend - Casos de Uso

```
📁 src/prosell/application/use_cases/wallet/
```

- [ ] 🔴 [L] `RechargeWalletUseCase`
- [ ] 🔴 [M] `GetWalletBalanceUseCase`
- [ ] 🔴 [L] `ConsumeTokensUseCase`
- [ ] 🔴 [M] `GetTransactionHistoryUseCase`
- [ ] 🟡 [M] `PurchasePackageUseCase`
- [ ] 🟡 [M] `RefundTransactionUseCase`

### Backend - Endpoints

- [ ] 🔴 [M] GET /api/wallet
- [ ] 🔴 [L] POST /api/wallet/recharge
- [ ] 🔴 [M] GET /api/wallet/transactions
- [ ] 🔴 [L] POST /api/webhooks/stripe
- [ ] 🟡 [M] GET /api/wallet/packages
- [ ] 🟡 [M] POST /api/wallet/packages/:id/purchase

### Frontend - Páginas

```
📁 frontend/src/app/dashboard/wallet/
```

- [ ] 🔴 [L] Vista de billetera
  - [ ] Balance actual
  - [ ] Token balances
  - [ ] Botón recargar
- [ ] 🔴 [L] Checkout de recarga
- [ ] 🔴 [M] Historial de transacciones
- [ ] 🟡 [M] Catálogo de paquetes

### Frontend - Componentes

- [ ] 🔴 [M] `WalletBalance`
- [ ] 🔴 [M] `TokenBalanceCard`
- [ ] 🔴 [M] `RechargeForm`
- [ ] 🔴 [M] `TransactionsList`
- [ ] 🟡 [M] `PackageCard`

### Lógica de Consumo

- [ ] 🔴 [M] Hook al subir imagen → consumir PHOTO_UPLOAD
- [ ] 🔴 [M] Hook al publicar producto → consumir LISTING token
- [ ] 🟡 [M] Hook al decodificar VIN → consumir VIN_DECODE

### Tests

- [ ] 🔴 [L] Tests integración Stripe (mock)
- [ ] 🔴 [L] Tests consumo de tokens
- [ ] 🔴 [M] Tests E2E recarga

---

## 📊 RESUMEN DE TAREAS

| Sprint | Tareas Totales | P0 (🔴) | P1 (🟡) | P2 (🟢) |
|--------|----------------|---------|---------|---------|
| 1-2 | 52 | 38 | 14 | 0 |
| 3-4 | 48 | 35 | 13 | 0 |
| 5-6 | 55 | 40 | 15 | 0 |
| 7-8 | 38 | 25 | 13 | 0 |
| 9-10 | 42 | 32 | 10 | 0 |
| 11-12 | 35 | 25 | 10 | 0 |
| **Total** | **270** | **195** | **75** | **0** |

---

## 📝 NOTAS PARA DESARROLLADORES

### Convenciones de Código

```python
# Nombres de archivos: snake_case
# Nombres de clases: PascalCase
# Nombres de funciones: snake_case
# Constantes: UPPER_SNAKE_CASE
```

### Estructura de Commits

```
feat: add user registration endpoint
fix: resolve JWT expiration issue
docs: update API documentation
test: add unit tests for auth service
refactor: extract password service
chore: update dependencies
```

### Definition of Done

- [ ] Código completado
- [ ] Tests escritos y pasando
- [ ] Code review aprobado
- [ ] Documentación actualizada
- [ ] Desplegado en staging
- [ ] QA verificado

---

**Documentos relacionados:**
- [Arquitectura](./01_ARQUITECTURA_PROSELL_SAAS_V2.md)
- [Requisitos](./02_REQUISITOS_PRD_PROSELL_SAAS_V2.md)
- [Roadmap](./04_ROADMAP_PROSELL_SAAS_V2.md)
