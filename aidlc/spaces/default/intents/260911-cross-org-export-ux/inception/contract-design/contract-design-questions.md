# Contract Design — Preguntas (260911-cross-org-export-ux)

Solo hay 1 frontera a formalizar (U2 → U1, ambas del mismo sistema, sin
API pública/externa consumida fuera del sistema): U2 (frontend)
consume 2 endpoints REST ya existentes de U1 (backend). El mecanismo
(REST/HTTP síncrono), la propiedad del contrato (U1, mismo router
`product_router.py`), y la política de versionado (namespace `/api/v1`
ya existente, sin breaking changes) ya están fijados por convención
del proyecto — sin ambigüedad genuina, se omiten esas preguntas.

## Hallazgo real durante la lectura del código (Step 2)

Leyendo `product_router.py` se confirmó una asimetría de contrato ya
señalada como riesgo en `team-practices.md` § Deployment, pero no
resuelta hasta ahora: `GET /api/v1/products` (`list_products`, línea 801) YA trata `organization_id` ausente como "todas las
organizaciones" para un usuario con `ORG_ADMIN_VIEW_ALL` — comentario
inline explícito en `export-client-format.zip` (línea ~755) confirma
la asimetría: "Unlike list_products (which defaults an admin's
omitted organization_id to a global browse...), export always
defaults to the caller's own org when organization_id is omitted".

Esto significa: **la grilla (FR3) no necesita un endpoint nuevo ni un
parámetro nuevo** — `organization_id` ya es aceptado y ya soporta
"todas" (por omisión, para un admin). El único endpoint que necesita
un mecanismo NUEVO para "todas" es el de export, porque su convención
de omisión es la opuesta.

## Q1 — Mecanismo del sentinel "todas" en el contrato de export

```question
prompt: "Para el endpoint de export (export-client-format.zip), que hoy interpreta organization_id ausente como \"mi organización\" (al revés de list_products), ¿cómo exponemos el sentinel \"todas las organizaciones\" en el contrato de API?"
header: "Sentinel API export"
multiSelect: false
options:
  - label: "A. Nuevo query param booleano (Recommended)"
    description: "all_organizations=true, separado de organization_id (que sigue siendo UUID puro) — no toca el tipo del parámetro existente"
  - label: "B. Overload de organization_id"
    description: "organization_id acepta un literal string especial (ej. \"all\") además de UUID — un solo parámetro, pero cambia su tipo/validación"
  - label: "X. Other (please specify)"
    description: "Otro mecanismo"
```

[Answer]: A. Nuevo query param booleano

## Implicancia para U2 (frontend)

Dado que `list_products` y `export-client-format.zip` tienen
convenciones OPUESTAS de omisión, U2 NO puede simplemente "omitir
organization_id cuando no hay selección" para ambos endpoints por
igual — debe:

- **Grilla** (`GET /api/v1/products`): cuando `viewingOrgId` es `null`
  (default, FR2.2), pasar EXPLÍCITAMENTE `organization_id={mi propia
organización}` — nunca omitirlo — para no caer en el default "todas"
  que ya tiene este endpoint para admins. Cuando `viewingOrgId` es el
  sentinel "todas" (frontend-side), omitir `organization_id` (mismo
  mecanismo ya existente del endpoint). Cuando `viewingOrgId` es una
  organización puntual, pasar ese `organization_id`.
- **Export** (`GET /api/v1/products/export-client-format.zip`): cuando
  `viewingOrgId` es el sentinel "todas", pasar `all_organizations=true`
  (nuevo param, ignora `organization_id` si viene). En los otros dos
  casos, comportamiento ya existente sin cambios.

## Plan Summary (pre-generation)

- 1 contrato formalizado: U2 → U1, REST/HTTP síncrono, dueño U1.
- El sentinel "todas" se expone como un nuevo query param booleano
  `all_organizations` SOLO en el endpoint de export — la grilla ya
  soporta "todas" omitiendo `organization_id` (comportamiento
  preexistente de `list_products` para admins).
- U2 debe pasar `organization_id` explícito (propia org) por defecto
  en la grilla — nunca omitirlo — para no heredar el default "todas"
  ya existente de `list_products`.

Does this all look correct before I generate the contract summary?

```question
prompt: "Does this all look correct before I generate the contract summary?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, generá el artefacto"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de generar"
```

[Answer]: Looks correct

## Consolidated Summary Confirmation

- 1 boundary inter-unit formalizado (U2 → U1), 2 contratos: `GET /api/v1/products` (sin cambio de forma, solo wiring de U2) y `GET /api/v1/products/export-client-format.zip` (extendido con `all_organizations`, `base_folder`, `facebook_groups_fallback`).
- Hallazgo real verificado en código: `list_products` ya trata `organization_id` ausente como "todas" para admins — persistido como aprendizaje.
- 2 preguntas abiertas diferidas a Functional Design (nombre de archivo para "todas", campo de auditoría exacto).

Does this all look correct before closing the Contract Design stage?

```question
prompt: "Does this all look correct before closing the Contract Design stage?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, cerrar la etapa"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de cerrar"
```

[Answer]: Looks correct
