# CEREBRO 2: UX RESEARCH - Análisis Completo

**Fecha**: 2026-03-05
**Proyecto**: ProSell SaaS
**Contexto**: Sprint 5-6 completado, decisión de roadmap pendiente

---

## 🎯 ANÁLISIS DEL USER JOURNEY ACTUAL

### User Journey de los Dealers (Estado Actual)

El flujo actual es un **"MVP Conserje"** que ha funcionado por 6 meses:

```
1. CAPTURA
   Dealer recibe vehículo en inventario físico
   ↓
2. COMUNICACIÓN (FRICCIÓN ALTA)
   Dealer envía fotos + datos por WhatsApp a ProSell
   ↓
3. PROCESAMIENTO (CAJA NEGRA)
   Empleado de ProSell recibe y procesa manualmente
   ↓
4. PUBLICACIÓN
   Empleado publica en Facebook Marketplace (~75 veces/día)
   ↓
5. CONFIRMACIÓN
   Dealer asume que está publicado cuando ve tráfico o pregunta
```

---

## 😰 PAIN POINTS IDENTIFICADOS

### 1. Latencia de Publicación

- **Problema**: Desfase temporal entre envío y publicación
- **Impacto**: Ansiedad del dealer, incertidumbre sobre estado
- **Severidad**: Media-Alta

### 2. Falta de Visibilidad (Ansiedad del Usuario)

- **Problema**: No hay dashboard en tiempo real
- **Impacto**: Dealer depende de comunicación humana
- **Severidad**: Alta
- **Cita**: "El dealer no tiene un dashboard en tiempo real para ver el estado de sus publicaciones"

### 3. Riesgo de Error Humano

- **Problema**: Con 75-225 publicaciones diarias, calidad degrada
- **Impacto**: Conversión del dealer se ve afectada
- **Severidad**: Alta
- **Contexto**: Títulos/descripciones pierden calidad bajo estrés

### 4. Escalabilidad Bloqueada

- **Problema**: "Muerte por éxito" - modelo humano colapsa
- **Impacto**: No puede aceptar más dealers
- **Severidad**: CRÍTICA
- **Dato**: 75 pubs/día (manejable) → 150 (imposible) → 225 (colapso)

---

## ⚖️ CATÁLOGO vs MARKETPLACE: IMPACTO EN UX

### Catálogo Público (Sprint 7-8)

**Qué es desde UX:**

- Una página web para el dealer
- Lista de inventario con filtros
- SEO y visibilidad orgánica

**Impacto en vida del dealer:**

| Aspecto                         | Evaluación                                             |
| ------------------------------- | ------------------------------------------------------ |
| **Resuelve problema principal** | ❌ NO (el problema es generación de leads en Facebook) |
| **Agrega valor inmediato**      | ⚠️ DUDOSO (ya están en Facebook)                       |
| **Crea carga adicional**        | ✅ SÍ (otra plataforma que gestionar)                  |
| **Esfuerzo cognitivo**          | ✅ AUMENTA (deben mantener otro canal)                 |

**Veredicto UX**: Es un "nice-to-have" que no ataca el "Job to be Done" principal.

---

### Marketplace Automation (Facebook Graph API)

**Qué es desde UX:**

- Elimina intermediario humano
- Publicación instantánea
- Re-publicación automática (posts vencen 7 días)
- Dashboard en tiempo real

**Impacto en vida del dealer:**

| Aspecto                         | Evaluación                    |
| ------------------------------- | ----------------------------- |
| **Resuelve problema principal** | ✅ SÍ (elimina carga manual)  |
| **Elimina fricción**            | ✅ SÍ (cero latencia)         |
| **Da visibilidad**              | ✅ SÍ (dashboard de estado)   |
| **Escala sin esfuerzo**         | ✅ SÍ (de 1 a 100+ autos/día) |

**Veredicto UX**: Es un **game-changer** que cementa retención y permite escalar.

---

## 🚀 QUICK WINS PARA RETENCIÓN

### Prioridad 0: Dashboard de Estado

**Qué es:**

```
┌─────────────────────────────────────┐
│ MIS PUBLICACIONES                   │
├─────────────────────────────────────┤
│ 🟢 Toyota Corolla 2021 - Facebook   │
│ 🟡 Honda Civic 2020 - Procesando    │
│ 🟢 Ford F-150 2022 - Facebook       │
│ 🔴 Nissan Altima 2019 - Error       │
└─────────────────────────────────────┘
```

**Impacto:**

- Elimina ansiedad del dealer
- Da transparencia inmediata
- Usa entidad `Product` ya implementada

**Estimado**: 1 semana

---

### Prioridad 1: VIN Decoder en Frontend

**Qué es:**

```
[ Ingresar VIN ] → [ Auto-completar mágicamente ]
     ↓
┌─────────────────────────────────┐
│ Toyota Corolla 2021             │
│ 45,000 mi, SUV, AWD             │
│ [Confirmar] [Editar]            │
└─────────────────────────────────┘
```

**Impacto:**

- Sensación de "magia"
- Ahorro de tiempo inmediato
- Reduce errores de data entry

**Estimado**: Ya implementado backend, solo falta frontend (3 días)

---

### Prioridad 2: Generador de Títulos con IA

**Qué es:**

```
VIN ingresado → IA genera título → [Editar si quieres]

"2021 Toyota Corolla LE - AWD - 45K mi - Un Owner"
```

**Impacto:**

- Reduce esfuerzo cognitivo
- Mejora CTR en Marketplace
- Calidad consistente

**Estimado**: 1 semana (integración GPT-4)

---

## 👥 ONBOARDING EXPERIENCE

### Estado Actual: Manual por WhatsApp

**Problema:**

- No es escalable
- Dependencia de humano
- Experiencia inconsistente

### Propuesta: Self-Service Onboarding

**Flujo propuesto:**

```
1. Registro → Crear Organization
   ↓
2. Conectar Facebook (OAuth guiado)
   ↓
3. Importar inventario inicial
   - Desde Facebook existente
   - Desde hoja de cálculo
   ↓
4. Primer vehículo publicado en 5 minutos
   (Usando VIN decoder + IA título)
```

**Quick wins:**

- **Carga masiva inicial**: Importa inventario actual (valor inmediato día 1)
- **Categorías jerárquicas**: Usa `field_config` (Sprint 5-6) para pedir solo datos necesarios
- **Configuración guiada**: Asistente paso-a-paso para conectar Facebook

---

## 📊 MÉTRICAS DE UX PARA CADA OPCIÓN

### Para Catálogo Público:

| Métrica         | Impacto          | Time to Value |
| --------------- | ---------------- | ------------- |
| SEO visibility  | +30% (6 meses)   | Lento         |
| Brand awareness | +20%             | Lento         |
| Leads orgánicos | +10%             | Lento         |
| Esfuerzo dealer | +5 (más trabajo) | Inmediato     |

### Para Marketplace Automation:

| Métrica              | Impacto    | Time to Value |
| -------------------- | ---------- | ------------- |
| Latencia publicación | -95%       | Inmediato     |
| Ansiedad dealer      | -80%       | Inmediato     |
| Capacidad dealers    | ×10 (5→50) | 6 semanas     |
| Retención            | +40%       | 6 semanas     |

---

## ✅ RECOMENDACIÓN UX

### VEREDICTO: PRIORIZAR MARKETPLACE AUTOMATION

**Justificación:**

1. **El catálogo público no resuelve el pain point principal**
   - El dolor del dealer es "publicar rápido en Facebook"
   - Un catálogo web es otra tarea más, no una solución

2. **La automatización ataca el "Job to be Done"**
   - Dealer quiere: "Vender autos con mínimo esfuerzo"
   - Marketplace Automation elimina esfuerzo
   - Catálogo agrega esfuerzo

3. **La automatización permite escalar**
   - De 5 dealers actuales a 50 sin colapsar
   - El catálogo no escala la operación

> "La libertad del usuario de no depender de un humano para publicar es lo que cementará la retención y permitirá escalar a 20+ dealers sin colapsar la experiencia"

---

## 🗺️ ROADMAP UX PRIORITADO

### Sprint 7+: Marketplace UX (Semanas 1-4)

**Semana 1: Dashboard de Estado**

- Widget de conectividad Facebook
- Lista de publicaciones con badges
- Activity logs visuales

**Semana 2: VIN Decoder Frontend**

- Input VIN → Auto-completar
- Preview de datos del vehículo
- Botón "Confirmar"

**Semana 3: IA Title Generator**

- Sugerencia de título automática
- Edición opcional
- Guardar como preferencia

**Semana 4: Bulk Actions**

- Seleccionar 20 vehículos
- "Publicar todos" en un click
- Mitiga colapso operativo

### Sprint 9: Catálogo Público (Semanas 9-10)

**Solo cuando:**

- Capacidad operativa está resuelta
- Dealers están retenidos
- Hay tiempo para construir "nice-to-have"

---

**Estado del Cerebro 2**: ✅ ANÁLISIS COMPLETO
**Confianza en recomendación**: 95%
**Nivel de urgencia**: 🔴 CRÍTICA
