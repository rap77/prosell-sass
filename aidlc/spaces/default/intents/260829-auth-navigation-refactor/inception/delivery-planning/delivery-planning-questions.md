# Delivery Planning — Plan de Bolts

## Contexto

Solo hay 1 Unit (`U1` / `u1-auth-navigation-refactor`), sin dependencias con otros Units. Eso
colapsa la mayoría de las preguntas estratégicas de este stage a respuestas triviales:

- **¿Qué construir primero?** No aplica una elección real — solo hay una cosa que construir.
- **¿Puntuación formal (WSJF)?** No aplica con un solo ítem a secuenciar.
- **¿Tamaño del Bolt?** Un Bolt = el único Unit completo.
- **¿Bolts en paralelo?** No aplica — solo hay un Bolt.
- **¿Algo externo que nos frene?** No — Practices Discovery ya registró los gaps de seguridad de
  pipeline (SAST/DAST/dependency scanning) como aceptados y no bloqueantes, y este intent no toca
  ninguna API externa nueva (el endpoint de OAuth authorize ya existe y no cambia).
- **Walking skeleton**: ya afirmado como "No" en Practices Discovery (Q2) — no aplica acá tampoco.
- **Mob dueño del Bolt**: Team Formation fue salteado (scope `classic`) → default a
  `aidlc-developer-agent` (IA) para todos los Bolts, por regla de este stage.

Lo único que amerita una decisión real es qué cuenta como "hecho" para este Bolt y qué valida.

## Bolt 1 — `u1-auth-navigation-refactor` (único Bolt)

- **Unit(s) incluidos**: U1
- **Walking skeleton**: No
- **Definition of Done propuesta**: helper OAuth consolidado y en uso desde login/register; cero
  supresores de ESLint en el área (o el mínimo justificado, ver Open Question OQ1 de
  requirements.md); `useOAuthPreload.ts` y su test eliminados; JSDoc de `proxy.ts` corregido; tests
  nuevos para los botones OAuth pasando; suite existente en verde (NFR1); typecheck y lint sin
  nuevas violaciones.
- **Confidence hypothesis propuesta**: el login/register vía OAuth (Google y Microsoft) sigue
  funcionando exactamente igual para el usuario final tras el refactor — cero regresión de
  comportamiento observable (NFR3) — y el pipeline de lint/pre-commit ya no necesita justificar
  supresores en esta área.
- **Expected demo**: correr login/register con OAuth en dev, confirmar redirect + sesión + rol sin
  cambios visibles; mostrar el diff de `eslint-disable` (5→objetivo) y la corrida de tests nueva en
  verde.
- **Mob**: `aidlc-developer-agent`

## Confirmación

¿Esta Definition of Done / confidence hypothesis está bien planteada para este Bolt?

A. Sí, está bien así
B. Ajustar (especificar qué cambiar)

[Answer]: A. Sí, está bien así

## Consolidated Summary Confirmation

- 1 Bolt único (`u1-auth-navigation-refactor`) cubriendo el único Unit U1.
- Sin walking skeleton (ya afirmado en Practices Discovery), sin paralelismo posible (un solo Bolt).
- Mob: `aidlc-developer-agent` (Team Formation salteado en scope classic).
- Definition of Done y confidence hypothesis confirmadas tal cual se propusieron.
- Sin dependencias externas que bloqueen (gaps de seguridad de pipeline ya aceptados en Practices Discovery, sin API externa nueva).

Does this all look correct before I generate the artifacts?

A. Looks correct
B. Request changes

[Answer]: Looks correct
