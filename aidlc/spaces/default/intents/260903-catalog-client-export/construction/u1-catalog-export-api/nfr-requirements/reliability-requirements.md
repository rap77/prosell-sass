# Reliability Requirements — u1-catalog-export-api

`requirements.md` no define ningún NFR de confiabilidad para este
intent — los targets de esta sección son originados en esta etapa, igual
que `performance-requirements.md`, sin `NFR{n}` de inception del que
heredar un sub-número.

## Disponibilidad

Sin SLA/SLO dedicado nuevo para este endpoint — hereda la disponibilidad
ya vigente del servicio `apps/api` completo (sin componente
desplegable nuevo, per `unit-of-work.md`: `deployment: embedded`). No se
define un target de disponibilidad distinto al del resto de la API.

## Tolerancia a fallos

```
NFR-REL-1: Fallo de lectura de imagen individual
El export NO se aborta por completo si una imagen individual referenciada
en image_urls no se puede leer — degradación parcial graceful, ya fijada
en Functional Design (rules.md BR4.2, stories.md AC1.1.6). El vehículo se
incluye igual en el CSV y en su carpeta, con las imágenes que sí están
disponibles.

NFR-REL-2: Fallo del servicio de storage completo (DigitalOcean Spaces
caído)
Si get_object() falla sistemáticamente para TODAS las imágenes (storage
completo no disponible), el export continúa igual — cada fallo individual
se trata igual que NFR-REL-1 (log warning, se sigue). El resultado sería
un ZIP con CSV completo pero carpetas de imágenes vacías — comportamiento
aceptable dado que no hay requisito de "todo o nada" en ningún artefacto
upstream, y es preferible a fallar el export completo por una
dependencia externa caída.
```

## Backup y recuperación

No aplica — sin dato nuevo persistido (Domain Design ADR-002), no hay
backup/recovery que definir para este Unit. Los datos leídos (`Product`,
`Organization`, imágenes ya en Spaces) ya están cubiertos por las
políticas de backup/recovery generales del sistema, sin cambio.

## Degradación graceful

El único modo de degradación relevante es NFR-REL-1/NFR-REL-2 (imágenes
individuales o el storage completo no disponibles) — en ambos casos el
export prioriza entregar el CSV completo (el dato más crítico para
`facebook-auto-post`) sobre bloquear el flujo completo por una imagen
faltante.
