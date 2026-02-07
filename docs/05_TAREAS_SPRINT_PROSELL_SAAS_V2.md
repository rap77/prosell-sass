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
📁 apps/api/src/prosell/domain/entities/user/
```

- [ ] 🔴 [M] Crear entidad `User` con campos básicos
- [ ] 🔴 [M] Crear entidad `Role` (6 roles predefinidos)
- [ ] 🔴 [M] Crear entidad `Permission` (matriz de permisos)
- [ ] 🔴 [S] Crear `UserRole` (relación many-to-many)
- [ ] 🟡 [S] Crear `Session` para tracking de sesiones
- [ ] 🟡 [S] Crear `RefreshToken` entity

```
📁 apps/api/src/prosell/infrastructure/models/
```

- [ ] 🔴 [L] Crear modelo SQLAlchemy `UserModel`
- [ ] 🔴 [M] Crear modelo `RoleModel`
- [ ] 🔴 [M] Crear modelo `PermissionModel`
- [ ] 🔴 [S] Crear modelo `UserRoleModel`
- [ ] 🔴 [M] Crear migración Alembic inicial

### Backend - Repositorios

```
📁 apps/api/src/prosell/infrastructure/repositories/
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
📁 apps/api/src/prosell/application/use_cases/auth/
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
📁 apps/api/src/prosell/infrastructure/http/routers/
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
📁 apps/api/src/prosell/infrastructure/http/middleware/
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
📁 apps/api/src/prosell/infrastructure/services/auth/
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
📁 apps/web/src/app/(auth)/
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
📁 apps/web/src/components/auth/
```

- [ ] 🔴 [M] `LoginForm`
- [ ] 🔴 [M] `RegisterForm`
- [ ] 🔴 [S] `OAuthButtons`
- [ ] 🟡 [S] `TwoFactorInput`

### Frontend - Estado & Hooks

```
📁 apps/web/src/stores/
📁 apps/web/src/hooks/
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
📁 apps/api/src/prosell/domain/entities/organization/
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
📁 apps/api/src/prosell/infrastructure/models/
```

- [ ] 🔴 [L] Modelo SQLAlchemy `OrganizationModel`
- [ ] 🔴 [M] Modelo `TeamModel`
- [ ] 🔴 [M] Modelo `TeamAssignmentModel`
- [ ] 🔴 [M] Modelo `OrgConfigModel`
- [ ] 🟡 [M] Modelo `WalletModel`
- [ ] 🔴 [M] Migraciones Alembic

### Backend - Casos de Uso

```
📁 apps/api/src/prosell/application/use_cases/organizations/
```

- [ ] 🔴 [L] `CreateOrganizationUseCase`
- [ ] 🔴 [M] `UpdateOrganizationUseCase`
- [ ] 🔴 [M] `GetOrganizationUseCase`
- [ ] 🔴 [M] `ListOrganizationsUseCase`
- [ ] 🔴 [M] `VerifyOrganizationUseCase`
- [ ] 🔴 [M] `SuspendOrganizationUseCase`
- [ ] 🟡 [L] `UploadOrgMediaUseCase` (logo, banner)

```
📁 apps/api/src/prosell/application/use_cases/teams/
```

- [ ] 🔴 [L] `CreateTeamUseCase`
- [ ] 🔴 [M] `AssignManagerUseCase`
- [ ] 🔴 [M] `AssignSellerToTeamUseCase`
- [ ] 🔴 [M] `AssignOrgsToTeamUseCase`
- [ ] 🟡 [M] `PromoteToManagerUseCase`

### Backend - API Endpoints

```
📁 apps/api/src/prosell/infrastructure/http/routers/
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
📁 apps/api/src/prosell/infrastructure/services/storage/
```

- [ ] 🔴 [L] `DOSpacesService`
  - [ ] upload_file()
  - [ ] delete_file()
  - [ ] get_presigned_url()
  - [ ] Configuración de bucket
  - [ ] Resize de imágenes

### Frontend - Páginas

```
📁 apps/web/src/app/admin/organizations/
```

- [ ] 🔴 [L] Lista de organizaciones
- [ ] 🔴 [L] Formulario crear/editar organización
- [ ] 🔴 [M] Detalle de organización
- [ ] 🟡 [M] Página de verificación

```
📁 apps/web/src/app/admin/teams/
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
📁 apps/api/src/prosell/domain/entities/product/
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
📁 apps/api/src/prosell/infrastructure/models/
```

- [ ] 🔴 [L] Modelo `CategoryModel`
- [ ] 🔴 [L] Modelo `CategoryFieldModel`
- [ ] 🔴 [XL] Modelo `ProductModel`
- [ ] 🔴 [L] Modelo `VehicleModel`
- [ ] 🔴 [M] Modelo `ProductImageModel`
- [ ] 🔴 [M] Migraciones + seed de categorías

### Backend - Casos de Uso

```
📁 apps/api/src/prosell/application/use_cases/products/
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
📁 apps/api/src/prosell/application/use_cases/products/
```

- [ ] 🔴 [L] `UploadProductImagesUseCase`
  - [ ] Validar cantidad (máx 20)
  - [ ] Resize y optimización
  - [ ] Upload a DO Spaces
  - [ ] Guardar referencias
- [ ] 🟡 [L] `ReorderProductImagesUseCase`
- [ ] 🟡 [L] `DeleteProductImageUseCase`

```
📁 apps/api/src/prosell/application/use_cases/products/
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
📁 apps/api/src/prosell/infrastructure/http/routers/
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
📁 apps/web/src/app/dashboard/products/
```

- [ ] 🔴 [L] Lista de productos (mi org)
- [ ] 🔴 [XL] Formulario crear/editar producto
  - [ ] Selector de categoría
  - [ ] Campos dinámicos
  - [ ] Galería de imágenes
  - [ ] Preview
- [ ] 🔴 [M] Detalle de producto (admin)

```
📁 apps/web/src/app/admin/approvals/
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
📁 apps/api/src/prosell/application/use_cases/catalog/
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
📁 apps/web/src/app/(public)/
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
📁 apps/api/src/prosell/domain/entities/sales/
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
📁 apps/api/src/prosell/application/use_cases/appointments/
```

- [ ] 🔴 [L] `CreateAppointmentUseCase`
  - [ ] Generar QR
  - [ ] Asignar vendedor
- [ ] 🔴 [M] `UpdateAppointmentUseCase`
- [ ] 🔴 [M] `RescheduleAppointmentUseCase`
- [ ] 🔴 [M] `CancelAppointmentUseCase`
- [ ] 🔴 [M] `CompleteAppointmentUseCase`

```
📁 apps/api/src/prosell/application/use_cases/sales/
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
📁 apps/web/src/app/dashboard/appointments/
```

- [ ] 🔴 [L] Lista de citas (calendario/lista)
- [ ] 🔴 [L] Formulario crear cita
- [ ] 🔴 [M] Modal de QR

```
📁 apps/web/src/app/dashboard/sales/
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
📁 apps/api/src/prosell/domain/entities/wallet/
```

- [ ] 🔴 [M] Completar entidad `Wallet`
- [ ] 🔴 [M] Crear entidad `TokenBalance`
- [ ] 🔴 [L] Crear entidad `Transaction`
  - [ ] Tipos: DEPOSIT, WITHDRAW, PURCHASE, REFUND
  - [ ] Estados: PENDING, COMPLETED, FAILED
- [ ] 🟡 [M] Crear entidad `TokenPackage`

### Backend - Integración Stripe

```
📁 apps/api/src/prosell/infrastructure/services/payments/
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
📁 apps/api/src/prosell/application/use_cases/wallet/
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
📁 apps/web/src/app/dashboard/wallet/
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

## 📬 SPRINT 13-14: NOTIFICACIONES AVANZADAS

**Duración**: Semanas 25-28 (Jul 28 - Ago 24, 2026)
**Objetivo**: Sistema de notificaciones multi-canal

### Backend - Integraciones

```
📁 apps/api/src/prosell/infrastructure/services/notifications/
```

- [ ] 🔴 [XL] `WhatsAppBusinessAPI`
  - [ ] Configuración de API credentials
  - [ ] Template messages
  - [ ] Media messages (imágenes, documentos)
  - [ ] Interactive buttons
  - [ ] Webhook handler
- [ ] 🟡 [L] `MessengerService`
  - [ ] Facebook Graph API
  - [ ] Quick replies
  - [ ] Webhook setup
- [ ] 🟢 [M] `SMSService` (Twilio)
  - [ ] Send SMS
  - [ ] Delivery status
  - [ ] Opt-out management

### Backend - Sistema de Notificaciones

```
📁 apps/api/src/prosell/domain/entities/notifications/
```

- [ ] 🔴 [M] `NotificationTemplate` entity
- [ ] 🔴 [M] `NotificationQueue` entity
- [ ] 🔴 [M] `NotificationPreference` entity

```
📁 apps/api/src/prosell/application/use_cases/notifications/
```

- [ ] 🔴 [L] `SendNotificationUseCase`
  - [ ] Selección de canal preferido
  - [ ] Fallback a canales alternativos
  - [ ] Retry con backoff
- [ ] 🔴 [M] `CreateTemplateUseCase`
- [ ] 🔴 [M] `ManagePreferencesUseCase`
- [ ] 🔴 [M] `BulkSendUseCase`

### Backend - Endpoints

- [ ] 🔴 [M] GET /api/notifications/preferences
- [ ] 🔴 [M] PUT /api/notifications/preferences
- [ ] 🔴 [M] GET /api/notifications/history
- [ ] 🟡 [S] POST /api/notifications/test
- [ ] 🔴 [L] POST /api/webhooks/whatsapp
- [ ] 🟡 [L] POST /api/webhooks/messenger

### Backend - Workers/Queues

```
📁 apps/api/src/prosell/infrastructure/queue/workers/
```

- [ ] 🔴 [L] `NotificationWorker`
  - [ ] Procesar cola de notificaciones
  - [ ] Rate limiting por API
  - [ ] Retry policy
  - [ ] Dead letter queue

### Frontend

```
📁 apps/web/src/app/dashboard/settings/notifications/
```

- [ ] 🔴 [M] Página de preferencias de notificación
  - [ ] Canales preferidos
  - [ ] Tipos de notificación
  - [ ] Horarios silencio

```
📁 apps/web/src/components/notifications/
```

- [ ] 🟡 [M] `NotificationCenter`
- [ ] 🟡 [M] `NotificationBadge`
- [ ] 🟡 [S] `NotificationItem`

### Tests

- [ ] 🔴 [M] Tests integración WhatsApp (mock)
- [ ] 🔴 [M] Tests cola de notificaciones
- [ ] 🟡 [M] Tests E2E preferencias usuario

---

## 🕷️ SPRINT 15-16: SCRAPING & ANÁLISIS

**Duración**: Semanas 29-32 (Ago 25 - Sep 21, 2026)
**Objetivo**: Sistema de scraping y análisis de precios

### Backend - Scraping Engine

```
📁 apps/api/src/prosell/infrastructure/scrapers/
```

- [ ] 🔴 [XL] `FacebookMarketplaceScraper`
  - [ ] Playwright async browser
  - [ ] Login automation
  - [ ] Search by location/filters
  - [ ] Extract listing data
  - [ ] Extract images
  - [ ] Anti-detection (delays, randomization)
- [ ] 🟡 [L] `CraigslistScraper`
- [ ] 🟡 [L] `eBayMotorsScraper`
- [ ] 🔴 [L] `ScraperOrchestrator`
  - [ ] Schedule jobs
  - [ ] Distribute load
  - [ ] Handle failures
  - [ ] Proxy rotation

### Backend - Anti-Detección

```
📁 apps/api/src/prosell/infrastructure/scrapers/anti_detection/
```

- [ ] 🔴 [L] `ProxyRotator`
  - [ ] Pool de proxies residenciales
  - [ ] Health check
  - [ ] Auto-rotation
- [ ] 🔴 [M] `UserAgentRotator`
- [ ] 🔴 [M] `DelayManager`
  - [ ] Random delays
  - [ ] Human-like patterns
- [ ] 🔴 [M] `FingerprintManager`
  - [ ] Browser fingerprints
  - [ ] Session management

### Backend - Procesamiento de Datos

```
📁 apps/api/src/prosell/infrastructure/scrapers/pipeline/
```

- [ ] 🔴 [L] `ExtractionPipeline`
  - [ ] Raw data → Structured data
  - [ ] Image processing
  - [ ] De-duplication (content hash)
- [ ] 🔴 [M] `PriceAnalyzer`
  - [ ] Calculate averages
  - [ ] Detect outliers
  - [ ] Trend analysis
- [ ] 🟡 [M] `MatchingEngine`
  - [ ] Match scraped vs internal
  - [ ] Suggest price adjustments

### Backend - Scheduling

```
📁 apps/api/src/prosell/application/use_cases/scraping/
```

- [ ] 🔴 [L] `ScheduleScrapingJobUseCase`
- [ ] 🔴 [M] `GetScrapingResultsUseCase`
- [ ] 🔴 [M] `GetPriceAnalysisUseCase`
- [ ] 🟡 [M] `SyncMarketDataUseCase`

### Backend - Endpoints

- [ ] 🔴 [M] POST /api/scraping/jobs
- [ ] 🔴 [M] GET /api/scraping/jobs/:id
- [ ] 🔴 [M] GET /api/scraping/jobs
- [ ] 🔴 [L] GET /api/analytics/price-analysis
  - [ ] make, model, year, location
  - [ ] avg, min, max, median prices
  - [ ] count of listings
- [ ] 🔴 [M] GET /api/products/:id/price-comparison

### Frontend

```
📁 apps/web/src/app/analytics/
```

- [ ] 🔴 [L] Dashboard de análisis de precios
  - [ ] Gráfico de tendencias
  - [ ] Comparador de precios
  - [ ] Mapa de calor por ubicación

```
📁 apps/web/src/app/admin/scraping/
```

- [ ] 🔴 [M] Panel de control de scraping
  - [ ] Jobs programados
  - [ ] Estado de scrapers
  - [ ] Logs de errores
  - [ ] Estadísticas de éxito

### Frontend - Componentes

- [ ] 🔴 [L] `PriceAnalysisCard`
- [ ] 🔴 [M] `PriceTrendChart`
- [ ] 🔴 [M] `ScrapingJobList`
- [ ] 🟡 [M] `MarketComparisonTable`

### Tests

- [ ] 🔴 [L] Tests scraping (con stubs)
- [ ] 🔴 [M] Tests pipeline de datos
- [ ] 🔴 [M] Tests análisis de precios
- [ ] 🟡 [S] Tests E2E dashboard analytics

---

## 🤖 SPRINT 17-18: ANALYTICS & IA

**Duración**: Semanas 33-36 (Sep 22 - Oct 19, 2026)
**Objetivo**: Dashboards avanzados y agentes IA

### Backend - Dashboards

```
📁 apps/api/src/prosell/application/use_cases/analytics/
```

- [ ] 🔴 [L] `GetMasterDashboardUseCase`
  - [ ] Métricas globales
  - [ ] Organizaciones por estado
  - [ ] Productos por categoría
  - [ ] Ventas por período
- [ ] 🔴 [L] `GetManagerDashboardUseCase`
  - [ ] Rendimiento de equipo
  - [ ] Comisiones por vendedor
  - [ ] Orgs asignadas
- [ ] 🔴 [L] `GetOrganizationDashboardUseCase`
  - [ ] Inventario por estado
  - [ ] Vistas del catálogo
  - [ ] Leads y conversiones
- [ ] 🔴 [M] `GetSalesReportUseCase`
  - [ ] Ventas por período
  - [ ] Top productos
  - [ ] Top vendedores

### Backend - Agentes IA

```
📁 apps/api/src/prosell/infrastructure/services/ai/
```

- [ ] 🔴 [L] `ClaudeAIService`
  - [ ] Anthropic API client
  - [ ] Streaming responses
  - [ ] Context management
  - [ ] Token counting
- [ ] 🔴 [L] `ProductAssistantAgent`
  - [ ] Chat de productos
  - [ ] Recomendaciones
  - [ ] Comparaciones
- [ ] 🟡 [L] `PricePredictorAgent`
  - [ ] Predecir precio óptimo
  - [ ] Análisis de mercado
  - [ ] Sugerencias de mejora

### Backend - Endpoints Analytics

- [ ] 🔴 [M] GET /api/analytics/dashboard/master
- [ ] 🔴 [M] GET /api/analytics/dashboard/manager
- [ ] 🔴 [M] GET /api/analytics/dashboard/organization/:id
- [ ] 🔴 [M] GET /api/analytics/reports/sales
- [ ] 🔴 [M] GET /api/analytics/reports/commissions
- [ ] 🔴 [M] GET /api/analytics/kpis
  - [ ] période (daily, weekly, monthly)
  - [ ] Métricas calculadas

### Backend - Endpoints IA

- [ ] 🔴 [L] POST /api/ai/chat
  - [ ] message
  - [ ] context (product_id, organization_id)
  - [ ] Streaming response
- [ ] 🔴 [M] POST /api/ai/analyze-price
  - [ ] product_id
  - [ ] Sugerencias de precio
- [ ] 🟡 [M] POST /api/ai/description-generator
  - [ ] category_id
  - [ ] attributes
  - [ ] Generated description

### Frontend - Analytics Dashboards

```
📁 apps/web/src/app/analytics/
```

- [ ] 🔴 [XL] Dashboard Master
  - [ ] KPIs globales
  - [ ] Gráficos de ventas
  - [ ] Mapa de organizaciones
  - [ ] Top performers
- [ ] 🔴 [L] Dashboard Manager
  - [ ] Rendimiento equipo
  - [ ] Comisiones
  - [ ] Orgs asignadas
- [ ] 🔴 [L] Dashboard Organización
  - [ ] Inventario
  - [ ] Métricas de catálogo
  - [ ] Leads y conversiones

### Frontend - Componentes Analytics

- [ ] 🔴 [L] `KPICard`
- [ ] 🔴 [M] `LineChart` (ventas)
- [ ] 🔴 [M] `BarChart` (categorías)
- [ ] 🔴 [M] `PieChart` (estados)
- [ ] 🔴 [M] `MapChart` (ubicaciones)
- [ ] 🔴 [M] `DataTable` (sortable, filterable)
- [ ] 🔴 [M] `DateRangePicker`
- [ ] 🟡 [M] `ReportExportButton`

### Frontend - IA Chat

```
📁 apps/web/src/components/ai/
```

- [ ] 🔴 [L] `AIChatInterface`
  - [ ] Chat bubbles
  - [ ] Input con typing indicator
  - [ ] Streaming response
  - [ ] Context switcher
- [ ] 🟡 [M] `ProductCardSuggestion`
- [ ] 🟡 [M] `PriceAnalysisTooltip`

### Frontend - Páginas

```
📁 apps/web/src/app/ai/
```

- [ ] 🔴 [M] Página de chat de productos
- [ ] 🟡 [L] Página de análisis de precio IA

### Tests

- [ ] 🔴 [L] Tests dashboards (data fixtures)
- [ ] 🔴 [M] Tests endpoints analytics
- [ ] 🔴 [M] Tests IA service (mock Claude API)
- [ ] 🟡 [M] Tests E2E chat interface

---

## 📊 RESUMEN COMPLETO DE TAREAS

| Sprint | Tareas Totales | P0 (🔴) | P1 (🟡) | P2 (🟢) | Fase |
|--------|----------------|---------|---------|---------|------|
| 1-2 | 52 | 38 | 14 | 0 | MVP Core |
| 3-4 | 48 | 35 | 13 | 0 | MVP Core |
| 5-6 | 55 | 40 | 15 | 0 | MVP Core |
| 7-8 | 38 | 25 | 13 | 0 | MVP Completo |
| 9-10 | 42 | 32 | 10 | 0 | MVP Completo |
| 11-12 | 35 | 25 | 10 | 0 | MVP Completo |
| 13-14 | 36 | 26 | 10 | 0 | Crecimiento |
| 15-16 | 42 | 30 | 12 | 0 | Crecimiento |
| 17-18 | 48 | 35 | 13 | 0 | Crecimiento |
| **Total** | **396** | **286** | **110** | **0** | - |

**Desglose por Capa:**

| Capa | Tareas Totales |
|------|---------------|
| Backend - Domain | 68 |
| Backend - Application | 102 |
| Backend - Infrastructure | 95 |
| Backend - API | 58 |
| Frontend - Pages | 42 |
| Frontend - Components | 31 |
| **Total Backend** | **323** |
| **Total Frontend** | **73** |

---

## ⏱️ ESTIMACIÓN DE TIEMPO TOTAL

| Sprint | Duración | Días hábiles | Horas estimadas |
|--------|----------|--------------|-----------------|
| 1-2 | 4 semanas | 20 | 320h |
| 3-4 | 4 semanas | 20 | 280h |
| 5-6 | 4 semanas | 20 | 340h |
| 7-8 | 4 semanas | 20 | 240h |
| 9-10 | 4 semanas | 20 | 260h |
| 11-12 | 4 semanas | 20 | 220h |
| 13-14 | 4 semanas | 20 | 240h |
| 15-16 | 4 semanas | 20 | 280h |
| 17-18 | 4 semanas | 20 | 320h |
| **Total** | **36 semanas** | **180** | **2,500h** |

**Con 2 developers full-time:**
- 2,500 horas ÷ 160 horas/mes/desarrollador = ~16 meses
- **Con equipo completo (2 backend + 1 frontend + 1 QA):** ~9 meses

---

## 🎯 CRITERIOS DE ACCEPTANCE DE SPRINT

### Antes de considerar un Sprint como "Completado":

```gherkin
Scenario: Sprint Review
  GIVEN todas las tareas P0 del sprint están completas
  AND tests unitarios tienen cobertura > 80%
  AND tests E2E críticos pasan
  AND code review fue aprobado
  WHEN se hace demo al stakeholder
  THEN el sprint se marca como COMPLETADO
  AND se procede al siguiente sprint

Scenario: Sprint Incompleto
  GIVEN alguna tarea P0 no está completa
  OR tests críticos fallan
  OR hay bugs P0/P1 conocidos
  THEN el sprint NO se marca como completo
  AND tasks pendientes pasan al siguiente sprint
```

---

## 📋 SEGUIMIENTO DE PROGRESO

### Métricas de Sprint por Seguir

| Métrica | Fórmula | Objetivo |
|---------|---------|----------|
| **Velocity** | Story points completados | Estabilizar en sprint 3-4 |
| **Sprint Burndown** | Trabajo restante vs días | Pendiente en 0 al final |
| **Escape Rate** | Trabajo añadido durante sprint | < 20% del compromiso inicial |
| **Defect Density** | Bugs encontrados por 1000 LOC | < 5 bugs/KLOC |
| **Test Coverage** | Lines cubiertas / Lines totales | > 80% |
| **Code Review Time** | Tiempo promedio de aprobación | < 24h |
| **Build Success Rate** | Builds exitosos / Totales | > 95% |

### Definition of Done (DoD)

**Por User Story:**
- [ ] Código implementado siguiendo Clean Architecture
- [ ] Tests unitarios con cobertura > 80%
- [ ] Tests de integración para repositories
- [ ] Code review aprobado (1 aprobat mínimo)
- [ ] Linter pasa sin errores
- [ ] Type checker pasa sin errores
- [ ] Documentación de API actualizada (si aplica)
- [ ] E2E test para flujos críticos
- [ ] Desplegado en staging para QA

**Por Sprint:**
- [ ] Todas las US P0 completadas según DoD
- [ ] P1 backlog está documentado
- [ ] Retrospectiva completada con action items
- [ ] Sprint review realizado con demo
- [ ] Métricas de sprint registradas
- [ ] Roadmap actualizado si hubo desvíos

---

## 🔄 GESTIÓN DE DEPENDENCIAS ENTRE SPRINTS

```
Dependencias Críticas:

Sprint 1-2 (Auth) → Sprint 3-4 (Orgs)
  └── Roles y permisos deben estar definidos

Sprint 3-4 (Orgs) → Sprint 5-6 (Products)
  └── Organizations debe existir para FK

Sprint 5-6 (Products) → Sprint 7-8 (Catalog)
  └── Productos publicados para catálogo

Sprint 5-6 (Products) → Sprint 9-10 (Sales)
  └── Productos para vender

Sprint 9-10 (Sales) → Sprint 11-12 (Wallet)
  └── Comisiones para calcular consumo

Sprint 11-12 (Wallet) → Sprint 13-14 (Notifications)
  └── Wallet para cobrar mensajes

Sprint 5-6 (Products) + Sprint 15-16 (Scraping) → Sprint 17-18 (Analytics)
  └── Datos internos y externos para análisis
```

---

## 🚨 RIESGOS POR SPRINT Y MITIGACIÓN

| Sprint | Riesgos | Mitigación |
|--------|---------|------------|
| 1-2 | OAuth provider rechaza app | Tener email/password como fallback |
| 3-4 | DO Spaces config compleja | Documentar early, usar local en dev |
| 5-6 | Campos dinámicos muy complejos | MVP con hardcoded fields primero |
| 7-8 | Performance búsqueda full-text | Usar PostgreSQL simple primero |
| 9-10 | Cálculo comisiones con edge cases | Unit tests exhaustivos |
| 11-12 | Stripe webhook unreliable | Retry + dead letter queue |
| 13-14 | WhatsApp API rate limits | Queue con rate limiting |
| 15-16 | Scrapers blocked rapidamente | Proxies + delays + user agents |
| 17-18 | Claude API costs | Caching + token limits |

---

**Documentos relacionados:**
- [Arquitectura](./01_ARQUITECTURA_PROSELL_SAAS_V2.md)
- [Requisitos](./02_REQUISITOS_PRD_PROSELL_SAAS_V2.md)
- [Roadmap](./04_ROADMAP_PROSELL_SAAS_V2.md)
