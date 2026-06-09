# Brain #1 - Product Strategy Analysis

**Phase**: 08 - Layout Shell + Vehicle Management
**Date**: 2026-03-26
**Status**: ⚠️ **Concerns**

---

## Executive Summary

El CONTEXT.md de Phase 8 está **bien alineado** con las necesidades del producto, pero existen **3 ajustes recomendados** antes de proceder al planning:

1. **Mover Bulk Upload al MVP** (no Wave 2)
2. **Redefinir North Star** hacia "Time to First Published"
3. **Aclarar Status de Publicación** con confirmación de portales externos

---

## Detailed Analysis

### 1. OKR Alignment ⚠️ **Concerns**

**Current**: "Reducir tiempo de carga de inventario de 15 min a 3 min"
**Issue**: Es una métrica de **eficiencia operativa**, no de activación.

**Recommendation**: Cambiar a **"Time to First Published Vehicle"** como North Star para retención inicial.

### 2. Wave Strategy ⚠️ **Concerns**

**Current**: MVP (Single Vehicle) → UAT (Bulk + Cmd+K) → Premium (Advanced Roles)

**Issue**: Al ser B2B para dealers, **Bulk Upload es el verdadero diferenciador**. Limitar MVP a Single Vehicle corre riesgo de no validar hipótesis de valor.

**Recommendation**: Mover **Bulk Upload simplificado** al MVP.

### 3. Build Trap Risk ✅ **Validated**

El foco en UI premium (MagicUI, Cmd+K) está **mitigado** porque en este mercado B2B, **la UI es parte del outcome** — reduce carga cognitiva en entorno de alta velocidad.

### 4. Priority Gaps

| Gap                             | Priority | Rationale                                                                              |
| ------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| **Vehicle Status Visibility**   | P0       | Adición Crítica del Brain #1 — sin badges (Online/Vendido) el DataGrid pierde utilidad |
| **Mobile Camera Direct Upload** | P0       | Vital para sellers que caminan el lot — money-generating action                        |
| **Analytics en DataGrid**       | P1/P2    | Diferencial para Manager, vanity metric para Seller básico                             |

### 5. Cmd+K Over-engineering ✅ **Validated**

Para <20 autos es over-engineering en búsqueda, pero **escalable** y necesario como Omnibar para saltar entre sucursales (Org Switcher).

### 6. Missing Features

**Falta visibilidad sobre sincronización con Marketplaces externos** (Facebook, MercadoLibre). El status "Online" es vago sin especificar _dónde_ está publicado.

---

## Specific Issues

### Issue #1: North Star Desalineado (P0)

**Descripción**: Foco en "eficiencia" ignora el momento de activación.

**Impacto**: Usuarios pueden no ver valor inmediato → churn temprano.

**Fix**: Priorizar "Time to First Published Vehicle" para asegurar activación.

### Issue #2: Exclusión de Bulk Upload en MVP (P1)

**Descripción**: MVP de carga individual puede percibirse como "amateur".

**Impacto**: Competencia con bulk upload gana.

**Fix**: Incluir versión simplificada de bulk en Wave 1.

### Issue #3: Ambigüedad en Status de Publicación (P1)

**Descripción**: Badges de colores deben reflejar confirmación de portales externos.

**Impacto**: Status "Online" sin confirmación externa no es confiable.

**Fix**: Agregar indicador de "Publicado en: FB/ML/etc."

---

## Recommendation

**⚠️ Proceder a planning con ajustes menores.**

No hay product blockers totales, pero se recomienda:

1. Mover Bulk Upload al MVP (o versión simplificada)
2. Redefinir North Star hacia velocidad de publicación
3. Aclarar status de publicación con confirmación externa

El stack técnico (FastAPI/React 19) está listo para soportar esta carga.
