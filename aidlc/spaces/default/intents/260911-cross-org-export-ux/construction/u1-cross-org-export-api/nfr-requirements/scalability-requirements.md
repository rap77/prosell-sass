# Scalability Requirements — u1-cross-org-export-api

Formaliza el cap de recursos ya requerido en `requirements.md` NFR3 y ya
FIJADO por FR4.3/BR2.4 de `rules.md` — a diferencia del intent hermano
`260903-catalog-client-export` (donde el número exacto era la única
pregunta genuina de esta etapa), acá el número YA está decidido: no
queda ningún valor por resolver en esta pasada.

## Cap de recursos

```
NFR3.1: Cap de productos por export — caso puntual (sin cambio respecto a 260903)
Target capacity: máximo 500 productos published por export, aplicado
  por-organización.
Scaling approach: rechazo explícito (413 Payload Too Large).
Degradation policy: rechazo total de la request, sin subconjunto parcial.

NFR3.2: Cap de productos por export — modo "todas las organizaciones" (NUEVO, BR2.4/FR4.3)
Current baseline: sin cap global hoy (el modo "todas" no existía antes
  de este intent).
Target capacity: máximo 500 productos published EN TOTAL, sumando todas
  las organizaciones con catálogo — el MISMO número que NFR3.1, ahora
  aplicado como límite GLOBAL en vez de por-organización.
Growth model: n/a — límite de seguridad por request, no proyección de
  crecimiento. Sin necesidad de re-evaluar el número: el riesgo real
  (memoria ocupada armando el ZIP con imágenes) es el mismo orden de
  magnitud que el caso puntual ya validado en 260903, solo que ahora la
  base de productos candidatos es la plataforma completa en vez de una
  organización.
Scaling approach: rechazo explícito (413), mismo código de error y
  mismo mecanismo ya fijado para el caso puntual — sin paginación ni
  cambio de arquitectura nuevo (Out of Scope explícito en
  requirements.md).
Degradation policy: rechazo total de la request (no exporta un
  subconjunto parcial de organizaciones silenciosamente) — mismo
  criterio que el caso puntual.
```

**Justificación de reusar el mismo número (500) en modo global**: el
riesgo real de NFR3 es memoria ocupada armando el ZIP con imágenes en
memoria simultáneamente, no la cantidad de organizaciones involucradas
— 500 productos con imágenes es el mismo techo de riesgo de memoria
independientemente de si vienen de 1 organización o de 29. Subir el
número para "compensar" que ahora son más organizaciones sería
sobre-ingeniería sin evidencia de que el riesgo de memoria cambie de
naturaleza; mantenerlo global y sin cambio de valor es la decisión más
simple consistente con FR4.3.

## Concurrencia

Sin requisito de escalado horizontal nuevo — el endpoint sigue
corriendo dentro del servicio FastAPI (`apps/api`) ya existente, sin
infraestructura adicional, en ambos modos. Sin necesidad de rate
limiting específico nuevo más allá del ya vigente a nivel de aplicación
(descartado explícitamente en Practices Discovery para este intent).

## Crecimiento de datos

No aplica — el export no persiste ningún dato nuevo (`CategoryTranslationEntry`
es configuración estática en código, no una tabla con crecimiento —
ver `tech-stack-decisions.md`), por lo que no hay tasa de crecimiento de
almacenamiento que planificar para este Unit, en ningún modo.
