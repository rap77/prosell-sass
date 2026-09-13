# Reliability Requirements — u1-cross-org-export-api

`requirements.md` no define un NFR de confiabilidad nuevo aparte del ya
citado NFR3 (riesgo residual de memoria, `requirements.md` § NFR3) — los
targets de tolerancia a fallos de esta sección EXTIENDEN sin cambio los
ya establecidos en `260903-catalog-client-export`, y agregan la
formalización explícita del riesgo residual aceptado para el modo
"todas".

## Disponibilidad

Sin SLA/SLO dedicado nuevo — hereda la disponibilidad ya vigente del
servicio `apps/api` completo, sin componente desplegable nuevo (mismo
criterio que `260903`).

## Tolerancia a fallos (sin cambio respecto a 260903)

```
NFR-REL-1: Fallo de lectura de imagen individual
El export NO se aborta por completo si una imagen individual no se
puede leer — degradación parcial graceful, ya fijada en Functional
Design previo (BR4.2 de 260903, reutilizado sin cambio). El producto se
incluye igual en el CSV y en su carpeta, con las imágenes que sí están
disponibles. Aplica igual en ambos modos (puntual y "todas").

NFR-REL-2: Fallo del servicio de storage completo (DigitalOcean Spaces caído)
Si get_object() falla sistemáticamente para TODAS las imágenes, el
export continúa igual — cada fallo individual se trata como NFR-REL-1.
El resultado es un ZIP con CSV completo pero carpetas de imágenes
vacías. Aplica igual en ambos modos.
```

## Riesgo residual — modo "todas las organizaciones" (formalización de NFR3, sin mitigación nueva)

```
NFR-REL-3: Consumo de memoria escalado a nivel de plataforma
El ZIP se arma completo en memoria antes de que StreamingResponse
empiece a enviar nada (patrón ya vigente, sin cambio) — el consumo de
memoria de una request "todas las organizaciones" escala con el total
de productos+imágenes de LA PLATAFORMA, no de un solo tenant. El cap
global NFR3.2 (500 productos) acota parcialmente este riesgo pero no lo
elimina — riesgo residual ACEPTADO explícitamente por el equipo
(requirements.md § NFR3), sin refactor de streaming incremental ni de
paginación en este intent.
```

Sin mitigación nueva más allá de NFR3.2 (cap global) — decisión ya
tomada, no revisitada en esta etapa.

## Backup y recuperación

No aplica — `CategoryTranslationEntry` es configuración estática en
código (sin persistencia nueva, ver `tech-stack-decisions.md`); los
datos leídos (`Product`, `Organization`, imágenes ya en Spaces) siguen
cubiertos por las políticas de backup/recovery generales del sistema,
sin cambio.

## Degradación graceful

El único modo de degradación relevante sigue siendo NFR-REL-1/NFR-REL-2
(imágenes o storage completo no disponibles) — sin cambio de
comportamiento entre modo puntual y modo "todas": en ambos, el export
prioriza entregar el CSV completo sobre bloquear el flujo completo por
una imagen faltante.
