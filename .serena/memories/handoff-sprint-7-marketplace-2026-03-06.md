# Handoff: Sprint 7+ Marketplace Integration - 2026-03-06

## ESTADO ACTUAL

**Último Sprint Completado**: Sprint 5-6 (Products, Categories, Vehicles) ✅ Mergeado a main

**Próximo Sprint**: Sprint 7+ - Marketplace Integration (Facebook)

**Fecha Handoff**: 2026-03-06

---

## QUÉ SE DECIDIÓ

### 1. Roadmap v3.0 PIVOT APROBADO

✅ Auditoría 7-Brain completada (100% consenso)
✅ Roadmap actualizado: `docs/ROADMAP-PROSELL-SAAS-V3-PIVOT.md`
✅ Prioridad: Marketplace Automation sobre Catálogo Público

**Decisiones Clave**:
- Sprint 7+: Facebook Marketplace Integration (6 semanas)
- Sprint 8.5: Landing temporal (Quick Win, paralelo)
- Sprint 9+: Catálogo Público

---

### 2. Modelo de Negocio CLARIFICADO

**ES SERVICIO GESTIONADO, NO SAAS SELF-SERVICE**:

```
Dealer (entrega inventario)
    ↓
Admin ProSell (carga/valida/scraping)
    ↓
Vendedor ProSell (publica usando SU cuenta Facebook)
    ↓
Facebook Marketplace
    ↓
Leads → Asistente IA → n8n → Odoo (solo si calificado)
```

**Roles**:
- Admin ProSell: Full control
- Manager ProSell: Líder de equipo, dealers asignados
- Vendedor ProSell: Publica, dealers asignados
- Dealer: Solo su inventario (sin leads actualmente)

---

### 3. Modelo de Datos DEFINIDO

**field_config + JSONB (Opción B)** ✅ APROBADO

```python
Category (id, name, parent_id)  # Jerarquía multi-level
FieldConfig (category_id, field_name, field_type, validation_rules)
Product (id, tenant_id, category_id, data=JSONB)
```

**Validación en Backend**: CRÍTICA
**Multi-idioma**: es + en por defecto, escalable

---

### 4. Prioridades Sprint 7+ CONFIRMADAS

**MVP (Sí, va en Sprint 7+)**:
- ✅ Publicación automática en Facebook
- ✅ Scraping automático de webs (dealers con sitios)
- ✅ Dashboard vendedores
- ✅ Dashboard dealers

**POSTERGADO**:
- ⏸️ Webhook Odoo (implementación n8n, pero desarrollo posterior)

---

## QUÉ VIENE EN PRÓXIMA SESIÓN

### Paso 1: Crear Documento de Requisitos

**Archivo**: `docs/REQUIREMENTS-SPRINT-7-MARKETPLACE.md`

**Contenido**:
- Todos los requisitos detallados (10 preguntas + respuestas)
- Modelo de datos definitivo
- Jerarquías de categorías
- Permisos y roles
- Integraciones (n8n, Odoo, Facebook)
- Multi-idioma

### Paso 2: Diseñar Arquitectura Técnica

**Componentes a diseñar**:

1. **Task Queue System** (Redis + Taskiq/Celery)
   - Worker async para publicaciones
   - Retry logic + exponential backoff
   - Dead letter queue

2. **Facebook Integration Layer**
   - OAuth dinámico (cuentas de vendedores ProSell)
   - Graph API client + rate limiting
   - Webhook listener

3. **Scraping System**
   - Detector de cambios diario
   - Scraper incremental (deduplicación)
   - Agentes IA para extracción

4. **Circuit Breakers**
   - Para Facebook API failures
   - Para scraping failures
   - Health checks

5. **Multi-Idioma System**
   - es + en por defecto
   - Maestros multi-idioma
   - Escalable

6. **Asistente IA Vendedor**
   - WhatsApp + Messenger
   - Preguntas al lead
   - Ofrece opciones similares
   - Califica antes de enviar a Odoo

### Paso 3: Setup Técnico Inicial

**Día 1-2**:
```bash
# Instalar Task Queue
cd apps/api
uv add taskiq[redis]

# Crear estructura
src/prosell/infrastructure/tasks/
src/prosell/infrastructure/circuit_breakers/
src/prosell/infrastructure/scraping/
src/prosell/infrastructure/i18n/  # multi-idioma
```

**Día 3-4**:
- Circuit breakers implementation
- Health checks endpoint
- Task queue worker

**Día 5**:
- First task: publicación simple
- Test con staging environment

---

## ARCHIVOS CREADOS EN ESTA SESIÓN

1. ✅ `docs/audit/EXECUTIVE-SUMMARY.md` - Auditoría 7-Brain completa
2. ✅ `docs/audit/brain-*.md` - 7 cerebros análisis detallado
3. ✅ `docs/ROADMAP-PROSELL-SAAS-V3-PIVOT.md` - Roadmap actualizado
4. ✅ `memory/sprint-7-marketplace-requirements-2026-03-06.md` - TODAS las respuestas

---

## PENDIENTE PARA PRÓXIMA SESIÓN

### 1. Recibir Archivos del Usuario

**Archivos que el usuario va a compartir**:
- ⏳ Maestros de Facebook (vehículos) en .json
- ⏳ URLs de sitios web de dealers
- ⏳ Documentación de categorías Facebook (si la encuentra)

### 2. Decisión Técnica: Taskiq vs Celery

**Pregunta para usuario**: ¿Taskiq o Celery?

**Mi recomendación**: Taskiq (async-first, Python 3.13 friendly)

### 3. Setup Staging Environment

**Railway/Vercel/Docker local?** - Pendiente definición

### 4. Facebook App Review

**Iniciar DÍA 1** del Sprint 7+

---

## ESTADO DE DOCUMENTACIÓN

**Completa**:
- ✅ Requisitos de negocio
- ✅ Modelo de datos
- ✅ Roles y permisos
- ✅ Integraciones definidas
- ✅ Multi-idioma
- ✅ Roadmap actualizado

**Pendiente**:
- ⏳ Requisitos técnicos detallados (crear en próxima sesión)
- ⏳ Arquitectura de componentes (crear en próxima sesión)
- ⏳ Diagramas de secuencias (crear en próxima sesión)

---

## COMANDOS ÚTILES PRÓXIMA SESIÓN

```bash
# Activar Serena
mcp__serena__activate_project project="/home/rpadron/proy/prosell-sass"

# Listar memorias
mcp__serena__list_memories

# Leer memoria Sprint 7
mcp__serena__read_memory memory_file_name="sprint-7-marketplace-requirements-2026-03-06.md"

# Leer memoria handoff
mcp__serena__read_memory memory_file_name="handoff-sprint-7-marketplace-2026-03-06.md"
```

---

## NOTAS IMPORTANTES

1. **NO asumir SaaS self-service** - Es servicio gestionado
2. **field_config + JSONB es la decisión** - No cambiar
3. **Multi-idioma es obligatorio** - es + en desde el inicio
4. **Scraping es OBLIGATORIO** para dealers con sitios web
5. **Asistente IA es parte del flujo** - No es opcional
6. **Validación ANTES de DB** - No antes de Facebook
7. **Odoo es solo CRM** - ProSell es fuente de verdad
8. **Dealers sin cuenta siguen existiendo** - No obligar registro

---

**Próximo paso**: Crear `REQUIREMENTS-SPRINT-7-MARKETPLACE.md` con TODO documentado
