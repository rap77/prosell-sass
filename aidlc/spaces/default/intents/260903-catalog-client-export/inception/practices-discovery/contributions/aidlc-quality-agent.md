**Collaborator:** aidlc-quality-agent

## Contribution

### Testing posture aplicable a este intent

El draft del lead resuelve correctamente la postura general (test-after, sin
piso nuevo, asimetría de cobertura aceptada) heredándola sin cambios de
`team.md`. Desde calidad, agrego el análisis específico del área tocada
(export CSV + ZIP) que el draft deja abierto o resume de forma incompleta:

1. **El precedente citado (`CSVImageMapper`) cubre el sentido INVERSO al que
   este intent necesita.** `test_csv_image_mapper.py` (`TestReadZipContents`,
   `TestZipStructureReading`) testea LEER un ZIP que el cliente sube (import),
   no ARMAR uno para exportar. El patrón de test SÍ transfiere (unit test
   sobre la función/servicio, bytes-in/bytes-out, sin storage real), pero los
   casos de test en sí son nuevos — no hay que "extender" la suite existente,
   hay que escribir una suite nueva sobre `csv_export.py` con esa misma
   filosofía. El propio `evidence.md` del lead ya señala esto en
   `## Unresolved #3`; lo confirmo como postura de calidad, no solo como
   observación del lead.

2. **Hay un bug ya confirmado en código que este intent va a tocar/extender**
   (`code-quality-assessment.md` #58): `build_image_folder_name()`
   (`csv_export.py`) lee `attrs.get("color")` en vez de
   `attributes["exterior_color"]`. Implicación de testing: (a) el fix
   necesita un caso de test explícito con la clave real
   (`exterior_color`), no solo con `color`, para que la regresión quede
   cubierta permanentemente; (b) si `build_image_folder_name()` es
   compartida con el endpoint de export genérico ya existente
   (`GET /api/v1/products/export.csv`, FEAT-1 de `260826-prod-bugfixes-batch`),
   corregirla acá puede alterar el comportamiento de ESE endpoint también —
   antes de tocarla, confirmar consumidores y correr la suite completa
   relacionada al export genérico (no solo los tests nuevos), siguiendo la
   convención ya aprendida en `project.md` de no confiar en que un fix
   "queda contenido" sin re-verificar con la suite existente en verde.

3. **`Organization.code` es `str | None` de 1 a 5 caracteres, no fijo en 2**
   (`code-quality-assessment.md` #59). El piso de test para el segmento
   `{CÓDIGO_ORG}` del nombre de carpeta debe incluir explícitamente casos
   límite: código de 1 char, código de 5 chars, y código ausente (`None`) —
   no alcanza con un solo caso feliz de 2 chars como en el ejemplo de
   `docs/data39.csv`. Esto es un gap de test-case design, no de cobertura
   agregada.

4. **Cero tests hoy para `handleExportCsv` (frontend, `catalog/page.tsx`) y
   `exportCatalogCsv` (`apps/web/src/lib/api/products.ts`)** — confirmado en
   el brief de este step y consistente con lo relevado en
   `code-structure.md` (ambos solo aparecen inventariados por línea, sin
   suite de test asociada mencionada). Este es un gap de cobertura real que
   Build and Test va a tener que resolver — no hay piso previo que
   "mantener en verde" para este código específico, es superficie nueva.

5. **Gap de convención de ubicación de test, a resolver en la entrevista**:
   `catalog/page.tsx` no es una página "admin" (patrón co-located
   `page.test.tsx` de T12-T18) ni tiene un componente de test hermano
   confirmado bajo `apps/web/tests/components/catalog/`. `handleExportCsv`
   vive inline en el page component, igual que `handleStep1`/`completeSetup`
   en `onboarding/page.tsx` (área que SÍ generó pregunta de alcance en un
   intent previo). Antes de escribir tests, Build and Test necesita saber si
   este código sigue el patrón `tests/components/{module}/X.test.tsx` o el
   patrón co-located más nuevo — no es una decisión de calidad a resolver
   acá, pero sí un gap que el draft no nombra explícitamente.

6. **Riesgo de CI quality gate ya materializado en este mismo proyecto en
   exactamente esta clase de feature**: el historial tiene DOS bugs
   confirmados de "proxy fuerza `.json()` sobre contenido no-JSON"
   (`project.md` learning 260826, `code-quality-assessment.md` #9 y #64).
   El proxy de `products` ya está arreglado (confirmado por lectura directa,
   #64), pero el nuevo endpoint de export cuelga de esa misma ruta — dado el
   historial repetido de esta clase de bug en el proyecto, recomiendo que la
   entrevista confirme si el equipo quiere al menos un test liviano
   (integración o contrato) que verifique que el `Content-Type`/
   `Content-Disposition` de la respuesta real sobrevive el viaje completo
   proxy→browser para el nuevo endpoint, en vez de confiar solo en unit
   tests del backend. No es una ceremonia nueva — es la misma clase de
   regresión que ya rompió producción dos veces en este repo.

7. **Duplicado de archivo de test sin resolver**: `test_csv_image_mapper.py`
   existe en dos ubicaciones (`tests/unit/services/` y
   `tests/unit/domain/services/`, `code-quality-assessment.md` #65). Antes
   de asumir cuál es la copia vigente para extender o usar como referencia
   de patrón, Build and Test debe verificar cuál corre en CI — señalado ya
   por el lead scan, lo reconfirmo como bloqueante de bajo costo a resolver
   antes de escribir el test nuevo (podría llevar a duplicar/divergir
   fixtures si se elige la copia equivocada).

8. **Ambigüedad de "ruta base de destino" (Unresolved #1 del lead) tiene
   consecuencia directa de testability, no solo de arquitectura**: si termina
   siendo un `window.prompt`/input simple (patrón ya usado, FR8.3 de
   `260826-prod-bugfixes-batch`, confirmado vigente en #63), el patrón de
   component test es el mismo ya establecido (`fireEvent` + mock de
   `window.prompt`/`window.confirm`). Si en cambio requiere File System
   Access API real, ese patrón NO es testeable de forma directa en jsdom
   (requiere mock explícito de una API no estándar) — esto debería pesar en
   la decisión de diseño, no solo la arquitectura de storage.

### Sobre el resto de las secciones del draft (Way of Working, Walking

Skeleton, Deployment, Code Style)

No agrego evidencia nueva — no son mi área de foco declarada para este step
y el draft del lead no introduce nada que contradiga la postura de calidad
en esas secciones.

## Positions

AGREE: Testing Posture — Methodology test-after / Ordering (implementar capa, luego testear esa capa, sin backfill) heredada sin cambios de `team.md`, correcta para este intent.

AGREE: Testing Posture — asimetría de cobertura (40% frontend / sin piso backend) aceptada tal cual, sin forzar simetría ni piso nuevo para este intent.

AGREE: Testing Posture — CI ejecuta suite completa en cada push/PR y pre-push local corre pytest, gate de "suite en verde antes de merge" enforced mecánicamente; sin especialización nueva requerida por este intent.

AGREE: Testing Posture — el patrón de test para el ZIP (unit test sobre la función/servicio, bytes in/out, sin integración nueva contra storage real por defecto) es el patrón correcto, con la precisión de que el precedente citado cubre el sentido inverso (import, no export) — ver mi punto 1 en Contribution.

AGREE: Testing Posture — dejar como pregunta abierta para Requirements Analysis la semántica de "ruta base de destino" en vez de resolverla por asunción propia; agrego en Contribution que esta ambigüedad también tiene consecuencia directa de testability (ver punto 8), no solo de arquitectura.

AGREE: Testing Posture — dejar como pregunta abierta la elección de dónde vive la lectura de imágenes ya subidas (`get_object` en el puerto vs. `httpx` contra `image_urls`), reconociendo que condiciona la capa de test aplicable (unit vs. integración con storage).

OBJECT: Testing Posture — el draft presenta el nuevo export como si pudiera cubrirse íntegramente reutilizando el patrón de test ya existente de `CSVImageMapper` sin más matiz ("el patrón de test... es el MISMO"). El patrón de diseño de test transfiere, pero la suite en sí es nueva (dirección inversa: armar ZIP, no leerlo) y debe diseñarse con casos propios — incluyendo los casos límite de `Organization.code` (1-5 chars, ausente) y el caso de regresión explícito para el bug ya confirmado de `attrs.get("color")` vs. `attributes["exterior_color"]`. Ver puntos 1-3 en Contribution.

OBJECT: Testing Posture — el draft no nombra el gap de cobertura cero para `handleExportCsv`/`exportCatalogCsv` (frontend) como un punto a resolver explícitamente en la entrevista o en Build and Test; lo agrego como gap concreto (punto 4) junto con la ambigüedad de convención de ubicación de test para ese código (punto 5).

OBJECT: Testing Posture — el draft no plantea la pregunta de si el nuevo endpoint necesita al menos un test liviano de integración/contrato para el `Content-Type`/`Content-Disposition` de la respuesta real, dado el historial repetido de bugs de proxy exactamente en esta clase de contenido no-JSON en este mismo repo (dos veces ya, `code-quality-assessment.md` #9 y #64). Lo dejo como recomendación para la entrevista (punto 6), no como decisión tomada.

AGREE: ninguna especialización nueva requerida en Way of Working, Walking Skeleton, Deployment o Code Style para este intent, tal como resume el draft del lead.
