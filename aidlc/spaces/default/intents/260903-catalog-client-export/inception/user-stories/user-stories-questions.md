# User Stories — Plan &amp; Questions

## Persona development approach

Un solo persona relevante para este feature: **Vendedor/Dealer (seller)** —
ya dueño del catálogo, usa hoy `handleExportCsv` para el export genérico.
Objetivo: llevar su inventario a `facebook-auto-post` en el formato que esa
herramienta espera. No hay persona secundaria (comprador, revisor, super
admin no interactúan con este feature).

## Story format

Formato estándar INVEST: "Como [persona], quiero [acción], para [beneficio]",
con acceptance criteria Given/When/Then. IDs `US{group}.{seq}` / `AC{group}.{seq}.{criterio}`.

## Story prioritization

MoSCoW por story — a confirmar en Q2 abajo si el team-practices ya define un
umbral, o si aplica el default (Must Have ≤ 60% del backlog).

## Breakdown approach

Propuesto: por workflow step (disparar export → recibir resultado → manejar
errores), separando la corrección del bug de color como historia técnica
aparte (no visible al usuario pero con AC propio).

## Q1: Mecanismo de entrega CSV + ZIP (resuelve el hallazgo Critical del reviewer de Requirements Analysis)

Desde la perspectiva del vendedor: cuando hace clic en "Exportar catálogo
(formato cliente)", ¿qué pasa exactamente?

A. Un solo clic dispara UNA descarga: un ZIP que contiene el CSV en la raíz + una carpeta por vehículo con sus imágenes (todo junto)
B. Un solo clic dispara DOS descargas automáticas y secuenciales: primero el CSV, después el ZIP de imágenes (dos archivos separados en la carpeta de descargas del navegador)
C. Dos botones/acciones separadas: uno para descargar el CSV, otro para descargar el ZIP de imágenes (el usuario decide si quiere uno, otro, o ambos)
X. Other (please specify)

[Answer]: A. Un ZIP combinado — una sola descarga con el CSV en la raíz + una carpeta por vehículo con sus imágenes

## Q2: Story sobre el fix del bug de color

El fix de `build_image_folder_name()` (leer `exterior_color` en vez de `color`) es un bug de código, no algo que el vendedor pida explícitamente. ¿Cómo lo tratamos en las historias?

A. Como acceptance criterion dentro de la historia de export ("el nombre de carpeta usa el color real del vehículo")
B. Como historia técnica separada, sin persona de negocio, solo para trazabilidad (ej. "Como sistema, quiero que el nombre de carpeta incluya el color correcto...")
X. Other (please specify)

[Answer]: A. Acceptance criterion dentro de la historia de export

## Consolidated Summary Confirmation

- Persona única: Valeria, vendedora/dealer.
- Q1: el export entrega un único ZIP combinado (CSV en la raíz + carpetas de imágenes por vehículo).
- Q2: el fix del bug de color va como acceptance criterion de la historia de export, no como historia técnica separada.
- Breakdown por workflow step: US1.1 (exportar), US1.2 (nombre sugerido de descarga), US1.3 (aviso de límite de recursos).
- La ronda mob (design/developer/quality) integró correcciones aditivas directo en `stories.md`: sanitizador en AC1.1.3, contrato de error en AC1.1.5, campos de log en AC1.1.6, AC1.1.8/AC1.1.9 para el piso de test de Practices Discovery, y AC1.1.10 para estados de loading/éxito.
- El reviewer advisory marcó NOT-READY con 2 Major (N/A injustificado en FR1.4, prioridad de US1.3 degradada a Should Have pese al NFR obligatorio) y 2 Minor (placeholder sin definir en AC1.1.8, `requirements.md` no actualizado para reflejar la decisión de ZIP combinado) — quedan para decidir en el gate de aprobación, no resueltos acá.

Does this all look correct before I generate the requirements artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
