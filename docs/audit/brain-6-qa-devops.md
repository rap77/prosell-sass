# CEREBRO 6: QA/DEVOPS - Análisis Completo

**Fecha**: 2026-03-05
**Proyecto**: ProSell SaaS
**Contexto**: Sprint 5-6 completado, auditoría de testing y operaciones

---

## 🧪 COBERTURA DE TESTS ACTUAL

### Estado Actual: Sólido pero insuficiente para marketplace

| Suite          | Tests            | Status                     | Gap                       |
| -------------- | ---------------- | -------------------------- | ------------------------- |
| **Backend**    | 325/325 ✅       | 100% passing               | Falta: Facebook API mocks |
| **Frontend**   | 358/358 ✅       | 100% passing               | Falta: Contract tests     |
| **E2E**        | 33/33 ✅         | 91% passing (8/10 Vehicle) | Falta: Webhook tests      |
| **Pyright**    | 0 errores ✅     | Type safe                  | -                         |
| **Pre-commit** | GGA + linters ✅ | Automatizado               | -                         |

**Conclusión**: Base excelente, pero marketplace integration requiere nuevos tipos de tests.

---

## 🔍 COBERTURA DE TESTS PARA FACEBOOK INTEGRATION

### 1. Unit Tests (ya tenemos cobertura, extender)

**Qué necesitamos:**

```python
# Tests nuevos requeridos
def test_facebook_oauth_flow():
    # Simular exchange de tokens
    # Validar scopes otorgados
    # Testear token refresh

def test_graph_api_rate_limit():
    # Simular rate limit response
    # Validar exponential backoff
    # Testear retry logic

def test_webhook_processing():
    # Simular webhook de Facebook
    # Validar deduplication
    # Testear actualización de estado
```

**Estimado**: 2 semanas

---

### 2. Contract Tests (NUEVO - crítico)

**Qué son:**

```python
# Pruebas de contrato con API externa
def test_facebook_api_contract():
    # Asegurar que nuestra app y Facebook API
    # hablan el mismo idioma

    # Si Facebook cambia un campo:
    # - El test debe fallar en el pipeline
    # - No podemos agotar cuota en CI
```

**Por qué son CRÍTICOS:**

- Facebook puede cambiar API sin warning
- Queremos saber antes de producción
- Previene roturas de producción

**Estimado**: 1 semana

---

### 3. Integration Tests (Webhooks)

**Qué necesitamos:**

```python
# Tests de integración asíncrona
async def test_publication_lifecycle():
    # 1. Dealer publica vehículo
    # 2. System llama Facebook API
    # 3. Facebook responde (success/error)
    # 4. System actualiza estado
    # 5. Webhook confirma publicación

    assert product.status == 'published'
```

**Por qué son necesarios:**

- Publicación es asíncrona
- Necesitamos testear el ciclo completo
- No basta con unit tests

**Estimado**: 2 semanas

---

## 📊 MONITOREO DE SALUD DE TERCEROS

### Observabilidad Externa (Modelo nuevo)

**Qué necesitamos implementar:**

#### 1. Circuit Breakers

**Qué es:**

```python
class FacebookCircuitBreaker:
    def __init__(self):
        self.state = 'closed'  # open, half-open
        self.failures = 0
        self.threshold = 5

    async def call_api(self, request):
        if self.state == 'open':
            raise CircuitBreakerOpenError()

        try:
            response = await facebook_api.call(request)
            self.reset_failures()
            return response
        except Exception:
            self.record_failure()
            if self.failures >= self.threshold:
                self.state = 'open'
```

**Por qué es CRÍTICO:**

- Si Facebook API falla repetidamente, abrimos el circuito
- Evita que nuestras colas colapsen el sistema
- Permite recuperación gradual (half-open)

**Estimado**: 3 días

---

#### 2. Tracing Distribuido

**Qué es:**

```python
# Rastrear ciclo de vida de publicación
Dealer click → [FastAPI] → [Queue] → [Facebook API]
   ↓                ↓            ↓
Dashboard      DB           Webhook confirmation
```

**Herramientas:**

- OpenTelemetry (tracing)
- Jaeger (visualization)
- Prometheus (metrics)

**Por qué es necesario:**

- No podemos ver qué pasa dentro de Facebook
- Necesitamos saber dónde falla
- Debugging de producción

**Estimado**: 1 semana

---

#### 3. Health Checks de Integración

**Qué es:**

```python
@app.get("/health/integrations")
async def health_check():
    return {
        "facebook": {
            "status": "healthy",
            "tokens_active": 5,
            "tokens_expiring_soon": 1,
            "queue_depth": 12
        }
    }
```

**Por qué es necesario:**

- Dashboard en tiempo real para ops
- Proactive monitoring (antes que falle)
- Dealer visibility (transparencia)

**Estimado**: 2 días

---

## 🚨 ALERTS CRÍTICOS A CONFIGURAR

### 1. Rate Limit Alert

**Qué es:**

```yaml
alert: RateLimitThreshold
condition: facebook_api_usage > 80%
action: Notify team + Throttle queue
```

**Por qué es CRÍTICO:**

- Si llegamos al 100%, Facebook nos banea
- 80% nos da tiempo de reaccionar
- Previene bloqueos de producción

**Configuración**: Datadog/Prometheus + Alertmanager

---

### 2. Queue Depth Alert

**Qué es:**

```yaml
alert: QueueDepthExplosion
condition: queue_size > 150
action: Scale workers + Notify ops
```

**Por qué es CRÍTICO:**

- Queue creciendo exponencialmente = workers fallando
- 150 es 2× el volumen normal (75 pubs/día)
- Previene colapso de memoria

**Configuración**: Redis monitoring + alerts

---

### 3. Token Expiration Alert

**Qué es:**

```yaml
alert: TokenExpiringSoon
condition: token_expires < 48h
action: Auto-refresh + Notify dealer
```

**Por qué es CRÍTICO:**

- Token expirado = dealer sin servicio
- 48hs da tiempo de refresh manual
- Previene interrupción de servicio

**Configuración**: Sistema de monitoreo de tokens

---

### 4. Error Rate Alert

**Qué es:**

```yaml
alert: HighErrorRate
condition: error_rate > 5%
action: Investigate + Scale down
```

**Por qué es CRÍTICO:**

- > 5% errores indica problema sistémico
- Puede ser Facebook API issue
- Previene cascade failures

**Configuración**: Sentry + custom metrics

---

## 🚀 RIESGO DE DEPLOY

### Opción A: Catálogo Público

**Nivel de Riesgo**: BAJO

**Por qué:**

- Es principalmente una capa de LECTURA
- No hay estado mutable complejo
- Errores no impactan negocio directamente
- SEO y caching son problemas de performance, no de corrección

**Estrategia de deploy:**

- Blue-green deployment (Vercel)
- Feature flags por tenant
- Rollback instantáneo

**Estimado**: 1 día para deploy completo

---

### Opción B: Facebook Integration

**Nivel de Riesgo**: ALTO

**Por qué:**

- Es una capa de ESCRITURA con dependencias externas
- Errores impactan negocio directamente (dealers no pueden publicar)
- Facebook API puede cambiar sin warning
- Manejo de estado asíncrono complejo
- Gestión de estado multi-dealer

**Riesgos específicos:**

1. **Facebook API changes**: Cambio en API rompe integración
2. **Rate limiting**: Excedemos límites y nos bloquean
3. **Token issues**: Expiración o revocación masiva
4. **Queue failures**: Workers no procesan, cola crece infinitamente
5. **Data inconsistency**: Estado desincronizado entre DB y Facebook

**Estrategia de deploy:**

- **Canary Deployment** (CRÍTICO)
  - Dealer 1 primero (48h monitoreo)
  - Dealer 2-3 (72h monitoreo)
  - Resto de dealers (si éxito)

- **Feature flags por dealer**
  - `enable_facebook_publishing: true/false`
  - Rollback instantáneo por dealer

- **Monitoring intensivo**
  - Métricas en tiempo real
  - Dashboard de errores
  - Logs centralizados

**Estimado**: 1 semana para deploy completo (con canary)

---

## 📋 ESTRATEGIA QA/DEVOPS PRIORIZADA

### Sprint 7+: Marketplace QA (Semanas 1-6)

**Semana 1-2: Infraestructura**

- [ ] Configurar Task Queue en CI/CD
- [ ] Setup staging environment
- [ ] Implementar Circuit Breakers
- [ ] Setup health checks

**Semana 3-4: Tests**

- [ ] Contract Tests suite
- [ ] Facebook API mocks
- [ ] Unit tests de OAuth flow
- [ ] Unit tests de webhooks

**Semana 5: Deployment**

- [ ] Canary Deployment setup
- [ ] Monitoring + alerts
- [ ] Tracing distribuido
- [ ] Error tracking (Sentry)

**Semana 6: Production**

- [ ] Deploy to 1 dealer (48h monitoreo)
- [ ] Deploy to 3 dealers (72h monitoreo)
- [ ] Deploy to all 5 dealers
- [ ] Post-deployment review

---

## ✅ RECOMENDACIÓN QA/DEVOPS

### VEREDICTO: PRIORIZAR MARKETPLACE INTEGRATION

**Justificación:**

1. **El riesgo técnico es alto pero manejable**
   - Canary deployment mitiga riesgo
   - Feature flags permiten rollback
   - Monitoring da visibilidad

2. **El riesgo de NO hacer es fatal**
   - "Muerte por éxito" es real
   - 5 dealers actuales dependen de esto
   - Colapso operativo es inevitable sin automatización

3. **Tenemos la base técnica para hacerlo bien**
   - 716 tests passing = base sólida
   - Pyright 0 errores = type safety
   - Pre-commit automatizado = calidad

> "Seguir el Roadmap original (Sprint 7-8) nos daría una victoria estética, pero la Opción B nos da la infraestructura necesaria para no morir en el intento de escalar."

---

## 📊 CHECKLIST QA/DEVOPS PARA IMPLEMENTAR

### Para Marketplace Integration:

**Tests:**

- [ ] Contract Tests suite
- [ ] Facebook API mocks (todos los escenarios)
- [ ] Webhook integration tests
- [ ] OAuth flow tests
- [ ] Rate limiting tests
- [ ] End-to-end publication tests

**Monitoring:**

- [ ] Circuit Breakers implementation
- [ ] Tracing distribuido (OpenTelemetry)
- [ ] Health checks endpoint
- [ ] Metrics dashboard (Grafana)
- [ ] Error tracking (Sentry)

**Alerts:**

- [ ] Rate Limit Alert (80% threshold)
- [ ] Queue Depth Alert (>150 items)
- [ ] Token Expiration Alert (48h before)
- [ ] Error Rate Alert (>5%)
- [ ] API Success Rate (<99.9%)

**Deployment:**

- [ ] Canary Deployment setup
- [ ] Feature flags por dealer
- [ ] Rollback procedure
- [ ] Staging environment
- [ ] Blue-green fallback

### Para Catálogo Público:

**Tests:**

- [ ] SEO metadata tests
- [ ] Cache invalidation tests
- [ ] Performance tests (LCP < 2.5s)
- [ ] Accessibility tests (WCAG AA)

**Monitoring:**

- [ ] Pageviews tracking
- [ ] SEO rankings monitoring
- [ ] Core Web Vitals monitoring

**Alerts:**

- [ ] Error rate alert
- [ ] Performance degradation alert

---

**Estado del Cerebro 6**: ✅ ANÁLISIS COMPLETO
**Confianza en recomendación**: 90%
**Nivel de urgencia**: 🔴 CRÍTICA
