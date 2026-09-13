# Deployment Execution — Questions

## Pre-Deployment Checks

**[Q1] ¿Están pasando todos los chequeos pre-deployment?**

Sí — `build-and-test/test-results.md`: build limpio (ruff/pyright/eslint/tsc),
2032/2032 tests backend, 1322/1322 tests frontend, Cross-Unit Coverage Gate
PASS (31/31 AC, 9/9 grupos de FR, 4/4 NFR).

A. Sí, todos verdes — proceder
B. No, hay fallas pendientes — detener
[Answer]: A. Sí, todos verdes — proceder

**[Q2] ¿Se requieren migraciones de base de datos?**

No — confirmado en `tech-stack-decisions.md` de ambos Units (sin
migración nueva, sin schema nuevo). Los cambios son de código de
aplicación únicamente (nuevo `category_translation.py`, extensión de
`csv_export.py`/`export_catalog_client_format.py`/`product_router.py`
en backend; `organizationStore.ts`/`OrganizationPicker.tsx`/
`products.ts`/`catalog/page.tsx` en frontend).

A. Sí, requiere migración — ejecutar y validar
B. No, sin migración — proceder directo
[Answer]: B. No, sin migración — proceder directo

**[Q3] ¿Los servicios dependientes están disponibles y saludables?**

Sí — `prosell-staging-api`, `prosell-staging-web`, `prosell-staging-db`,
`prosell-staging-redis` corriendo (verificado con `docker ps` en este
stage). El pipeline real (`.github/workflows/deploy.yml`) construye y
despliega ambos deployables (`apps/api`+`apps/web`) desde el mismo push
a `main` — ya afirmado en `team.md` § Deployment, sin cambio de
topología introducido por este intent.

A. Sí, saludables — proceder
B. No, hay degradación — detener
[Answer]: A. Sí, saludables — proceder

**[Q4] ¿Cuál es la ventana de deployment?**

Deploy-on-merge automático a staging (ya afirmado — sin ventana fija
para staging). Producción requiere confirmación manual explícita
(`promote-prod.yml`, input de texto exacto `"deploy"`) — fuera de
alcance de este stage, no se dispara acá.

A. Ahora — deploy-on-merge a staging, sin ventana restringida
B. Ventana específica requerida
[Answer]: A. Ahora — deploy-on-merge a staging, sin ventana restringida

## Consolidated Summary Confirmation

Plan: commitear los 18 archivos de código/tests de `apps/api`+`apps/web`
tocados por este intent (Conventional Commits, sin `--no-verify`, sin
`Co-Authored-By`) + los artefactos de registro AI-DLC del intent
`260911-cross-org-export-ux`, correr el pipeline de pre-commit completo,
y pushear a `origin/main` — dispara el deploy automático real a staging
vía `.github/workflows/deploy.yml`. Se excluyen del commit dos archivos
sin relación con este intent (`docs/catalogo-formato-cliente-2026-09-11.zip`,
archivo del usuario; `.tsbuildinfo` espurio ya documentado en `project.md`).

El usuario ya confirmó explícitamente esta acción fuera del archivo
(AskUserQuestion "¿Querés que commitee... y pushee a origin/main?" →
"Sí, commitear y pushear").

[Answer]: Looks correct
