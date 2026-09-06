# Security Requirements — u2-catalog-export-ui

Sin superficie de seguridad nueva propia de este Unit — U2 no maneja
credenciales, no persiste datos, y no introduce ningún flujo de
autenticación/autorización distinto al ya vigente. Deriva de
`requirements.md` NFR1 (aislamiento multi-tenant) solo en el sentido de
que U2 NO participa en la resolución de `organization_id` — eso es
responsabilidad exclusiva de `u1-catalog-export-api` (`NFR1.1`, `NFR1.2`
de ese Unit), consistente con `functional-spec.md` § Workflow Paso 5
("el tenant_id se resuelve del lado del servidor, U2 no participa en esa
resolución"). El contrato de error que U2 consume y renderiza
(`ProductErrorResponse` — campos `detail.error`/`detail.message`, código
`4XX` de cap excedido) está fijado en `contract-summary.md` (Contract
Design) — U2 no define ese shape, solo lo consume tal cual.

## Amenazas STRIDE relevantes para este Unit

| Categoría              | Amenaza                                                                                                                                                                                                                                                                                                                                                                                                      | Mitigación                                                                                                                                                            | Estado                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Spoofing               | N/A — la sesión ya autenticada se reenvía vía cookie httpOnly, sin lógica de auth propia en U2                                                                                                                                                                                                                                                                                                               | Hereda el patrón ya vigente                                                                                                                                           | No aplica lógica nueva      |
| Tampering              | El único input de usuario (`window.prompt()`) SÍ se usa como nombre real del archivo ZIP descargado (`functional-spec.md` AC1.2.2), no solo como valor "sugerido" reemplazable — pero el riesgo es despreciable: el atributo `download` del navegador no ejecuta contenido, solo nombra el archivo; no hay superficie de XSS ni de path traversal (el nombre no llega al servidor, es puramente client-side) | Sin mitigación adicional requerida — riesgo inherentemente acotado por el mecanismo del navegador                                                                     | Riesgo aceptado, sin acción |
| Information Disclosure | Mensajes de error mostrados al usuario (`ExportSummaryBanner`, toasts) — deben ser específicos pero sin exponer detalles internos (stack traces, IDs de infraestructura)                                                                                                                                                                                                                                     | `frontend-components.md` ya especifica mensajes claros basados en `ProductErrorResponse.detail.message`, sin exponer `error` (código interno) directamente al usuario | Mitigado por diseño         |
| Denial of Service      | N/A — U2 no puede disparar múltiples requests simultáneos (guard de doble-clic, `AC1.1.10`)                                                                                                                                                                                                                                                                                                                  | `frontend-components.md` § ExportClientFormatButton                                                                                                                   | Mitigado por diseño         |
| Elevation of Privilege | N/A                                                                                                                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                     | No aplica                   |
| Repudiation            | N/A — el log de auditoría del evento de export (quién exportó, cuándo) es responsabilidad de `u1-catalog-export-api` (`observability-requirements.md` de ese Unit)                                                                                                                                                                                                                                           | —                                                                                                                                                                     | Cubierto por U1             |

## Protección de datos

Ningún dato sensible nuevo se maneja en el cliente — el nombre sugerido
del archivo (`window.prompt()`) es texto no sensible, y la respuesta del
endpoint (ZIP binario) se entrega directo al navegador sin
almacenamiento intermedio en el estado de la aplicación.
