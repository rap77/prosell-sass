# Discovered Rules — 260911-export-org-selector

> Integración final (Step 5). `## Mandated`/`## Forbidden` quedan
> deliberadamente vacíos: ninguna decisión de este intent amerita
> promoción a restricción de proceso de equipo. Ver `evidence.md` para el
> detalle completo del proceso de decisión (draft, 3 revisiones ciegas,
> entrevista humana).

## Mandated

Ninguna promoción a `team.md`/`project.md` en este intent.

El piso mínimo de test afirmado en la entrevista (Q1: "A. Sí, afirmar los
3 puntos tal cual") es específico de este intent — cubre superficie de
test nueva puntual (gating de UI + wiring de `organization_id`), no una
restricción de proceso de equipo general — y queda documentado en
`team-practices.md` § Testing Posture, no acá (mismo criterio ya aplicado
en `260903-catalog-client-export`: "una decisión de diseño acotada a un
solo feature/intent... se documenta en evidence.md [o, para pisos de
test puntuales, en team-practices.md], no se promueve a
discovered-rules.md ## Mandated").

Las precisiones de aplicación de convención ya vigente señaladas por
developer (naming en el boundary, distinción de boundaries de
lectura/escritura, organización de archivos) y por devsecops (chequear el
permiso puntual `ORG_ADMIN_VIEW_ALL` en vez de un proxy de rol) son
decisiones de diseño de producto/arquitectura de este feature puntual,
a resolver en Requirements Analysis/Functional Design — no constraints de
proceso de equipo.

## Forbidden

Ninguna promoción a `team.md`/`project.md` en este intent.

---

Las tres revisiones ciegas (quality, developer, devsecops) coincidieron
en AGREE de fondo, cero OBJECT, sobre que este intent no requiere
ninguna especialización nueva de práctica de equipo en ninguna de las 5
secciones. La entrevista humana (Step 4) confirmó únicamente el piso
mínimo de test puntual de Q1, sin abrir ninguna pregunta adicional sobre
las otras 4 secciones — consistente con el patrón ya reconfirmado varias
veces en `project.md` de mantener el piso de preguntas acotado cuando un
re-run no encuentra objeciones de fondo.
