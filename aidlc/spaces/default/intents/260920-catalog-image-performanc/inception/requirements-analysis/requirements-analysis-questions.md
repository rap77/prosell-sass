# Requirements Analysis — Preguntas

## Contexto

El intent es un bugfix que elimina el fan-out N+1 de URLs firmadas por producto visible en la página de catálogo, sirviendo una miniatura privada adecuada y validando comportamiento de caché/CDN sin debilitar la privacidad del bucket. La reverse engineering ya respondió la mayoría de las ambigüedades técnicas (rutas N+1, derivado thumbnail ausente, defensa-en-profundidad de tenant-prefix, `do_cdn_endpoint` configurado pero sin uso). Las siguientes preguntas apuntan a las decisiones de producto/operación que el código no decide por sí solo.

## Preguntas

### Q1. Especificación de la miniatura privada para tarjetas de catálogo

El derivado thumbnail privado que se creará durante el upload necesita una especificación de tamaño/aspect para que la tarjeta del catálogo pueda renderizarlo sin recorte destructivo ni letterboxing. ¿Cuál es la dimensión objetivo del derivado de portada (ancho × alto en píxeles) y el aspect ratio esperado?

A. 600×600 px, aspect 1:1 (cuadrado, recorte centrado) — uniforme para grilla uniforme
B. 800×600 px, aspect 4:3 — un poco más amplio, más detalle del vehículo
C. 600×400 px, aspect 3:2 — formato fotografía tradicional
D. Mantener aspect variable del original (≤600 px ancho máximo, sin recorte) — respeta la composición del vendedor
X. Other (please specify)

[Answer]: A

### Q2. Estrategia de CDN al deploy

La configuración `do_cdn_endpoint` existe en `apps/api/src/prosell/core/config.py:278-281` pero hoy ningún path de aplicación la lee. ¿Cuál es la estrategia correcta para que el CDN entre en juego?

A. CDN obligatorio al deploy — todas las URLs firmadas pasan por el endpoint CDN configurado (fail-fast si no está configurado)
B. CDN opt-in por tenant — flag por organización habilita el endpoint CDN; sin flag, el comportamiento actual sin CDN
C. CDN opt-out global — habilitado por defecto al deploy, configurable para apagarlo (sin acción del tenant)
D. Mantener config-only, sin uso — el fix queda independiente del CDN, queda como mejora futura
X. Other (please specify)

[Answer]: A

### Q3. Invalidación de caché al reemplazar/eliminar imagen

Cuando el vendedor reemplaza o elimina una imagen de un producto, el catálogo puede mostrar la miniatura vieja hasta que expire el TTL. ¿Cómo manejamos la consistencia?

A. Purga inmediata en object storage + invalidación CDN en el mismo flujo de upload/delete — sin ventana de stale
B. Solo TTL-based — el caché se refresca naturalmente; sin acción de invalidación (más simple, ventana de stale = TTL)
C. Híbrido — purge eager para reemplazos/eliminaciones explícitos, TTL-based para re-uploads de misma key (más simple laxo)
D. Versionado por object key — cada upload genera una key nueva (timestamp+suffix), invalida naturalmente sin purge
X. Other (please specify)

[Answer]: A

### Q4. Alcance de visibilidad del administrador cross-organización

El admin con permiso `ORG_ADMIN_VIEW_ALL` ya existe y accede a productos de otras organizaciones. En la nueva ruta batch de miniaturas, ¿qué alcance tiene sobre las imágenes de portada?

A. Mismo alcance que su propia organización — ve todas las miniaturas de productos en todas las orgs que puede administrar
B. Solo portadas de productos explícitamente autorizados a ver — filtrado adicional más estricto que el tenant check actual
C. Sin miniatura — el admin ve metadata del producto pero la portada se marca como no disponible cross-org (placeholder)
D. Mantener comportamiento actual sin cambios específicos — el tenant check actual del signing ya cubre el caso
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- La miniatura privada para tarjetas de catálogo se creará a **600×600 px, aspect 1:1** (cuadrado, recorte centrado) — uniforme para la grilla del catálogo.
- La estrategia de CDN es **obligatoria al deploy**: todas las URLs firmadas de imágenes privadas pasan por el endpoint `do_cdn_endpoint` configurado; fail-fast si no está configurado.
- La invalidación de caché en reemplazo/eliminación es **purga inmediata**: storage + CDN invalidation en el mismo flujo, sin ventana de stale.
- El administrador con `ORG_ADMIN_VIEW_ALL` mantiene **el mismo alcance que para su propia organización** sobre las imágenes de portada — sin gating adicional cross-org; el tenant check actual del signing cubre el caso.

¿Todo correcto antes de generar el artefacto `requirements.md`?

Looks correct
Request changes

[Answer]: Looks correct
