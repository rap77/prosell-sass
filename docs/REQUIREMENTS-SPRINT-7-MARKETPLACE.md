# REQUIREMENTS - Sprint 7+ Marketplace Integration

**Fecha**: 2026-03-06
**Sprint**: 7+ (Marketplace Integration - Facebook)
**Timeline**: 6 semanas (Mar 10 - Abr 21, 2026)
**Prioridad**: 🔴 CRÍTICA

---

## 📋 TABLA DE CONTENIDOS

1. [Contexto y Justificación](#contexto-y-justificación)
2. [Modelo de Negocio](#modelo-de-negocio)
3. [Roles y Permisos](#roles-y-permisos)
4. [Modelo de Datos](#modelo-de-datos)
5. [Integración Facebook](#integración-facebook)
6. [Scraping System](#scraping-system)
7. [Gestión de Leads](#gestión-de-leads)
8. [Multi-Idioma](#multi-idioma)
9. [Dashboard y Métricas](#dashboard-y-métricas)
10. [Requisitos Técnicos](#requisitos-técnicos)
11. [Prioridades MVP](#prioridades-mvp)
12. [Dependencies Externas](#dependencies-externas)

---

## 1. CONTEXTO Y JUSTIFICACIÓN

### Por qué este Sprint es CRÍTICO

**Problema Actual**: "Muerte por Éxito"

```
HOY:     5 dealers × 15 autos = ~75 pubs/día (manejable)
+3 MESES: 10 dealers × 15 autos = ~150 pubs/día (IMPOSIBLE manual)
+6 MESES: 20 dealers × 15 autos = ~225 pubs/día (COLAPSO)
```

**Sin automatización**:

- Empleados de ProSell se queman
- Calidad de publicaciones cae
- Dealers se van por incapacidad operativa
- Negocio muere por éxito

**Solución**: Marketplace Integration para automatizar publicaciones y habilitar escalabilidad.

---

## 2. MODELO DE NEGOCIO

### 2.1 Servicios Gestionados (NO SaaS Self-Service)

ProSell es una **agencia de servicios** que gestiona inventario, publicaciones y leads para dealers.

**Flujo Principal**:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Dealer entrega inventario                                │
│    - WhatsApp group (notifica autos nuevos/vendidos)        │
│    - Sitio web (para scraping)                              │
│    - En persona (lista de autos)                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Admin ProSell carga/valida/scraping                      │
│    - Validación contra estructura Facebook                  │
│    - Normalización de datos                                 │
│    - Asignación a vendedor/manager                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Vendedor ProSell publica usando SU cuenta Facebook      │
│    - Publicación automática en Marketplace                   │
│    - Re-publicación programada (posts vencen a 7 días)      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Lead se manifiesta interesado (WhatsApp/Messenger)      │
│    - Asistente IA vendedor conversa                         │
│    - Ofrece opciones similares                              │
│    - Intenta cerrar venta / generar cita                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Lead calificado → n8n → Odoo CRM                        │
│    - Solo si muestra interés genuino                        │
│    - Si quiere producto no disponible: contactar si se logra│
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. ProSell gestiona hasta cierre                           │
│    - Source of truth: ProSell                              │
│    - Odoo: solo CRM                                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Fuentes de Inventario

**Prioridad de fuentes**:

1. **WhatsApp Group** (Dealer notifica nuevo/vendido)
   - Dealer envía fotos + info al grupo
   - Admin ProSell recibe y carga

2. **Sitio Web del Dealer** (Scraping automático)
   - Servicio diario detecta cambios
   - Scraping incremental (deduplicación)
   - Agentes IA extraen información

3. **En Persona** (Lista de autos)
   - Dealer entrega lista física/digital
   - Admin ProSell ingresa manualmente

---

## 3. ROLES Y PERMISOS

### 3.1 Jerarquía de Roles

```
Admin ProSell (Dios)
    ├── Full control: inventario, publicaciones, leads, métricas
    ├── Asigna managers a dealers
    └── Asigna vendedores a dealers

Manager ProSell (Líder de Equipo)
    ├── Ve dealers asignados por Admin
    ├── Ve vendedores bajo su mando
    ├── Asigna vendedores a dealers (de sus equipos)
    └── Dashboard de su equipo

Vendedor ProSell (Ejecutor)
    ├── Ve dealers asignados (por Admin o Manager)
    ├── Publica usando SU cuenta Facebook
    ├── Ve leads de SU nivel (solo sus asignados)
    └── Dashboard personal con métricas

Dealer (Cliente)
    ├── Ve/modifica SOLO su inventario
    ├── NO ve leads (leads son de ProSell actualmente)
    ├── Puede tener dashboard propio
    └── Puede existir SIN cuenta/correo (gestionado por Admin)
```

### 3.2 Matriz de Permisos

| Acción                        | Admin | Manager        | Vendedor      | Dealer |
| ----------------------------- | ----- | -------------- | ------------- | ------ |
| Ver TODO inventario           | ✅    | ✅             | ✅            | ❌     |
| Ver inventario assigned       | ✅    | ✅             | ✅            | ✅     |
| Modificar TODO inventario     | ✅    | ❌             | ❌            | ❌     |
| Modificar inventario assigned | ✅    | ✅             | ❌            | ✅     |
| Publicar (cualquier cuenta)   | ✅    | ❌             | ❌            | ❌     |
| Publicar (su cuenta)          | ✅    | ✅             | ✅            | ✅     |
| Ver TODO leads                | ✅    | ❌             | ❌            | ❌     |
| Ver leads assigned            | ✅    | ✅             | ✅            | ❌     |
| Asignar vendedores            | ✅    | ✅             | ❌            | ❌     |
| Crear dealers sin cuenta      | ✅    | ❌             | ❌            | ❌     |
| Ver métricas globales         | ✅    | ✅ (su equipo) | ✅ (personal) | ❌     |
| Eliminar inventario           | ✅    | ❌             | ❌            | ❌     |

### 3.3 Asignación de Vendedores a Dealers

**Reglas**:

- Admin ProSell asigna vendedores o managers a dealers
- Un vendedor puede tener múltiples dealers
- Un dealer puede tener múltiples vendedores
- Manager puede asignar vendedores de su equipo

**Dealer sin cuenta**:

- Admin lo crea como organización sin correo
- No tiene cuenta de usuario registrada
- Acceso via `dealer_id` o `tenant_id`
- ID único = dealer_id/tenant_id (NUNCA teléfono)

---

## 4. MODELO DE DATOS

### 4.1 Decisión de Arquitectura: field_config + JSONB

**Seleccionado**: Opción B (field_config + JSONB)

**Justificación**:

- ✅ Sprint 5-6 ya usa este patrón
- ✅ Fácil agregar nuevos productos sin código
- ✅ Validación dinámica por categoría
- ✅ JSONB soporta queries en PostgreSQL

**Estructura**:

```python
class Category(Base):
    """Categorías jerárquicas multi-level"""
    id: UUID
    name: MultiLanguageString  # {"es": "Automóviles", "en": "Cars"}
    parent_id: UUID | None  # Para jerarquía
    level: int  # Para profundidad de jerarquía
    product_type: str  # "vehicles", "real_estate", "perfumes", etc.

class FieldConfig(Base):
    """Configuración dinámica de campos por categoría"""
    id: UUID
    category_id: UUID
    field_name: str  # "make", "model", "year", etc.
    field_type: FieldType  # "text", "number", "select", "multiselect"
    required: bool
    validation_rules: JSONB  # {"min": 1900, "max": 2026}
    options: JSONB | None  # Para select: ["Toyota", "Ford", ...]
    multi_language: bool  # Si el campo es multi-idioma

class Product(Base):
    """Productos con datos dinámicos"""
    id: UUID
    tenant_id: UUID  # dealer_id
    category_id: UUID
    title: MultiLanguageString
    description: MultiLanguageString
    price: Money
    images: List[Image]
    data: JSONB  # Datos dinámicos validados contra FieldConfig
    status: ProductStatus  # "draft", "published", "sold", "pending_approval"
    source: ProductSource  # "whatsapp", "scraping", "manual", "api"
    source_url: str | None  # Si viene de scraping
    created_at: datetime
    updated_at: datetime

class Publication(Base):
    """Publicaciones en marketplaces"""
    id: UUID
    product_id: UUID
    marketplace: Marketplace  # "facebook", "autotrader", etc.
    marketplace_id: str  # ID de publicación en Facebook
    seller_user_id: UUID  # Vendedor ProSell que publicó
    facebook_account_id: UUID | None  # Cuenta Facebook usada
    status: PublicationStatus  # "pending", "published", "failed", "expired"
    published_at: datetime | None
    expires_at: datetime | None  # Posts vencen a 7 días
    republished_count: int
    created_at: datetime
```

### 4.2 Categorías de Productos

**Vehículos** (Jerarquía multi-level):

```
Vehículos
├── Automóviles
│   ├── Sedan
│   ├── SUV
│   ├── Hatchback
│   ├── Coupé
│   ├── Convertible
│   └── ... (tantos niveles como necesite)
├── Camiones
│   ├── Livianos
│   ├── Pesados
│   └── ...
├── Motos
├── Bicicletas
├── Barcos
├── Yates
├── Aviones
└── Tractores
```

**Otros Productos**:

- Real Estate (inmuebles)
- Perfumes
- Electrónicos
- Productos de consumo masivo

**Cada producto tiene**:

- Categorías y subcategorías (multi-level)
- Campos particulares específicos (via FieldConfig)
- Maestros/estructuras de Facebook (si existen)

### 4.3 Campos Dinámicos por Producto

**Ejemplo Vehículos**:

```json
{
  "make": "Toyota",
  "model": "Corolla",
  "year": 2021,
  "mileage": 45000,
  "transmission": "automatic",
  "fuel_type": "gasoline",
  "vin": "2T1BURHE1MC123456",
  "color": "silver",
  "doors": 4,
  "cylinder_count": 4
}
```

**Ejemplo Real Estate**:

```json
{
  "property_type": "house",
  "bedrooms": 3,
  "bathrooms": 2,
  "square_meters": 150,
  "address": "Calle Falsa 123",
  "city": "Madrid",
  "country": "Spain",
  "parking": true,
  "pool": false
}
```

### 4.4 Validación

**Backend valida ANTES de crear en DB**:

```python
async def create_product(dto: CreateProductDTO):
    # 1. Obtener FieldConfig de la categoría
    field_configs = await get_field_configs(dto.category_id)

    # 2. Validar cada campo contra su config
    for config in field_configs:
        if config.required and config.field_name not in dto.data:
            raise ValidationError(f"{config.field_name} is required")

        value = dto.data[config.field_name]

        # Validar tipo
        if config.field_type == "number":
            if not isinstance(value, (int, float)):
                raise ValidationError(f"{config.field_name} must be number")

        # Validar reglas
        if config.validation_rules:
            if "min" in config.validation_rules and value < config.validation_rules["min"]:
                raise ValidationError(f"{config.field_name} below minimum")

        # Validar opciones (para select)
        if config.field_type == "select":
            if value not in config.options:
                raise ValidationError(f"{config.field_name} invalid option")

    # 3. Si pasa validación, crear en DB
    product = await create_product_in_db(dto)
    return product
```

**Beneficio**: Si validamos ANTES de DB, no necesitamos validar antes de Facebook (ya está validado con standard de Facebook).

---

## 5. INTEGRACIÓN FACEBOOK

### 5.1 OAuth Dinámico por Vendedor

**Flujo**:

```
1. Admin ProSell crea/configura vendedor
2. Admin solicita conectar cuenta Facebook del vendedor
3. Vendedor autoriza ProSell en Facebook
4. Recibimos short-lived token (1 hora)
5. Exchange por long-lived token (60 días)
6. Guardar token en DB (vinculado a vendedor)
7. Auto-refresh 48hs antes de expirar
```

**Modelo de Datos**:

```python
class FacebookAccount(Base):
    """Cuentas de Facebook de vendedores"""
    id: UUID
    seller_user_id: UUID  # Vendedor ProSell
    facebook_user_id: str  # ID de usuario en Facebook
    access_token: str  # Encriptado
    token_expires_at: datetime
    pages: List[FacebookPage]  # Páginas del vendedor
    status: AccountStatus  # "active", "expired", "revoked"
    created_at: datetime
    updated_at: datetime

class FacebookPage(Base):
    """Páginas de Facebook (donde se publican)"""
    id: UUID
    facebook_account_id: UUID
    page_id: str  # ID de página en Facebook
    page_name: str
    page_access_token: str  # Encriptado
    category: str  # "Vehicle Dealer", etc.
```

### 5.2 Graph API Client

**Componentes**:

**Rate Limiting**:

```python
class FacebookRateLimiter:
    """Token bucket algorithm para rate limiting"""
    def __init__(self, calls_per_hour: int = 200):
        self.tokens = calls_per_hour
        self.rate = calls_per_hour / 3600  # Tokens por segundo
        self.last_update = time.time()

    async def acquire(self):
        now = time.time()
        elapsed = now - self.last_update
        self.tokens = min(self.calls_per_hour, self.tokens + elapsed * self.rate)
        self.last_update = now

        if self.tokens < 1:
            wait_time = (1 - self.tokens) / self.rate
            await asyncio.sleep(wait_time)
            self.tokens = 0
        else:
            self.tokens -= 1
```

**Graph API Client**:

```python
class FacebookGraphAPIClient:
    """Cliente para Facebook Graph API"""
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://graph.facebook.com/v19.0"
        self.rate_limiter = FacebookRateLimiter()

    async def publish_marketplace_listing(
        self,
        page_id: str,
        product: Product
    ) -> str:
        """Publica producto en Facebook Marketplace"""
        await self.rate_limiter.acquire()

        url = f"{self.base_url}/{page_id}/feed"
        data = {
            "message": self._format_message(product),
            "photos": self._upload_images(product.images),
            "published": False,  # Borrador primero
            # ... más campos según Facebook API
        }

        response = await httpx.post(url, json=data)
        return response.json()["id"]
```

### 5.3 Webhook Listener

**Para actualizaciones de Facebook**:

```python
@app.post("/webhooks/facebook")
async def facebook_webhook(request: Request):
    """Recibe actualizaciones de Facebook"""
    payload = await request.json()

    # Verificar signature de Facebook
    if not verify_facebook_signature(payload):
        raise HTTPException(401)

    # Procesar eventos
    for entry in payload["entry"]:
        for change in entry.get("changes", []):
            if change["field"] == "feed":
                await handle_feed_update(change["value"])

    return {"status": "ok"}

async def handle_feed_update(update: dict):
    """Procesa actualización de feed"""
    post_id = update["post_id"]
    status = update["value"]  # "published", "removed", etc.

    # Actualizar estado en DB
    publication = await get_publication_by_marketplace_id(post_id)
    if status == "removed":
        publication.status = "removed"
    elif status == "published":
        publication.status = "published"

    await save_publication(publication)
```

**Deduplication**:

- Webhooks pueden llegar desordenados
- Usar `id` de publicación como clave única
- Dead letter queue para fallos

### 5.4 Re-publicación Programada

**Posts vencen a los 7 días en Facebook**:

```python
@task(broker=redis_broker)
async def republish_expired_listings():
    """Re-publica listings que vencen"""
    # Buscar publicaciones que expiran en 24h
    expiring = await get_expiring_publications(hours=24)

    for publication in expiring:
        # Re-publicar
        await facebook_client.publish_marketplace_listing(
            page_id=publication.facebook_page_id,
            product=publication.product
        )

        # Actualizar contador
        publication.republished_count += 1
        publication.expires_at = datetime.now() + timedelta(days=7)
        await save_publication(publication)
```

---

## 6. SCRAPING SYSTEM

### 6.1 Detector de Cambios Diario

**Servicio que corre diariamente**:

```python
@task(schedule=[{"cron": "0 9 * * *"}])  # 9 AM todos los días
async def daily_change_detection():
    """Detecta cambios en sitios web de dealers"""
    dealers = await get_dealers_with_websites()

    for dealer in dealers:
        # Detectar si hay cambios
        has_changes = await detect_website_changes(dealer.website_url)

        if has_changes:
            # Trigger scraping
            await scrape_dealer_website.task(dealer_id=dealer.id)
```

### 6.2 Scraper Incremental

**Con detección de duplicados**:

```python
async def scrape_dealer_website(dealer_id: UUID):
    """Scrapea sitio web de dealer incrementalmente"""
    dealer = await get_dealer(dealer_id)
    scraper = create_scraper(dealer.website_url)

    # Obtener productos del sitio
    products_data = await scraper.extract_products()

    # Deduplicación
    for product_data in products_data:
        # Buscar si ya existe
        existing = await find_product_by_vin_or_url(
            dealer_id=dealer.id,
            vin=product_data.get("vin"),
            source_url=product_data.get("url")
        )

        if existing:
            # Actualizar si cambió
            if has_product_changed(existing, product_data):
                await update_product(existing.id, product_data)
        else:
            # Crear nuevo
            await create_product_for_dealer(dealer.id, product_data)
```

### 6.3 Agentes IA para Extracción

**Para sitios difíciles o no estructurados**:

```python
class AIExtractionAgent:
    """Agente IA para extraer información de sitios no estructurados"""
    def __init__(self, openai_client):
        self.client = openai_client
        self.prompt_template = """
        Extrae información de vehículos del siguiente HTML:
        {html}

        Devuelve JSON con:
        - make (marca)
        - model (modelo)
        - year (año)
        - price (precio)
        - mileage (kilometraje)
        - transmission (transmisión)
        - images (URLs de imágenes)
        """

    async def extract(self, html: str) -> dict:
        prompt = self.prompt_template.format(html=html[:10000])

        response = await self.client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )

        return json.loads(response.choices[0].message.content)
```

---

## 7. GESTIÓN DE LEADS

### 7.1 Flujo de Leads

```
Lead se manifiesta interesado
    ↓
WhatsApp/Messenger recibe mensaje
    ↓
Trigger en ProSell (webhook)
    ↓
Asistente Vendedor IA conversa
    - Pregunta necesidades específicas
    - Ofrece productos similares
    - Intenta cerrar venta / generar cita
    ↓
Lead CALIFICADO (genuino interés)
    ↓
Webhook ProSell → n8n → Odoo CRM
    - Crear cliente en Odoo
    - Asignar a vendedor
    - Iniciar seguimiento
    ↓
ProSell gestiona hasta cierre
```

### 7.2 Asistente Vendedor IA

**Funcionalidades**:

```python
class AIVendorAssistant:
    """Asistente vendedor IA"""
    async def handle_lead(self, lead_message: str, product: Product):
        # 1. Analizar intención del lead
        intent = await self.analyze_intent(lead_message)

        if intent == "interested":
            # 2. Pregunta para calificar
            questions = [
                "¿Estás buscando este vehículo en particular?",
                "¿Tienes un presupuesto en mente?",
                "¿Cuándo estás planeando comprar?",
            ]

            # 3. Buscar productos similares si es abierto
            if self.is_open_to_alternatives(lead_message):
                similar = await find_similar_products(product, lead_message)
                response = self.offer_alternatives(similar)

            # 4. Si hay interés genuino, generar cita
            if self.is_qualified_lead(intent, responses):
                appointment = await self.schedule_appointment()

                # 5. Enviar a Odoo solo si calificado
                await self.send_to_odoo(lead, product, appointment)
```

### 7.3 Webhook ProSell → n8n → Odoo

**Endpoint en ProSell**:

```python
@app.post("/webhooks/lead-qualified")
async def lead_qualified(lead: QualifiedLead):
    """Recibe lead calificado del asistente IA"""

    # Enviar a n8n (que luego manda a Odoo)
    async with httpx.AsyncClient() as client:
        await client.post(
            settings.N8N_WEBHOOK_URL,
            json={
                "lead_name": lead.name,
                "lead_phone": lead.phone,
                "lead_email": lead.email,
                "product_interest": lead.product_id,
                "dealer_id": lead.dealer_id,
                "seller_id": lead.seller_id,
                "similar_interests": lead.similar_interests,  # Camioneta 7 puestos
                "appointment_scheduled": lead.appointment is not None,
            }
        )

    return {"status": "queued"}
```

**n8n Workflow**:

- Recibe webhook de ProSell
- Crea/actualiza cliente en Odoo
- Asigna a vendedor correspondiente
- Crea tarea de seguimiento

---

## 8. MULTI-IDIOMA

### 8.1 Requisito

Plataforma multi-idioma **por defecto**:

- Español (es)
- Inglés (en)
- Escalable a otros idiomas en el futuro

### 8.2 Estructura Multi-Idioma

**Para textos (UI, labels)**:

```python
class MultiLanguageString(Base):
    """String multi-idioma"""
    es: str
    en: str
    # Futuro: fr, de, it, etc.

# Ejemplo:
category = Category(
    name=MultiLanguageString(
        es="Automóviles",
        en="Cars"
    )
)
```

**Para maestros (options de select)**:

```json
{
  "makes": {
    "es": ["Toyota", "Ford", "Chevrolet", "Honda"],
    "en": ["Toyota", "Ford", "Chevrolet", "Honda"]
  },
  "models": {
    "Toyota": {
      "es": ["Corolla", "Camry", "RAV4", "Hilux"],
      "en": ["Corolla", "Camry", "RAV4", "Hilux"]
    }
  }
}
```

### 8.3 Detección de Idioma

**Para usuarios**:

```python
def get_user_language(request: Request) -> str:
    """Detecta idioma del usuario"""
    # 1. Header Accept-Language
    accept_language = request.headers.get("accept-language", "")
    if "es" in accept_language:
        return "es"

    # 2. Query param
    lang = request.query_params.get("lang")
    if lang in ["es", "en"]:
        return lang

    # 3. Usuario guardado en DB
    if request.user:
        return request.user.language

    # Default: español
    return "es"
```

---

## 9. DASHBOARD Y MÉTRICAS

### 9.1 Dashboard por Rol

**Admin ProSell**:

- Inventario total (todos dealers)
- Publicaciones/día (total y por dealer)
- Leads totales (todos)
- Métricas de vendedores/managers
- Performance de publicaciones
- Revenue por dealer

**Manager ProSell**:

- Dealers asignados
- Vendedores bajo su mando
- Publicaciones de su equipo
- Leads de su equipo
- Métricas de sus vendedores

**Vendedor ProSell**:

- Dealers asignados
- Sus publicaciones
- Sus leads (asignados)
- Métricas personales (ventas, citas, etc.)

**Dealer**:

- Su inventario
- Sus publicaciones
- Performance de sus productos
- NO ve leads (actualmente)

### 9.2 Métricas Clave

**Publicaciones**:

- Publicaciones/día
- Time-to-publish (objetivo: <30 segundos)
- API Success Rate (objetivo: >99.9%)
- Posts expirados vs republishes
- Engagement (views, likes, messages)

**Leads**:

- Leads/día
- Leads calificados vs no calificados
- Leads por producto
- Leads por dealer
- Leads por vendedor
- Conversion rate (lead → venta)

**Inventario**:

- Productos totales
- Productos publicados
- Productos vendidos
- Productos pendientes
- Productos por categoría

---

## 10. REQUISITOS TÉCNICOS

### 10.1 Task Queue System

**Requerimiento**: CRÍTICO (no hay task queue en stack actual)

**Tecnología**: Taskiq o Celery (pendiente decisión)

**Componentes**:

```python
# Worker
from taskiq import TaskiqBroker

broker = RedisBroker(url="redis://localhost:6379/2")

@task(broker=broker)
async def publish_to_facebook(product_id: UUID, seller_id: UUID):
    """Publica producto en Facebook"""
    # Implementación...

# Scheduler
from taskiq.scheduler import TaskiqScheduler

scheduler = TaskiqScheduler(broker=broker)

@scheduler.scheduled(cron="0 9 * * *")  # 9 AM
async def daily_republish():
    """Re-publica listings expirados"""
    # Implementación...
```

**Features**:

- Async workers
- Retry logic con exponential backoff
- Dead letter queue
- Scheduled tasks (para re-publicación)

### 10.2 Circuit Breakers

**Para Facebook API failures**:

```python
class FacebookCircuitBreaker:
    def __init__(self, threshold: int = 5, timeout: int = 60):
        self.state = CircuitState.CLOSED
        self.failures = 0
        self.threshold = threshold
        self.timeout = timeout

    async def call(self, api_call, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpenError("Circuit is OPEN")

        try:
            result = await api_call(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
```

### 10.3 Health Checks

**Endpoint para monitoreo**:

```python
@app.get("/health/integrations")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "facebook": {
            "status": "healthy",
            "active_accounts": 5,
            "expiring_soon": 1,
            "queue_depth": 12,
            "circuit_breaker_state": "closed"
        },
        "redis": {
            "status": "healthy",
            "memory_usage": "45MB",
            "connected_clients": 3
        },
        "database": {
            "status": "healthy",
            "pool_size": 10,
            "active_connections": 3
        }
    }
```

### 10.4 Multi-Idioma System

**Estructura de archivos**:

```
apps/api/src/prosell/infrastructure/i18n/
├── __init__.py
├── locales/
│   ├── es.json
│   └── en.json
└── translator.py
```

**Ejemplo de locale**:

```json
{
  "categories": {
    "vehicles": {
      "name": "Vehículos",
      "subcategories": {
        "automobiles": "Automóviles",
        "suvs": "SUVs",
        "trucks": "Camiones"
      }
    }
  },
  "fields": {
    "make": "Marca",
    "model": "Modelo",
    "year": "Año",
    "mileage": "Kilometraje"
  },
  "validation": {
    "required": "Este campo es requerido",
    "min_value": "El valor mínimo es {min}",
    "max_value": "El valor máximo es {max}"
  }
}
```

---

## 11. PRIORIDADES MVP

### 11.1 CRÍTICO (Sí, va en Sprint 7+)

✅ **Publicación automática en Facebook**

- Task Queue setup
- OAuth dinámico por vendedor
- Graph API client + rate limiting
- Webhook listener
- Re-publicación programada

✅ **Scraping automático de webs**

- Detector de cambios diario
- Scraper incremental (deduplicación)
- Agentes IA para extracción
- OBLIGATORIO para dealers con sitios web

✅ **Dashboard vendedores**

- Ver dealers asignados
- Ver sus publicaciones
- Ver sus leads (asignados)
- Métricas personales

✅ **Dashboard dealers**

- Ver su inventario
- Ver sus publicaciones
- Performance de sus productos
- Modificar su inventario

### 11.2 POSTERGADO (Sprint posterior)

⏸️ **Webhook Odoo (desarrollo)**

- Integración con n8n: SÍ
- Desarrollo del webhook: NO (próximo sprint)
- Flujo completo: NO (próximo sprint)

---

## 12. DEPENDENCIES EXTERNAS

### 12.1 Facebook App Review

**Lead Time**: 14-30 días
**Acción**: INICIAR DÍA 1 del Sprint 7+

**Permissions requeridos**:

- `pages_manage_posts`
- `pages_read_engagement`
- `pages_manage_metadata`
- `pages_read_user_content`
- `pages_manage_engagement`

**Plan de Mitigación**:

- Plan B: CSV upload + Selenium
- Plan C: Manual publishing fallback

### 12.2 Otros Servicios

**OpenAI/Claude API** (IA titles, asistente vendedor):

- Lead Time: 1 día
- Priority: Alta

**Redis** (Task Queue, caching):

- Ya en stack
- Priority: CRÍTICA

**n8n** (Webhook Odoo):

- Lead Time: 1 día setup
- Priority: Media (desarrollo posterior)

---

## 13. MÉTRICAS DE ÉXITO

### 13.1 Objetivos Sprint 7+

| Métrica             | Hoy        | Objetivo 6 semanas  | Objetivo 12 semanas |
| ------------------- | ---------- | ------------------- | ------------------- |
| Publicaciones/día   | ~75 manual | ~75 automático <30s | 150+ automático     |
| Dealers activos     | 5          | 5 (retención 100%)  | 10                  |
| API Success Rate    | N/A        | >99.9%              | >99.9%              |
| Time-to-Publish     | Minutos    | <30 segundos        | <30 segundos        |
| Churn Rate          | 0%         | 0%                  | <5%                 |
| Dealer Satisfaction | 7/10       | 9/10                | 9/10                |

### 13.2 Checkpoint Post-Sprint 7+

**Fecha**: Abr 21, 2026

**Preguntas**:

1. Marketplace Automation funciona?
   - [ ] Dealers pueden publicar sin intervención humana
   - [ ] API Success Rate > 99.9%
   - [ ] Time-to-publish < 30 segundos
   - [ ] Churn = 0%

2. Capacidad de escala lograda?
   - [ ] Sistema soporta 10 dealers (150 pubs/día)
   - [ ] Queue depth estable (<50 items)
   - [ ] No degradation de performance

3. Dealers satisfechos?
   - [ ] NPS > 8
   - [ ] 0 quejas sobre latencia
   - [ ] Feedback positivo

**SI TODO SÍ** → Continuar con Sprint 9 (Catálogo Público)
**SI ALGÚN NO** → Investigar, corregir, re-evaluar timeline

---

## 14. ARCHIVOS Y RECURSOS

### 14.1 Documentos Relacionados

- [Executive Summary Auditoría](./audit/EXECUTIVE-SUMMARY.md)
- [Roadmap v3.0 PIVOT](./ROADMAP-PROSELL-SAAS-V3-PIVOT.md)
- [Reevaluación PMF](./REEVALUACION-PRODUCT-MARKET-FIT-2026-03-04.md)

### 14.2 Archivos del Usuario (Pendientes)

- ⏳ Maestros de Facebook (vehículos) en .json
- ⏳ URLs de sitios web de dealers
- ⏳ Documentación de categorías Facebook Marketplaces

---

## 15. PRÓXIMOS PASOS

### Inmediato (Día 1-2)

1. **Decisión técnica**: Taskiq vs Celery
2. **Facebook App Review**: Iniciar proceso
3. **Setup Task Queue**: Instalar y configurar
4. **Setup Staging**: Environment para testing

### Corto Plazo (Semana 1-2)

1. Circuit Breakers implementation
2. Health Checks endpoint
3. OAuth Facebook flow
4. Scraping detector diario

### Medio Plazo (Semana 3-6)

1. Graph API client completo
2. Webhook listener
3. Asistente IA vendedor
4. Dashboards (vendedores + dealers)
5. Re-publicación programada
6. Testing + QA
7. Canary Deployment

---

**ESTADO**: ✅ REQUISITOS COMPLETOS
**PRÓXIMO PASO**: Diseñar arquitectura técnica detallada
