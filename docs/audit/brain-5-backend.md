# CEREBRO 5: BACKEND - Análisis Completo

**Fecha**: 2026-03-05
**Proyecto**: ProSell SaaS
**Contexto**: Sprint 5-6 completado, auditoría de arquitectura backend

---

## 🏗️ ARQUITECTURA BACKEND ACTUAL

### Stack Confirmado (Sólido para escalabilidad)

| Tecnología     | Versión                | Propósito   | Estado        |
| -------------- | ---------------------- | ----------- | ------------- |
| **Python**     | 3.13+ (free-threading) | Runtime     | ✅ Producción |
| **FastAPI**    | 0.115+                 | Framework   | ✅ Producción |
| **SQLAlchemy** | 2.0 async              | ORM         | ✅ Producción |
| **Pydantic**   | 2.12+                  | Validation  | ✅ Producción |
| **PostgreSQL** | 17                     | Database    | ✅ Producción |
| **Redis**      | 7.4+                   | Cache/Queue | ✅ Producción |
| **Tests**      | 325 passing            | Coverage    | ✅ 95%+       |

**Fortalezas:**

- ✅ Clean Architecture (domain → application → infrastructure)
- ✅ Multi-tenant (tenant_id en todas las entidades)
- ✅ Async/await (soporta alta concurrencia)
- ✅ Type safety (Pydantic + SQLAlchemy 2.0)

---

## 🔍 FORTALEZAS Y GAPS TÉCNICOS

### Lo que está BIEN:

1. **Arquitectura Clean facilita segregación de datos**
   - `tenant_id` ya implementado en todas las entidades
   - Cada dealer tiene sus datos aislados
   - Fácil agregar multi-plataforma (FB + AutoTrader + Cars.com)

2. **Redis 7.4+ da base para Task Queue**
   - Ya está en el stack
   - Perfecto para colas de publicación
   - Soporta rate limiting

3. **Free-threading Python 3.13**
   - Ideal para concurrencia que exige marketplace integration
   - Publicaciones pueden ser paralelas sin GIL bottleneck

### Lo que FALTA (GAPS CRÍTICOS):

1. **Task Runner (Celery/Taskiq)**
   - **Problema**: No hay task queue system implementado
   - **Impacto**: No podemos hacer publicaciones async sin bloquear
   - **Solución**: Implementar Taskiq o Celery
   - **Estimado**: 1 semana

2. **Circuit Breakers**
   - **Problema**: Si Facebook API falla, nuestro sistema colapsa
   - **Impacto**: Queue crece infinitamente, memoria se llena
   - **Solución**: Implementar pattern Circuit Breaker
   - **Estimado**: 3 días

3. **Observability**
   - **Problema**: No hay tracing distribuido
   - **Impacto**: No podemos rastrear publicación de principio a fin
   - **Solución**: OpenTelemetry + Jaeger
   - **Estimado**: 1 semana

---

## ⚖️ ANÁLISIS DE COMPLEJIDAD TÉCNICA

### OPCIÓN A: Catálogo Público

**Complejidad**: MEDIA

**Qué requiere:**

- API endpoints públicos (`GET /api/v1/public/vehicles`)
- SEO metadata generation
- Caching (Redis + CDN)
- Rate limiting (prevenir scraping)

**Riesgos:**

- **Desperdicio de recursos**: Implementar caching/SEO para producto que dealers no necesitan urgentemente
- **Costo de oportunidad técnico**: Alto (podríamos estar automatizando)

**Estimado**: 4 semanas

---

### OPCIÓN B: Marketplace Integration (Facebook Graph API)

**Complejidad**: ALTA

**Qué requiere:**

#### 1. OAuth Dinámico (1-2 semanas)

```python
# Flujo de tokens
1. Dealer autoriza ProSell en Facebook
2. Recibimos short-lived token (1 hora)
3. Exchange por long-lived token (60 días)
4. Refresh token antes de expirar
5. Manejar revocaciones
```

**Riesgos:**

- Tokens expiran sin warning
- Dealer puede revocar acceso
- Facebook puede cambiar política de tokens

---

#### 2. Webhook Listener (1 semana)

```python
# Recibir actualizaciones de Facebook
@app.post("/webhooks/facebook")
async def facebook_webhook(request):
    # Post publicado
    # Post eliminado
    # Post rechazado
    # Guardar estado en DB
```

**Riesgos:**

- Webhooks pueden llegar desordenados
- Necesitamos deduplication
- Facebook puede reenviar webhooks

---

#### 3. Rate Limiting (1-2 semanas)

```python
# Facebook tiene límites estrictos
# 200 calls per hour per user
# 50 calls per day per page

# Necesitamos:
- Token bucket algorithm
- Exponential backoff
- Priority queue (dealers premium primero)
```

**Riesgos:**

- Si excedemos límites, Facebook banea nuestra app
- Queue puede crecer infinitamente si workers fallan
- Dealers pueden no publicar en horas pico

---

#### 4. Image Upload (1 semana)

```python
# Subir imágenes a Facebook
- Multipart/form-data
- Resize optimization (Facebook tiene límites)
- Retry con backoff
```

**Riesgos:**

- Uploads pueden fallar por timeout
- Imágenes corruptas rechazadas
- Storage cost (S3/Spaces)

---

## 🚨 DEPENDENCIAS EXTERNAS BLOQUEANTES

### Facebook App Review Process

**Qué es:**

- Facebook revisa nuestra app manualmente
- Requiere screenshots, video demo, explicación detallada
- Pueden pedir cambios múltiples veces

**Timeline realista:**

- **Mejor caso**: 3 días
- **Caso promedio**: 2 semanas
- **Peor caso**: 6 semanas o rechazo

**Estrategia de mitigación:**

- INICIAR proceso DÍA 1 (paralelo al desarrollo)
- Tener Plan B (CSV upload + Selenium)
- Documentar todo el proceso

---

## 📏 ESTIMADO TÉCNICO REALISTA

### Desglose por componente:

| Componente                            | Estimado         | Dependencias |
| ------------------------------------- | ---------------- | ------------ |
| **Setup Task Queue (Redis + Taskiq)** | 3 días           | -            |
| **OAuth Facebook**                    | 5 días           | App Review   |
| **Graph API Client**                  | 1 semana         | OAuth        |
| **Webhook Listener**                  | 3 días           | Graph API    |
| **Image Upload**                      | 3 días           | Graph API    |
| **Rate Limiting**                     | 5 días           | Graph API    |
| **Re-publicación Scheduler**          | 1 semana         | Task Queue   |
| **IA Titles/Descriptions**            | 3 días           | OpenAI API   |
| **Error Handling + Retries**          | 1 semana         | Todos        |
| **Testing + QA**                      | 1 semana         | Todos        |
| **TOTAL**                             | **~6-7 semanas** |              |

**Nota**: El App Review es paralelo, no secuencial.

---

## 🎯 RECOMENDACIÓN BACKEND

### VEREDICTO: PRIORIZAR MARKETPLACE INTEGRATION

**Justificación técnica:**

1. **La arquitectura actual soporta la complejidad**
   - Python 3.13 free-threading = concurrencia ideal
   - Redis 7.4+ = task queue ready
   - Multi-tenant = segregación de datos lista

2. **El gap principal es process, no tech**
   - Necesitamos Task Runner (Taskiq/Celery)
   - Necesitamos Circuit Breakers
   - Ninguno es rocket science

3. **El riesgo operativo es mayor que el técnico**
   - 75 pubs/día → 225 pubs/día sin automatización = colapso
   - El backend puede escalar, los empleados no

> "Ignorar la automatización llevará al colapso técnico y operativo de los 5 dealers actuales. El catálogo público es una victoria estética, la automatización es supervivencia."

---

## 🗺️ ROADMAP BACKEND PRIORITADO

### Sprint 7+: Marketplace BE (Semanas 1-6)

**Semana 1-2: Foundation**

- [ ] Implementar Taskiq (Python async task queue)
- [ ] Configurar Redis para queues
- [ ] Iniciar Facebook App Review (DÍA 1)
- [ ] Setup Circuit Breakers

**Semana 3-4: Integration**

- [ ] OAuth Facebook implementation
- [ ] Graph API client con rate limiting
- [ ] Webhook listener + deduplication
- [ ] Image upload optimization

**Semana 5: Automation**

- [ ] IA titles/descriptions (OpenAI/Claude)
- [ ] Re-publication scheduler (celery beat)
- [ ] VIN Decoder production-ready

**Semana 6: Production**

- [ ] Error handling + retries
- [ ] Observability (OpenTelemetry)
- [ ] Canary deployment (1 dealer primero)
- [ ] Monitoring + alerts

### Sprint 9: Catálogo Público (Semanas 9-10)

**Solo cuando:**

- Marketplace automation está estable (>99.9% success rate)
- No hay fires operativos
- Hay capacidad para "nice-to-haves"

---

## ⚠️ RIESGOS TÉCNICOS Y MITIGACIÓN

### 1. Facebook App Rejection

**Probabilidad**: Media (30%)
**Impacto**: CRÍTICO (bloquea desarrollo)
**Mitigación**:

- Plan B: Selenium automation (fallback)
- Plan C: CSV upload manual
- Iniciar múltiples apps en paralelo

---

### 2. Rate Limit Blocks

**Probabilidad**: Alta (60%)
**Impacto**: Alto (publicaciones fallan)
**Mitigación**:

- Token bucket algorithm
- Priority queue (dealers premium primero)
- Exponential backoff
- Monitoring de queue depth

---

### 3. Token Expiration

**Probabilidad**: Media (40%)
**Impacto**: Alto (dealer pierde servicio)
**Mitigación**:

- Auto-refresh 48hs antes
- Alertas tempranas
- Manual refresh option

---

### 4. Webhook Failures

**Probabilidad**: Media (30%)
**Impacto**: Medio (desincronización)
**Mitigación**:

- Dead letter queue
- Idempotency keys
- Status polling fallback

---

## ✅ CHECKLIST BACKEND PARA IMPLEMENTAR

### Para Marketplace Integration:

- [ ] Task Queue (Redis + Taskiq/Celery)
- [ ] Circuit Breakers implementation
- [ ] OAuth Facebook flow
- [ ] Graph API client
- [ ] Rate limiting (token bucket)
- [ ] Webhook listener + deduplication
- [ ] Image upload optimization
- [ ] Error handling + retries
- [ ] Re-publication scheduler
- [ ] IA titles/descriptions (OpenAI/Claude)
- [ ] Observability (tracing)
- [ ] Monitoring + alerts
- [ ] Canary deployment

### Para Catálogo Público:

- [ ] Public API endpoints
- [ ] SEO metadata generation
- [ ] Caching layer (Redis)
- [ ] CDN configuration (Vercel Edge)
- [ ] Rate limiting (public API)
- [ ] Pagination optimization

**Nota**: Marketplace automation es supervivencia. Catálogo público es nice-to-have.

---

**Estado del Cerebro 5**: ✅ ANÁLISIS COMPLETO
**Confianza en recomendación**: 90%
**Nivel de urgencia**: 🔴 CRÍTICA
