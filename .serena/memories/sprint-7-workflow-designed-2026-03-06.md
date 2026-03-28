# Sprint 7+ Marketplace - Workflow Designed

**Fecha**: 2026-03-06
**Status**: ✅ DESIGN COMPLETE - READY FOR IMPLEMENTATION
**Sprint**: 7+ (Marketplace Integration - Facebook)

---

## Resumen Ejecutivo

Sprint 7+ es **CRÍTICO** para evitar "muerte por éxito" del negocio. Sin automatización, el negocio colapsará bajo carga operacional.

**Decisiones Clave Tomadas**:
1. ✅ **Enfoque**: Ramas por fase + PRPs por fase (Opción B) - Small batches, fail fast
2. ✅ **Arquitectura**: Task Queue + Multi-Idioma primero (PRP 1)
3. ✅ **Publicación**: Híbrida Playwright → Graph API (unblocks inmediato)
4. ✅ **Testing**: Pyramid strategy (Unit >80%, Integration >70%, E2E críticos)
5. ✅ **Duración**: 7 semanas (7 PRPs × 1 semana cada uno)

---

## Documentación Creada

### Design Document
- ✅ `docs/plans/2026-03-06-sprint7-workflow-design.md` - Flujo de trabajo completo

### PRPs Creados (3 de 7)

| # | PRP | Estado | Archivo |
|---|-----|-------|--------|
| **1** | Task Queue + Multi-Idioma | ✅ CREADO | `PRPs/sprint-7-phase1-taskqueue-prp.md` |
| **2** | Facebook OAuth | ✅ CREADO | `PRPs/sprint-7-phase2-facebook-oauth-prp.md` |
| **3** | Graph API + Playwright (Híbrido) | ✅ CREADO | `PRPs/sprint-7-phase3-graphapi-playwright-prp.md` |
| **4** | Scraping System | ⏳ Pendiente | `PRPs/sprint-7-phase4-scraping-prp.md` |
| **5** | Dashboards + Leads | ⏳ Pendiente | `PRPs/sprint-7-phase5-dashboards-prp.md` |
| **6** | Asistente IA + n8n/Odoo | ⏳ Pendiente | `PRPs/sprint-7-phase6-ai-assistant-prp.md` |
| **7** | Integration + Testing | ⏳ Pendiente | `PRPs/sprint-7-phase7-integration-prp.md` |

---

## Resumen de PRPs Creados

### PRP 1: Task Queue + Multi-Idioma

**Objetivo**: Implementar sistema de tareas asíncronas + infraestructura multi-idioma

**Componentes**:
- Taskiq (preferred) o Celery (fallback) - Spike valida cuál funciona
- Redis broker + worker setup
- Circuit breakers (Facebook API failures)
- Health checks (`/health/integrations`)
- Multi-idioma infrastructure (es + en)
- `MultiLanguageString` value object
- Translator service + locale files

**Duration**: 5-7 días
**Approach**: Spike → Standard

### PRP 2: Facebook OAuth

**Objetivo**: Permitir que vendedores conecten sus cuentas de Facebook

**Componentes**:
- Facebook OAuth 2.0 flow (server-side)
- Token encryption at rest (AES-256)
- Token auto-refresh (48h before expiry)
- Facebook pages discovery
- Webhook handling (permission revocation)

**Duration**: 5-7 días
**Approach**: Spike → Standard

**Entidades**:
- `FacebookAccount` - Cuenta conectada del vendedor
- `FacebookPage` - Páginas de Facebook del vendedor

### PRP 3: Graph API + Playwright (Híbrido)

**Objetivo**: Publicar en Facebook Marketplace con estrategia híbrida

**Estrategia Híbrida**:
1. **Playwright** (PRIMARIO en Sprint 7) - Browser automation
2. **Graph API** (SECUNDARIO post-sprint) - API oficial

**Por qué híbrido**: Playwright unblocks inmediato (sin App Review), Graph API prepara futuro robusto

**Componentes**:
- `PlaywrightFBPublisher` - Browser automation con anti-detection
- `FacebookGraphAPIClient` - API oficial client
- `HybridFacebookPublisher` - Unificado con fallback automático
- `TokenBucketRateLimiter` - Rate limiting (200 calls/hour)
- Circuit breaker - Previene fallos en cascada

**Anti-Detection (Playwright)**:
- User-Aleatorios reales (Chrome, Safari, Firefox)
- Viewports realistas (1920x1080, 1366x768)
- Delays humanos (2-5 segundos entre acciones)
- Typing character-by-character (50-150ms)
- Mouse movement curvas Bezier
- Session persistence (cookies)
- Locale es-ES, timezone Argentina

**Duration**: 7-10 días
**Approach**: Spike → Standard

---

## Decisiones Arquitectónicas Clave

| # | Decisión | Justificación |
|---|----------|---------------|
| 1 | **OPCIÓN B**: Fases + PRPs | Small batches, fail fast, aprendizaje validado |
| 2 | **Task Queue** en PRP 1 | Foundation para todo async work |
| 3 | **Híbrido Playwright/Graph API** | No bloqueado por App Review |
| 4 | **Multi-Idioma** en PRP 1 | Cross-cutting concern, afecta todo |
| 5 | **UX primero** para Dashboards | No rework UI posterior |
| 6 | **Spikes** para unknowns | Mitiga riesgo técnico temprano |

---

## Comandos Útiles

### Activar Serena
```bash
mcp__serena__activate_project project="/home/rpadron/proy/prosell-sass"
mcp__serena__list_memories
```

### Leer Memorias Sprint 7
```bash
# Handoff completo
mcp__serena__read_memory memory_file_name="sprint-7-workflow-designed-2026-03-06.md"

# Requisitos
mcp__serena__read_memory memory_file_name="sprint-7-marketplace-requirements-2026-03-06.md"

# Handoff anterior
mcp__serena__read_memory memory_file_name="handoff-sprint-7-marketplace-2026-03-06.md"
```

### Ver Documentación
```bash
# Design doc
cat docs/plans/2026-03-06-sprint7-workflow-design.md

# PRPs creados
ls PRPs/
```

---

## Próximos Pasos

1. **Implementar PRP 1** (Task Queue + Multi-Idioma)
   - Spike: Taskiq vs Celery (2 días)
   - Implementación: 3-5 días
   - Testing + deploy: 2 días

2. **Crear PRPs restantes** (4-7)
   - PRP 4: Scraping System
   - PRP 5: Dashboards + Leads
   - PRP 6: Asistente IA + n8n/Odoo
   - PRP 7: Integration + Testing

3. **Seguir orden de dependencies**
   - PRP 1 → PRP 2 → PRP 3 → PRP 4
   - PRP 5 depende de 2, 3, 4
   - PRP 6 depende de 5
   - PRP 7 depende de todos

---

## Fechas Clave

- **2026-03-06**: Design completo, 3 PRPs creados
- **Estimado inicio Sprint 7**: Mar 10, 2026 (Día 1)
- **Estimado fin Sprint 7**: Abr 28, 2026 (7 semanas)

---

## Notas Importantes

- **NO es SaaS self-service** - Es servicio gestionado
- **Multi-idioma es obligatorio** - es + en desde el inicio
- **field_config + JSONB** - Modelo de datos decisión tomada
- **Scraping es OBLIGATORIO** - Para dealers con sitios web
- **Playwright es PRIMARY** durante Sprint 7, Graph API después

---

**Estado**: ✅ Ready for implementation
**Próximo paso**: Revisar PRP 1 con usuario o continuar generando PRPs 4-7
