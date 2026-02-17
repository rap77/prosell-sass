# GGA Workflow - Regla de Oro

**Fecha**: 2026-02-17
**Prioridad**: CRÍTICA

---

## 🚨 REGLA DE ORO

> **SIEMPRE, SIEMPRE arreglar las violaciones que detecte GGA hasta lograr un commit limpio.**

---

## ✅ Workflow CORRECTO

1. **Aplicar cambios**
2. **Stage archivos**: `git add <archivos>`
3. **Intentar commit**: `git commit -m "mensaje"`
4. **GGA detecta violaciones** ❌
5. **NO hacer commit con --no-verify**
6. **Arreglar violaciones**
7. **Repetir desde paso 3** hasta que GGA apruebe ✅
8. **Solo entonces hacer commit**

---

## ❌ Prohibido

- **JAMÁS** usar `git commit --no-verify` para saltar GGA
- **JAMÁS** hacer commit cuando GGA detecta violaciones
- **JAMÁS** asumir "los any types ya existían, no son mi culpa"

---

## 🎯 Mindset Correcto

**Si GGA detecta una violación en los archivos que estás cambiando:**
- Es tu responsabilidad arreglarla
- No importa si el código existía antes
- Si lo tocas, lo arreglas

**Ejemplo:**
```
❌ MAL: "Los `any` types en utils.ts ya existían, no son mi culpa"
✅ BIEN: "Estoy cambiando utils.ts, aprovecho y limpio los `any` types"
```

---

## 📋 Categorías Comunes de Violaciones

### 1. Type Safety (`any` types)
- Reemplazar `any` con `unknown` + type guards
- O usar tipos genéricos apropiados

### 2. React 19 Patterns
- Remover `useCallback`, `useMemo`, `memo`
- React Compiler lo hace automáticamente

### 3. Console Logs
- Reemplazar `console.log/error/warn` con `logger`
- Logger centralizado para Sentry/Axiom

### 4. Code Quality
- Remover código comentado
- Remover imports no usados
- Remover optimizaciones prematuras

---

## 🔧 Si GGA tarda mucho o se stuck

**Opción 1**: Esperar a que termine
```bash
# Ver procesos de GGA
ps aux | grep gga

# Si tarda > 5 min, matar y reintentar
pkill -f "gga run"
git commit -m "mensaje"  # Reintentar
```

**Opción 2**: Limpiar cache de GGA y reintentar
```bash
gga cache clear
git commit -m "mensaje"  # Reintentar con cache limpio
```

**Opción 3**: NO usar --no-verify (solo en emergencias extremas)
```bash
# Solo si GGA está roto, no si falla por violaciones
git commit --no-verify -m "mensaje"
```

---

## 📝 Casos Especiales

### Caso 1: Archivos muy grandes con muchas violaciones
**Problema**: GGA tarda mucho en revisar
**Solución**: Dividir commits en chunks más pequeños
```bash
# Primero: Commits pequeños y enfocados
git commit src/lib/logger.ts -m "feat: add logger wrapper"

# Luego: Otro commit con cambios relacionados
git commit src/stores/authStore.ts -m "refactor: use logger in authStore"
```

### Caso 2: Violaciones en código que NO tocaste
**Problema**: GGA detecta violaciones en archivos que no cambié
**Solución**: Stage solo lo que cambié
```bash
# MAL - Stage todo el archivo
git add src/lib/utils.ts  # Tiene `any` types que no toqué

# BIEN - Stage solo mis cambios específicos
git add -p src/lib/utils.ts  # Interactive patch, elijo solo mis cambios
```

---

## 🎓 Aprendizaje de Sesiones Pasadas

**Session 2026-02-17 - Intento fallido de commit**
- **Error**: Intenté usar `--no-verify` para saltar GGA
- **Lección**: Si GGA detecta violaciones, ARREGLARLAS, no saltarlas
- **Resultado**: Commit rechazado, tuve que revertir y arreglar

---

## ✅ Checklist Antes de Commit

- [ ] Tests pasan: `pnpm vitest run`
- [ ] GGA aprobado: `git commit` sin errores
- [ ] No hay `--no-verify` en el comando
- [ ] Mensaje de commit sigue conventional commits
- [ ] Solo archivos relacionados están staged

---

**Última actualización**: 2026-02-17
**Autor**: rpadron
**Prioridad**: CRÍTICA - Nunca olvidar esta regla
