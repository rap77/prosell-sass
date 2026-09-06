# Unit Test Instructions — u2-catalog-export-ui

Test Strategy: **standard** (5-8 tests por componente). Ver Testing
Contract embebido en `code-generation-plan.md`.

## Runner

```
pnpm --filter web vitest run tests/components/catalog/CatalogPage.test.tsx
```

Confirmar en verde ANTES de tocar código (baseline).

## Archivo a extender

`apps/web/tests/components/catalog/CatalogPage.test.tsx` — patrón ya
vigente (`tests/components/{module}/X.test.tsx`), NO crear archivo
nuevo ni usar el patrón co-located.

## Casos obligatorios

1. El ítem "Exportar catálogo (formato cliente)" del menú desplegable
   está visible y dispara el flujo al hacer click.
2. El banner de resumen muestra el conteo correcto de productos
   `published` ya cargados en memoria (sin request nuevo — verificar
   que NO se dispara ningún `fetch` extra al abrir el banner).
3. Catálogo vacío (`rows.length === 0` de productos `published`): el
   banner muestra el mensaje de catálogo vacío SIN botón "Continuar".
4. Confirmar el banner + confirmar el prompt dispara
   `exportCatalogClientFormat()` y deshabilita el botón/ítem mientras
   está en curso (guard de doble-clic).
5. Éxito (200, `Content-Type: application/zip`): dispara la descarga
   del blob y muestra toast de éxito.
6. Error 413 (`ExportLimitExceededError`): muestra toast de error
   específico con el mensaje de `detail.message` del backend, sin
   disparar descarga.
7. Cancelar el `window.prompt()` no dispara ningún request.
8. **Contrato de descarga** (piso mínimo del equipo, ítem 3 en
   `team.md`): test dedicado sobre `exportCatalogClientFormat()`
   (puede vivir en el mismo archivo o en un test unitario aislado de
   `products.ts` si ya existe un archivo de tests para ese módulo)
   verificando que una `Response` mockeada con
   `Content-Type: application/zip` + `Content-Disposition: attachment`
   se maneja como blob, no como JSON.

## Mocking

- Mockear `fetch` global o el módulo `products.ts` — sin red real, sin
  Postgres, sin backend real (esto corre en Build and Test, no acá).
- Mockear `window.prompt` (ya hay precedente en el archivo actual para
  `handleExportCsv`, reutilizar el mismo patrón).

## No hacer

- No backfillear cobertura de `handleExportCsv`/`exportCatalogCsv`
  (código pre-existente no tocado por este cambio) — señalado por
  `team.md` como gap a resolver en Build and Test, no en Code
  Generation.
- No generar `integration-test-instructions.md` /
  `performance-test-instructions.md` / `security-test-instructions.md`
  — Unit kind `ui` sin NFR de performance/security propio (ya
  confirmado por `project.md`).
