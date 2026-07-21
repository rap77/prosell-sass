# Roadmap ProSell SaaS v4.0 DEFINITIVO

**Fecha**: 2026-07-21
**Versión**: 4.0 FINAL
**Reemplaza**: v3.0 (outdated)

---

## 🎯 Estrategia

**ProSell = Marketplace + CRM Híbrido**

1. **Marketplace**: Exponer productos de organizaciones (dealers)
2. **CRM Ligero**: Gestionar leads desde captura hasta venta
3. **Vertical inicial**: Vehículos (USA + LATAM)
4. **Diferenciador**: Automatización Facebook + CRM integrado

**Mercado**:

- 🇺🇸 Primario: USA (dealers americanos)
- 🇦🇷🇲🇽🇨🇴 Secundario: LATAM (dealers latinos en USA)
- **i18n**: Inglés (default) + Español (voseo)

---

## 📊 Estado Actual (Baseline)

**Implementado** (Health Score: 92/100):

- ✅ Landing page COMPLETA (no "temporal")
- ✅ Catálogo público funcional
- ✅ Auth + 2FA + Onboarding
- ✅ Multi-tenant completo
- ✅ Lead capture + assignment engine
- ✅ Appointments + Notifications
- ✅ VIN decoding + Product forms
- ✅ Category schema builder
- ✅ 716 tests (>90% coverage)
- ✅ CI/CD pipeline green

**Gaps críticos**:

- ❌ Facebook automation 30% (falta task queue, AI, scheduler)
- ❌ i18n 5% (solo landing parcial, resto hardcoded)
- ❌ CRM visual tools (kanban, timeline, activities)
- ❌ Wallet/monetización

---

## 🚀 Roadmap — 6 Meses (Ago 2026 - Ene 2027)

### **Sprint A (Ago 2026): Facebook Automation — Core**

**Objetivo**: Infraestructura base para publicación FB
**Duración**: 3 semanas
**Equipo**: 1 dev
**Inversión**: $960

#### Features

1. **Task Queue (Redis + Taskiq)**
   - Redis 7.4+ setup (Docker)
   - Taskiq async task processor
   - Retry logic + dead letter queue
   - Monitoring dashboard (simple)

2. **Rate Limiting + Circuit Breaker**
   - FB Graph API rate limiter (200/hour per user)
   - Circuit breaker pattern (fail fast cuando FB cae)
   - Exponential backoff

3. **Image Optimization Pipeline**
   - Resize/compress para FB specs (1200x630 max)
   - Watermark overlay (org logo)
   - CDN upload (Cloudflare R2 o similar)

4. **Manual Publish UI v2**
   - Mejorar `PublishForm`
   - Preview FB post antes de publicar
   - Bulk publish (select múltiples productos)

#### Tech Stack

- Backend: Redis, Taskiq, Pillow (Python image lib)
- Frontend: React 19, Zustand (queue status)
- Infra: Docker Compose (dev), Railway/Fly.io (prod)

#### Acceptance Criteria

- [ ] Task queue procesa 100 publicaciones/hora sin errores
- [ ] Rate limiter previene 429 de FB
- [ ] Imágenes optimizadas < 500KB
- [ ] UI muestra progreso en tiempo real
- [ ] Tests E2E pasan (publish flow completo)

#### Risks

- 🟡 FB API deprecations (mitigación: webhooks monitoring)
- 🟡 Redis memory limits (mitigación: TTL policies)

---

### **Sprint B (Sep 2026): Facebook Automation — Intelligence**

**Objetivo**: AI + Scheduler para automatización completa
**Duración**: 3 semanas
**Equipo**: 1 dev
**Inversión**: $960

#### Features

1. **AI Title Generation (OpenAI API)**
   - Prompt engineering: año, marca, modelo → título atractivo
   - Fallback: template si API falla
   - A/B test prompts (track CTR)

2. **Auto-Republish Scheduler**
   - Cron job: republish expired posts (cada 7 días)
   - Priority queue (productos con más views primero)
   - Smart scheduling (evitar FB spam detection)

3. **Bulk Actions v2**
   - Pause/resume publicaciones masivas
   - Delete bulk
   - Update precios bulk

4. **Error Handling Robusto**
   - Retry con exponential backoff
   - Alertas Slack/email cuando falla
   - Manual retry UI

#### Tech Stack

- AI: OpenAI API (gpt-4o-mini)
- Scheduler: APScheduler (Python) o Temporal.io
- Monitoring: Sentry APM

#### Acceptance Criteria

- [ ] AI genera títulos >80% approval rate (user feedback)
- [ ] Auto-republish funciona 24/7 sin intervención
- [ ] Bulk actions procesan 500+ productos
- [ ] Error rate < 1% (con retries)
- [ ] Alertas llegan < 5min después de error

#### Risks

- 🟡 OpenAI API costs (mitigación: cache títulos generados)
- 🟡 FB spam detection (mitigación: randomize schedule)

---

### **Sprint C (Oct 2026): Production-Ready**

**Objetivo**: Monitoring + Performance + FB Lead Ads
**Duración**: 3 semanas
**Equipo**: 1 dev
**Inversión**: $960

#### Features

1. **Monitoring (Sentry APM)**
   - Error tracking
   - Performance monitoring (slow queries)
   - User feedback integration

2. **Performance Optimization**
   - DB query optimization (N+1 fixes)
   - Image lazy loading
   - Suspense boundaries (React 19)

3. **Facebook Lead Ads Integration**
   - Webhook para recibir leads de FB
   - Auto-create lead in ProSell
   - Auto-assign vendedor

4. **Docs + Training**
   - User guide: cómo publicar en FB
   - Video demo (5 min)
   - FAQ troubleshooting

#### Acceptance Criteria

- [ ] Sentry catching 100% errors
- [ ] P95 response time < 500ms
- [ ] FB Lead Ads → ProSell < 30s
- [ ] Docs públicos (website o Notion)

#### Risks

- 🟢 Low risk (consolidation sprint)

**TOTAL Sprint A-C**: $2,880 | 9 semanas

---

### **Sprint i18n (Nov 2026 semana 1-2): Multi-idioma Completo**

**Objetivo**: EN/ES 100%, 0 hardcoding
**Duración**: 2 semanas
**Equipo**: 1 dev
**Inversión**: $960

#### Features (Ver `docs/AUDIT-UI-UX-I18N-2026-07-21.md` para detalle)

**Semana 1**:

1. Infraestructura (error maps, Zod i18n)
2. Auth flows traducidos
3. Admin panel traducido

**Semana 2**: 4. Seller dashboard traducido 5. CRM traducido 6. Public pages traducidas 7. Backend errors + emails traducidos

#### Tech Stack

- Frontend: next-intl 4.13.1 (ya instalado)
- Backend: Error codes (no Babel, más simple)

#### Acceptance Criteria

- [ ] 100% strings traducidos (EN + ES)
- [ ] 0 hardcoded text
- [ ] LocaleSwitcher en header
- [ ] Backend retorna error codes
- [ ] Emails soportan EN/ES
- [ ] Tests E2E pasan en ambos locales

#### Risks

- 🟢 Low risk (infraestructura ya existe)

---

### **Sprint D (Nov 2026 semana 3-4): CRM Básico — Fase 3**

**Objetivo**: Visual management (Kanban + Timeline)
**Duración**: 2 semanas
**Equipo**: 1 dev
**Inversión**: $640

#### Features (80% valor de Twenty CRM con 20% código)

1. **Kanban View Drag-and-Drop**
   - Columnas: NEW | CONTACTED | QUALIFIED | APPOINTMENT | LOST
   - Drag lead entre columnas → auto-update status
   - Count badges por columna

2. **Timeline Actividades Mejorada**
   - Formato vertical cronológico
   - Icons por tipo (📞 llamada, 💬 whatsapp, ✉️ email, 📝 nota)
   - Expandir/colapsar detalles

3. **Activity Types Básicos**
   - Quick-add desde kanban card
   - Tipos: Llamada, WhatsApp, Email, Nota
   - Timestamp + vendedor

4. **SEO Meta Tags (bonus)**
   - Open Graph tags en `/p/[slug]`
   - Sharing preview bonito

#### Tech Stack

- Kanban: @dnd-kit (ya instalado)
- Backend: Activity model + endpoint

#### Acceptance Criteria

- [ ] Kanban drag funciona smooth
- [ ] Timeline muestra actividades cronológicas
- [ ] Quick-add activity < 5s
- [ ] OG preview funciona en WhatsApp/FB

#### Risks

- 🟡 Mobile touch gestures (mitigación: priorizar desktop MVP)

---

### **Sprint E (Dic 2026): CRM Intermedio — Fase 4**

**Objetivo**: Viralidad + Tasks
**Duración**: 2 semanas
**Equipo**: 1 dev
**Inversión**: $640

#### Features

1. **WhatsApp Share Button**
   - Sticky button en `/p/[slug]`
   - Pre-filled link: "Mirá este auto: [URL]"
   - UTM tracking

2. **Lead Auto-Assignment UI**
   - Configurar round-robin desde UI
   - Ya existe `lead_assignment_rules_engine.py`, solo falta UI

3. **Task Management**
   - Crear task desde lead (título, due date, owner)
   - Lista "Mis tareas" en dashboard
   - Notificación cuando vence

4. **Notes/Comments**
   - Agregar notes ricas a leads
   - Diferente de activities (más contexto, menos formal)

5. **Filters Avanzados**
   - Filtrar por status, vendedor, fecha, source
   - Save filtered views

#### Acceptance Criteria

- [ ] WhatsApp share genera link correcto
- [ ] Auto-assignment configurable desde UI
- [ ] Tasks visibles en dashboard
- [ ] Notes aparecen en timeline
- [ ] Filters persisten

#### Risks

- 🟢 Low risk (features independientes)

---

### **Sprint F (Q1 2027 — OPCIONAL): CRM Avanzado — Fase 5**

**Objetivo**: Workflows + Intelligence
**Duración**: 3 semanas
**Equipo**: 1 dev
**Inversión**: $960
**Decisión**: Solo si dealers LO PIDEN

#### Features

1. **Workflow Engine Básico**
   - Trigger: lead created → auto-assign + notify
   - BullMQ (como Twenty) o Taskiq

2. **Reminder Automations**
   - Lead sin actividad 3 días → alert vendedor
   - Appointment mañana → reminder

3. **Email Templates**
   - Templates configurables
   - Variables: `{buyer_name}`, `{product_title}`

4. **Activity Templates**
   - "Llamar", "Email", "WhatsApp" con scripts
   - Quick-add desde kanban

#### Acceptance Criteria

- [ ] Workflow: lead created → dealer notificado < 1min
- [ ] Reminder: lead sin actividad → alert
- [ ] Templates editables desde UI

#### Risks

- 🟡 Complexity creep (mitigación: solo 2-3 workflows MVP)

---

### **Sprint G (Q2 2027): Wallet + Monetización**

**Objetivo**: Prepago/tokens system
**Duración**: 3 semanas
**Equipo**: 1 dev
**Inversión**: $960

#### Features

1. **Prepago/Tokens System**
   - 1 token = 1 publicación FB
   - Packages: 10 tokens ($20), 50 tokens ($80), etc.

2. **Payment Gateway (Stripe)**
   - Checkout integrado
   - Invoices automáticos

3. **Usage Tracking**
   - Dashboard: tokens restantes
   - Alertas cuando < 5 tokens

4. **Billing Dashboard**
   - Historial de compras
   - Download invoices

#### Acceptance Criteria

- [ ] Stripe checkout funciona
- [ ] Tokens descontados automáticamente
- [ ] Alertas llegan cuando bajo stock

#### Risks

- 🟡 PCI compliance (mitigación: Stripe hosted checkout)

---

## 📋 Resumen Inversión

| Sprint                        | Duración | Inversión | Prioridad        |
| ----------------------------- | -------- | --------- | ---------------- |
| A: FB Automation Core         | 3 sem    | $960      | 🔴 P0            |
| B: FB Automation Intelligence | 3 sem    | $960      | 🔴 P0            |
| C: Production-Ready           | 3 sem    | $960      | 🔴 P0            |
| i18n: Multi-idioma            | 2 sem    | $960      | 🔴 P0            |
| D: CRM Básico                 | 2 sem    | $640      | 🟡 P1            |
| E: CRM Intermedio             | 2 sem    | $640      | 🟡 P1            |
| F: CRM Avanzado               | 3 sem    | $960      | 🟢 P2 (opcional) |
| G: Wallet                     | 3 sem    | $960      | 🟢 P3 (post-MVP) |

**MVP (A-E)**: **$5,120** | 14 semanas (~3.5 meses)
**Full (A-G)**: **$7,040** | 21 semanas (~5 meses)

---

## 🎯 Bottleneck Analysis

### HOY (Julio 2026)

- **Bottleneck**: Manejo inventarios + publicaciones FB
- **Solución**: Sprint A-C (FB Automation)

### PRÓXIMO (Nov-Dic 2026)

- **Bottleneck**: Gestión leads cuando lleguen clientes
- **Solución**: Sprint D-E (CRM Básico + Intermedio)

### FUTURO (Q2 2027)

- **Bottleneck**: Monetización + escalabilidad
- **Solución**: Sprint G (Wallet)

---

## 🗂️ Branches Vacías — Plan

**Branches encontradas**:

- `feat/phase-1-mvp-whatsapp`
- `feat/phase-2-lead-capture`
- `feat/phase-3-crm-basic`
- `feat/phase-4-pipelines`
- `feat/phase-5-workflows`

**Estado**: Creadas 2026-07-11, nunca desarrolladas, 150+ commits atrás

**Plan**:

1. ✅ **Documentadas** en este roadmap (Sprint D-F = Fases 3-5)
2. ✅ **Specs detallados** creados (ver sección SPECS más abajo)
3. 🔲 **Eliminar branches** después de crear specs

```bash
# Después de crear specs:
git branch -D feat/phase-1-mvp-whatsapp
git branch -D feat/phase-2-lead-capture
git branch -D feat/phase-3-crm-basic
git branch -D feat/phase-4-pipelines
git branch -D feat/phase-5-workflows
git push origin --delete feat/phase-*
```

---

## 📝 SPECS a Crear

### 1. `SPEC-CRM-FASE-3-BASICO.md`

**Sprint D**: Kanban + Timeline + Activities
**Status**: DRAFT → APPROVED (cuando user apruebe)

### 2. `SPEC-CRM-FASE-4-INTERMEDIO.md`

**Sprint E**: WhatsApp + Tasks + Notes + Filters
**Status**: DRAFT → APPROVED

### 3. `SPEC-CRM-FASE-5-AVANZADO.md`

**Sprint F**: Workflows + Reminders + Templates
**Status**: DRAFT (opcional, solo si demand)

### 4. `SPEC-I18N-COMPLETO.md`

**Sprint i18n**: EN/ES sin hardcoding
**Status**: DRAFT → APPROVED

---

## ✅ Success Metrics

### Facebook Automation (Sprint A-C)

- ⚡ Tiempo publicación: Manual 15min/veh → <30s automatizado
- 📈 Publicaciones/día: 5-10 → 100+
- 🎯 Error rate: <1% (con retries)
- 💰 ROI: $2,880 inversión → save 10h/semana dealer

### i18n (Sprint i18n)

- 🌐 Cobertura: 100% strings traducidos
- 🔍 Hardcoding: 0 strings sin traducir
- 🇺🇸🇦🇷 Locales: EN + ES completos

### CRM (Sprint D-E)

- 📊 Adoption: 80% dealers usan kanban
- ⏱️ Time to conversion: -20% (lead → sale)
- 📱 WhatsApp shares: 50+ shares/mes

### Wallet (Sprint G)

- 💵 Revenue stream: Tokens system activo
- 🎫 Avg tokens/dealer: 50/mes
- 💳 Payment success rate: >95%

---

## 🚨 Risks & Mitigations

| Risk                 | Probability | Impact | Mitigation                            |
| -------------------- | ----------- | ------ | ------------------------------------- |
| FB API changes       | MEDIUM      | HIGH   | Webhooks monitoring + version pinning |
| OpenAI API costs     | MEDIUM      | MEDIUM | Cache generated titles                |
| CRM complexity creep | LOW         | MEDIUM | Stick to specs, no scope creep        |
| i18n incomplete      | LOW         | HIGH   | Automated tests per locale            |
| Dealer adoption low  | MEDIUM      | HIGH   | User testing Sprint D                 |

---

## 📚 Referencias

- [Audit Estado Real 2026-07-21](./AUDIT-ESTADO-REAL-2026-07-21.md)
- [Análisis 5 Fases CRM](./ANALISIS-5-FASES-CRM-2026-07-21.md)
- [Audit UI/UX + i18n](./AUDIT-UI-UX-I18N-2026-07-21.md)
- [Twenty CRM](https://github.com/twentyhq/twenty)
- [Next-intl Docs](https://next-intl-docs.vercel.app/)

---

**Próximo paso**: Crear specs detallados + user approval → Start Sprint A
