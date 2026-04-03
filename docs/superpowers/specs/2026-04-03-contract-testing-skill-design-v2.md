# Contract Testing Skill - Design Document v2

**Date**: 2026-04-03
**Author**: Rafael Padrón + Claude
**Status**: Updated - Iterative Agent Architecture
**Type**: Technical Design Specification

---

## Executive Summary

A multi-layer contract testing skill that **prevents, diagnoses, AND FIXES** API contract mismatches between backend (FastAPI/Python) and frontend (React/TypeScript). The skill automatically detects endpoint characteristics, applies the appropriate validation layer, and **iterates until tests pass**.

**Business Value**:
- Reduces debugging time from 2-3 hours to < 3 minutes (fully automated)
- Prevents contract bugs from reaching staging
- **Auto-fixes common issues** (normalizer not connected, casing mismatches, null handling)
- Provides clear diagnostic messages when contracts fail
- Leverages existing test infrastructure (458 tests, fixtures, patterns)

---

## Architecture v2: Iterative Agent

### Three-Layer Model + Auto-Fixer

```
┌─────────────────────────────────────────────────────────────┐
│  CONTRACT TESTING SKILL                                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ANALYZER: Endpoint Characterization                │    │
│  │  - Detects external API calls                      │    │
│  │  - Detects normalization logic                     │    │
│  │  - Recommends appropriate layer                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ↓                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  GENERATOR: Test Creation                          │    │
│  │  - Reads template (Layer 1/2/3)                    │    │
│  │  - Renders with endpoint context                   │    │
│  │  - Writes test to tests/contract/                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ↓                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  FIXER: Iterative Auto-Repair ⭐ NEW               │    │
│  │  - Executes pytest                                 │    │
│  │  - Analyzes failures                               │    │
│  │  - Applies fixes automatically                     │    │
│  │  - Re-tests until passes (max 10 iterations)       │    │
│  │  - Commits working fix                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Skill Structure (Anthropic Standard)

```
.skills/contract-testing/
├── SKILL.md                    # Main skill file
├── config.yaml                 # Configuration (thresholds, keywords)
└── scripts/                    # Python executable code (Anthropic standard)
    ├── __init__.py             # Package initialization
    ├── analyzer.py             # Endpoint analysis
    ├── generator.py            # Test generation from templates
    ├── fixer.py                # ⭐ Iterative auto-repair agent
    └── templates/              # Jinja2 templates
        ├── layer1_openapi_test.py.j2
        ├── layer2_integration_test.py.j2
        └── layer3_schema_match_test.py.j2
```

**Key Design Decision**: All Python code lives in `scripts/` per Anthropic skill standards. This ensures:
- ✅ Portability (entire skill is self-contained)
- ✅ Standard compliance (follows Anthropic conventions)
- ✅ Executability (scripts can be invoked directly or via skill)

---

## Component Specifications

### 1. Analyzer (`scripts/analyzer.py`)

**Purpose**: Inspect endpoint and recommend validation layer

**Interface**:
```python
from scripts.analyzer import analyze_endpoint, LayerRecommendation

recommendation = analyze_endpoint(
    endpoint_path="/api/v1/vehicles/decode-vin",
    project_root="/path/to/project"
)

print(recommendation.layer)      # 2
print(recommendation.reason)     # "External API + normalization detected"
print(recommendation.confidence) # "high"
```

**Algorithm**:
```python
def analyze_endpoint(endpoint_path: str, project_root: Path) -> LayerRecommendation:
    # 1. Find router definition
    router = find_router_file(endpoint_path, project_root)

    # 2. Check characteristics
    has_external_api = detect_keywords(router, EXTERNAL_API_KEYWORDS)
    has_normalization = detect_keywords(router, NORMALIZATION_KEYWORDS)
    field_count = count_response_fields(router)

    # 3. Recommend layer
    if has_external_api or has_normalization:
        return LayerRecommendation(layer=2, reason="...", confidence="high")
    elif field_count > 10:
        return LayerRecommendation(layer=3, reason="...", confidence="medium")
    else:
        return LayerRecommendation(layer=1, reason="...", confidence="high")
```

---

### 2. Generator (`scripts/generator.py`)

**Purpose**: Generate test from template

**Interface**:
```python
from scripts.generator import generate_test

test_path = generate_test(
    endpoint_path="/api/v1/vehicles/decode-vin",
    layer=2,
    project_root="/path/to/project"
)
# Returns: tests/contract/integration/test_vin_decode_contract.py
```

**Process**:
```python
def generate_test(endpoint_path: str, layer: int, project_root: Path) -> Path:
    # 1. Read endpoint metadata
    metadata = extract_endpoint_metadata(endpoint_path, project_root)

    # 2. Select template
    template_path = TEMPLATES_DIR / f"layer{layer}_integration_test.py.j2"

    # 3. Render with Jinja2
    test_content = render_template(template_path, metadata)

    # 4. Write to tests/contract/
    test_path = project_root / "tests" / "contract" / get_layer_name(layer) / f"test_{endpoint_name}.py"
    test_path.write_text(test_content)

    return test_path
```

---

### 3. Fixer (`scripts/fixer.py`) ⭐ NEW

**Purpose**: Iterate until test passes, applying fixes automatically

**Interface**:
```python
from scripts.fixer import fix_until_pass

result = fix_until_pass(
    test_path="tests/contract/integration/test_vin_decode_contract.py",
    project_root="/path/to/project"
)

if result.success:
    print(f"✅ Fixed in {result.iterations} iterations")
    print(f"Commit: {result.commit_hash}")
else:
    print(f"❌ Could not fix: {result.error}")
```

**Algorithm**:
```python
def fix_until_pass(test_path: Path, project_root: Path) -> FixResult:
    """Iterate fixes until test passes or max iterations reached."""

    max_iterations = 10
    for iteration in range(1, max_iterations + 1):
        # 1. Run pytest
        result = run_pytest(test_path, project_root)

        if result.passed:
            # 2. Success! Commit the fix
            commit_hash = commit_fix(
                message=f"fix(contract): resolve {test_path.stem}",
                files=result.modified_files
            )
            return FixResult(
                success=True,
                iterations=iteration,
                commit_hash=commit_hash
            )

        # 3. Analyze failure
        diagnosis = analyze_failure(result.output, test_path, project_root)

        print(f"Iteration {iteration}: {diagnosis.reason}")
        print(f"  File: {diagnosis.file_path}")
        print(f"  Fix: {diagnosis.fix_description}")

        # 4. Apply fix
        apply_fix(diagnosis)

    # Max iterations reached
    return FixResult(
        success=False,
        error="Could not fix after max iterations"
    )
```

**Common Fix Patterns**:

| Pattern | Detection | Fix |
|---------|-----------|-----|
| **Normalizer not connected** | `AssertionError: assert 'chevrolet' == 'CHEVROLET'` | Import and call `normalize_*()` function |
| **Missing field** | `KeyError: 'field_name'` | Add field to DTO or default value |
| **Type mismatch** | `TypeError: expected str, got int` | Add type conversion |
| **Null handling** | `AssertionError: None != <expected>` | Add null check or default |
| **Import missing** | `ImportError: No module named 'x'` | Add import statement |

---

## Workflow: Complete Example

### User Request
```
"El VIN decode devuelve CHEVROLET pero debería ser chevrolet"
```

### Step 1: Claude Activates Skill
```
<Skill: contract-testing>
Analyzing endpoint /api/v1/vehicles/decode-vin...
```

### Step 2: Analyzer Runs
```python
recommendation = analyzer.analyze_endpoint("/api/v1/vehicles/decode-vin")
# Layer: 2
# Reason: External API (NHTSA) + normalization detected
# Confidence: high
```

### Step 3: Generator Creates Test
```python
test_path = generator.generate_test("/api/v1/vehicles/decode-vin", layer=2)
# Created: tests/contract/integration/test_vin_decode_contract.py
```

### Step 4: Fixer Iterates
```bash
Iteration 1: Normalizer not connected
  File: apps/api/.../decode_vin.py
  Fix: Import normalize_nhtsa_value and wrap make field

Iteration 2: Normalizer not connected
  File: apps/api/.../decode_vin.py
  Fix: Wrap body_type field with normalize_nhtsa_value

Iteration 3: Normalizer not connected
  File: apps/api/.../decode_vin.py
  Fix: Wrap drivetrain field with normalize_nhtsa_value

✅ Fixed in 3 iterations
Commit: abc123 (fix(contract): connect VIN normalizer in decode_vin.py)
```

### Step 5: Result
```
✅ Test passing
✅ Fix applied automatically
✅ Changes committed
✅ Bug resolved in < 3 minutes (would have taken 2-3 hours manually)
```

---

## Implementation Plan Update

### Task 4 (Updated): Implement Fixer

**Files to Create**:
- `scripts/fixer.py` - Core iterative fix logic
- `scripts/diagnosis.py` - Failure analysis
- `scripts/fixes/` - Fix pattern library

**Fix Patterns to Implement**:
1. Normalizer connection (VIN decode case)
2. Missing imports
3. Type conversions
4. Null handling
5. Default values

**Tests**:
- `tests/unit/test_fixer.py` - Test fixer logic with mock scenarios

---

## Success Criteria

The updated skill is successful when:

1. ✅ **Auto-detection**: Analyzer correctly identifies endpoint characteristics
2. ✅ **Test generation**: Generator creates valid pytest tests
3. ✅ **Auto-repair**: Fixer resolves common issues without human intervention
4. ✅ **Iteration**: Fixer converges in < 5 iterations for 80% of cases
5. ✅ **Safety**: Fixer creates git commits for rollback
6. ✅ **Portability**: Entire skill works in any FastAPI/React project

---

*Updated: 2026-04-03 - Added iterative fixer architecture*
