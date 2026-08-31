# Requirements Analysis — Questions

Intent: `260830-ci-fixes-round2` (scope: bugfix, Depth: Minimal)

Contexto: Reverse Engineering (scan enfocado) ya confirmó la mayor parte de las causas raíz de los 8 failed + 12 errors de CI. Estas preguntas cubren solo las decisiones que el scan no pudo resolver por sí mismo.

## Q1. Bugs de diseño reales encontrados en bulk upload

El scan confirmó dos problemas de diseño (no solo de test) en el flujo de bulk upload:

- `bulk_upload_vehicles.py`: el chequeo de "unknown organization codes" corre ANTES del loop por fila que respeta el fallback `organization_id` del caller — dispara `ValueError` innecesariamente incluso cuando el caller ya pasó una organización válida.
- `product_router.py`: los endpoints `/bulk-upload/preview` y `/bulk-upload/with-images` no envuelven `use_case.execute()` en `try/except ValueError → HTTPException(400)`, a diferencia de otros endpoints del mismo archivo (`/brokers`, `/ownership`) que sí lo hacen — hoy producen un 500 no manejado.

¿Cómo abordamos esto en este intent?

A. Arreglar ambos: reordenar el chequeo para respetar el fallback `organization_id`, Y envolver los endpoints de bulk-upload en `try/except ValueError → HTTPException(400)` (igual que `/brokers`/`/ownership`)
B. Arreglar solo los fixtures/tests para trabajar con el comportamiento actual — no tocar código de aplicación, el bug de diseño y el 500 quedan como deuda documentada
C. Arreglar solo el mapeo `try/except` (500→400) pero dejar el bug de orden del chequeo para un intent de seguimiento separado
X. Other (please specify)

[Answer]: A. Arreglar ambos

## Q2. Fixture `test_organization` sin campo `code`

`tests/integration/conftest.py:190-215` nunca setea `OrganizationModel.code` al crear la fixture `test_organization`. Los CSVs de prueba de bulk upload traen `cod_organization` hardcodeado que no matchea con ningún org real en la DB de test.

¿Cómo resolvemos la falta de matching?

A. Actualizar la fixture `test_organization` para que setee `code` con el valor que ya usan los CSVs de muestra
B. Actualizar los CSVs de muestra de los tests para que referencien el código (o la ausencia de código, confiando en `organization_id`) que la fixture ya produce
C. Agregar una fixture nueva y dedicada solo para los tests de bulk-upload, sin tocar `test_organization` (que otros tests siguen usando tal cual)
X. Other (please specify)

[Answer]: A. Actualizar la fixture

## Q3. Bloqueo de permisos sobre `test_fb_credential_migration_router.py` (10 errores)

El scan no pudo leer `test_fb_credential_migration_router.py` ni su router porque `.claude/settings.local.json` deniega `Read`/`Bash` sobre cualquier ruta que contenga "credential". Solo tengo la estructura vía graphify, no el contenido real — no puedo diagnosticar los 10 errores sin acceder al contenido.

¿Cómo seguimos con esto?

A. Dame una excepción puntual para esta sesión para leer esos dos archivos y diagnosticar/arreglar los 10 errores ahora
B. Dejar este archivo fuera del alcance de este intent — se registra como un intent de seguimiento dedicado más adelante
C. Vos me pegás el contenido relevante de esos archivos y diagnostico sin tocar la regla de permisos
X. Other (please specify)

[Answer]: A. Excepción puntual

## Q4. Root cause sin confirmar: `test_appointment_api.py` y el test de fb-sync de capped-attempt

Ni `test_appointment_api.py` (asserts deliberadamente laxos, router registrado correctamente) ni `test_failed_callback_keeps_request_queued_with_capped_attempt_count` (depende de un `server_default` de columna, no de lógica explícita del handler) tienen una causa raíz confirmada por lectura estática — el developer no corrió pytest real. Necesitamos correr la suite real (contenedor Docker temporal de Postgres, igual que en el intent anterior `ci-seed-data`) para diagnosticar ambos antes de proponer un fix.

¿Corremos pytest ahora para diagnosticar estos dos antes de cerrar los requirements?

A. Sí, correr pytest ahora contra ambos para confirmar la causa raíz antes de finalizar requirements.md
B. No — dejar ambos como "causa raíz por confirmar" en requirements.md y diagnosticar recién en Code Generation
X. Other (please specify)

[Answer]: A. Sí, correr pytest ahora

## Q5 (follow-up). Dos fallas nuevas encontradas al correr la suite real

Corrida la suite completa contra un Postgres de test temporal (config exacta de CI): 8 failed + 12 errors, coincide con lo que reportaba el intent. Confirmé en vivo las 5 causas ya conocidas, PERO encontré 2 fallas nuevas dentro de esos "8 failed" que no estaban en la descripción original del intent:

- `test_admin_organizations_router.py::test_admin_patch_persists_contact_name` — `GET /api/v1/admin/organizations/{id}` devuelve 405 Method Not Allowed (no existe endpoint de detalle de una sola organización).
- `test_org_verticals.py::test_list_org_verticals_cross_org_returns_403` — un admin puede listar los verticals de OTRA organización (200 con lista vacía) en vez de recibir 403 (falta chequeo de autorización cross-tenant).

También confirmé que `test_appointment_api.py` (12 tests) y el test de fb-sync `test_failed_callback_keeps_request_queued_with_capped_attempt_count` YA PASAN en la suite real — quedan fuera de alcance de este intent (no hace falta tocarlos).

¿Cómo tratamos las 2 fallas nuevas?

A. Arreglar ambas ahora — ya bloquean el mismo deploy que el resto de este intent
B. Arreglar solo el GET faltante ahora; separar el gap de autorización cross-org a un intent de seguridad dedicado
C. Separar ambas a un intent de seguimiento — este intent se queda solo con los 5 issues originales
X. Other (please specify)

[Answer]: A. Arreglar ambas ahora

## Consolidated Summary Confirmation

- Q1: Arreglar ambos bugs de diseño de bulk upload — reordenar el chequeo de "unknown organization codes" para respetar el fallback `organization_id`, Y envolver `/bulk-upload/preview` y `/bulk-upload/with-images` en `try/except ValueError → HTTPException(400)`
- Q2: Actualizar la fixture `test_organization` para que setee `code` con el valor que ya usan los CSVs de muestra de bulk upload
- Q3: El contenido pegado inicialmente no correspondía al repo real (verificado con graphify); corriendo pytest real se confirmó la causa raíz genuina de los 12 errores de `test_fb_credential_migration_router.py`: falta el bootstrap del enum `fb_group_category` (`create_type=False`) en el setup de schema que usa este archivo, lo que rompe la creación de la tabla `fb_account_groups` con `UndefinedObjectError: type "fb_group_category" does not exist`
- Q4: Se corrió pytest real contra un Postgres de test temporal (config exacta de CI). `test_appointment_api.py` (12 tests) y `test_failed_callback_keeps_request_queued_with_capped_attempt_count` YA PASAN — quedan fuera de alcance de este intent
- Q5: Se agregan 2 bugs nuevos encontrados en la corrida real, ambos parte de los "8 failed" que bloquean el deploy: `GET /api/v1/admin/organizations/{id}` devuelve 405 (falta el endpoint de detalle de una organización), y falta un chequeo de autorización cross-tenant en `GET /api/v1/organizations/{id}/verticals` (un admin puede listar verticals de otra organización — devuelve 200 con lista vacía en vez de 403)

**Revalidación tras jump hacia atrás** (contexto: el status del workflow marcó este stage como "drift detected / directly stale" tras el jump backward manual solicitado por el usuario vía `/aidlc --stage requirements-analysis`; verifiqué el requirements.md existente contra el estado real del repo antes de reinterrogar desde cero):

- El `git status` actual muestra los cambios de Code Generation ya staged en exactamente los archivos que FR1-FR5 apuntaban (`bulk_upload_vehicles.py`, `admin_organizations_router.py`, `product_router.py`, `conftest.py`, y los 4 archivos de test afectados) — Code Generation y Build and Test ya corrieron sobre este mismo requirements.md y lo completaron.
- El usuario eligió mantener el documento existente en vez de rehacer el ciclo de preguntas desde cero (no se re-preguntaron Q1-Q5, ya respondidas y sin contradicciones).
- Verificación puntual: el Open Question de FR3 ("acceso bloqueado a archivos 'credential' para Code Generation") resultó resuelto — el diff staged de `conftest.py` confirma que el fix fue enteramente test-infra (bootstrap del enum `fb_group_category` antes de `create_all()`), sin necesitar leer el router bloqueado. Se actualizó FR3, Constraints y Open Questions en requirements.md para reflejar esto.
- `.claude/settings.local.json` sigue denegando `Read(**/*credential*)` hoy — queda como deuda de permisos separada, ya no como bloqueante de este intent.

Does this all look correct before confirming requirements.md as still valid?

- Looks correct
- Request changes

[Answer]: Looks correct
