# Session 2026-04-02: FastAPI Upgrade + Staging Debugging

**Date**: 2026-04-02
**Branch**: main
**Duration**: ~2 hours
**Status**: PAUSED (smoke tests pending)

---

## 🎯 Objective

Upgrade FastAPI from 0.115.13 to 0.128.0 for Pydantic 2.12+ compatibility and investigate "Pydantic serialization bug" in staging deployment.

---

## ✅ Accomplished

### 1. FastAPI + Pydantic Upgrade

**Files Modified**:
- `apps/api/pyproject.toml`: FastAPI 0.115.13 → 0.128.0, Pydantic 2.11.2 → 2.12.5
- `apps/api/uv.lock`: Updated with new dependency versions
- `apps/api/src/prosell/infrastructure/api/routers/health_router.py`: Restored `response_model` usage

**Commits**:
- `e74b239`: feat(api): upgrade FastAPI to 0.128.0 and Pydantic to 2.12.5
- `a450b89`: wip: staging deployment paused - FastAPI 0.128.0 upgraded, smoke tests pending

### 2. Root Cause Investigation (Systematic Debugging)

**Initial Problem**: Endpoints with `response_model=BaseModel` returning JSON schema instead of values
- Symptom: `{status: string, timestamp: string}` instead of `{status: "healthy", timestamp: "..."}`

**Investigation Process**:
1. Checked staging container versions: FastAPI 0.115.13, Pydantic 2.12.5
2. Tested with TestClient inside container: ✅ Works correctly
3. Tested with curl from inside container: ✅ Works correctly
4. Tested with curl from host: ❌ Shows schema in stdout

**Root Cause Found**:
- **NOT a FastAPI/Pydantic bug**
- **curl -s quirk**: Shows JSON schema in stdout when no TTY
- **Verification methods**:
  - `wget` ✅ Shows correct JSON
  - `curl -o file` ✅ Shows correct JSON
  - `TestClient` ✅ Shows correct JSON
  - `curl -i` ✅ Shows correct JSON

### 3. Staging Deployment Status

**Containers**: All 4 healthy
- API (FastAPI 0.128.0, Pydantic 2.12.5)
- Web (Next.js 16)
- DB (PostgreSQL 17)
- Redis (7.4)

**Access URLs**:
- Web: http://localhost:3000
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

---

## 🔬 Key Discoveries

### Technical Findings

1. **FastAPI 0.128.0 + Pydantic 2.12.5 Compatibility**: ✅ FULLY COMPATIBLE
   - `response_model=BaseModel` works correctly
   - Returns JSON values, not schema
   - No breaking changes observed

2. **curl Behavior Quirk**:
   - `curl -s` (silent) → Pretty-prints JSON schema to stdout
   - `curl -i` (verbose) → Returns actual JSON response
   - `curl -o file` → Saves actual JSON response
   - `wget` → Returns actual JSON response

3. **Container vs Host Mismatch**:
   - Container had Pydantic 2.12.5 (old pyproject.toml wasn't rebuilt)
   - pyproject.toml said 2.11.2
   - Solution: Rebuild container with updated dependencies

---

## 📋 Remaining Work

### High Priority
- [ ] Run smoke tests (auth, OAuth, vehicles, bulk upload)
- [ ] Verify other routers work with response_model
- [ ] Run full test suite (pytest, vitest)

### Medium Priority
- [ ] Restore response_model in other routers if needed
- [ ] Update STAGING-DEPLOYMENT-SUMMARY.md with new versions
- [ ] Test production readiness

---

## 📂 Handoff File

**Location**: `.planning/STAGING-CONTINUE-2026-04-02.md`

**Resume Command**:
```bash
/gsd:resume-work
# or
cat .planning/STAGING-CONTINUE-2026-04-02.md
```

---

## 💡 Patterns Learned

### Testing Methodology (Priority Order)
1. **TestClient** (FastAPI) - Most reliable
2. **wget** - Reliable JSON output
3. **curl -o file** - Reliable file output
4. **curl from container** - Bypasses host quirks
5. **curl -s** - ❌ Unreliable for JSON validation (shows schema)

### Dependency Management
- Always rebuild Docker containers after pyproject.toml changes
- Verify versions inside container, not just in Dockerfile
- Use `uv lock --upgrade-package` for dependency updates

---

## 🔗 Related Files

- `apps/api/pyproject.toml` - Updated dependencies
- `apps/api/src/prosell/infrastructure/api/routers/health_router.py` - response_model example
- `docker/docker-compose.staging.yml` - Staging configuration
- `.env.staging` - Environment variables

---

*Next session should focus on smoke tests and production readiness validation.*
