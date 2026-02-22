# Plan Maestro - ProSell SaaS

**Fecha:** 2026-02-11
**Estado:** Activo - En constante evolución

---

## Visión General

ProSell SaaS es una plataforma de análisis de mercado de vehículos que combina:

- **Marketplace Público:** E-commerce para compradores de vehículos
- **SaaS Analytics:** Inteligencia de mercado en tiempo real para concesionarios
- **Scraping Automatizado:** Multi-marketplace (Facebook Marketplace primario)
- **ML Predictions:** Predicción de precios y modelos de recomendación

---

## Arquitectura

**Frontend:** Next.js 16 + React 19 + TypeScript + Zustand + TailwindCSS
**Backend:** FastAPI + SQLAlchemy 2.0 + PostgreSQL 17 + Redis
**Patrón:** Clean Architecture (SOLID, Hexagonal, Screaming)

---

## Fases del Proyecto

### Fase 1: Fundamentos y Configuración ✅

- Monorepo estructurado (Turborepo)
- Tech stack definido (Next.js 16, FastAPI, etc.)
- Linters configurados (Ruff, Pyright, ESLint, Prettier)
- Pre-commit hooks + GGA (AI code review)
- CI/CD con GitHub Actions

### Fase 2: Frontend - Sprint 1-2 (Auth) ✅ COMPLETADO

**Periodo:** 2026-02-06 to 2026-02-08 (3 días)
**Objetivo:** Sistema de autenticación frontend completo

#### Tareas Completadas (17/17):

1. ✅ Environment Setup
2. ✅ authStore (Zustand)
3. ✅ useAuth Hook
4. ✅ authApi Client (mock)
5. ✅ PasswordInput Component
6. ✅ OAuthButtons Component (UI only)
7. ✅ TwoFactorInput Component
8. ✅ LoginForm Component
9. ✅ RegisterForm Component
10. ✅ Login Page
11. ✅ Register Page
12. ✅ Verify-email Page
13. ✅ Forgot-password & Reset-password Pages
14. ✅ 2FA-setup Page
15. ✅ Route Protection Middleware
16. ✅ E2E Tests (Playwright)
17. ✅ Final Validation

#### Logros:

- **316 tests** unitarios pasando
- **64 specs** E2E (Chromium, Firefox, WebKit)
- **91.57% coverage** de código
- **Zero `any` types** (TypeScript strict)
- **Todos los commits** aprobados por GGA

#### NOTA IMPORTANTE - OAuth:

- **Task #6 (OAuthButtons)** implementó solo el **COMPONENTE UI** con callbacks mock
- **NO incluía:** Backend FastAPI, NextAuth.js config, Google Console apps
- **Los callbacks** `signIn('google')` son funciones MOCK que no conectan a nada

#### Issues Conocidos:

1. ✅ **RESUELTO:** Error de JSON en consola (`/api/auth/state` → 404)
   - Solución: Wrapper `fetchWithFallback()` + flag `NEXT_PUBLIC_DEV_DISABLE_API=true`
   - Estado: Funcionando en dev con localStorage mock

### Fase 3: Frontend - Sprint 3 (Dashboard) 🚧 PRÓXIMO

**Objetivo:** Dashboard principal para análisis de mercado

#### Tareas Planeadas:

- Diseño de layout principal (sidebar, contenido, header)
- Sistema de navegación y menús
- Cards de métricas y KPIs
- Gráficos y visualizaciones de datos
- Tablas de vehículos con filtros
- Sistema de notificaciones

**Estado:** No iniciado

### Fase 4: Backend - Sprint 1 (Core API) 🚧 PRÓXIMO

**Objetivo:** APIs core de usuarios, autenticación, productos

#### Tareas Planeadas:

- **Autenticación:**
  - Login con email/password
  - Registro de usuario
  - Recuperación de contraseña
  - Verificación de email
  - 2FA (TOTP)
  - OAuth (Google, Facebook) - **PENDIENTE IMPLEMENTACIÓN**

- **Usuarios:**
  - CRUD de usuarios
  - Perfiles de usuario
  - Gestión de roles (admin, dealer, buyer)

- **Productos:**
  - CRUD de productos
  - Catálogo de vehículos
  - Imágenes y especificaciones

- **Base de Datos:**
  - PostgreSQL 17
  - SQLAlchemy 2.0 (async)
  - Migraciones con Alembic

**Estado:** No iniciado

### Fase 5: Scraping & ML 🚧 PRÓXIMO

**Objetivo:** Scraping automatizado y modelos de ML

#### Tareas Planeadas:

- **Scraping:**
  - Facebook Marketplace scraper (Playwright async)
  - Sistema de colas de scraping
  - Proxies rotativos

- **Machine Learning:**
  - Modelos de predicción de precios
  - Recomendación de vehículos similares
  - Análisis de tendencias del mercado

**Estado:** No iniciado

---

## Prioridades Actuales

### URGENTE - Completar Fase 2 (Sprint 1-2)

**Motivo:** Sprint 1-2 frontend está "completo" según la memoria, PERO:

1. **OAuth NO ESTÁ FUNCIONAL** - Los botones están pero no conectan a backend
2. **Falta implementación REAL** de:
   - Backend FastAPI con endpoints OAuth
   - NextAuth.js configurado con credenciales
   - Google OAuth apps creadas
   - Environment variables

**ACCIONES NECESARIAS:**

1. ✅ **CORREGIR PLAN DEL SPRINT 1-2** - Agregar tarea pendiente de OAuth real
2. ✅ **INICIAR FASE 3 (Backend Sprint 1)** - Implementar endpoints OAuth en FastAPI
3. ✅ **ACTUALIZAR ROADMAP** - Crear documento formal de fases y sprints

### HOJA DE RUTA (Next.js)

1. **Completar OAuth en frontend:**
   - Conectar OAuthButtons a backend real cuando exista
   - Mientras tanto, mantener callbacks mock funcionales

2. **Empezar Sprint 3 (Dashboard):**
   - Una vez que OAuth funcione, construir dashboard
   - Priorizar UI sobre backend complejo

3. **Lanzar Sprint 4 (Backend Sprint 1):**
   - Implementar endpoints core en FastAPI
   - Incluye OAuth endpoints `/api/auth/google`, `/api/auth/callback`
   - Integrar con NextAuth.js

---

## Métricas de Éxito

### Fase 1: Fundamentos ✅

- Setup completado al 100%

### Fase 2: Frontend Auth ✅ 98%

- 17/17 tareas completadas
- 316/317 tests pasando
- 91.57% coverage
- **ÚNICO PENDIENTE:** OAuth real (backend + config)

---

## Notas

- **Fase 2 (Frontend Auth)** está técnicamente completa
- El workaround actual (`NEXT_PUBLIC_DEV_DISABLE_API=true`) es TEMPORAL
- Para producción, necesitamos backend real funcionando
- OAuthButtons UI está correcta - solo falta el backend

**Próximos pasos:**

1. Revisar y aprobar este plan maestro
2. Actualizar memoria del Sprint 1-2
3. Crear roadmap detallado en ROADMAP.md
4. Priorizar Sprint 3 (Dashboard) sobre todo lo demás
