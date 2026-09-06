# Practices Discovery — Interview (re-run)

Este es un re-run: `team.md` ya tiene afirmadas las cinco áreas (Way of Working,
Walking Skeleton, Testing Posture, Deployment, Code Style). El draft del lead y
las tres revisiones ciegas (quality, developer, devsecops) confirman que ese
baseline sigue vigente tal cual para este intent — no hay preguntas nuevas
sobre esas cinco áreas en general. Lo único que quedó abierto son dos
especializaciones puntuales para el feature de export CSV+ZIP, abajo.

## Q1: Testing — Alcance de tests para el nuevo export

Ya existe un patrón de test en el repo para el flujo INVERSO (import de
CSV+ZIP: `CSVImageMapper`, `csv_export.py` con `zipfile`). Para el nuevo
export, además de reusar ese patrón de diseño de test, quality señaló casos
puntuales sin cobertura hoy: el bug ya confirmado en `build_image_folder_name()`
(pierde el color), los límites de `Organization.code` (1 a 5 caracteres, o
ausente), y un test de contrato para `Content-Type`/`Content-Disposition` del
nuevo endpoint (el repo ya tuvo dos bugs reales de esa clase en proxies).

¿Marcamos estos tres casos como piso mínimo obligatorio de test para este
intent (sin subir el piso general del proyecto, solo para este feature)?

A. Sí, agregar los tres como piso obligatorio para este intent
B. No, dejar que Build and Test decida caso por caso como siempre
X. Other (please specify)

[Answer]: Sí, agregar los tres como piso obligatorio para este intent

## Q2: Code Style — Manejo de errores del nuevo export (backend)

El backend ya tiene una jerarquía de excepciones tipada para productos
(`ProductError` + subclases, con handler centralizado). Developer confirmó que
`csv_export.py` hoy no lanza ninguna excepción propia (el bug de color pasa
silencioso). Developer propone extender `ProductError` con una subclase nueva
en vez de inventar una jerarquía separada para export.

¿Extendemos `ProductError` con una subclase nueva para los errores de export
(catálogo vacío, imagen no disponible, etc.), en vez de crear una jerarquía
`CatalogExportException` separada?

A. Sí, extender ProductError (una subclase nueva)
B. No, crear una jerarquía separada para export
X. Other (please specify)

[Answer]: Sí, extender ProductError (una subclase nueva)

## Consolidated Summary Confirmation

Resumen de lo que se va a integrar en los artefactos finales de Practices Discovery:

- Las cinco secciones de `team.md` (Way of Working, Walking Skeleton, Testing Posture, Deployment, Code Style) se confirman **sin cambios** para este intent — el draft del lead y las tres revisiones ciegas coinciden en que el baseline afirmado sigue vigente.
- **Q1 (Testing)**: se agrega como piso mínimo obligatorio de test PARA ESTE INTENT (no cambia el piso general del proyecto): regresión del bug de `build_image_folder_name()` (color), casos límite de `Organization.code` (1-5 chars / ausente), y un test de contrato `Content-Type`/`Content-Disposition` para el nuevo endpoint de export.
- **Q2 (Code Style)**: el manejo de errores del export en backend extiende `ProductError` con una subclase nueva, en vez de una jerarquía separada.
- Quedan como preguntas abiertas para Requirements Analysis (NO se resuelven acá): si la "ruta de destino" es un nombre sugerido de descarga de navegador o algo de escritura a filesystem local; si el export es un endpoint nuevo o extiende `GET /api/v1/products/export.csv`; el gap de `IDOSpacesService` sin método de lectura.
- Constraints técnicos señalados por devsecops para Functional Design/Code Generation (no son afirmaciones de práctica de equipo, son requisitos de este feature): el export debe filtrar SIEMPRE por `tenant_id` del JWT (igual que `export.csv` actual, nunca como `list_products()`), reusar el sanitizador de nombres ya existente para evitar zip-slip, y un cap de filas/imágenes para evitar DoS por memoria.

[Answer]: Looks correct
