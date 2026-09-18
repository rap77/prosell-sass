# External Dependency Map — Catálogo Canónico de Vehículos para Facebook

Liviano — todo el trabajo de este Bolt es interno al equipo, sin aprobaciones ni hand-offs de otro equipo, y sin cambio de infraestructura ni de topología de despliegue (`requirements.md` § Constraints).

## Dependencias externas identificadas

| Dependencia                                           | Dueño                                                | Bolt que la consume | Impacto si se demora                                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| API de NHTSA (decode de VIN)                          | Ya integrada, sin cambios de contrato en este intent | Bolt 1              | Ninguno — es una integración ya en producción, no nueva; este intent no depende de ningún cambio del lado de NHTSA.                |
| Automatización en vivo de Facebook (publicación real) | Fuera de alcance explícito de este intent            | Ninguno             | N/A — FR4 documenta el contrato existente sin activarla; ningún Bolt de este plan depende de que Facebook apruebe o habilite nada. |

No hay ítems bloqueantes gateados fuera del equipo — este Bolt es completamente AI-contained.
