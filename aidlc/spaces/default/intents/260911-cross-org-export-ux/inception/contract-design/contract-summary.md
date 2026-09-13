# Contract Summary — 260911-cross-org-export-ux

Fuente: `unit-of-work.md`, `unit-of-work-dependency.md`,
`requirements.md`. Una sola frontera inter-unit en este intent: U2
(`u2-cross-org-export-ui`) consume 2 endpoints REST ya existentes de
U1 (`u1-cross-org-export-api`), extendidos por este intent.

## Contracts Table

| #   | Provider Unit           | Consumer               | Mechanism          | Owner                   |
| --- | ----------------------- | ---------------------- | ------------------ | ----------------------- |
| 1   | u1-cross-org-export-api | u2-cross-org-export-ui | REST/HTTP síncrono | u1-cross-org-export-api |
| 2   | u1-cross-org-export-api | u2-cross-org-export-ui | REST/HTTP síncrono | u1-cross-org-export-api |

## Contract 1 — `GET /api/v1/products` (filtrado de grilla, FR3)

**Sin cambio de forma del endpoint** — `organization_id` ya existe
como parámetro opcional (`UUID | None`) y ya soporta "todas las
organizaciones" implícitamente: un usuario con `ORG_ADMIN_VIEW_ALL`
que omite `organization_id` recibe productos de todas las
organizaciones (`_check_org_scope_permission`, comportamiento
preexistente, confirmado en `product_router.py:801-838`). El trabajo
de este intent es de INTEGRACIÓN (U2 debe empezar a pasar este
parámetro), no de contrato nuevo.

```yaml
openapi: 3.0.3
info:
  title: Products List (delta — filtrado por organización)
  version: "1.0"
paths:
  /api/v1/products:
    get:
      summary: Lista productos, opcionalmente filtrados por organización
      parameters:
        - name: organization_id
          in: query
          required: false
          schema:
            type: string
            format: uuid
          description: >
            Filtra por organización. AUSENTE: para un usuario CON
            ORG_ADMIN_VIEW_ALL, retorna productos de TODAS las
            organizaciones (comportamiento preexistente, sin cambios).
            Para un usuario SIN ese permiso, retorna solo su propia
            organización (comportamiento preexistente, sin cambios).
        # ... resto de parámetros (category_id, status, etc.) sin cambios
      responses:
        "200":
          description: Lista de productos (ProductListResponse), sin cambio de forma
        "422":
          description: attr.* sin category_id (comportamiento preexistente, sin cambios)
```

### Contrato de integración para U2 (NUEVO — comportamiento requerido del consumidor)

```yaml
consumer_contract:
  rule: >
    U2 DEBE pasar organization_id explícito (la propia organización del
    usuario) cuando viewingOrgId está en su estado por defecto (null),
    para NO heredar el comportamiento "todas" que este endpoint ya
    aplica quando organization_id se omite y el usuario tiene
    ORG_ADMIN_VIEW_ALL — de lo contrario un Super Admin vería "todas las
    organizaciones" en la grilla sin haberlo elegido explícitamente
    (violaría FR2.2/AC2.2.1).
  cases:
    - viewingOrgId: null (default)
      organization_id enviado: "{propia organización del usuario}"
    - viewingOrgId: "<uuid-puntual>"
      organization_id enviado: "<uuid-puntual>"
    - viewingOrgId: "ALL_ORGS" (sentinel de frontend)
      organization_id enviado: (omitido)
```

## Contract 2 — `GET /api/v1/products/export-client-format.zip` (export, FR2/FR4/FR6)

**Extensión de forma** — se agrega un nuevo query param
`all_organizations` (booleano, default `false`) — decisión ya tomada
en Q1 de `contract-design-questions.md` (opción A: param booleano
separado, en vez de overload de `organization_id`). `organization_id`
mantiene su tipo y semántica actual sin cambios (ausente = propia
organización, presente = organización ajena puntual con permiso).

```yaml
openapi: 3.0.3
info:
  title: Export Catalog Client Format (delta — modo "todas las organizaciones")
  version: "1.0"
paths:
  /api/v1/products/export-client-format.zip:
    get:
      summary: Exporta el catálogo en formato cliente (CSV+ZIP)
      parameters:
        - name: organization_id
          in: query
          required: false
          schema:
            type: string
            format: uuid
          description: >
            Sin cambios respecto al comportamiento actual. Ausente =
            propia organización. Presente = organización ajena puntual
            (requiere ORG_ADMIN_VIEW_ALL). Ignorado si
            all_organizations=true.
        - name: all_organizations
          in: query
          required: false
          schema:
            type: boolean
            default: false
          description: >
            NUEVO (FR2, FR4). Cuando es true, exporta el catálogo de
            TODAS las organizaciones con producto en una sola
            respuesta. Requiere ORG_ADMIN_VIEW_ALL/super_admin (FR4.4,
            NFR2) — mismo chequeo ya usado para organization_id ajeno
            puntual (_check_org_scope_permission). Sin ese permiso,
            403 aunque el resto de los parámetros sea válido.
        - name: base_folder
          in: query
          required: true
          schema:
            type: string
          description: >
            NUEVO (FR8). Carpeta base de imágenes confirmada por el
            usuario vía popup — se concatena con el código de
            organización y la carpeta del producto para completar la
            columna path del CSV (FR8.4).
        - name: facebook_groups_fallback
          in: query
          required: true
          schema:
            type: string
          description: >
            NUEVO (FR9). Grupos de Facebook confirmados por el usuario
            vía popup — se usa SOLO como fallback para productos sin
            facebook_groups propio (FR9.4).
      responses:
        "200":
          description: CSV+ZIP del catálogo (sin cambio de forma del contenido, salvo las 8 columnas corregidas de FR7 y el path/groups completados)
          headers:
            Content-Disposition:
              schema:
                type: string
              description: >
                Sin cambios de forma. Para all_organizations=true, el
                nombre de archivo debe distinguirse del caso puntual
                (decisión de Functional Design, no fijada acá).
        "403":
          description: >
            Sin permiso ORG_ADMIN_VIEW_ALL/super_admin al pasar
            organization_id ajeno O all_organizations=true (FR4.4)
        "404":
          description: >
            Catálogo vacío — sin cambio de forma, aplica también al
            caso all_organizations=true cuando ninguna organización
            tiene productos (US4.5)
        "413":
          description: >
            EXPORT_MAX_PRODUCTS (500) excedido — sin cambio de forma,
            ahora aplicado como límite GLOBAL cuando
            all_organizations=true (FR4.3)
```

### Contrato de auditoría (NFR1, FR6 — no es un boundary HTTP, pero es parte del contrato de comportamiento)

```yaml
shared-schema:
  name: cross_org_export_audit_log
  format: logger.info() estructurado (sin tabla de auditoría dedicada, per precedente ya afirmado en project.md)
  fields_when_all_organizations:
    - scope: "ALL_ORGS" # valor exacto a confirmar en Functional Design — distingue este evento del export de una org ajena puntual
    - user: current_user.id
    - own_org: owner_tenant_id
  fields_when_single_cross_org:
    - user: current_user.id
    - own_org: owner_tenant_id
    - exported_org: effective_tenant_id
    # comportamiento ya existente, sin cambios
```

## Contract Ownership Rules

- **U1 (backend) posee ambos specs** — cualquier cambio de forma
  (nuevo campo, nuevo código de error) requiere que U1 lo publique
  primero; U2 consume el contrato ya publicado, nunca al revés.
- **Cambios breaking**: ninguno en este intent, pero con una precisión
  importante — `all_organizations` es genuinamente aditivo (opcional,
  default `false`, un consumidor que no lo envíe conserva el
  comportamiento actual). `base_folder` y `facebook_groups_fallback`,
  en cambio, están declarados `required: true` en este mismo contrato
  (FR8.1/FR9.1: se piden en TODO export, no solo en el modo "todas") —
  un query param nuevo REQUERIDO sí es, por definición, breaking para
  cualquier consumidor que hoy invoque el endpoint sin enviarlos (FastAPI
  rechazaría la request con 422). Esto no representa un riesgo real de
  ruptura en producción porque U1 (que posee y cambia el contrato) y U2
  (el único consumidor real de este endpoint) se entregan en el MISMO
  Bolt de este intent — no hay una versión de U2 desplegada en producción
  que invoque este endpoint sin esos dos parámetros antes de que el Bolt
  completo se mergee. Documentado así para que quede explícito: la
  ausencia de riesgo depende del bundling de U1+U2 en un solo Bolt, no de
  que el cambio sea aditivo en el sentido estricto de compatibilidad
  hacia atrás.
- **Cambios aditivos**: U2 debe ignorar cualquier campo nuevo no
  documentado que U1 agregue a la respuesta en el futuro (contrato
  estándar ya vigente en el proyecto).

## Open Questions

| Contract   | Question                                                                                                                | Blocks                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 2 (export) | Nombre de archivo exacto para el caso `all_organizations=true` (para distinguirlo del caso puntual)                     | Functional Design, antes de Code Generation de U1 |
| Auditoría  | Valor exacto del campo que distingue el log de "todas" (ej. `scope=ALL_ORGS`) — FR6.1 ya lo deja abierto explícitamente | Functional Design, antes de Code Generation de U1 |

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-12T14:32:08Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                        | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Recommendation                                        |
| --- | -------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | Major    | § Contract Ownership Rules → "Cambios breaking" | La afirmación original ("un consumidor viejo que no los envíe sigue funcionando") era autocontradictoria: `base_folder` y `facebook_groups_fallback` están declarados `required: true` en el mismo contrato — un query param nuevo REQUERIDO sí rompe a cualquier consumidor que no lo envíe (FastAPI devuelve 422). Corregido directamente en el artefacto: se aclara que `all_organizations` es genuinamente aditivo, pero que los otros dos son técnicamente breaking en sentido estricto, y que la ausencia de riesgo real depende de que U1+U2 se entreguen en el mismo Bolt (no hay consumidor viejo desplegado en producción antes del merge). | Corregido — ver el archivo. Ninguna acción adicional. |

No se encontraron hallazgos Critical. Un solo hallazgo Major, corregido directamente antes de este veredicto — no se presenta al humano como NOT-READY.

### Verificación de las 5 preguntas de la dispatch

1. **Premisa central (asimetría list_products vs. export)**: VERIFICADA carácter a carácter contra `product_router.py`. `list_products` (línea 801-838): `effective_tenant = None if can_view_all_orgs else tenant_id`, y el `organization_id` se pasa SEPARADO al use case/repositorio (`_apply_product_filters`, línea 135-136: `if organization_id is not None: stmt.where(ProductModel.organization_id == organization_id)`). Consecuencia exacta: admin sin `organization_id` → sin filtro de tenant NI de organización → "todas"; admin CON `organization_id` → filtro puntual por esa organización (el filtro de `organization_id` se aplica igual, independientemente de `can_view_all_orgs`); no-admin → siempre `tenant_id` propio, nunca puede pasar `organization_id` ajeno (403 en `_check_org_scope_permission`, línea 284-292). `export_catalog_client_format` (línea 735-798): `effective_tenant_id = organization_id if (organization_id is not None and can_view_all_orgs) else owner_tenant_id` — ausente siempre resuelve a la propia organización, comentario inline explícito en el código (línea 760-763) confirma la asimetría documentada. La premisa del contrato es exacta.
2. **Contrato de integración para U2**: internamente consistente. Contract 1 cubre explícitamente los 3 casos de `viewingOrgId` (null/puntual/ALL_ORGS) con un bloque `consumer_contract` dedicado — justificado porque ese endpoint tiene el default-gotcha real (omitir implica "todas" para un admin). Contract 2 no repite un bloque formal de 3 casos, pero cada caso queda cubierto igual de forma inequívoca en las descripciones de los parámetros (`organization_id`: ausente=propia, presente=puntual, ignorado si `all_organizations=true`; `all_organizations`: nuevo sentinel explícito) — no hay caso de `viewingOrgId` sin especificar para ninguno de los dos endpoints.
3. **Aditividad de `all_organizations`/`base_folder`/`facebook_groups_fallback`**: `all_organizations` es genuinamente aditivo (opcional, default `false`). `base_folder`/`facebook_groups_fallback` NO son aditivos en sentido estricto (son `required: true`) — hallazgo Major #1 arriba, ya corregido en el artefacto. La firma real del endpoint (línea 735-741, sin estos 3 params hoy) confirma que son três parámetros genuinamente nuevos, no un rename ni un overload de uno existente.
4. **Códigos de error**: verificados exactos contra el código real — `EmptyCatalogExportError` → 404 (línea 778-779), `ExportLimitExceededError` → 413 (línea 780-783), falta de permiso → 403 vía `_check_org_scope_permission` (línea 289-292). Coinciden con lo documentado en Contract 2.
5. **Open Questions genuinamente diferidas**: ambas (nombre de archivo para `all_organizations=true`; valor exacto del campo de auditoría) están fuera del alcance de Contract Design (son detalles de implementación de Functional Design, no de forma del contrato HTTP) y ya estaban marcadas como abiertas en `requirements.md` (FR6.1 lo deja explícito). Ninguna bloquea Units Generation, que ya cerró (`unit-of-work.md`/`unit-of-work-dependency.md` READY, revisados) sin depender de estos dos valores puntuales.

### Validation Tool Results

No se listan validation tools en la definición de esta etapa (Contract Design); verificación hecha por lectura cruzada manual del artefacto primario, `contract-design-questions.md`, `unit-of-work.md`, `unit-of-work-dependency.md`, `requirements.md`, y el código real de `product_router.py` (líneas 265-293, 735-946) más `list_products.py`/`product_repository_impl.py` (resolución de filtros).

### Summary

El diseño de contrato es sólido: la premisa central (asimetría de convención entre `list_products` y el export) está verificada línea por línea contra el código real, el sentinel `all_organizations` es una extensión limpia y aditiva, los códigos de error documentados coinciden exactamente con las excepciones reales, y las 2 Open Questions están genuinamente diferidas sin bloquear el trabajo ya cerrado de Units Generation. Se corrigió una autocontradicción mecánica en la sección de compatibilidad hacia atrás (parámetros nuevos requeridos presentados como no-breaking) antes de este veredicto.
