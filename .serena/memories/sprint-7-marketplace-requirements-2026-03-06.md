# Sprint 7+ Marketplace Requirements - 2026-03-06

## Modelo de Negocio: Servicio Gestionado (NO SaaS self-service)

**Flujo Principal**:
```
Dealer (entrega inventario)
    ↓
Admin ProSell (carga/valida/scraping)
    ↓
Vendedor ProSell (publica usando SU cuenta de Facebook)
    ↓
Facebook Marketplace
    ↓
Leads → WhatsApp/Messenger → Asistente IA → Odoo CRM (si interés genuino)
```

**Roles y Jerarquía**:
```
Admin ProSell (Full control)
    ↓
Manager ProSell (Líder de equipo, dealers asignados)
    ↓
Vendedor ProSell (Solo su cuenta Facebook, dealers asignados)
    ↓
Dealer (Solo su inventario, sin acceso a leads - actualmente)
```

**Puntos Clave**:
- ProSell es FUENTE DE VERDAD, Odoo solo es CRM
- No hay límites de publicación (por ahora)
- Vendedor se va = se lleva su cuenta, puede eliminar
- Vendedor se registra con cualquier correo, DEBE tener Facebook
- Futuro: cuentas para otros marketplaces (AutoTrader, etc.)
- Futuro: SaaS self-service cuando se pivotee

---

## P1. Scraping de Sitios Web de Dealers

### Respuestas:

**a)** No todos los dealers tienen sitio web, algunos desactualizados

**b)** Campo al registrar dealer + agente IA para extraer info (URLs a compartir)

**c)** Sitios fáciles y difíciles (Playwright puede manejar ambos)

**d)** Servicio diario que detecte cambios → scraping

**e)** Dealer notifica en WhatsApp grupo cada auto nuevo/vendido

**f)** Sí, detección de duplicados, scraping incremental

**g)** OBLIGATORIO para dealers con sitios web

**Marketplaces**: Scraping periódico de Facebook Marketplace/otros

### Implementación:

```python
# apps/api/src/prosell/infrastructure/scraping/
# Detector de cambios diario
# Scraper incremental con deduplicación
# Agentes IA para extracción inteligente
```

---

## P2. Modelo de Datos Multi-Producto

### DECISIÓN: field_config + JSONB (Opción B)

**Estructura**:
```python
class Category(Base):
    id, name, parent_id  # Vehículos → Automóviles → SUV
    # Multi-level hierarchy

class FieldConfig(Base):
    category_id, field_name, field_type, required, validation_rules
    # Configurable por categoría

class Product(Base):
    id, tenant_id, category_id
    data = JSONB  # {make: "Toyota", model: "Corolla", year: 2021}
    # Validado contra field_config
```

**Ventajas**:
- ✅ Sprint 5-6 ya usa este patrón
- ✅ Fácil agregar nuevos productos sin código
- ✅ Validación dinámica por categoría
- ✅ JSONB soporta queries en PostgreSQL

**Validación en Backend**: CRÍTICA

---

## P3. Validación de Campos Facebook

### Maestros:

**a)** Tiene archivo .json con maestros (inglés + español)

**b)** Para vehículos: SÍ, marcas, modelos, años, etc.

**c)** Para inmuebles: NO, hay que generarlos

**d)** Facebook API rechaza si campos inválidos (select box wrong option)

**e)** Validar ANTES de crear en DB (no antes de publicar, ya está validado)

### Multi-Idioma:

**Requisito**: Plataforma multi-idioma por defecto (es + en), escalable a otros

```python
# Maestros structure:
{
  "es": {
    "makes": ["Toyota", "Ford", "Chevrolet"],
    "models": {"Toyota": ["Corolla", "Camry", "RAV4"]}
  },
  "en": {
    "makes": ["Toyota", "Ford", "Chevrolet"],
    "models": {"Toyota": ["Corolla", "Camry", "RAV4"]}
  }
}
```

---

## P4. Webhook ProSell → n8n → Odoo

### Datos que fluyen:

- Nombre del lead
- Teléfono/WhatsApp
- Email (si tiene)
- Producto de interés
- Dealer originario
- Vendedor ProSell asignado
- **+ Productos similares** (ej: camioneta 7 puestos, no importa marca)

### Cuándo:

- Trigger en WhatsApp/Messenger cuando lead se manifiesta
- **Asistente vendedor IA**: Pregunta al lead, da opciones, trata de cerrar venta
- Llevar a Odoo SOLO si muestra interés genuino
- Si quiere producto no disponible: contactar si se consigue

### Implementación Sprint 7+:

- ✅ Integración con n8n última versión
- ✅ Diseñar flujo que monitoree WhatsApp y Messenger
- Endpoint webhook en ProSell para leads

---

## P5. Dealers sin Cuenta/Correo

### Gestión:

**a)** Sí, siguen existiendo dealers sin cuenta

**b)** No pueden ver leads (leads son de ProSell actualmente)

**c)** Admin lo crea como organización sin correo
   - Acceso via `dealer_id` o `tenant_id`
   - No tiene cuenta de usuario registrada

**d)** ID único = dealer_id/tenant_id (NUNCA teléfono que puede cambiar)

---

## P6. Categorías de Vehículos (Jerarquía)

### Estructura:

```
Vehículos
├── Automóviles
│   ├── Sedan
│   ├── SUV
│   ├── Hatchback
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

**Campos diferentes**:
- En tabla `products`: depende del producto
- Productos de consumo masivo SÍ tienen campos diferentes
- field_config maneja esto dinámicamente

**Documentación Facebook**: No la tiene, hay que averiguar

---

## P7. Futuro Marketplace (No solo Facebook)

### Timeline:

- **Sprint 7+**: SOLO Facebook
- **Cuando Facebook esté estable**: Otros marketplaces

**Otros Marketplaces**:
- AutoTrader
- CarGurus
- Craigslist
- Otros (posiblemente diferentes requisitos)

**Validación**: Cada marketplace puede tener sus propios maestros/campos

---

## P8. Dashboard de Vendedores ProSell

### Jerarquía de Acceso:

```
Admin ProSell
└── Puede ver TODO (todos inventarios, todos leads, todas métricas)

Manager ProSell (Líder de equipo)
└── Acceso a dealers asignados por Admin
    └── Vendedores bajo su mando

Vendedor ProSell
└── Acceso a dealers asignados (por Manager o Admin)
    └── Solo ve leads de SU nivel
    └── Dashboard con métricas individuales
```

**Métricas**: Cada rol tiene dashboard con métricas correspondientes

---

## P9. Asignación de Vendedores a Dealers

### Funcionamiento:

**a-b)** Admin ProSell asigna a vendedor o manager

**c)** Un vendedor puede tener múltiples dealers

**d)** Un dealer puede tener múltiples vendedores

**Workflow**:
- Admin crea dealer
- Admin asigna manager (o lo deja sin manager)
- Admin asigna vendedores (o manager asigna vendedores de su equipo)
- Vendedor solo ve dealers asignados

---

## P10. Prioridades Sprint 7+ (MVP)

### CRÍTICO (Sí, debe ir):

**a)** Publicación automática en Facebook ✅
**b)** Scraping automático de webs (dealers con sitios) ✅
**d)** Dashboard vendedores ✅
**e)** Dashboard dealers ✅

### POSTERGADO (No va en Sprint 7+):

**c)** Webhook Odoo (implementación n8n, pero desarrollo posterior)
- Nota: Implementar integración n8n + diseño de flujo
- Pero desarrollo del webhook propiamente en sprint posterior

---

## Productos a Soportar (Multi-Producto)

### Vehículos (Categorías):
- Automóviles (sedan, SUV, hatchback, etc.)
- Camiones (livianos, pesados)
- Motos
- Bicicletas
- Barcos
- Yates
- Aviones
- Tractores

### Otros Productos:
- Real Estate (inmuebles) - generar maestros
- Perfumes
- Electrónicos
- Productos de consumo masivo

**Cada producto**:
- Categorías y subcategorías
- Campos particulares específicos
- Maestros de Facebook (o generarlos)
- Validación dinámica via field_config

---

## Multi-Idioma

**Requisito**: Plataforma multi-idioma por defecto

**Idiomas iniciales**:
- Español (es)
- Inglés (en)

**Escalabilidad**: Agregar otros idiomas en el futuro

**Estructura**:
```python
# Maestros multi-idioma
# UI labels multi-idioma
# Validaciones multi-idioma
```

---

## Asistente Vendedor IA

### Función:

- Recibe lead cuando se manifiesta interesado
- Pregunta al lead sobre necesidades
- Ofrece opciones (productos similares)
- Trata de cerrar la venta
- Genera cita si hay interés genuino
- Contacta si producto no disponible pero se puede conseguir

### Integración:

- WhatsApp Business API
- Messenger
- n8n para orquestación
- Odoo CRM solo si lead calificado

---

## Archivos/Recursos Disponibles:

- ✅ Maestros de Facebook (vehículos) en .json (inglés + español)
- ⚠️ URLs de sitios web de dealers (para compartir)
- ⚠️ Documentación de categorías Facebook Marketplaces (por averiguar)
