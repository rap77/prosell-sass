# Plan de Ejecución: Refactorización Pydantic Stack 2026

> **Propósito**: Documentar estrategia de ejecución y workflow para las 8 fases del refactoring de Pydantic
> **Creado**: 2026-02-14 | **Estrategia**: Merge en dos niveles (rama base → main)

---

## 📋 Resumen Ejecutivo

**Estrategia**: Dos niveles de merge para aislamiento

1. **Nivel 1**: Fases individuales → `refactor/pydantic-stack-2026`
   - Cada fase se ejecuta en su rama feature independiente
   - Cuando está completa y validada → merge a rama base de refactorización
   - Fases 2-4 pueden ejecutarse en paralelo

2. **Nivel 2**: Rama base → `main`
   - Solo cuando TODAS las 8 fases están mergeadas a `refactor/pydantic-stack-2026`
   - Validación conjunta completa (tests, lint, typecheck, API)
   - Merge final a main

**Ventaja**: Reduce riesgo en main - los problemas se quedan en la rama de refactorización

---

## 🎯 Estrategia Visual

```
feature/fase-1-foundation ─┐┐
feature/fase-2-domain      ─┐┐
feature/fase-3-application  ─┐┐  fases 1-4 en paralelo
feature/fase-4-infrastructure ─┐┐
feature/fase-5-python313    ─┐┐
feature/fase-6-cleanup      ─┘┐
feature/fase-7-testing      ─┘┐
feature/fase-8-validation    ─┘
                             ↓
               (merge secuencial: completado → merge)
                             ↓
                    refactor/pydantic-stack-2026
                             ↓
         (solo cuando TODO completo)
                             ↓
                    validación conjunta (tests, lint, API)
                             ↓
                             main
```

---

## 📋 Workflow Detallado por Fase

### Fase 1: Foundation (339 líneas, 9/10 confianza)

```bash
# === PASO 1: Crear rama feature ===
git checkout -b feature/fase-1-foundation

# === PASO 2: Ejecutar PRP ===
/sc execute-prp PRPs/refactor/fase-1-foundation.md

# === PASO 3: Validar ===
cd apps/api && uv run pytest tests/unit/domain/ -v
cd apps/api && uv run ruff check .
cd apps/api && uv run pyright

# === PASO 4: Merge a rama base ===
git checkout refactor/pydantic-stack-2026
git merge feature/fase-1-foundation --no-ff

# === PASO 5: Eliminar rama feature ===
git branch -d feature/fase-1-foundation

# === PASO 6: Verificar estado en rama base ===
git status
# Debe mostrar "Your branch is up to date with 'refactor/pydantic-stack-2026'"
```

**Lo que hace esta fase**:

- Crea `apps/api/src/prosell/domain/base.py` (DomainModel, ValueObject, DomainEvent)
- Elimina `python-jose[cryptography]` de `pyproject.toml`
- Configura Pydantic 2.12+ correctamente

---

### Fase 2: Domain Migration (613 líneas, 7/10 confianza)

```bash
# === PASO 1: Crear rama feature ===
git checkout -b feature/fase-2-domain

# === PASO 2: Ejecutar PRP ===
/sc execute-prp PRPs/refactor/fase-2-domain-migration.md

# === PASO 3: Validar ===
cd apps/api && uv run pytest tests/unit/domain/ -v
cd apps/api && uv run ruff check .
cd apps/api && uv run pyright

# === PASO 4: Merge a rama base ===
git checkout refactor/pydantic-stack-2026
git merge feature/fase-2-domain --no-ff

# === PASO 5: Eliminar rama feature ===
git branch -d feature/fase-2-domain
```

**Lo que hace esta fase**:

- Migra entities (User, Role, Session) a DomainModel
- Migra value objects (Email) a ValueObject
- Migra events a DomainEvent
- Convierte ports (IJWTService, etc.) de ABC a Protocol

---

### Fase 3: Application DTOs (471 líneas, 8/10 confianza)

```bash
# === PASO 1: Crear rama feature ===
git checkout -b feature/fase-3-application

# === PASO 2: Ejecutar PRP ===
/sc execute-prp PRPs/refactor/fase-3-application-dtos.md

# === PASO 3: Validar ===
cd apps/api && uv run pytest tests/unit/application/ -v
cd apps/api && uv run ruff check .
cd apps/api && uv run pyright

# === PASO 4: Merge a rama base ===
git checkout refactor/pydantic-stack-2026
git merge feature/fase-3-application --no-ff

# === PASO 5: Eliminar rama feature ===
git branch -d feature/fase-3-application
```

**Lo que hace esta fase**:

- Migra TODOS los DTOs de application a BaseModel
- Agrega validación Pydantic (EmailStr, Field, field_validator)

---

### Fase 4: Infrastructure (509 líneas, 7/10 confianza)

```bash
# === PASO 1: Crear rama feature ===
git checkout -b feature/fase-4-infrastructure

# === PASO 2: Ejecutar PRP ===
/sc execute-prp PRPs/refactor/fase-4-infrastructure.md

# === PASO 3: Validar ===
cd apps/api && uv run pytest tests/unit/infrastructure/ -v
cd apps/api && uv run ruff check .
cd apps/api && uv run pyright

# === PASO 4: Merge a rama base ===
git checkout refactor/pydantic-stack-2026
git merge feature/fase-4-infrastructure --no-ff

# === PASO 5: Eliminar rama feature ===
git branch -d feature/fase-4-infrastructure
```

**Lo que hace esta fase**:

- Extraer schemas de API a módulo separado
- Actualizar repos para usar `model_validate()`
- Eliminar ABC de services

---

### Fase 5: Python 3.13+ Syntax (999 líneas, 7/10 confianza)

```bash
# === PASO 1: Crear rama feature ===
git checkout -b feature/fase-5-python313

# === PASO 2: Ejecutar PRP ===
/sc execute-prp PRPs/refactor/fase-5-python313.md

# === PASO 3: Validar ===
cd apps/api && uv run pytest -v
cd apps/api && uv run ruff check .
cd apps/api && uv run pyright

# === PASO 4: Merge a rama base ===
git checkout refactor/pydantic-stack-2026
git merge feature/fase-5-python313 --no-ff

# === PASO 5: Eliminar rama feature ===
git branch -d feature/fase-5-python313
```

**Lo que hace esta fase**:

- Aplicar sintaxis Python 3.13+ (type aliases, StrEnum, Annotated)
- Modernizar todo el código

---

### Fase 6: Cleanup (679 líneas, 8/10 confianza)

```bash
# === PASO 1: Crear rama feature ===
git checkout -b feature/fase-6-cleanup

# === PASO 2: Ejecutar PRP ===
/sc execute-prp PRPs/refactor/fase-6-cleanup.md

# === PASO 3: Validar ===
cd apps/api && uv run pytest -v
cd apps/api && uv run ruff check .
cd apps/api && uv run pyright

# === PASO 4: Merge a rama base ===
git checkout refactor/pydantic-stack-2026
git merge feature/fase-6-cleanup --no-ff

# === PASO 5: Eliminar rama feature ===
git branch -d feature/fase-6-cleanup
```

**Lo que hace esta fase**:

- Eliminar UserStatus duplicado
- Verificar que no queden dependencias sin usar

---

### Fase 7: Testing (742 líneas, 8/10 confianza)

```bash
# === PASO 1: Crear rama feature ===
git checkout -b feature/fase-7-testing

# === PASO 2: Ejecutar PRP ===
/sc execute-prp PRPs/refactor/fase-7-testing.md

# === PASO 3: Validar ===
cd apps/api && uv run pytest -v --cov=src/prosell
cd apps/api && uv run ruff check .
cd apps/api && uv run pyright

# === PASO 4: Merge a rama base ===
git checkout refactor/pydantic-stack-2026
git merge feature/fase-7-testing --no-ff

# === PASO 5: Eliminar rama feature ===
git branch -d feature/fase-7-testing
```

**Lo que hace esta fase**:

- Actualizar tests existentes para Pydantic
- Agregar tests de validación Pydantic

---

### Fase 8: Validation Final (935 líneas, 9/10 confianza)

```bash
# === PASO 1: Crear rama feature ===
git checkout -b feature/fase-8-validation

# === PASO 2: Ejecutar PRP ===
/sc execute-prp PRPs/refactor/fase-8-validation.md

# === PASO 3: Validar ===
cd apps/api && uv run pytest -v --cov=src/prosell
cd apps/api && uv run ruff check .
cd apps/api && uv run pyright

# === PASO 4: Merge a rama base ===
git checkout refactor/pydantic-stack-2026
git merge feature/fase-8-validation --no-ff

# === PASO 5: Eliminar rama feature ===
git branch -d feature/fase-8-validation
```

**Lo que hace esta fase**:

- Validación final completa
- Verificar API funcionando
- Validar cobertura de tests

---

## 🚀 Ejecución Paralela (Fases 1-4)

Las fases 1-4 pueden ejecutarse simultáneamente porque trabajan capas distintos:

```bash
# === TERMINAL 1: Fase 1 ===
git checkout -b feature/fase-1-foundation
/sc execute-prp PRPs/refactor/fase-1-foundation.md

# === TERMINAL 2: Fase 2 ===
git checkout -b feature/fase-2-domain
/sc execute-prp PRPs/refactor/fase-2-domain-migration.md

# === TERMINAL 3: Fase 3 ===
git checkout -b feature/fase-3-application
/sc execute-prp PRPs/refactor/fase-3-application-dtos.md

# === TERMINAL 4: Fase 4 ===
git checkout -b feature/fase-4-infrastructure
/sc execute-prp PRPs/refactor/fase-4-infrastructure.md
```

Cuando cada una esté completa:

```bash
# Desde cada terminal
git checkout refactor/pydantic-stack-2026
git merge feature/fase-N --no-ff
git branch -d feature/fase-N
```

**Nota**: Fases 5-8 deben esperarse a que 1-4 estén completas porque tienen dependencias.

---

## ✅ Validación Final Antes de Merge a Main

### Checklist en refactor/pydantic-stack-2026

```bash
# Verificar rama base
git checkout refactor/pydantic-stack-2026
git log --oneline --graph --all
```

**Checklist**:

- [ ] **Fase 1**: `apps/api/src/prosell/domain/base.py` existe
- [ ] **Fase 2**: Entities/VOs/Events heredan de DomainModel/ValueObject/DomainEvent
- [ ] **Fase 2**: Ports usan Protocol (no ABC)
- [ ] **Fase 3**: DTOs de application usan BaseModel
- [ ] **Fase 4**: `infrastructure/api/schemas/` existe
- [ ] **Fase 4**: Repos usan `model_validate()`
- [ ] **Fase 4**: Services no heredan de ABC
- [ ] **Fase 5**: Sintaxis Python 3.13+ aplicada (type, StrEnum)
- [ ] **Fase 6**: UserStatus duplicado eliminado
- [ ] **Fase 6**: python-jose eliminado de dependencias
- [ ] **Fase 7**: Tests actualizados
- [ ] **Fase 8**: Validación final completa

### Test Suite Completa

```bash
# Backend tests
cd apps/api && uv run pytest -v --cov=src/prosell

# Esperado: Todos pasan
# Test Files: >20
# Tests: 129+ (domain) + nuevos (application, infrastructure)

# Linting
cd apps/api && uv run ruff check .

# Esperado: 0 errores
# pyright
cd apps/api && uv run pyright

# Esperado: 0 errores
```

### API Funcionando

```bash
# Iniciar API en modo desarrollo
cd apps/api && fastapi dev src/prosell/infrastructure/api/main.py --reload --port 8000

# En otro terminal, probar endpoints
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "full_name": "Test User",
    "accept_terms": true
  }'

# Esperado: 201 Created con user response
```

### Revisión Final

```bash
# AI Code Review
gga run

# Pre-commit (lint + GGA)
pre-commit run --all-files
```

---

## 🚀 Merge Final a Main

**SOLO cuando TODO lo anterior pasa perfectamente**:

```bash
# === PASO 1: Checkout rama base ===
git checkout refactor/pydantic-stack-2026

# === PASO 2: Verificar que todo esté completo ===
# Repetir checklist anterior

# === PASO 3: Merge a main ===
git checkout main
git merge refactor/pydantic-stack-2026 --no-ff

# === PASO 4: Puhear a remoto ===
git push origin main

# === PASO 5: Eliminar rama base (opcional) ===
git branch -d refactor/pydantic-stack-2026
```

---

## 📋 Resumen de Comandos

### Por Fase (1-8)

```bash
# Template de comandos por fase
git checkout -b feature/fase-N
/sc execute-prp PRPs/refactor/fase-N.md
# (validar tests, lint, typecheck)
git checkout refactor/pydantic-stack-2026
git merge feature/fase-N --no-ff
git branch -d feature/fase-N
```

### Validación Final

```bash
# En rama refactor/pydantic-stack-2026
cd apps/api && uv run pytest -v --cov=src/prosell
cd apps/api && uv run ruff check .
cd apps/api && uv run pyright
fastapi dev src/prosell/infrastructure/api/main.py --reload
# (probar endpoints)
gga run
pre-commit run --all-files
```

### Merge Final

```bash
# Solo cuando TODO pasa en refactor/pydantic-stack-2026
git checkout main
git merge refactor/pydantic-stack-2026 --no-ff
git push origin main
```

---

## 📊 Archivos Referenciados

### PRPs (8 archivos)

- `PRPs/refactor/fase-1-foundation.md` (339 líneas)
- `PRPs/refactor/fase-2-domain-migration.md` (613 líneas)
- `PRPs/refactor/fase-3-application-dtos.md` (471 líneas)
- `PRPs/refactor/fase-4-infrastructure.md` (509 líneas)
- `PRPs/refactor/fase-5-python313.md` (999 líneas)
- `PRPs/refactor/fase-6-cleanup.md` (679 líneas)
- `PRPs/refactor/fase-7-testing.md` (742 líneas)
- `PRPs/refactor/fase-8-validation.md` (935 líneas)

### Plan Original

- `docs/planes/2026-02-14-pydantic-stack-refactoring.md` (plan maestro de 8 fases)

### Plan de Ejecución (este archivo)

- `docs/planes/2026-02-14-pydantic-stack-ejecucion.md` (este documento)

---

## 🎯 Confianza Total

**Promedio de fases**: 8
**Promedio de líneas de PRPs**: 5,287
**Confianza promedio**: 70/80 = **87.5%**

Si una fase falla, se puede deshacer (rollback) sin afectar las demás.
Si todo falla, se puede eliminar la rama `refactor/pydantic-stack-2026` completa y main queda intacta.

---

## 🚀 Quick Start (Nueva Sesión)

En una nueva sesión, ejecutar:

```bash
# 1. Activar proyecto
mcp__serena__activate_project project: "/home/rpadron/proy/prosell-sass"

# 2. Crear rama base (si no existe)
git checkout -b refactor/pydantic-stack-2026

# 3. Comenzar con Fase 1
git checkout -b feature/fase-1-foundation
/sc execute-prp PRPs/refactor/fase-1-foundation.md

# 4. Repetir workflow para cada fase
```
