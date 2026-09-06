# User Stories — Assessment

**Decision**: Execute.

**Rationale**: El feature es user-facing (el vendedor/dealer dispara la exportación desde la UI de catálogo), tiene un flujo de interacción no trivial (input de ruta destino, descarga, manejo de errores) y una decisión de UX pendiente (mecanismo de entrega CSV+ZIP, señalada como Critical por el reviewer de Requirements Analysis) que se resuelve mejor pensando el flujo desde la perspectiva del usuario, no solo como una lista de FR/NFR.

**Factores considerados**:

- Proyecto: brownfield, scope `classic` (Standard depth) — User Stories está en el plan de ejecución (no SKIP).
- Alcance: un solo flujo de usuario nuevo (exportar catálogo), un solo persona relevante (vendedor/dealer), sin múltiples roles enfrentados ni coordinación cross-team.
- Complejidad: moderada — no es un CRUD trivial (arma CSV+ZIP, maneja errores de imágenes faltantes, límites de recursos), pero tampoco es un dominio nuevo grande.

**Áreas donde las historias agregan más valor**:

- Resolver explícitamente el flujo de "un clic, un resultado" vs. "dos descargas separadas" (el gap Critical del reviewer) en términos de lo que el vendedor ve y hace, no solo como contrato de API.
- Acceptance criteria testeables para los casos de error ya señalados como no-testeables en requirements.md (catálogo vacío, límite de recursos excedido).
