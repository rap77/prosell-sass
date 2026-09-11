# External Dependency Map — 260911-export-org-selector

Sin dependencias externas que bloqueen el Bolt — el intent es totalmente
AI-contenido dentro de `apps/web`.

## Dependencias ya resueltas (no bloquean, ya estables)

| Dependencia                                                      | Estado                                                                  | Bolt que la consume |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------- |
| `GET /api/v1/products/export-client-format.zip?organization_id=` | Ya mergeado (`264d99f1`, intent `260910-export-cross-org`), 10/10 tests | Bolt 1              |
| `GET /api/v1/admin/organizations`                                | Ya en producción, usado por `OrganizationPicker`                        | Bolt 1              |

## Sin hand-offs de otro equipo

Team Formation fue SKIP — todo el Bolt lo ejecuta `aidlc-developer-agent`
(AI), sin dependencia de aprobación ni hand-off de otro equipo humano más
allá del gate de aprobación del propio workflow.
