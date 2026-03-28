# Completion Gates Pattern - PRP Verification

## Concepto

Los **Completion Gates** son tests de completitud **ejecutables** que validan que un PRP está implementado correctamente.

## Estructura

```markdown
---

## 11. Completion Gates (VERIFIABLE)

Estos son los **tests de completitud** ejecutables que validan que el PRP está completo.

### 11.1 Spike Validation (si aplica)

```bash
# Spike POC completado y documentado
test -f docs/plans/2026-03-06-{slug}-spike.md
# Expected: File exists with findings
```

### 11.2 Unit Tests

```bash
# Tests unitarios pasan con coverage requerido
cd apps/api && uv run pytest tests/unit/ -v --cov=src --cov-report=term-missing
# Expected: All pass, coverage > 80%
```

### 11.3 Integration Tests

```bash
# Tests de integración pasan
cd apps/api && uv run pytest tests/integration/ -v
# Expected: All pass, coverage > 70%
```

### 11.4 Code Quality

```bash
# No errores de linting
cd apps/api && ruff check .
# Expected: Exit code 0

# No errores de tipo
cd apps/api && pyright .
# Expected: 0 errors
```

### 11.5 Documentation

```bash
# PRP documentación completa
grep -q "^## 11. Completion Gates" {prp_file}
# Expected: Pattern found (you're reading it!)
```

### 11.6 Final Checklist

- [ ] Spike completado (si aplica)
- [ ] Todos los tests unitarios pasan (>80%)
- [ ] Todos los tests de integración pasan (>70%)
- [ ] No errores de pyright (0 errores)
- [ ] No errores de ruff (0 errores)
- [ ] Documentación actualizada
- [ ] Code review completado
- [ ] E2E tests pasan (si aplica)

```

## Script Python para Agregar Completion Gates

```python
#!/usr/bin/env python3
"""Add Completion Gates to PRP files."""

import re
from pathlib import Path

COMPLETION_GATES_TEMPLATE = """

---

## 11. Completion Gates (VERIFIABLE)

Estos son los **tests de completitud** ejecutables que validan que el PRP está completo.

### 11.1 Spike Validation (si aplica)

```bash
# Spike POC completado y documentado
test -f docs/plans/2026-03-06-{slug}-spike.md
# Expected: File exists with findings
```

### 11.2 Unit Tests

```bash
# Tests unitarios pasan con coverage requerido
cd apps/api && uv run pytest tests/unit/ -v --cov=src --cov-report=term-missing
# Expected: All pass, coverage > 80%
```

### 11.3 Integration Tests

```bash
# Tests de integración pasan
cd apps/api && uv run pytest tests/integration/ -v
# Expected: All pass, coverage > 70%
```

### 11.4 Code Quality

```bash
# No errores de linting
cd apps/api && ruff check .
# Expected: Exit code 0

# No errores de tipo
cd apps/api && pyright .
# Expected: 0 errors
```

### 11.5 Documentation

```bash
# PRP documentación completa
grep -q "^## 11. Completion Gates" {prp_file}
# Expected: Pattern found (you're reading it!)
```

### 11.6 Final Checklist

- [ ] Spike completado (si aplica)
- [ ] Todos los tests unitarios pasan (>80%)
- [ ] Todos los tests de integración pasan (>70%)
- [ ] No errores de pyright (0 errores)
- [ ] No errores de ruff (0 errores)
- [ ] Documentación actualizada
- [ ] Code review completado
- [ ] E2E tests pasan (si aplica)

"""

def add_completion_gates(prp_path: Path) -> None:
    """Add Completion Gates section before Confidence Score."""
    content = prp_path.read_text()

    # Check if already has Completion Gates
    if "## 11. Completion Gates" in content:
        print(f"⏭️  Ya tiene Completion Gates: {prp_path.name}")
        return

    # Find Confidence Score section
    confidence_match = re.search(r"\n## Confidence Score\n", content)
    if not confidence_match:
        print(f"❌ No se encontró '## Confidence Score' en {prp_path.name}")
        return

    # Get slug from filename
    slug = prp_path.stem.replace("sprint-7-phase", "").replace("-prp", "")

    # Prepare Completion Gates content
    completion_gates = COMPLETION_GATES_TEMPLATE.replace("{slug}", slug)

    # Insert before Confidence Score
    updated_content = content[:confidence_match.start()] + completion_gates + content[confidence_match.start():]

    # Write back
    prp_path.write_text(updated_content)
    print(f"✅ Agregado Completion Gates a: {prp_path.name}")

def main():
    """Add Completion Gates to all Sprint 7 PRPs."""
    prp_dir = Path("PRPs")

    for prp_file in sorted(prp_dir.glob("sprint-7-phase*.md")):
        add_completion_gates(prp_file)

if __name__ == "__main__":
    main()
```

## Uso

```bash
python3 /tmp/add_completion_gates_v3.py
```

## Coverage Targets

| Tipo | Target |
|------|--------|
| Unit Tests | > 80% |
| Integration Tests | > 70% |
| Pyright Errors | 0 |
| Ruff Errors | 0 |

## Checklist Manual

Los ítems que no se pueden automatizar van en el **Final Checklist**:

- Spike completado (si aplica)
- Code review completado
- Documentación actualizada
- E2E tests pasan (si aplica)
