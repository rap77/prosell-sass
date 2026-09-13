# Security Design — u1-cross-org-export-api

Diseña las soluciones concretas para `security-requirements.md`
(NFR1.1, NFR1.2, NFR2.1, NFR2.2, NFR2.3, NFR2.4) de este mismo Unit.
Extiende sin cambio de mecanismo el diseño ya aprobado en
`260903-catalog-client-export`.

## Autenticación y autorización (caso puntual, sin cambio)

Reusa el middleware ya existente (`auth_middleware.py`,
`rbac_middleware.py`) — `organization_id` se extrae del claim del JWT
ya decodificado (NFR1.1/NFR1.2), sin lógica de extracción nueva.

## Autorización — modo "todas las organizaciones" (NUEVO, NFR2.4, BR2.1)

Diseño concreto: extender la función ya existente
`_check_org_scope_permission()` para aceptar un flag `all_organizations`
además del `organization_id` puntual actual — MISMO chequeo de permiso
subyacente (`ORG_ADMIN_VIEW_ALL`/`super_admin`), sin una segunda función
paralela:

```python
# Pseudocódigo ilustrativo
def _check_org_scope_permission(
    current_user: User,
    organization_id: UUID | None = None,
    all_organizations: bool = False,
) -> None:
    if (organization_id is not None or all_organizations) and not current_user.has_permission(
        Permission.ORG_ADMIN_VIEW_ALL
    ):
        raise HTTPException(status_code=403, detail="...")
```

Defensa en profundidad: el chequeo se ejecuta en el handler del
endpoint, ANTES de resolver el alcance efectivo — igual si la request
viene de la UI o de una llamada directa (`security-requirements.md`
NFR2.4).

## Prevención de zip-slip (NFR2.1, sin cambio)

Reusa `_slug_part()`/`_sanitize_filename` ya existente como única vía
de construcción de cada segmento del path interno del ZIP — el
`org_code` resuelto en batch (`performance-design.md`) pasa por el
mismo sanitizador antes de concatenarse, sin excepción por modo.

```python
# Pseudocódigo ilustrativo
folder_name = "/".join(
    _slug_part(segment) for segment in [org_code_by_id[product.organization_id], product_folder]
)
```

## Input validation

Sin validación de input nueva más allá de la ya cubierta por FastAPI
(tipos de query params: `all_organizations: bool`, `base_folder: str`,
`facebook_groups_fallback: str`, `organization_id: UUID | None`) — sin
sanitización adicional de `base_folder`/`facebook_groups_fallback` más
allá de tratarlos como strings opacos que se concatenan (path) o se
unen con coma (groups), sin ejecutarlos ni interpretarlos.

## Manejo de secretos (sin cambio)

Sin secreto nuevo — reusa la configuración de cliente `boto3`/JWT ya
existente.

## Headers de seguridad (sin cambio)

Sin header nuevo — hereda los headers ya configurados a nivel de
aplicación FastAPI.

## Datos en tránsito y exposición de datos en la respuesta

**NFR2.2 (datos en tránsito)**: TLS ya vigente, sin cambio.

**NFR2.3 (datos expuestos)**: en modo "todas", el ZIP expone el
catálogo completo de la plataforma — alcance mayor, pero gateado por el
MISMO permiso (NFR2.4) que ya autoriza ver cualquier organización
ajena. Sin diseño de masking ni filtrado adicional — el chequeo de
permiso (arriba) es el único control de alcance.

## Fuente

Deriva de `security-requirements.md` (NFR1.1, NFR1.2, NFR2.1-NFR2.4) y
`functional-spec.md`/`contract-summary.md` (Contract 2) para el punto
exacto del flujo donde cada control aplica.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-12T20:07:08Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                                               | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Recommendation                                                                                                                                                                                                                                                             |
| --- | -------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor    | `performance-design.md` § Cache de resolución de vertical de categoría | La memoización lazy (`vertical_cache: dict[UUID, UUID \| None]`) se puebla dentro de un loop `async` sin ningún mecanismo de exclusión — si el mismo `category_id` hoja se resuelve para dos productos consecutivos ANTES de que el primer `await` complete (posible con `asyncio.gather`/concurrencia real sobre el loop, aunque el pseudocódigo actual lo muestra secuencial), ambas corutinas verían el cache vacío y dispararían el mismo walk-up dos veces. No es un bug de corrección (el resultado final escrito en el dict es el mismo, solo hay trabajo duplicado transitorio), y el diseño ya documenta explícitamente que el walk-up es secuencial dentro del armado de filas — pero el archivo no aclara si el armado de filas corre secuencial o concurrente, dejando la garantía implícita. | Agregar una línea explícita en `performance-design.md` aclarando que el armado de filas (a diferencia de la lectura de imágenes) es secuencial, no concurrente — eso hace la ausencia de lock una garantía de diseño explícita en vez de una casualidad de implementación. |
| 2   | Minor    | `traceability.json`                                                    | La decisión de NO incluir `NFR-PERF-6` en `upstream_ids` es correcta y está bien justificada (`memory.md`, `performance-design.md`): `NFR-PERF-6` nunca fue agregado como ID real a `performance-requirements.md` — solo aparece como una recomendación de un hallazgo Minor del reviewer de NFR Requirements dentro de `security-requirements.md` § Review, nunca aplicada al archivo de origen. Incluirlo en `upstream_ids` citaría un ID upstream inexistente; tratarlo como presupuesto de diseño local es la resolución correcta dado el propósito del archivo (upstream NFR → diseño). Se señala solo para que quede constancia explícita de la verificación — no bloquea.                                                                                                                          | Ninguna acción requerida. Opcionalmente, si un futuro intent formaliza NFR-PERF-6 en `performance-requirements.md`, promoverlo a `upstream_ids` en ese momento.                                                                                                            |

### Validation Tool Results

No se listan herramientas de validación automatizadas para esta etapa (`nfr-design.md` no declara `validation_tools`). Verificación manual: los 16 IDs de `upstream_ids` (NFR1.1, NFR1.2, NFR2.1-2.4, NFR3.1-3.2, NFR-PERF-1 a 5, NFR-REL-1 a 3) se confirmaron uno por uno, literales, en los 5 archivos de `nfr-requirements` de este mismo Unit (`grep` cruzado) — cero IDs huérfanos, cero referencias rotas. Los 6 archivos Markdown tienen ≥2 H2 cada uno y citan en prosa los artefactos de `consumes` aplicables (`performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `observability-requirements.md`, `tech-stack-decisions.md`, `functional-spec.md`, `contract-summary.md`) — cobertura completa entre el conjunto de 6 archivos, aunque no cada archivo cita los 8.

### Summary

Diseño sólido y consistente con BR2.1/BR2.3/BR2.4/BR1.3 de `rules.md` y con el contrato ya aprobado en `contract-design/contract-summary.md` (verificado línea por línea: `all_organizations` es un parámetro separado, no un overload de `organization_id`; el chequeo de permiso cubre ambos; el método único de conteo parametrizado replica el patrón ya usado por `list_products`). La reutilización sin cambio de las dos decisiones de `260903` (semáforo de 20, retry 1×200ms) está bien justificada — el techo de volumen (500) no cambia, solo el alcance del filtro. Sin ciclos, sin IDs huérfanos, sin contradicciones entre los 6 artefactos. Los dos hallazgos Minor no bloquean.
