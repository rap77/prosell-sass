# Guía Modular de Tests E2E - ProSell SaaS

## Overview

Esta guía permite ejecutar los tests E2E por módulos en orden lógico, desde el registro hasta el flujo completo de negocio.

**Ubicación**: `/home/rpadron/proy/prosell-sass/tests/e2e/`

---

## 🚀 Quick Start - Ejecutar Todos

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e

# Instalar dependencias (primera vez)
pnpm install

# Ejecutar todos los tests
pnpm test

# Ejecutar solo smoke tests (~2 min)
pnpm test --grep @smoke

# Ejecutar con UI (debugging)
pnpm test --ui

# Reporte HTML
pnpm report
```

---

## 📦 Módulos en Orden Lógico

### MÓDULO 1: Auth & Registro (Foundation)

**Qué prueba**: Flujo completo de autenticación, OAuth, registro
**Tiempo estimado**: 3-5 minutos
**Archivos**:

- `specs/oauth.spec.ts` - OAuth flow (Google, Facebook)
- `specs/facebook-oauth.spec.ts` - Facebook OAuth específico
- `smoke.spec.ts` (Auth Flow section)

**Ejecutar**:

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e

# Tests de OAuth
pnpm test oauth.spec.ts

# Facebook OAuth específico
pnpm test facebook-oauth.spec.ts

# Smoke tests de auth
pnpm test smoke.spec.ts --grep "Auth Flow"
```

**Qué verificar**:

- ✅ Login page carga correctamente
- ✅ Validación de email funciona
- ✅ Google OAuth button visible
- ✅ Redirect a /auth/login para rutas protegidas
- ✅ Home pública accesible

**Próximo paso**: Si Auth pasa, continuar a Catálogo

---

### MÓDULO 2: Catálogo C3 (Core Business)

**Qué prueba**: CRUD de categorías, productos, vehículos
**Tiempo estimado**: 5-8 minutos
**Archivos**:

- `specs/categories.spec.ts` - Categorías CRUD
- `specs/products.spec.ts` - Productos CRUD
- `specs/products-api.spec.ts` - API contracts productos
- `specs/vehicles.spec.ts` - Vehículos CRUD
- `specs/vehicle-creation-c3.spec.ts` - Creación C3 específica
- `smoke.spec.ts` (Category/DataGrid sections)

**Ejecutar**:

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e

# Categorías
pnpm test categories.spec.ts

# Productos
pnpm test products.spec.ts

# API Products
pnpm test products-api.spec.ts

# Vehículos
pnpm test vehicles.spec.ts

# Creación C3
pnpm test vehicle-creation-c3.spec.ts

# Smoke tests de catálogo
pnpm test smoke.spec.ts --grep "Category|DataGrid"
```

**Qué verificar**:

- ✅ GET /api/v1/categories - lista categorías
- ✅ POST /api/v1/categories - crea categoría
- ✅ GET /api/v1/products - lista productos
- ✅ POST /api/v1/products - crea producto
- ✅ Vehicles page carga y muestra datos
- ✅ Vehicle creation form accesible

**Próximo paso**: Si Catálogo pasa, continuar a VIN Decode

---

### MÓDULO 3: VIN Decode & Vehicle Form (Input)

**Qué prueba**: Decodificación de VIN, validación de formulario
**Tiempo estimado**: 4-6 minutos
**Archivos**:

- `specs/vehicle-form-vin.spec.ts` - VIN decode + form
- `smoke.spec.ts` (VehicleForm section)

**Ejecutar**:

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e

# VIN decode completo
pnpm test vehicle-form-vin.spec.ts

# Smoke tests de VIN
pnpm test smoke.spec.ts --grep "VehicleForm"
```

**Qué verificar**:

- ✅ POST /api/v1/vehicles/decode-vin - decodifica VIN válido
- ✅ Model field se actualiza después de decode (model = "equinox")
- ✅ Engine field se pobla correctamente
- ✅ Make select se actualiza (make = "chevrolet")
- ✅ Drivetrain select se pobla
- ✅ Selected values se muestran sin placeholder
- ✅ Todos los fields se poblan simultáneamente
- ✅ Form submit crea product+vehicle vía POST /api/v1/products

**Próximo paso**: Si VIN decode pasa, continuar a Leads

---

### MÓDULO 4: Leads (Business Logic)

**Qué prueba**: Captura, listado, asignación de leads
**Tiempo estimado**: 5-7 minutos
**Archivos**:

- `specs/leads.spec.ts` - Leads CRUD
- `specs/manager-leads.spec.ts` - Vista de manager
- `specs/manager-leads-verify.spec.ts` - Verificación manager

**Ejecutar**:

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e

# Leads básico
pnpm test leads.spec.ts

# Vista manager
pnpm test manager-leads.spec.ts

# Verificación manager
pnpm test manager-leads-verify.spec.ts
```

**Qué verificar**:

- ✅ Lead creation funciona
- ✅ Lead listing muestra datos
- ✅ Lead assignment a vendedores
- ✅ Manager view muestra leads del equipo
- ✅ Lead lifecycle (created → assigned → contacted)

**Próximo paso**: Si Leads pasan, continuar a Appointments

---

### MÓDULO 5: Appointments (Scheduling)

**Qué prueba**: Creación, listado, calendar de citas
**Tiempo estimado**: 5-7 minutos
**Archivos**:

- `specs/appointments.spec.ts` - Appointments CRUD
- `specs/dealer-calendar.spec.ts` - Calendar de dealer
- `specs/appointments-debug.spec.ts` - Debug appointments

**Ejecutar**:

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e

# Appointments básico
pnpm test appointments.spec.ts

# Calendar dealer
pnpm test dealer-calendar.spec.ts

# Debug appointments
pnpm test appointments-debug.spec.ts
```

**Qué verificar**:

- ✅ Appointment creation funciona
- ✅ Appointment listing muestra citas
- ✅ Dealer calendar muestra slots disponibles
- ✅ Citas se asignan correctamente a vendedores
- ✅ Calendar UI funciona (navegación, selección)

**Próximo paso**: Si Appointments pasan, continuar a Features Avanzados

---

### MÓDULO 6: Features Avanzados (Integration)

**Qué prueba**: Image upload, bulk operations, webhooks
**Tiempo estimado**: 6-10 minutos
**Archivos**:

- `specs/bulk-image-upload.spec.ts` - Upload masivo de imágenes
- `specs/facebook-webhook.spec.ts` - Webhook de Facebook
- `specs/catalog-accessibility.spec.ts` - Accesibilidad WCAG

**Ejecutar**:

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e

# Bulk image upload
pnpm test bulk-image-upload.spec.ts

# Facebook webhook
pnpm test facebook-webhook.spec.ts

# Accesibilidad
pnpm test catalog-accessibility.spec.ts
```

**Qué verificar**:

- ✅ Image upload (presigned URL) funciona
- ✅ Bulk upload maneja múltiples archivos
- ✅ Facebook webhook recibe publicaciones
- ✅ WCAG compliance (a11y) en catálogo

**Próximo paso**: Si features avanzados pasan, ejecutar End-to-End completo

---

### MÓDULO 7: End-to-End Integration (Full Flow)

**Qué prueba**: El flujo completo de negocio
**Tiempo estimado**: 10-15 minutos
**Archivos**:

- `specs/a6-verification.spec.ts` - Verificación completa fase A6
- `specs/a6-manual-verification.spec.ts` - Verificación manual
- `specs/staging-smoke.spec.ts` - Smoke en staging

**Ejecutar**:

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e

# Verificación automática A6
pnpm test a6-verification.spec.ts

# Verificación manual
pnpm test a6-manual-verification.spec.ts

# Staging smoke
pnpm test staging-smoke.spec.ts
```

**Qué verificar** (Flujo Completo):

1. ✅ Login → Dashboard accesible
2. ✅ Catálogo → Crear categoría
3. ✅ Catálogo → Crear vehículo (con VIN decode)
4. ✅ Catálogo → Listar productos
5. ✅ Leads → Capturar lead desde vehículo
6. ✅ Leads → Asignar lead a vendedor
7. ✅ Appointments → Crear cita para lead
8. ✅ Appointments → Ver calendar de dealer
9. ✅ Manager → Ver leads del equipo
10. ✅ Dashboard → Métricas actualizadas

---

## 🔧 Debugging

### Ver screenshots de failures

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
ls -la screenshots/
ls -la screenshots-summary/
```

### Ver reporte HTML

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm report
# Abre: playwright-report/index.html
```

### Ejecutar un solo test

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e

# Por línea de número
pnpm test vehicle-form-vin.spec.ts --grep "should update model"

# Con UI (headful)
pnpm test vehicle-form-vin.spec.ts --ui --headed
```

### Ver logs

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
cat test-results.log
cat test-output.log
```

---

## 📊 Matriz de Ejecución

| Módulo          | Tests | Tiempo    | Dependencies         | Próximo         |
| --------------- | ----- | --------- | -------------------- | --------------- |
| 1. Auth         | 5-8   | 3-5 min   | Ninguno              | 2. Catálogo     |
| 2. Catálogo     | 8-12  | 5-8 min   | 1. Auth              | 3. VIN          |
| 3. VIN Decode   | 7-10  | 4-6 min   | 2. Catálogo          | 4. Leads        |
| 4. Leads        | 6-9   | 5-7 min   | 3. VIN               | 5. Appointments |
| 5. Appointments | 5-8   | 5-7 min   | 4. Leads             | 6. Features     |
| 6. Features     | 4-6   | 6-10 min  | 5. Appointments      | 7. E2E          |
| 7. E2E Full     | 10-15 | 10-15 min | Todos los anteriores | ✅ Done         |

**Total estimado**: 40-60 minutos para ejecutar todos los módulos secuencialmente.

---

## 🎯 Estrategia Recomendada

### Opción A: Fast Feedback (Desarrollo)

```bash
# Ejecutar smoke tests después de cada cambio
pnpm test --grep @smoke
```

### Opción B: Modular (Feature Development)

```bash
# Ejecutar solo el módulo que estás trabajando
pnpm test vehicle-form-vin.spec.ts
```

### Opción C: Completo (Pre-release)

```bash
# Ejecutar todos los tests en orden
pnpm test oauth.spec.ts
pnpm test categories.spec.ts
pnpm test products.spec.ts
pnpm test vehicle-form-vin.spec.ts
pnpm test leads.spec.ts
pnpm test appointments.spec.ts
pnpm test a6-verification.spec.ts
```

---

## ⚠️ Troubleshooting

### "Address already in use"

```bash
# Matar procesos en puerto 3999 (web) o 8000 (api)
lsof -ti:3999 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

### "Cannot find module"

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm install
```

### "Server not responding"

```bash
# Verificar que API y Web están corriendo
curl http://localhost:8000/health
curl http://localhost:3999
```

### Tests timeout

```bash
# Aumentar timeout en playwright.config.ts
# O ejecutar con --timeout=60000 (60s por test)
pnpm test --timeout=60000
```

---

## 📝 Checklist Pre-Test

Antes de ejecutar los tests, verificar:

- [ ] API server corriendo en `http://localhost:8000`
- [ ] Web server corriendo en `http://localhost:3999`
- [ ] Database inicializada con `init_data.py`
- [ ] Admin user disponible: `admin@prosell-demo.com / Admin123!`
- [ ] Dependencias instaladas: `pnpm install` en `tests/e2e/`
- [ ] Browser instalado: Chrome/Chromium para Playwright

---

**Última actualización**: 2026-05-02
**Estatus**: Ready for execution
**Mantenedor**: ProSell SaaS Team
