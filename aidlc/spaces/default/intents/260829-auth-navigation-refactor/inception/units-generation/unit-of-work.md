# Unit of Work

| Unit ID | Directory                     | Kind |
| ------- | ----------------------------- | ---- |
| U1      | `u1-auth-navigation-refactor` | `ui` |

## U1 — `u1-auth-navigation-refactor`

- **Description**: Consolida el redirect OAuth duplicado entre login/register en un helper
  compartido, elimina los 5 supresores de ESLint del área (o los deja al mínimo justificado si la
  regla de lint resulta genuinamente ineludible), borra el código muerto `useOAuthPreload.ts` y su
  test, corrige el JSDoc de cabecera de `proxy.ts`, y agrega cobertura de test para los botones
  OAuth consolidados.
- **Boundaries**: `apps/web/src/lib/api/fetchWithAuth.ts`, `apps/web/src/app/auth/login/LoginPageContent.tsx`,
  `apps/web/src/app/auth/register/RegisterPageContent.tsx`, `apps/web/src/proxy.ts`,
  `apps/web/src/hooks/useOAuthPreload.ts` (a eliminar), un nuevo helper compartido bajo
  `apps/web/src/lib/auth/` (ubicación exacta a decidir en Functional Design/Code Generation), y sus
  tests correspondientes.
- **Responsibilities**: FR1 (helper OAuth consolidado), FR2 (cero supresores de ESLint), FR3
  (eliminar código muerto), FR4 (JSDoc de `proxy.ts`), FR5 (cobertura de test de botones OAuth).
- **Deployment model**: Embebido — parte del build/deploy normal de `apps/web`, sin runtime ni
  contrato de despliegue propio.
- **Relative complexity**: S (small) — ~6 archivos ya identificados por Reverse Engineering, sin
  cambios de infraestructura ni de contrato externo.
- **Implementation notes and constraints**:
  - El flujo OAuth2 requiere navegación completa del navegador (`window.location.href` o
    equivalente) — no puede reemplazarse por `fetch`/`router.push` sin romper el flujo real.
  - No se implementa en este Unit el patrón de manejo de errores tipados por dominio (afirmado en
    Practices Discovery como convención futura) — queda explícitamente fuera de alcance (ver
    `requirements.md` § Constraints).
  - La suite de tests existente debe permanecer en verde (NFR1); los tests nuevos de FR5 son
    adicionales, no un intento de subir el piso de cobertura global (NFR2).

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-08-29T17:18:29Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                                 | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Recommendation                                                                                                                                                                                               |
| --- | -------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Minor    | unit-of-work-dependency.md § Machine-Readable Edge Block | Verificado manualmente: el bloque YAML declara un único nodo (`u1-auth-navigation-refactor`), `kind: ui` (valor válido del enum `service\|spec\|ui\|packaging\|library`), `depends_on: []`, identificador en minúsculas/guiones dentro del máximo de 64 caracteres. Trivialmente acíclico (grafo de un solo nodo, cero aristas). No hay defecto — se registra como evidencia de la verificación, no como hallazgo a corregir.                                                                                                                                                                                                       | Ninguna acción requerida.                                                                                                                                                                                    |
| 2   | Minor    | unit-of-work.md § U1 Boundaries / Implementation notes   | El helper OAuth nuevo de FR1 queda embebido en `kind: ui` en vez de modelarse como su propio Unit `library`. Es la decisión correcta para este alcance: el helper solo lo consumen dos archivos dentro del mismo Unit (no hay un segundo Unit que lo consuma), por lo que separarlo en `library` solo agregaría la matriz completa de artefactos de diseño de Construction (incluyendo documentos de escalabilidad/contrato que un helper de una función no necesita) sin ningún beneficio de desacoplamiento real. Se señala para que el humano confirme que esta lectura coincide con su intención, no porque el diseño esté mal. | Ninguna acción requerida salvo que el humano prefiera aislar el helper como `library` de cara a una reutilización futura fuera de `apps/web` — no hay evidencia en requirements.md de que eso esté planeado. |
| 3   | Minor    | traceability.json / requirements.md FR2.1                | FR2.1 también modifica la construcción de URL del redirect de sesión expirada en `fetchWithAuth.ts`, pero FR5 (cobertura de test) solo cubre explícitamente los botones OAuth de login/register — no hay un FR de test dedicado para el cambio en `fetchWithAuth.ts`. La traceability.json de este stage es correcta (cada FR declarado mapea a U1), y esto no es un defecto de la descomposición en Units — es una nota para que Build and Test / Code Generation no asuman que FR5 cubre ese segundo cambio.                                                                                                                      | Ninguna acción en este stage; confirmar en Code Generation/Build and Test que el cambio de `fetchWithAuth.ts` (FR2.1) recibe verificación equivalente aunque no esté nombrado en FR5.                        |

### Validation Tool Results

No se listan herramientas de validación específicas en el frontmatter de este stage más allá de los sensores automáticos (`required-sections`, `upstream-coverage`, `traceability`), que corren aparte de este pase de revisión. Verificación manual realizada en su lugar:

| Check                                                          | Resultado                  | Interpretación                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| YAML edge block bien formado y acíclico                        | PASS (verificación manual) | Un nodo, sin aristas — no hay ciclo posible.                                                                                                                                                                                                                                                                                                                     |
| `kind` dentro del enum permitido                               | PASS                       | `ui` es un valor válido.                                                                                                                                                                                                                                                                                                                                         |
| traceability.json cubre todo FR declarado en requirements.md   | PASS                       | FR1–FR5, los 5 con `status: OK` y `target: U1`; ningún FR de requirements.md queda fuera.                                                                                                                                                                                                                                                                        |
| unit-of-work-story-map.md coincide con traceability.json       | PASS                       | Misma asignación FR→U1 en ambos artefactos.                                                                                                                                                                                                                                                                                                                      |
| Justificación de "1 solo Unit" respaldada por evidencia previa | PASS                       | `units-generation-questions.md` documenta por qué se saltó el bloque de preguntas de estrategia (todos los FR tocan los mismos archivos/área, sin frontera de despliegue/servicio/dominio distinta) — consistente con el skip de Domain Design (sin componentes nuevos) y con requirements.md (todo el alcance es `apps/web`, un solo componente `prosell-web`). |

### Summary

La descomposición en un único Unit `U1` (`ui`, sin dependencias) es razonable y está bien justificada: los 5 FR son cambios acoplados dentro de la misma superficie frontend, sin frontera de despliegue/servicio distinta que amerite separación, consistente con el skip legítimo de Domain Design y User Stories para este refactor interno. El bloque YAML es válido y trivialmente acíclico, y la traceability.json cubre los 5 FR sin gaps. Los tres hallazgos son de severidad Minor y no bloquean la aprobación — son observaciones para que el humano las pese antes de aprobar, no defectos estructurales.
