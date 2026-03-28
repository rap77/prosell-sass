# Code Review Findings - Sprint 7 Phase 1

## Fecha: 2026-03-06

## Review Summary

**Overall Assessment**: GOOD - 80% listo
**Status**: ⚠️ NEEDS FIXES antes de merge

## Issues Críticos (Must Fix)

### C1: 31 Pyright Type Errors 🔴

**Archivos afectados**:
- `src/prosell/infrastructure/i18n/translator.py` - 13 errors
- `src/prosell/infrastructure/tasks/circuit_breaker.py` - 9 errors
- `src/prosell/infrastructure/tasks/health.py` - 4 errors
- `src/prosell/infrastructure/tasks/worker.py` - 2 errors
- `src/prosell/infrastructure/tasks/broker.py` - 1 error
- `src/prosell/domain/value_objects/i18n/multi_language_string.py` - 2 errors

**Top fixes**:

1. **translator.py** - Agregar type args a dicts:
```python
# BEFORE
categories: dict = {}
fields: dict = {}

# AFTER
from typing import Any
categories: dict[str, Any] = {}
fields: dict[str, Any] = {}
```

2. **translator.py** - Type **kwargs:
```python
# BEFORE
def t(..., **kwargs) -> str:

# AFTER
def t(..., **kwargs: Any) -> str:
```

3. **circuit_breaker.py** - Type Callable:
```python
# BEFORE
async def call(self, func: Callable, *args, **kwargs):

# AFTER
from collections.abc import Awaitable, Callable
T = TypeVar('T')
async def call(self, func: Callable[..., Awaitable[T]], *args: Any, **kwargs: Any) -> T:
```

4. **health.py** - redis.ping() no es async:
```python
# BEFORE
await client.ping()

# AFTER
client.ping()  # sync, no await
```

5. **broker.py + health.py** - Environment detection bug:
```python
# BEFORE (siempre False!)
if settings.environment == "testing":

# AFTER
import sys
import os
IS_TESTING = "pytest" in sys.modules or os.getenv("PYTEST_VERSION")
if IS_TESTING:
    broker = InMemoryBroker()
```

### C2: Broken Integration Test 🔴

**Archivo**: `tests/integration/tasks/test_task_execution.py`

**Error**:
```python
from prosell.infrastructure.tasks.broker import async_task, broker
# ImportError: cannot import name 'async_task'
```

**Fix**: Cambiar import
```python
from prosell.infrastructure.tasks.broker import broker

@broker.task  # Usar broker.task en lugar de async_task
async def simple_task(x: int, y: int) -> int:
    return x + y
```

### C3: Worker Implementation Bug 🔴

**Archivo**: `src/prosell/infrastructure/tasks/worker.py`

**Error**: Line 16-18
```python
receiver = Receiver(
    broker=broker,
    max_workers=settings.task_queue_max_workers,  # ❌ Invalid parameter
)
```

**Fix**: Verificar documentación de taskiq Receiver
```python
receiver = Receiver(
    broker=broker,
)
# Worker count is controlled by process manager (systemd, kubernetes, etc.)
```

## Issues Importantes

### I1: Missing Spike Documentation
**Archivo faltante**: `docs/plans/2026-03-06-phase1-taskqueue-spike.md`

**Debe incluir**:
- Taskiq vs Celery comparación
- Validación SQLAlchemy 2.0 async
- Memory leak tests
- Performance benchmarks
- Decision rationale

### I2: Missing Scheduled Tasks
- `taskiq-scheduler` no agregado a pyproject.toml
- `TaskiqScheduler` instance no creada
- No ejemplos de tareas programadas

### I3: Environment Detection Bug
**Dos lugares**:
- `src/prosell/infrastructure/tasks/broker.py:13`
- `src/prosell/infrastructure/tasks/health.py:29`

### I4: Ruff Warnings
- B019: cached-instance-method
- SIM108: if-else-block-instead-of-if-exp

## Fix Commands

```bash
cd apps/api

# Fix translator.py type annotations
sd 'categories: dict = {}' 'categories: dict[str, Any] = {}' src/prosell/infrastructure/i18n/translator.py
sd 'fields: dict = {}' 'fields: dict[str, Any] = {}' src/prosell/infrastructure/i18n/translator.py
sd 'validation: dict = {}' 'validation: dict[str, Any] = {}' src/prosell/infrastructure/i18n/translator.py
sd 'common: dict = {}' 'common: dict[str, Any] = {}' src/prosell/infrastructure/i18n/translator.py
sd '**kwargs) -> str:' '**kwargs: Any) -> str:' src/prosell/infrastructure/i18n/translator.py

# Auto-fix ruff warnings
ruff check --fix src/prosell/infrastructure/i18n/translator.py
ruff check --fix src/prosell/infrastructure/tasks/circuit_breaker.py
```

## Assessment

| Categoría | Grade | Status |
|-----------|-------|--------|
| **Arquitectura** | A | ✅ Excelente Clean Architecture |
| **Code Quality** | B+ | ⚠️ Type safety issues |
| **Test Coverage** | A- | ✅ Buenos unit tests, broken integration |
| **Documentación** | B+ | ⚠️ Falta spike doc |
| **Seguridad** | A | ✅ No issues |
| **Performance** | A | ✅ No concerns |

## Estimated Fix Time

- **Críticos**: 2-3 horas
- **Importantes**: 1 hora (spike doc + scheduled tasks)

## Approval Status

⚠️ **CONDICIONAL APPROVAL** - 80% listo

Necesita fixes críticos antes de merge a main.
