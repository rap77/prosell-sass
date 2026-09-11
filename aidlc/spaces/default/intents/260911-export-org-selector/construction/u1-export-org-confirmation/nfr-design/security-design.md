# Security Design — u1-export-org-confirmation

## Sin patrón de diseño técnico nuevo

`nfr-requirements` formalizó `NFR1` (`security-requirements.md`) como un
requisito 100% HEREDADO: este Unit no agrega ningún control de
seguridad, guard, ni patrón de autorización nuevo. NFR1.1–NFR1.3 se
satisfacen enteramente por mecanismos ya existentes y ya auditados:

- **NFR1.1** (inalcanzabilidad de `viewingOrgId` sin permiso) — se
  satisface por el guard ya implementado en
  `organizationStore.setViewingOrgId()` (verificado contra código real en
  la revisión de Functional Design).
- **NFR1.2** (autorización real en el backend) — se satisface por
  `_check_org_scope_permission()`, ya diseñado, implementado y testeado
  en el intent previo `260910-export-cross-org`.
- **NFR1.3** (auditoría sin duplicar) — se satisface por el
  `logger.info()` ya implementado en el mismo intent previo.

Por eso esta etapa no produce un diseño de patrón nuevo (no hay
zero-trust, defense-in-depth, ni arquitectura de autenticación que
diseñar) — sería inventar diseño técnico para un requisito que ya está
resuelto por diseño previo. Esto es una decisión explícita, no una
omisión.

## Review

**Verdict:** READY

**Findings:**

1. [Severidad: Minor] — El sensor `upstream-coverage` probablemente vuelva a fallar (advisory) en esta etapa por el mismo motivo ya documentado y aceptado en `nfr-requirements/security-requirements.md` § Review: ni `rules` ni `contract-summary` tienen artefacto que citar (`domain-design`/`contract-design` SKIP, Unit `ui` sin `rules.md`). No es un gap nuevo de esta etapa — es la misma causa estructural ya explicada y aceptada río arriba; se deja constancia por trazabilidad, sin bloquear.

Sin otros hallazgos. Verificación de los 3 puntos del brief: (1) declarar "sin diseño técnico nuevo" en las 3 categorías es razonable y verificable contra `nfr-requirements` — NFR1.1 se satisface por un guard ya implementado y verificado contra código real (`organizationStore.ts:361-367`, citado en `security-requirements.md`), NFR1.2/NFR1.3 por mecanismos backend ya auditados en `260910-export-cross-org`, y `performance-requirements.md` no fija ningún target numérico nuevo (solo NFR-PERF-1, "sin latencia medible", verificable por inspección de código sin fetch nuevo en el render). (2) `traceability.json` de esta etapa es coherente con el de `nfr-requirements`: NFR1 → `OK` en ambos, NFR2 → `N/A` en ambos, con el mismo motivo de fondo (NFR2 es una restricción de convención de código, no un atributo de calidad clásico). (3) No hay diseño técnico escondido: el estado "loading" del badge (unión discriminada de 3 estados, incluye el caso "organización borrada/inaccesible") ya está completamente especificado en `functional-design/frontend-components.md` como componente puro sin fetch propio y sin estado interno — no requiere ningún patrón técnico nuevo de NFR Design (no hay estrategia de cache/circuit-breaker que diseñar para un componente que solo lee props ya resueltas por el padre vía `useOrganizations()`, que ya trae su propia estrategia de cache de TanStack Query).
