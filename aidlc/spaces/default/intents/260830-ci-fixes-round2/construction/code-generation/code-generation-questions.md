# Code Generation — Plan Approval

## Plan Approval

Revisá `code-generation-plan.md` (10 pasos, cubre FR1-FR5) y `unit-test-instructions.md` (comandos exactos por FR, todos contra tests de integración ya existentes).

Resumen:

- FR1: fixture real de categoría en `test_batch_review_api.py` (4 sitios).
- FR2: reordenar el chequeo de organization_id fallback + mapear ValueError→400 + fixture `test_organization.code`.
- FR3: bootstrap del enum `fb_group_category` en el fixture `test_db_session` (root cause confirmada leyendo el archivo real).
- FR4: nuevo endpoint `GET /api/v1/admin/organizations/{id}`.
- FR5: **corregido en esta etapa** — no se toca el router (su bypass ORG_ADMIN_VIEW_ALL es intencional); se corrige el rol usado por el test.

[Approval Fingerprint]: sha256:0534eb3aff490443b4ec74e2833ec0a5888123dd14b42271494282bb4df45c3c

- "Approve Plan" — proceder a la generación de código
- "Request Changes" — revisar el plan

[Answer]: Approve Plan
