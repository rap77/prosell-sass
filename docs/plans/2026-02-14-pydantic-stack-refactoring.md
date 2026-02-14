# Plan: Refactorización Completa con Stack Tecnológico 2026

## Context

El proyecto ProSell SaaS tiene una implementación funcional del sistema de autenticación con Clean Architecture, pero el código no aprovecha completamente el stack tecnológico planificado (Pydantic 2.12+, Python 3.13+). Las entities usan `@dataclass` en lugar de Pydantic, los DTOs de application layer están vacíos, las API schemas están mezcladas dentro de los routers, hay interfaces inconsistentes (mix Protocol/ABC), dependencias fantasma, y duplicación de código. Este plan moderniza TODO el código existente.

## Decisiones Tomadas

- **Pydantic en TODO** (domain, application, infrastructure) - No rompe Hexagonal porque Pydantic es utilidad, no infraestructura
- **Protocol para TODAS las interfaces** - Eliminar ABC, usar structural typing
- **Python 3.13+ syntax** - PEP 695, Annotated, StrEnum consistente
- **Solo refactorizar lo existente** - No agregar entities/features nuevas
- **Rama independiente**: `refactor/pydantic-stack-2026`

---

## Pre-requisito: Crear rama

```bash
git checkout -b refactor/pydantic-stack-2026
```

---

## Fase 1: Foundation - Dependencias y Configuración

### 1.1 Limpiar `apps/api/pyproject.toml`
- **Eliminar**: `python-jose[cryptography]` (fantasma - se usa `pyjwt`)
- **Verificar**: Python `requires-python = ">=3.13"` correcto
- **Verificar**: Todas las versiones de deps matchean con CLAUDE.md

### 1.2 Crear Base Models Pydantic reutilizables
**Archivo nuevo**: `apps/api/src/prosell/domain/base.py`

```python
"""Base Pydantic models for the domain layer."""
from datetime import UTC, datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class DomainModel(BaseModel):
    """Base for all domain entities."""
    model_config = ConfigDict(
        frozen=False,           # Entities son mutables
        str_strip_whitespace=True,
        validate_assignment=True,  # Valida en cada asignación
        from_attributes=True,     # Permite crear desde ORM models
    )


class ValueObject(BaseModel):
    """Base for all value objects (immutable)."""
    model_config = ConfigDict(
        frozen=True,            # Value Objects son inmutables
        str_strip_whitespace=True,
    )


class DomainEvent(BaseModel):
    """Base for all domain events (immutable)."""
    model_config = ConfigDict(frozen=True)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
```

### 1.3 Verificar tests pasan antes de tocar nada
```bash
cd apps/api && uv run pytest
```

**Archivos afectados:**
- `apps/api/pyproject.toml`
- `apps/api/src/prosell/domain/base.py` (NUEVO)

---

## Fase 2: Domain Layer - Migración a Pydantic

### 2.1 Value Objects (`domain/value_objects/`)

**`email.py`**: `@dataclass(frozen=True)` → `ValueObject` (Pydantic)
```python
class Email(ValueObject):
    address: EmailStr  # Pydantic valida automáticamente formato

    @computed_field
    @property
    def domain(self) -> str:
        return self.address.split("@")[1]

    @computed_field
    @property
    def local_part(self) -> str:
        return self.address.split("@")[0]

    @field_validator("address")
    @classmethod
    def reject_disposable(cls, v: str) -> str:
        # ... validación de dominios desechables
        return v
```

**`user_status.py`**: ELIMINAR - Ya existe `UserStatus` enum en `user.py`. Solo mantener uno.

### 2.2 Entities (`domain/entities/`)

**`user.py`**: `@dataclass` → `DomainModel` (Pydantic)
- Migrar todos los campos a Pydantic Field() con validación
- Mantener factory methods (`create()`, `create_oauth()`) como `@classmethod`
- Mantener business logic methods
- Usar `model_validator` donde aplique
- `UserStatus` queda como `StrEnum` aquí (eliminar el duplicado)

**`role.py`**: `@dataclass` → `DomainModel` (Pydantic)
- `RoleType` y `Permission` quedan como `StrEnum` (ya lo son)
- `ROLE_PERMISSIONS` dict queda igual
- Migrar `Role` a Pydantic con Field()

**`session.py`**: `@dataclass` → `DomainModel` (Pydantic)
- Campos con Field() y validación

### 2.3 Domain Events (`domain/events/`)

**`user_events.py`**: `@dataclass(frozen=True)` → `DomainEvent` (Pydantic)
- Todos los eventos heredan de `DomainEvent`
- `timestamp` ya viene del base

### 2.4 Domain Exceptions
- NO cambian - son clases Python puras, no necesitan Pydantic

### 2.5 Repository Interfaces (`domain/repositories/`)
- Ya usan `Protocol` - solo revisar y asegurar consistencia
- NO necesitan Pydantic

### 2.6 Service Interfaces (`domain/ports/`)

**MIGRAR ABC → Protocol**:
- `i_jwt_service.py`: `IJWTService(ABC)` → `IJWTService(Protocol)`
- `i_password_service.py`: `IPasswordService(ABC)` → `IPasswordService(Protocol)`
- `i_totp_service.py`: `ITOTPService(ABC)` → `ITOTPService(Protocol)`

Eliminar `@abstractmethod`, usar `...` (Ellipsis) como body.

**Archivos afectados:**
- `apps/api/src/prosell/domain/value_objects/email.py`
- `apps/api/src/prosell/domain/value_objects/user_status.py` (ELIMINAR)
- `apps/api/src/prosell/domain/entities/user.py`
- `apps/api/src/prosell/domain/entities/role.py`
- `apps/api/src/prosell/domain/entities/session.py`
- `apps/api/src/prosell/domain/events/user_events.py`
- `apps/api/src/prosell/domain/ports/i_jwt_service.py`
- `apps/api/src/prosell/domain/ports/i_password_service.py`
- `apps/api/src/prosell/domain/ports/i_totp_service.py`

---

## Fase 3: Application Layer - DTOs Pydantic

### 3.1 Auth DTOs (`application/dto/auth/`)

Migrar TODOS los DTOs de `@dataclass` a Pydantic `BaseModel` con validación:

**Request DTOs** (con validación estricta):
```python
class RegisterUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    accept_terms: bool

    @field_validator("accept_terms")
    @classmethod
    def must_accept_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Must accept terms")
        return v
```

**Response DTOs** (serializables):
```python
class RegisterUserResponse(BaseModel):
    user_id: UUID
    email: str
    status: str
    message: str
```

### 3.2 Actualizar Use Cases
- Actualizar imports en todos los use cases
- Los use cases reciben/devuelven Pydantic DTOs
- Verificar que la lógica sigue funcionando

**Archivos afectados:**
- `apps/api/src/prosell/application/dto/auth/*.py` (todos)
- `apps/api/src/prosell/application/use_cases/auth/*.py` (todos los imports)

---

## Fase 4: Infrastructure Layer - Schemas y Adapters

### 4.1 Crear módulo de API Schemas separado

**Directorio nuevo**: `apps/api/src/prosell/infrastructure/api/schemas/`

Extraer schemas de `auth_router.py` a archivos dedicados:

```
infrastructure/api/schemas/
├── __init__.py
├── auth.py          # RegisterRequest, LoginRequest, etc.
├── responses.py     # APIResponse, ErrorResponse, PaginatedResponse
└── common.py        # Schemas compartidos
```

**`auth.py`** - Request schemas con validación Pydantic completa:
```python
class RegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(..., min_length=8, description="User password")
    full_name: str = Field(..., min_length=2, max_length=100)
    accept_terms: bool = Field(..., description="Must accept terms of service")
```

**`responses.py`** - Response schemas para documentación OpenAPI:
```python
class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    status: str
    is_email_verified: bool
    has_2fa: bool

class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class MessageResponse(BaseModel):
    message: str
    status: str = "success"
```

### 4.2 Actualizar `auth_router.py`
- Eliminar schemas inline
- Importar desde `schemas/`
- Agregar `response_model` a TODOS los endpoints
- Ejemplo: `@router.post("/register", response_model=MessageResponse)`

### 4.3 Actualizar Repository Implementations
- Los repos ahora trabajan con Pydantic entities (tienen `from_attributes=True`)
- Actualizar `_to_entity()` methods para usar `Model.model_validate()`
- Ejemplo: `User.model_validate(user_model, from_attributes=True)`

### 4.4 Actualizar Service Implementations
- Eliminar herencia de ABC (`class JWTService(IJWTService):`)
- Solo implementar los métodos del Protocol (duck typing)
- Eliminar `@abstractmethod` overrides innecesarios

**Archivos afectados:**
- `apps/api/src/prosell/infrastructure/api/schemas/` (NUEVO directorio)
- `apps/api/src/prosell/infrastructure/api/routers/auth_router.py`
- `apps/api/src/prosell/infrastructure/repositories/user_repository_impl.py`
- `apps/api/src/prosell/infrastructure/repositories/role_repository_impl.py`
- `apps/api/src/prosell/infrastructure/repositories/session_repository_impl.py`
- `apps/api/src/prosell/infrastructure/services/jwt_service.py`
- `apps/api/src/prosell/infrastructure/services/password_service.py`
- `apps/api/src/prosell/infrastructure/services/totp_service.py`

---

## Fase 5: Python 3.13+ Modernización

### 5.1 PEP 695 Type Aliases (`type` statement)
Donde aplique, usar nueva sintaxis:
```python
# Antes
from typing import TypeAlias
RolePermissions: TypeAlias = dict[RoleType, set[Permission]]

# Después (Python 3.12+)
type RolePermissions = dict[RoleType, set[Permission]]
```

### 5.2 StrEnum Consistencia
Verificar que TODOS los enums usan `StrEnum` (no `str, Enum`):
```python
# Antes
class UserStatus(str, Enum):

# Después
from enum import StrEnum
class UserStatus(StrEnum):
```

### 5.3 Annotated para Constraints
Usar `Annotated` para constraints reutilizables:
```python
from typing import Annotated
from pydantic import Field

type UserEmail = Annotated[str, Field(description="User email address")]
type UserName = Annotated[str, Field(min_length=2, max_length=100)]
```

### 5.4 Limpiar imports obsoletos
- Eliminar `from __future__ import annotations` si existe
- Usar `X | None` en lugar de `Optional[X]` (ya se hace, verificar consistencia)
- Usar `list[X]` en lugar de `List[X]` (ya se hace, verificar)

**Archivos afectados**: Todos los archivos Python del proyecto

---

## Fase 6: Limpieza y Deduplicación

### 6.1 Eliminar `UserStatus` duplicado
- Mantener en `domain/entities/user.py`
- Eliminar `domain/value_objects/user_status.py`
- Actualizar todos los imports

### 6.2 Eliminar `python-jose` de dependencias
- Remover de `pyproject.toml`
- Solo se usa `pyjwt`

### 6.3 Limpiar re-exports innecesarios
- Verificar `__init__.py` files
- Asegurar exports claros y mínimos

**Archivos afectados:**
- `apps/api/pyproject.toml`
- `apps/api/src/prosell/domain/value_objects/user_status.py` (ELIMINAR)
- Todos los `__init__.py` relevantes

---

## Fase 7: Testing - Actualizar y Validar

### 7.1 Actualizar tests existentes
Los 4 archivos de test del domain layer necesitan actualizarse para Pydantic:

```python
# Antes (dataclass)
user = User(id=uuid4(), email="test@example.com", ...)

# Después (Pydantic)
user = User.create(email="test@example.com", password_hash="hashed")
# O
user = User(id=uuid4(), email="test@example.com", ...)  # Pydantic valida automáticamente
```

**Tests a actualizar:**
- `tests/unit/domain/test_user_entity.py` (45 tests)
- `tests/unit/domain/test_role_entity.py`
- `tests/unit/domain/test_value_objects.py` (cambios significativos por Email → Pydantic)
- `tests/unit/domain/test_events_exceptions.py`

### 7.2 Agregar tests de validación Pydantic
Nuevos tests que validan que Pydantic rechaza datos inválidos:
```python
def test_user_rejects_invalid_email() -> None:
    with pytest.raises(ValidationError):
        User.create(email="not-an-email", ...)

def test_register_dto_rejects_short_password() -> None:
    with pytest.raises(ValidationError):
        RegisterUserRequest(email="test@example.com", password="short", ...)
```

### 7.3 Ejecutar suite completa
```bash
cd apps/api && uv run pytest -v
cd apps/api && uv run ruff check .
cd apps/api && uv run pyright
```

**Archivos afectados:**
- `apps/api/tests/unit/domain/test_user_entity.py`
- `apps/api/tests/unit/domain/test_role_entity.py`
- `apps/api/tests/unit/domain/test_value_objects.py`
- `apps/api/tests/unit/domain/test_events_exceptions.py`

---

## Fase 8: Validación Final y Commit

### 8.1 Checklist de validación
- [ ] `uv run pytest` - Todos los tests pasan
- [ ] `uv run ruff check .` - Sin errores de lint
- [ ] `uv run pyright` - Sin errores de tipos
- [ ] `git commit` - GGA code review pasa con STRICT_MODE=true
- [ ] Verificar que la API sigue funcionando: `fastapi dev src/prosell/infrastructure/api/main.py`

### 8.2 Commits (uno por fase completada)
```
refactor(domain): create Pydantic base models (DomainModel, ValueObject, DomainEvent)
refactor(domain): migrate value objects to Pydantic
refactor(domain): migrate entities to Pydantic BaseModel
refactor(domain): migrate events to Pydantic DomainEvent
refactor(domain): unify interfaces to Protocol (remove ABC)
refactor(app): migrate DTOs to Pydantic with validation
refactor(infra): extract API schemas to dedicated module
refactor(infra): add response_model to all endpoints
refactor(infra): update repositories for Pydantic entities
refactor: apply Python 3.13+ modern syntax
chore: clean dependencies and remove duplicates
test: update domain tests for Pydantic migration
```

---

## Resumen de Archivos

### Nuevos
| Archivo | Propósito |
|---------|-----------|
| `domain/base.py` | Base models: DomainModel, ValueObject, DomainEvent |
| `infrastructure/api/schemas/__init__.py` | Package init |
| `infrastructure/api/schemas/auth.py` | Auth request schemas |
| `infrastructure/api/schemas/responses.py` | Response schemas (UserResponse, AuthTokenResponse) |
| `infrastructure/api/schemas/common.py` | Shared schemas |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `pyproject.toml` | Eliminar python-jose |
| `domain/entities/user.py` | @dataclass → DomainModel |
| `domain/entities/role.py` | @dataclass → DomainModel |
| `domain/entities/session.py` | @dataclass → DomainModel |
| `domain/value_objects/email.py` | frozen dataclass → ValueObject |
| `domain/events/user_events.py` | frozen dataclass → DomainEvent |
| `domain/ports/i_*.py` (3 files) | ABC → Protocol |
| `application/dto/auth/*.py` | @dataclass → BaseModel |
| `application/use_cases/auth/*.py` | Actualizar imports |
| `infrastructure/api/routers/auth_router.py` | Extraer schemas, agregar response_model |
| `infrastructure/repositories/*_impl.py` | Usar model_validate() |
| `infrastructure/services/*.py` | Eliminar ABC herencia |
| `tests/unit/domain/*.py` (4 files) | Actualizar para Pydantic |

### Eliminados
| Archivo | Razón |
|---------|-------|
| `domain/value_objects/user_status.py` | Duplicado - UserStatus ya está en user.py |

---

## Orden de Ejecución

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7 → Fase 8
  ↓         ↓         ↓         ↓         ↓         ↓         ↓         ↓
 Base    Domain     App      Infra    Python    Clean     Tests    Validate
 Setup   Migrate   DTOs    Schemas   3.13+    Dupes    Update    & Commit
```

Cada fase tiene su propio commit. Si una fase rompe tests, se arregla ANTES de avanzar a la siguiente.
