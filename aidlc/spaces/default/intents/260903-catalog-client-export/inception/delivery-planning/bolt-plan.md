# Bolt Plan — Export de catálogo (formato cliente + ZIP)

Un **Bolt** es una tanda de construcción dentro de Construction — una
pasada completa por las etapas 3.1–3.7 sobre una o más Units de trabajo.
Este intent se entrega en un único Bolt.

## Bolt 1 — Export de catálogo (U1 + U2)

| Campo                 | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Units incluidas       | `u1-catalog-export-api` (backend, kind: service) + `u2-catalog-export-ui` (frontend, kind: ui) — `unit-of-work.md`                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Walking skeleton      | No — walking skeleton OFF a nivel de equipo (`team.md`/`org.md`, afirmado en 260829, sin especialización nueva para este intent)                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Definition of Done    | Endpoint nuevo funcionando (24 columnas exactas de `requirements.md` FR1.3 + ZIP combinado de imágenes por vehículo con el fix de `exterior_color`), acción "Exportar catálogo (formato cliente)" integrada en `catalog/page.tsx` con el flujo completo de `mockups.md` (resumen previo, prompt de nombre sugerido, loading, éxito/error), piso mínimo de test de `team-practices.md` en verde (regresión del bug de color, límites de `Organization.code`, contrato Content-Type/Content-Disposition end-to-end), pre-commit y pre-push completos en verde. |
| Confidence hypothesis | Valeria puede exportar su catálogo publicado y el archivo resultante (CSV + ZIP de imágenes) es directamente compatible con `facebook-auto-post`, sin reformateo manual — valida el objetivo central del intent (`requirements.md` § Intent analysis).                                                                                                                                                                                                                                                                                                       |
| Expected demo         | Exportar un catálogo real desde staging (con al menos un producto `published` con imágenes), abrir el ZIP resultante y verificar: 24 columnas en el orden exacto de `docs/data39.csv`, una carpeta por vehículo nombrada según convención (`stories.md` AC1.1.3), y el flujo de UI completo (resumen → prompt → loading → éxito) tal como lo especifica `mockups.md`.                                                                                                                                                                                        |

**Por qué un solo Bolt (no dos)**: `u1-catalog-export-api` (M) y
`u2-catalog-export-ui` (S) son dos Units chicas de un mismo feature
autocontenido — `team-practices.md` confirma que "no necesita rama ni
convención distinta" y que es "una adición de código dentro de un Unit
existente". `u2-catalog-export-ui` depende de `u1-catalog-export-api`
(`unit-of-work-dependency.md`) sin ofrecer valor de usuario independiente
si se entregara sola — no hay razón económica para separar en dos Bolts
lo que el usuario solo puede usar completo. Ver
`risk-and-sequencing-rationale.md` para el detalle de la heurística
elegida.

## Cobertura de historias

Las tres historias de `stories.md` (US1.1, US1.2, US1.3) y las cuatro
familias de FR de `requirements.md` (FR1-FR4) quedan cubiertas dentro de
este único Bolt — ver `unit-of-work-story-map.md` (Units Generation) para
el mapeo detallado por Unit.
