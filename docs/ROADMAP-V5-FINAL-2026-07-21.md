# Roadmap ProSell SaaS v5.0 FINAL (Mobile-First + Multi-Canal)

**Fecha**: 2026-07-21
**Versión**: 5.0 FINAL
**Reemplaza**: v4.0 (faltaban mobile-first + video + multi-cuenta + multi-canal + AI agent)

---

## 🎯 Estrategia

**ProSell = Marketplace + CRM Híbrido Multi-Canal**

1. **Marketplace**: Exponer productos de organizaciones (dealers)
2. **CRM Multi-Canal**: Gestionar leads desde captura (FB Messages + WhatsApp) hasta venta
3. **Mobile-First**: Dealers suben fotos/videos desde móvil (herramienta primordial)
4. **Vertical inicial**: Vehículos (USA + LATAM)
5. **Diferenciador**: Automatización Facebook + CRM multi-canal + AI agent futuro

**Mercado**:

- 🇺🇸 Primario: USA (dealers americanos)
- 🇦🇷🇲🇽🇨🇴 Secundario: LATAM (dealers latinos en USA)
- **i18n**: Inglés (default) + Español (voseo)
- **Device-first**: Mobile → Desktop (dealers usan móvil para upload diario)

---

## 📊 Estado Actual (Baseline)

**Implementado** (Health Score: 92/100):

- ✅ Landing page COMPLETA
- ✅ Catálogo público funcional
- ✅ Auth + 2FA + Onboarding
- ✅ Multi-tenant completo
- ✅ Lead capture + assignment engine
- ✅ Appointments + Notifications
- ✅ VIN decoding + Product forms
- ✅ 716 tests (>90% coverage)
- ✅ CI/CD pipeline green

**Gaps CRÍTICOS**:

- ❌ **Mobile NO optimizado** (componentes no se ajustan, upload desde móvil imposible)
- ❌ **Video soporte** (solo imágenes, FB Marketplace permite videos)
- ❌ **Multi-cuenta Facebook** (arquitectura single-account, necesita multi per org)
- ❌ **CRM multi-canal** (solo captura form, falta FB Messages + WhatsApp)
- ❌ Facebook automation 30% (falta task queue, AI, scheduler)
- ❌ i18n 5% (solo landing parcial)
- ❌ CRM visual tools (kanban, timeline)
- ❌ AI agent (auto-responder leads)

---

## 🚀 Roadmap — 7 Meses (Ago 2026 - Feb 2027)

### **Sprint 0 (Ago 2026 semana 1): Mobile-First Foundation** 🔴 P0 CRÍTICO

**Objetivo**: Hacer plataforma 100% funcional en móvil
**Duración**: 1 semana
**Equipo**: 1 dev
**Inversión**: $320

#### Problema Actual

- Admin tables sin horizontal scroll (overflow hidden)
- Sidebar no colapsa en mobile
- Forms largos (UnifiedProductForm) no optimizados
- Kanban no funciona touch
- Upload fotos desde móvil NO funciona
- **Dealers NO PUEDEN usar la app desde móvil** → Blocker total

#### Features

1. **Responsive Audit + Fixes**
   - Admin tables: horizontal scroll + sticky columns
   - Sidebar: hamburger menu mobile
   - Forms: split en pasos mobile (wizard)
   - Bottom nav mobile (reemplaza sidebar)

2. **Mobile Upload Optimization**
   - Camera API nativa (take photo directo)
   - File input optimizado móvil
   - Compress before upload (client-side)
   - Progress indicator upload

3. **Touch Gestures**
   - Swipe actions (delete, edit)
   - Pull-to-refresh
   - Touch-friendly buttons (min 44px)

4. **PWA Setup Básico**
   - manifest.json
   - Service worker cache estático
   - Add to home screen prompt

#### Tech Stack

- React 19 responsive hooks
- Framer Motion (gestures)
- next-pwa (PWA)
- Browser APIs: Camera, File

#### Acceptance Criteria

- [ ] Admin panel funcional 100% en iPhone/Android
- [ ] Upload foto desde móvil funciona
- [ ] Forms completables en mobile
- [ ] Touch gestures funcionan
- [ ] PWA instalable

#### Risks

- 🟡 Safari bugs (mitigación: test en iOS real)
- 🟡 Android fragmentation (mitigación: test Android 12+)

---

### **Sprint A (Ago 2026 sem 2-4): Facebook Automation — Core + Multi-Account + Video**

**Objetivo**: Infraestructura FB con multi-cuenta + soporte video
**Duración**: 3 semanas
**Equipo**: 1 dev
**Inversión**: $960

#### Features

1. **Multi-Account Facebook Architecture** 🆕 CRÍTICO
   - Tabla `facebook_accounts` (org_id, user_id, access_token, expires_at)
   - OAuth FB flow per vendedor
   - Admin impersonation (usar cuenta vendedor inactivo)
   - Token refresh automático (cronjob)
   - Selector cuenta al publicar

2. **Task Queue (Redis + Taskiq)**
   - Redis 7.4+ setup (Docker)
   - Taskiq async task processor
   - Retry logic + dead letter queue
   - Monitoring dashboard (simple)

3. **Rate Limiting + Circuit Breaker**
   - FB Graph API rate limiter (200/hour per user)
   - Per-account rate limiting (no global)
   - Circuit breaker pattern
   - Exponential backoff

4. **Image + Video Optimization Pipeline** 🆕
   - **Images**: Resize/compress (1200x630 max, <500KB)
   - **Videos**: FFmpeg transcode (H.264, max 60s, <10MB)
   - Watermark overlay (org logo)
   - CDN upload (Cloudflare R2)
   - Thumbnail generation (videos)

5. **Manual Publish UI v2**
   - Mejorar `PublishForm`
   - Video upload support (drag-and-drop)
   - Selector cuenta FB (dropdown)
   - Preview FB post (imagen + video)
   - Bulk publish (select múltiples)

#### Tech Stack

- Backend: Redis, Taskiq, Pillow (images), FFmpeg (videos)
- Frontend: React 19, Zustand, react-dropzone
- OAuth: Facebook Login SDK
- Storage: Cloudflare R2 (o AWS S3)

#### Acceptance Criteria

- [ ] Multi-account FB: 5+ cuentas per org
- [ ] Admin puede usar cuenta vendedor
- [ ] Video upload funciona (max 60s, 10MB)
- [ ] Task queue procesa 100 publicaciones/hora
- [ ] Rate limiter per-account funciona
- [ ] Videos transcodificados < 10MB
- [ ] Preview muestra imagen + video

#### Risks

- 🔴 FB OAuth revocations (mitigación: webhooks + re-auth flow)
- 🟡 FFmpeg server load (mitigación: queue + autoscaling)
- 🟡 Video CDN costs (mitigación: R2 cheap, 30-day TTL)

---

### **Sprint B (Sep 2026): Facebook Automation — Intelligence**

**Objetivo**: AI + Scheduler para automatización completa
**Duración**: 3 semanas
**Equipo**: 1 dev
**Inversión**: $960

#### Features

1. **AI Title Generation (OpenAI API)**
   - Prompt: año, marca, modelo, precio → título atractivo
   - Fallback template si API falla
   - A/B test prompts (track CTR)
   - Cache títulos generados (reduce costs)

2. **Auto-Republish Scheduler**
   - Cron job: republish expired posts (cada 7 días)
   - Priority queue (productos con más views primero)
   - Smart scheduling (evitar FB spam detection)
   - Per-account scheduling (load balancing)

3. **Bulk Actions v2**
   - Pause/resume publicaciones masivas
   - Delete bulk
   - Update precios bulk
   - Change account bulk

4. **Error Handling Robusto**
   - Retry con exponential backoff
   - Alertas Slack/email cuando falla
   - Manual retry UI
   - Account health dashboard

#### Acceptance Criteria

- [ ] AI genera títulos >80% approval rate
- [ ] Auto-republish funciona 24/7
- [ ] Bulk actions procesan 500+ productos
- [ ] Error rate < 1% (con retries)
- [ ] Alertas < 5min después de error

#### Risks

- 🟡 OpenAI API costs (mitigación: cache + gpt-4o-mini)
- 🟡 FB spam detection (mitigación: randomize schedule)

---

### **Sprint C (Oct 2026): Production-Ready + FB Lead Ads**

**Objetivo**: Monitoring + Performance + FB Lead Ads webhook
**Duración**: 3 semanas
**Equipo**: 1 dev
**Inversión**: $960

#### Features

1. **Monitoring (Sentry APM)**
   - Error tracking
   - Performance monitoring (slow queries)
   - User feedback integration
   - Video processing metrics

2. **Performance Optimization**
   - DB query optimization (N+1 fixes)
   - Image/video lazy loading
   - Suspense boundaries (React 19)
   - CDN caching headers

3. **Facebook Lead Ads Integration** 🆕
   - Webhook recibir leads de FB
   - Auto-create lead in ProSell
   - Auto-assign vendedor (round-robin)
   - Deduplication (email/phone)

4. **Docs + Training**
   - User guide: cómo publicar en FB
   - Video demo (5 min)
   - FAQ troubleshooting

#### Acceptance Criteria

- [ ] Sentry catching 100% errors
- [ ] P95 response time < 500ms
- [ ] FB Lead Ads → ProSell < 30s
- [ ] Docs públicos

**TOTAL Sprint 0-C**: $3,200 | 10 semanas

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

**Semana 2**:

4. Seller dashboard traducido
5. CRM traducido
6. Public pages traducidas
7. Backend errors + emails traducidos

#### Acceptance Criteria

- [ ] 100% strings traducidos (EN + ES)
- [ ] 0 hardcoded text
- [ ] LocaleSwitcher en header
- [ ] Backend retorna error codes
- [ ] Emails soportan EN/ES
- [ ] Mobile switcher funcional

---

### **Sprint D (Nov 2026 sem 3-4): CRM Básico + Multi-Canal Fase 1**

**Objetivo**: Visual management + Unified Inbox
**Duración**: 2 semanas
**Equipo**: 1 dev
**Inversión**: $640

#### Features CRM (80% valor Twenty CRM)

1. **Kanban View Drag-and-Drop**
   - Columnas: NEW | CONTACTED | QUALIFIED | APPOINTMENT | LOST
   - Drag lead entre columnas → auto-update status
   - Count badges por columna
   - Mobile: swipe horizontal

2. **Timeline Actividades Mejorada**
   - Formato vertical cronológico
   - Icons por tipo (📞 llamada, 💬 whatsapp, ✉️ email, 📝 nota)
   - Expandir/colapsar detalles

3. **Activity Types Básicos**
   - Quick-add desde kanban card
   - Tipos: Llamada, WhatsApp, Email, Nota
   - Timestamp + vendedor

#### Features Multi-Canal 🆕 CRÍTICO

4. **Facebook Marketplace Messages Webhook**
   - Webhook recibir mensajes FB
   - Auto-create activity en lead
   - Link FB conversation → ProSell lead
   - Deduplication (FB user ID)

5. **WhatsApp Business API Webhook**
   - Webhook recibir mensajes WhatsApp
   - Auto-create activity en lead
   - Link WhatsApp conversation → ProSell lead
   - Phone number matching

6. **Unified Inbox (Básico)**
   - Vista única FB Messages + WhatsApp
   - Filtrar por canal
   - Mark as read/unread
   - Quick reply (link to channel)

#### Tech Stack

- Kanban: @dnd-kit (ya instalado)
- Webhooks: FastAPI + ngrok (dev) / webhook.site (prod)
- FB Webhooks: Graph API subscriptions
- WhatsApp: WhatsApp Business API (Twilio o Meta oficial)

#### Acceptance Criteria

- [ ] Kanban drag funciona (desktop + mobile)
- [ ] Timeline muestra actividades cronológicas
- [ ] FB Messages → ProSell lead < 1min
- [ ] WhatsApp → ProSell lead < 1min
- [ ] Unified inbox muestra ambos canales
- [ ] Quick reply funciona

#### Risks

- 🔴 WhatsApp API approval (mitigación: empezar con Twilio sandbox)
- 🟡 FB webhook security (mitigación: verify signature)
- 🟡 Message threading complejo (mitigación: MVP = solo captura)

---

### **Sprint E (Dic 2026): CRM Intermedio + Multi-Canal Fase 2**

**Objetivo**: Viralidad + Tasks + Message Threading
**Duración**: 2 semanas
**Equipo**: 1 dev
**Inversión**: $640

#### Features CRM

1. **WhatsApp Share Button**
   - Sticky button en `/p/[slug]`
   - Pre-filled: "Mirá este auto: [URL]"
   - UTM tracking

2. **Lead Auto-Assignment UI**
   - Configurar round-robin desde UI
   - Engine ya existe, solo falta UI

3. **Task Management**
   - Crear task desde lead
   - Lista "Mis tareas" dashboard
   - Notificación cuando vence

4. **Notes/Comments**
   - Agregar notes ricas a leads
   - Diferente de activities

5. **Filters Avanzados**
   - Filtrar por status, vendedor, fecha, source, canal
   - Save filtered views

#### Features Multi-Canal 🆕

6. **Message Threading**
   - Agrupar mensajes por conversation_id
   - Thread view (chat-like)
   - Reply desde ProSell (redirect to channel)

7. **Auto-Lead Creation Rules**
   - Si mensaje nuevo + no existe lead → auto-create
   - Extract info from message (nombre, interés)
   - Smart assignment (by keyword, product mention)

8. **Channel Analytics**
   - Response time por canal
   - Messages per day
   - Conversion rate per channel

#### Acceptance Criteria

- [ ] WhatsApp share genera link correcto
- [ ] Tasks visibles en dashboard
- [ ] Message threads agrupados
- [ ] Auto-create lead funciona
- [ ] Analytics por canal

---

### **Sprint F (Q1 2027): CRM Avanzado + Workflows**

**Objetivo**: Workflows + Reminders
**Duración**: 3 semanas
**Equipo**: 1 dev
**Inversión**: $960
**Decisión**: Solo si dealers LO PIDEN

#### Features

1. **Workflow Engine Básico**
   - Trigger: lead created → auto-assign + notify
   - BullMQ o Taskiq
   - 2-3 workflows MVP

2. **Reminder Automations**
   - Lead sin actividad 3 días → alert
   - Appointment mañana → reminder
   - Message no respondido 24h → alert

3. **Email Templates**
   - Templates configurables
   - Variables: `{buyer_name}`, `{product_title}`

4. **Activity Templates**
   - Quick-add con scripts pre-defined

#### Acceptance Criteria

- [ ] Workflow: lead created → dealer notificado < 1min
- [ ] Reminder: lead sin actividad → alert
- [ ] Templates editables desde UI

---

### **Sprint G (Q1 2027): AI Agent Auto-Responder** 🆕

**Objetivo**: Agente AI que atienda mensajes y dé info a leads
**Duración**: 3 semanas
**Equipo**: 1 dev
**Inversión**: $960

#### Features

1. **OpenAI Assistant API Integration**
   - Assistant per organization
   - Context: productos org, precios, disponibilidad
   - Instrucciones: responder preguntas comunes

2. **RAG (Retrieval-Augmented Generation)**
   - Vector DB (Pinecone o Qdrant)
   - Embed productos (marca, modelo, año, precio, specs)
   - Buscar productos relevantes por query lead

3. **Auto-Responder FB Messages + WhatsApp**
   - Webhook → detect question → call Assistant
   - Generate response → send via channel API
   - Fallback: "Un vendedor te contactará pronto"
   - Human handoff: keyword "hablar con vendedor"

4. **AI Agent Dashboard**
   - Conversaciones atendidas
   - Accuracy (thumbs up/down)
   - Handoff rate
   - Disable/enable per org

#### Tech Stack

- OpenAI: Assistant API + gpt-4o-mini
- Vector DB: Pinecone (free tier 1M vectors)
- Embeddings: text-embedding-3-small

#### Acceptance Criteria

- [ ] AI responde preguntas productos >70% accuracy
- [ ] Handoff a vendedor funciona
- [ ] RAG encuentra productos relevantes
- [ ] Dashboard muestra metrics
- [ ] Org puede disable agent

#### Risks

- 🟡 AI hallucinations (mitigación: RAG + prompt engineering)
- 🟡 OpenAI costs (mitigación: gpt-4o-mini + cache)
- 🟡 Lead frustration (mitigación: handoff rápido)

---

### **Sprint H (Q2 2027): Wallet + Monetización**

**Objetivo**: Prepago/tokens system
**Duración**: 3 semanas
**Equipo**: 1 dev
**Inversión**: $960

#### Features

1. **Prepago/Tokens System**
   - 1 token = 1 publicación FB
   - Packages: 10 tokens ($20), 50 ($80), etc.

2. **Payment Gateway (Stripe)**
   - Checkout integrado
   - Invoices automáticos

3. **Usage Tracking**
   - Dashboard: tokens restantes
   - Alertas cuando < 5 tokens

4. **Billing Dashboard**
   - Historial compras
   - Download invoices

#### Acceptance Criteria

- [ ] Stripe checkout funciona
- [ ] Tokens descontados automáticamente
- [ ] Alertas llegan

---

## 📋 Resumen Inversión

| Sprint                                 | Duración | Inversión | Prioridad |
| -------------------------------------- | -------- | --------- | --------- |
| 0: Mobile-First Foundation             | 1 sem    | $320      | 🔴 P0     |
| A: FB Automation Core + Multi + Video  | 3 sem    | $960      | 🔴 P0     |
| B: FB Automation Intelligence          | 3 sem    | $960      | 🔴 P0     |
| C: Production-Ready + FB Lead Ads      | 3 sem    | $960      | 🔴 P0     |
| i18n: Multi-idioma                     | 2 sem    | $960      | 🔴 P0     |
| D: CRM Básico + Multi-Canal Fase 1     | 2 sem    | $640      | 🟡 P1     |
| E: CRM Intermedio + Multi-Canal Fase 2 | 2 sem    | $640      | 🟡 P1     |
| F: CRM Avanzado + Workflows            | 3 sem    | $960      | 🟢 P2     |
| G: AI Agent Auto-Responder             | 3 sem    | $960      | 🟢 P2     |
| H: Wallet                              | 3 sem    | $960      | 🟢 P3     |

**MVP Mobile-First (0-E)**: **$6,080** | 16 semanas (~4 meses)
**Full con AI (0-G)**: **$7,360** | 22 semanas (~5.5 meses)
**Full con Wallet (0-H)**: **$8,320** | 25 semanas (~6 meses)

---

## 🎯 Bottleneck Analysis

### HOY (Julio 2026)

- **Bottleneck #1**: Mobile NO funcional → dealers no pueden usar app
- **Bottleneck #2**: Manejo inventarios + publicaciones FB
- **Solución**: Sprint 0 (mobile) + Sprint A-C (FB automation)

### PRÓXIMO (Nov-Dic 2026)

- **Bottleneck**: Gestión leads cuando lleguen clientes + captura multi-canal
- **Solución**: Sprint D-E (CRM + unified inbox FB + WhatsApp)

### FUTURO (Q1 2027)

- **Bottleneck**: Atención leads 24/7 sin vendedores
- **Solución**: Sprint G (AI agent auto-responder)

### FUTURO (Q2 2027)

- **Bottleneck**: Monetización + escalabilidad
- **Solución**: Sprint H (Wallet)

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

1. ✅ **Documentadas** en este roadmap
   - feat/phase-3 → Sprint D (Kanban + Timeline)
   - feat/phase-4 → Sprint E (Tasks + WhatsApp share)
   - feat/phase-5 → Sprint F (Workflows)
   - feat/phase-1 → Sprint D-E (WhatsApp multi-canal)
   - feat/phase-2 → Sprint D (Lead capture multi-canal)
2. ✅ **Specs detallados** creados (ver sección SPECS)
3. 🔲 **Eliminar branches** después de crear specs

---

## 📝 SPECS a Crear

### 1. `SPEC-MOBILE-FIRST.md`

**Sprint 0**: Responsive + PWA + Touch
**Status**: DRAFT → APPROVED

### 2. `SPEC-FB-MULTI-ACCOUNT-VIDEO.md`

**Sprint A**: Multi-cuenta + Video pipeline
**Status**: DRAFT → APPROVED

### 3. `SPEC-CRM-MULTI-CANAL-FASE-1.md`

**Sprint D**: Kanban + FB Messages + WhatsApp webhooks
**Status**: DRAFT → APPROVED

### 4. `SPEC-CRM-MULTI-CANAL-FASE-2.md`

**Sprint E**: Message threading + Auto-create leads
**Status**: DRAFT → APPROVED

### 5. `SPEC-AI-AGENT-AUTO-RESPONDER.md`

**Sprint G**: OpenAI Assistant + RAG
**Status**: DRAFT (Q1 2027)

### 6. `SPEC-I18N-COMPLETO.md`

**Sprint i18n**: EN/ES sin hardcoding
**Status**: DRAFT → APPROVED

---

## ✅ Success Metrics

### Mobile-First (Sprint 0)

- 📱 Mobile traffic: 10% → 60%+
- ⚡ Upload desde móvil: 0% → 80% dealers
- 📊 Bounce rate mobile: 70% → <30%

### Facebook Automation (Sprint A-C)

- ⚡ Tiempo publicación: 15min → <30s
- 🎥 Videos publicados: 0% → 40% posts
- 👥 Cuentas FB per org: 1 → 5+ promedio
- 📈 Publicaciones/día: 10 → 100+
- 💰 ROI: $3,200 → save 15h/semana dealer

### Multi-Canal (Sprint D-E)

- 💬 Leads capturados FB Messages: +50/mes per org
- 📱 Leads capturados WhatsApp: +30/mes per org
- ⚡ Response time: 24h → <1h (con AI agent)
- 📊 Conversion multi-canal: 15% → 25%

### AI Agent (Sprint G)

- 🤖 Conversaciones atendidas: 70%+ (30% handoff)
- 🎯 Accuracy: >70% thumbs up
- ⏱️ Response time: <30s
- 💰 ROI: $960 → save 20h/semana dealer

---

## 🚨 Risks & Mitigations

| Risk                         | Probability | Impact | Mitigation                              |
| ---------------------------- | ----------- | ------ | --------------------------------------- |
| Mobile bugs Safari/Android   | MEDIUM      | HIGH   | Test en devices reales, iOS + Android   |
| FB OAuth revocations         | HIGH        | HIGH   | Webhooks monitoring + re-auth flow      |
| WhatsApp API approval        | MEDIUM      | MEDIUM | Empezar Twilio sandbox, migrar Meta     |
| Video CDN costs              | LOW         | MEDIUM | R2 cheap, 30-day TTL, compress agresivo |
| AI hallucinations            | MEDIUM      | HIGH   | RAG + prompt engineering + handoff      |
| FB webhook downtime          | MEDIUM      | MEDIUM | Retry queue + fallback polling          |
| Dealer adoption low (mobile) | LOW         | HIGH   | User testing Sprint 0                   |

---

## 🔄 Cambios vs Roadmap v4.0

| Feature                 | v4.0   | v5.0 (NUEVO)          |
| ----------------------- | ------ | --------------------- |
| Mobile-first            | ❌ No  | ✅ Sprint 0 (P0)      |
| Video soporte           | ❌ No  | ✅ Sprint A           |
| Multi-cuenta FB         | ❌ No  | ✅ Sprint A (CRÍTICO) |
| FB Messages webhook     | ❌ No  | ✅ Sprint D           |
| WhatsApp webhook        | ❌ No  | ✅ Sprint D           |
| Unified inbox           | ❌ No  | ✅ Sprint D           |
| Message threading       | ❌ No  | ✅ Sprint E           |
| AI Agent auto-responder | ❌ No  | ✅ Sprint G           |
| Total sprints           | 7      | 9                     |
| MVP investment          | $5,120 | $6,080                |
| Full investment         | $7,040 | $8,320                |

---

## 📚 Referencias

- [Audit Estado Real 2026-07-21](./AUDIT-ESTADO-REAL-2026-07-21.md)
- [Análisis 5 Fases CRM](./ANALISIS-5-FASES-CRM-2026-07-21.md)
- [Audit UI/UX + i18n](./AUDIT-UI-UX-I18N-2026-07-21.md)
- [Twenty CRM](https://github.com/twentyhq/twenty)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [OpenAI Assistant API](https://platform.openai.com/docs/assistants)

---

**Próximo paso**: Crear specs detallados + user approval → Start Sprint 0 (Mobile-First)
