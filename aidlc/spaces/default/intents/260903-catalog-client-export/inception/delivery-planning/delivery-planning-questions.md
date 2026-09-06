# Delivery Planning — Questions

## Nota: bloque interactivo de Step 3 omitido

Las preguntas estratégicas y por-Bolt de esta etapa ya tienen respuesta
resuelta por decisiones previas del equipo, sin ambigüedad genuina que
requiera juicio humano adicional en esta etapa puntual:

- **Walking skeleton**: OFF a nivel de equipo (`team.md`/`org.md`, Q2 en
  260829, reconfirmado sin especialización nueva para este intent) — no
  hay Bolt 1 separado de skeleton.
- **Team Formation**: SKIP para scope `classic` — un único mob, ejecutado
  por `aidlc-developer-agent` (AI), sin Program Board de múltiples
  equipos.
- **Tamaño del Bolt**: `u1-catalog-export-api` (M) y `u2-catalog-export-ui`
  (S) son 2 Units chicas y fuertemente acopladas de un mismo feature
  autocontenido (`team-practices.md`: "no necesita rama ni convención
  distinta"; `unit-of-work.md`: U2 depende de U1, sin valor de usuario
  independiente si se entrega U1 sin U2) — no hay razón económica para
  dos Bolts separados de una feature tan chica; se bundlean en **1 solo
  Bolt**.
- **Riesgo a atacar primero**: sin riesgo genuino que amerite aislar en
  un Bolt separado — los riesgos de seguridad (zip-slip, IDOR, DoS por
  memoria) ya están mitigados por diseño en `requirements.md`
  NFR1-NFR3/`contract-summary.md`, no por secuenciación de Bolts.
- **Dependencias externas**: ninguna — `requirements.md` § Constraints
  confirma que no hace falta ninguna dependencia nueva, ningún equipo ni
  aprobación externa bloquea este feature.

Por eso se va directo al plan propuesto para confirmación (sin scoring
formal WSJF — un solo Bolt no necesita ranking).

## Plan propuesto

**1 Bolt**, bundleando ambas Units (`u1-catalog-export-api` +
`u2-catalog-export-ui`), ejecutado por `aidlc-developer-agent` (mob único,
sin Team Formation en scope `classic`), sin walking skeleton:

- **Definition of Done**: endpoint nuevo funcionando (24 columnas + ZIP
  combinado), UI de export integrada en `catalog/page.tsx`, tests del
  piso mínimo de `team-practices.md` en verde, pre-commit/pre-push
  completos en verde.
- **Confidence hypothesis**: Valeria puede exportar su catálogo publicado
  y el archivo resultante es directamente compatible con
  `facebook-auto-post`, sin reformateo manual (valida el objetivo central
  del intent, `requirements.md` § Intent analysis).
- **Demo esperado**: exportar un catálogo real desde staging, abrir el
  ZIP, verificar 24 columnas + carpetas de imágenes nombradas
  correctamente.

Sin dependencias externas que bloqueen el Bolt.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
