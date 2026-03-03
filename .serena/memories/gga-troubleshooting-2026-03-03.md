# GGA Troubleshooting - Configuration Debugged

**Fecha**: 2026-03-03
**Prioridad**: CRÍTICA - NO cambiar esta configuración

---

## 🔧 Configuración Correcta

### Archivo: `apps/api/.gga`

```bash
# File containing code review rules (relative to project root)
RULES_FILE="../../AGENTS.md"
```

**IMPORTANTE**: El path `../../AGENTS.md` es CORRECTO porque:
- El working directory de git es `/home/rpadron/proy/prosell-sass/apps/api`
- Desde ahí, `../../AGENTS.md` apunta a `/home/rpadron/proy/prosell-sass/AGENTS.md`
- **NO cambiar a `../AGENTS.md`** - eso apunta a un archivo inexistente

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: GGA falla con exit code 1 sin output claro

**Síntoma**: `ℹ️  Sending to claude for review...` y no muestra más

**Causa**: Archivos incorrectos staged (memory files, screenshots, generated files)

**Solución**:
```bash
# Ver qué archivos están staged
git status --short

# Si ves archivos como .serena/, screenshots/, next-env.d.ts - resetear
git reset

# Agregar SOLO los archivos relevantes
git add <archivos del PRP/fix>

# Reintentar GGA
git commit -m "mensaje"
```

**Archivos que NUNCA deben estar staged para GGA**:
- `.serena/memories/` - memory files
- `tests/e2e/screenshots/` - PNGs
- `tests/e2e/.auth/` - auth state
- `apps/web/next-env.d.ts` - generated
- `*.png`, `*.jpg` - imágenes

---

### Problema 2: Cache invalidado

**Síntoma**: `Cache validity: Invalid (rules or config changed)`

**Solución**:
```bash
gga cache clear
git commit -m "mensaje"
```

---

### Problema 3: GGA timeout (problema conocido)

**Workaround** (SOLO si GGA está realmente roto, no si encuentra violaciones):
```bash
git commit --no-verify -m "mensaje"
```

**PERO** según `gga-workflow-regla-de-oro.md`:
- ❌ NUNCA usar --no-verify para saltar violaciones
- ✅ Solo usar si GGA está roto (timeout, crash)

---

## 📋 Checklist Antes de Commit

1. **Solo archivos relevantes staged**:
   ```bash
   git status --short  # Revisar lista
   # Si hay archivos extra: git reset + git add <solo los correctos>
   ```

2. **Tests pasan**:
   ```bash
   cd apps/api && uv run pytest tests/unit/ -q
   pnpm test  # Frontend
   ```

3. **GGA corre sin timeout**:
   ```bash
   git commit -m "mensaje"
   # Si se cuelga > 2 min: Ctrl+C, revisar staged files, reintentar
   ```

---

## 🎯 Lecciones Aprendidas

### Session 2026-03-03 - "Fix" incorrecto del path

- **Error**: Cambié `RULES_FILE="../../AGENTS.md"` a `../AGENTS.md`
- **Razón**: Pensé que el path estaba mal sin verificar足够
- **Resultado**: GGA dejó de funcionar completamente
- **Solución**: Revertí al path original `../../AGENTS.md`
- **Lección**: **NO CAMBIAR la configuración sin verificar contra commits anteriores**

### Cómo verificar configuración correcta:

```bash
# Ver config de un commit donde GGA funcionó
git show <commit>:apps/api/.gga

# Comparar con config actual
diff <(git show <commit>:apps/api/.gga) apps/api/.gga
```

---

## 🔄 Workflow Correcto

1. Hacer cambios
2. `git add <archivos relevantes>` - SOLO los archivos del fix/feature
3. `git status --short` - VERIFICAR que no haya archivos extra
4. `git commit -m "mensaje"` - GGA corre automáticamente
5. Si GGA encuentra violaciones → ARREGLARLAS (no --no-verify)
6. Si GGA timeout → revisar staged files, limpiar cache, reintentar
7. Solo cuando GGA apruebe → commit se crea

---

**Última actualización**: 2026-03-03
**Autor**: rpadron + Claude Code
**Prioridad**: CRÍTICA - Nunca olvidar esta configuración
