# 🗺️ ROADMAP DE DESARROLLO - PROSELL SAAS v3.0 (PIVOT)

**Proyecto**: ProSell SaaS
**Versión**: 3.0 (PIVOT basado en auditoría 7-Brain)
**Fecha**: Marzo 2026
**Horizonte**: 6 meses (Marketplace-First Strategy)

---

## 🔄 QUÉ CAMBIÓ (WHY PIVOT?)

### Auditoría 7-Brain (5 Marzo 2026)

**Health Score: 87/100** - Sólido pero con riesgo operativo crítico

| Dimensión        | Score      | Estado                                       |
| ---------------- | ---------- | -------------------------------------------- |
| Product Strategy | 95/100     | ✅ PMF Confirmado                            |
| Backend          | 90/100     | ✅ Arquitectura sólida, **falta task queue** |
| Frontend         | 85/100     | ✅ React 19 + Tailwind 4                     |
| QA/Testing       | 95/100     | ✅ 716 tests passing                         |
| DevOps           | 80/100     | ⚠️ Falta: workers, circuit breakers          |
| **Growth**       | **75/100** | 🔴 **BLOQUEADO por capacidad manual**        |
| UX/UI            | 70/100     | ⚠️ Sin catálogo público aún                  |

**CONSENSUS UNÁNIME (100% de los 7 cerebros): PRIORIZAR MARKETPLACE INTEGRATION**

### El Problema: "Muerte por Éxito"

```
HOY:     5 dealers × 15 autos = ~75 pubs/día (manejable)
+3 MESES: 10 dealers × 15 autos = ~150 pubs/día (IMPOSIBLE manual)
+6 MESES: 20 dealers × 15 autos = ~225 pubs/día (COLAPSO)
```

**Sin automatización:**

- Empleados se queman
- Calidad cae
- Dealers se van
- Negocio muere por éxito

### Decisión de Pivot

| Roadmap Original (v2.0)      | Realidad del Negocio                     | Veredicto 7-Brain                     |
| ---------------------------- | ---------------------------------------- | ------------------------------------- |
| Sprint 7-8: Catálogo Público | 5 dealers esperan automatización URGENTE | **PIVOTAR a Marketplace Integration** |

**Estrategia Híbrida:** "Automate-First, Surface-Later"

- Sprint 7-8: Marketplace Integration (CRÍTICO)
- Sprint 8.5: Landing temporal mientras tanto (Quick Win)
- Sprint 9+: Catálogo Público completo

---

## 📊 TIMELINE ACTUALIZADO

```mermaid
gantt
    title ProSell SaaS - Roadmap v3.0 (PIVOT)
    dateFormat  YYYY-MM-DD

    section Fase 1: MVP Core (COMPLETADO)
    Sprint 1-2: Autenticación     :done, a1, 2026-02-10, 4w
    Sprint 3-4: Organizaciones    :done, a2, after a1, 4w
    Sprint 5-6: Productos         :done, a3, after a2, 4w

    section Fase 2: Marketplace Automation (NUEVO)
    Sprint 7+: Marketplace FB     :crit, b1, 2026-03-10, 6w
    Sprint 8.5: Landing Temporal  :b2, 2026-04-01, 2w

    section Fase 3: MVP Completo
    Sprint 9: Catálogo Público    :b3, after b1, 4w
    Sprint 10-11: Ventas          :b4, after b3, 4w
    Sprint 12: Wallet             :b5, after b4, 4w

    section Fase 4: Crecimiento
    Sprint 13-14: Scraping        :c1, after b5, 4w
    Sprint 15-16: Analytics IA    :c2, after c1, 4w

    section Hitos
    MVP Alpha (interno)           :milestone, 2026-03-04, 0d
    Marketplace Automation       :milestone, 2026-04-21, 0d
    MVP Launch                    :milestone, 2026-07-28, 0d
```

---

## 🚨 FASE 2: MARKETPLACE AUTOMATION (Sprint 7+)

**Objetivo**: Automatizar publicaciones en Facebook Marketplace
**Fecha**: Marzo - Abril 2026
**Inversión estimada**: $35,000
**Prioridad**: 🔴 CRÍTICA (Bloquea escalabilidad)

### Sprint 7+: Facebook Marketplace Integration (6 semanas)

**Fechas**: Mar 10 - Abr 21, 2026

#### Fase 1: Foundation (Semanas 1-2)

| Tarea                                      | Prioridad | Estimación    | Dependencias  |
| ------------------------------------------ | --------- | ------------- | ------------- |
| Task Queue (Redis + Taskiq/Celery)         | P0        | 3 días        | -             |
| Facebook App Review process                | P0        | Iniciar DÍA 1 | Meta approval |
| Architecture de colas con circuit breakers | P0        | 3 días        | Task Queue    |
| Health checks endpoint                     | P0        | 1 día         | -             |
| Setup staging environment                  | P0        | 2 días        | -             |

**Criterios de éxito:**

- [ ] Task queue procesa jobs sin bloquear API
- [ ] Circuit breakers configurados
- [ ] Facebook App submitted para review
- [ ] Health checks reportean estado de colas

---

#### Fase 2: Facebook Integration (Semanas 3-4)

| Tarea                        | Prioridad | Estimación | Dependencias          |
| ---------------------------- | --------- | ---------- | --------------------- |
| OAuth dinámico por dealer    | P0        | 5 días     | Facebook App approved |
| Graph API client             | P0        | 5 días     | OAuth                 |
| Rate limiting (token bucket) | P0        | 3 días     | Graph API             |
| Image upload optimization    | P0        | 3 días     | Graph API             |
| Webhook listener             | P0        | 3 días     | Graph API             |
| VIN Decoder production-ready | P0        | 2 días     | Sprint 5-6 (NHTSA)    |

**Criterios de éxito:**

- [ ] Dealer puede autorizar Facebook OAuth
- [ ] Publicación manual funciona end-to-end
- [ ] Rate limiting previene baneos
- [ ] Webhooks reciben actualizaciones de Facebook

---

#### Fase 3: Automation & QA (Semanas 5-6)

| Tarea                                            | Prioridad | Estimación | Dependencias |
| ------------------------------------------------ | --------- | ---------- | ------------ |
| IA títulos/descripciones (GPT-4/Claude)          | P0        | 3 días     | OpenAI API   |
| Re-publicación scheduler (posts vencen a 7 días) | P0        | 5 días     | Task Queue   |
| State machine publicación (Zustand)              | P0        | 4 días     | -            |
| Server Actions (OAuth + mutations)               | P0        | 5 días     | Next.js 16   |
| Contract Tests suite (Facebook API)              | P0        | 3 días     | Graph API    |
| Unit tests de OAuth flow                         | P0        | 2 días     | -            |
| Webhook integration tests                        | P0        | 2 días     | -            |
| Canary deployment setup                          | P0        | 2 días     | -            |

**Criterios de éxito:**

- [ ] Dealer publica vehículo → Facebook en <30 segundos
- [ ] IA genera títulos optimizados para CTR
- [ ] Re-publicación automática funciona
- [ ] Canary deployment completo (1 dealer → todos)
- [ ] API Success Rate > 99.9%
- [ ] Test coverage > 90%

---

### Sprint 8.5: Landing Temporal (Quick Win)

**Fechas**: Abr 1 - Abr 14, 2026 (Paralelo a Sprint 7+ últimas 2 semanas)

| Tarea                                                  | Prioridad | Estimación |
| ------------------------------------------------------ | --------- | ---------- |
| Landing estática temporal (usa componentes Sprint 5-6) | P0        | 3 días     |
| Dashboard básico (publicaciones/día, time-to-publish)  | P0        | 3 días     |
| Facebook App credential setup                          | P0        | 2 días     |
| Tests E2E básicos                                      | P0        | 2 días     |

**Criterios de éxito:**

- [ ] Landing lista vehículos que van a Facebook
- [ ] Dashboard muestra estado de publicaciones
- [ ] Preparado para integración Facebook

**POR QUÉ ESTE SPRINT:**

- Mientras terminamos Marketplace (semanas 5-6), ya entregamos valor visible
- Usa componentes ya construidos en Sprint 5-6
- Satisface necesidad parcial de "presencia pública"
- No bloquea desarrollo crítico

---

## 🎯 FASE 3: MVP COMPLETO (Sprint 9-12)

**Objetivo**: Funcionalidad completa para pilotos
**Fecha**: Abril - Julio 2026
**Inversión estimada**: $40,000

### Sprint 9: Catálogo Público (4 semanas)

**Fechas**: Abr 22 - May 19, 2026

| Entregable                       | Prioridad | Estimación |
| -------------------------------- | --------- | ---------- |
| Asignar tenant_id en OAuth users | P1        | 1 día      |
| Rutas dinámicas por tenant       | P0        | 3 días     |
| Shared layouts anidados          | P0        | 2 días     |
| Edge caching (ISR/SWR)           | P0        | 2 días     |
| Metadata API (SEO)               | P0        | 3 días     |
| Filtros avanzados                | P0        | 4 días     |
| Búsqueda (Postgres full-text)    | P0        | 3 días     |
| Paginación optimizada            | P0        | 2 días     |
| Imagen optimizada (next/image)   | P0        | 2 días     |
| Tests E2E                        | P0        | 2 días     |

**Deuda técnica incluida:**

- `tenant_id=None` en usuarios creados via OAuth → requiere Organizaciones implementadas

**Criterios de éxito:**

- [ ] Catálogo público funcional
- [ ] Búsqueda con filtros avanzados
- [ ] SEO metadata dinámico por vehículo
- [ ] Responsive en todos los dispositivos
- [ ] LCP < 2.5s

---

### Sprint 10-11: Sistema de Ventas (4 semanas)

**Fechas**: May 20 - Jun 16, 2026

_(Mantiene especificaciones del roadmap v2.0 - ver archivo original)_

---

### Sprint 12: Wallet & Tokens (4 semanas)

**Fechas**: Jun 17 - Jul 14, 2026

_(Mantiene especificaciones del roadmap v2.0 - ver archivo original)_

---

## 🚀 FASE 4: CRECIMIENTO (Sprint 13-16)

**Objetivo**: Funcionalidades avanzadas y escala
**Fecha**: Julio - Septiembre 2026
**Inversión estimada**: $50,000

### Sprint 13-14: Scraping & Analytics (4 semanas)

**Fechas**: Jul 15 - Ago 11, 2026

| Entregable                                   | Prioridad | Estimación | Depende de         |
| -------------------------------------------- | --------- | ---------- | ------------------ |
| Scraping FB Marketplace/CarGurus/AutoTrader  | P0        | 5 días     | Playwright setup   |
| Normalización de datos multi-fuente          | P0        | 3 días     | Scraper            |
| Dashboard pricing intelligence (percentiles) | P0        | 4 días     | Datos normalizados |
| Alertas de repricing automático              | P0        | 3 días     | Dashboard          |
| Tests                                        | P0        | 2 días     | -                  |

**Criterios de éxito:**

- [ ] Scraper extrae listings sin bloquearse
- [ ] Datos se normalizan correctamente
- [ ] Pricing dashboard muestra percentiles
- [ ] Alertas de repricing funcionan

---

### Sprint 15-16: Analytics Avanzados + IA (4 semanas)

**Fechas**: Ago 12 - Sep 8, 2026

_(Mantiene especificaciones del roadmap v2.0 - ver archivo original)_

---

## 📅 MILESTONES ACTUALIZADOS

| Milestone                      | Fecha        | Descripción                                       |
| ------------------------------ | ------------ | ------------------------------------------------- |
| **M1: Alpha**                  | Mar 4, 2026  | ✅ Backend core funcional (Sprint 5-6 completado) |
| **M2: Marketplace Automation** | Abr 21, 2026 | 🎯 Publicación automática en Facebook funcional   |
| **M3: MVP Completo**           | May 19, 2026 | Catálogo público + Marketplace automation         |
| **M4: Beta Pilotos**           | Jul 14, 2026 | 5 orgs piloto con wallet + ventas                 |
| **M5: MVP Launch**             | Sep 8, 2026  | Lanzamiento público con scraping + analytics      |

---

## 📈 MÉTRICAS DE ÉXITO POR SPRINT

### Sprint 7+ (Marketplace Automation)

| Métrica             | Hoy            | Objetivo 6 semanas  | Objetivo 12 semanas |
| ------------------- | -------------- | ------------------- | ------------------- |
| Publicaciones/día   | ~75 manual     | ~75 automático <30s | 150+ automático     |
| Dealers activos     | 5              | 5 (retención 100%)  | 10                  |
| API Success Rate    | N/A            | >99.9%              | >99.9%              |
| Time-to-Publish     | Minutos        | <30 segundos        | <30 segundos        |
| Churn Rate          | 0%             | 0%                  | <5%                 |
| Dealer Satisfaction | 7/10 (asumido) | 9/10                | 9/10                |

---

## ⚠️ DEPENDENCIAS CRÍTICAS (ACTUALIZADO)

| Dependencia               | Tipo     | Lead Time  | Due Date     | Responsable |
| ------------------------- | -------- | ---------- | ------------ | ----------- |
| **Facebook App Review**   | External | 14-30 días | Mar 12, 2026 | Tech Lead   |
| **OpenAI/Claude API Key** | External | 1 día      | Mar 31, 2026 | Tech Lead   |
| **Stripe Account**        | External | 3 días     | Jun 1, 2026  | Tech Lead   |
| **DigitalOcean Spaces**   | External | 1 día      | Feb 10, 2026 | DevOps      |

**Plan de Mitigación (Facebook App):**

- **INICIAR DÍA 1** del Sprint 7+
- Plan B: CSV upload + Selenium automation
- Plan C: Manual publishing fallback
- Documentar todo el proceso para re-aplicación si needed

---

## 🚨 RIESGOS Y MITIGACIÓN

### Riesgos Específicos de Marketplace Integration

| Riesgo                 | Probabilidad | Impacto | Mitigación                           |
| ---------------------- | ------------ | ------- | ------------------------------------ |
| Facebook App rejection | Media        | Alto    | Plan B: CSV upload + Selenium        |
| Rate limiting blocks   | Alta         | Medio   | Queue con exponential backoff        |
| Token expiration       | Media        | Alto    | Auto-refresh 48hs antes              |
| Webhook failures       | Media        | Medio   | Circuit breakers + dead letter queue |

---

## 🎯 QUICK WINS (2 semanas)

Mientras construimos Marketplace:

1. **Landing estática temporal** (3 días)
   - Lista vehículos que ya van a Facebook
   - Usa componentes Sprint 5-6
   - No requiere desarrollo nuevo significativo

2. **Dashboard básico** (3 días)
   - Muestra publicaciones/día
   - Time-to-publish metrics
   - Estado de cola de publicación

3. **Facebook App credential setup** (2 días)
   - Prepara el terreno para integración
   - Reduce delay cuando App es approved

---

## 📊 SALUD DEL PROYECTO (POST-PIVOT)

### Métricas de Desarrollo (Sprint over Sprint)

| Métrica                 | Sprint 1-2 | Sprint 3-4 | Sprint 5-6 | Sprint 7+ (Target)   |
| ----------------------- | ---------- | ---------- | ---------- | -------------------- |
| **Velocity (SP)**       | -          | 20-25      | 25-30      | Estabilizar en 25-30 |
| **Sprint Burndown**     | -          | 90%        | 95%        | 100%                 |
| **Test Coverage**       | -          | >70%       | >80%       | >90%                 |
| **API Success Rate**    | -          | 95%        | 98%        | >99.9%               |
| **Dealer Satisfaction** | -          | -          | 7/10       | 9/10                 |

---

## 🔄 PROCESO DE RE-EVALUACIÓN

### Checkpoint Post-Sprint 7+

**Fecha**: Abr 21, 2026 (Fin de Sprint 7+)

**Preguntas clave:**

1. **Marketplace Automation funciona?**
   - [ ] Dealers pueden publicar sin intervención humana
   - [ ] API Success Rate > 99.9%
   - [ ] Time-to-publish < 30 segundos
   - [ ] Churn = 0%

2. **Capacidad de escala lograda?**
   - [ ] Sistema soporta 10 dealers (150 pubs/día)
   - [ ] Queue depth estable (<50 items)
   - [ ] No degradation de performance

3. **Dealers están satisfechos?**
   - [ ] NPS > 8
   - [ ] 0 quejas sobre latencia
   - [ ] Feedback positivo en dashboard

**SI TODO SÍ → Continuar con Sprint 9 (Catálogo Público)**

**SI ALGÚN NO →**

- Investigar root cause
- Corregir antes de avanzar
- Re-evaluar timeline

---

## 📚 REFERENCIAS

### Documentación de Pivot

- [Executive Summary Auditoría](./audit/EXECUTIVE-SUMMARY.md)
- [Brain 1: Product Strategy](./audit/brain-1-product-strategy.md)
- [Brain 2: UX Research](./audit/brain-2-ux-research.md)
- [Brain 3: UI Design](./audit/brain-3-ui-design.md)
- [Brain 4: Frontend](./audit/brain-4-frontend.md)
- [Brain 5: Backend](./audit/brain-5-backend.md)
- [Brain 6: QA/DevOps](./audit/brain-6-qa-devops.md)
- [Brain 7: Growth/Data](./audit/brain-7-growth-data.md)

### Documentos Relacionados

- [Roadmap v2.0 Original](./04_ROADMAP_PROSELL_SAAS_V2.md)
- [Arquitectura del Sistema](./01_ARQUITECTURA_PROSELL_SAAS_V2.md)
- [Requisitos PRD](./02_REQUISITOS_PRD_PROSELL_SAAS_V2.md)
- [Reevaluación PMF](./REEVALUACION-PRODUCT-MARKET-FIT-2026-03-04.md)

---

## ✅ CHECKLIST DE INICIO SPRINT 7+

### Antes de iniciar el Sprint

**Técnico:**

- [ ] Task Queue (Redis + Taskiq/Celery) configurado en staging
- [ ] Facebook App creado y submitted para review
- [ ] Circuit breakers diseñados y documentados
- [ ] Health checks endpoint implementado
- [ ] Staging environment funcional

**Negocio:**

- [ ] Stakeholders notificados del pivot
- [ ] Timeline actualizado comunicado
- [ ] Expectativas realistas establecidas (6-7 semanas)
- [ ] Plan de mitigación documentado

**Equipo:**

- [ ] Todos alineados con nueva prioridad
- [ ] Dependencias externas identificadas
- [ ] Riesgos comprendidos
- [ ] Métricas de éxito claras

---

**Estado del Roadmap v3.0**: ✅ PIVOT DOCUMENTADO
**Próximo paso**: Aprobación del fundador → Iniciar Sprint 7+
