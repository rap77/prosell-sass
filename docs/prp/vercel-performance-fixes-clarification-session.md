# PRD Clarification Session

**Source PRD**: vercel-performance-fixes.md
**Session Started**: 2025-02-21
**Depth Selected**: Medium (10 questions)
**Total Questions**: 10
**Progress**: 10/10

---

## Session Log

## Question 1/10
**Category**: Functional Requirements - Edge Cases
**Ambiguity Identified**: PRD F2-F3 describe 2FA setup como user-initiated con botón 'Enable 2FA', pero no especifica comportamiento para usuarios que YA tienen 2FA habilitado
**Question Asked**: ¿Qué debe mostrarse al acceder a /auth/setup-2fa para usuarios con is2FAEnabled=true?
**User Response**: Opción 1 (Condicional). La página debe actuar como centro de gestión: si !is2FAEnabled → mostrar setup (QR + Confirm); si is2FAEnabled → mostrar estado 'Protegido', opción de ver Backup Codes y botón de deshabilitar.
**Requirement Clarified**: La página /auth/setup-2fa no es solo setup inicial sino un panel de gestión completo con comportamiento condicional basado en estado actual de 2FA

---

## Question 2/10
**Category**: Edge Cases & Error Handling - Navigation Interruption
**Ambiguity Identified**: PRD F6 describe estados loading/success/error para 2FA, pero no especifica comportamiento si usuario navega durante operación en curso
**Question Asked**: ¿Qué pasa si usuario inicia 'Enable 2FA', ve loading, y navega fuera antes de terminar?
**User Response**: Opción 1 + Opción 4 combinada. No persistir secretos en storage (seguridad); operación se considera cancelada si navega. Agregar beforeunload warning para prevenir navegación accidental. Al regresar, forzar nuevo fetch del secreto para garantizar proceso fresco y seguro.
**Requirement Clarified**: Regla de seguridad: NUNCA persistir secretos TOTP en storage. UX: beforeunload warning + reset completo + nuevo fetch al regresar

---

## Question 3/10
**Category**: Acceptance Criteria - Performance Metrics
**Ambiguity Identified**: PRD lista métricas como 'initializeAuth calls per session' y 'Time to interactive' pero no especifica CÓMO medirlas
**Question Asked**: ¿Cómo se medirán estas métricas en práctica para validar que Phase 1 está completa?
**User Response**: Opción 2 (Automatizada - Performance API). Implementar marcas de tiempo específicas en flujo de initializeAuth. Métricas objetivas comparables entre commits. Asegurar TTI se mantiene bajo umbrales del PRD antes de pasar a Fase 2.
**Requirement Clarified**: Implementar performance.mark() en código para mediciones automatizadas; aceptación de fase depende de cumplir umbrales medibles vía Performance API

---

## Question 4/10
**Category**: Technical Constraints - Fallback Behavior
**Ambiguity Identified**: PRD F4 dice 'If preload fails, silent fallback to on-demand loading' pero no especifica comportamiento en interacciones posteriores
**Question Asked**: Si el preload falla, ¿qué pasa en la próxima interacción del usuario? ¿Se reintentará el preload o se carga solo al hacer click?
**User Response**: Opción 1 con 'Intent-based Retry'. Preload fallido no es sentencia de muerte. onMouseEnter del botón de login sirve como disparador secundario. Garantiza que al momento del clic, tengamos mejores chances de tener SDK listo sin desperdiciar recursos.
**Requirement Clarified**: Implementar patrón 'Intent-based Retry' con fallback inteligente: preload inicial → si falla, reintentar en onMouseEnter del botón → cargar on-demand al click si todo falla

---

## Question 5/10
**Category**: Technical Constraints - Browser Compatibility
**Ambiguity Identified**: PRD no menciona estrategia de compatibilidad para APIs modernas (Performance API, dynamic import, etc.)
**Question Asked**: ¿Cuál es la estrategia de compatibilidad de browsers para optimizaciones que dependen de APIs modernas?
**User Response**: Opción 4 (Progressive Enhancement). Feature detection para todas las APIs de Performance y estrategias de Preload. Si browser no las soporta, degradar silenciosamente a estado funcional estándar sin excepciones. Innovar sin dejar atrás usuarios de Safari o versiones anteriores.
**Requirement Clarified**: REGLA: Todas las optimizaciones deben tener feature detection + graceful degradation. Si API no existe, deshabilitar optimización silenciosamente, no lanzar error.

---

## Question 6/10
**Category**: Testing Requirements - Validation Strategy
**Ambiguity Identified**: PRD no menciona estrategia de testing para validar optimizaciones funcionan correctamente
**Question Asked**: ¿Qué tipos de tests se requieren para validar las optimizaciones?
**User Response**: Unit tests (Jest/Vitest) + E2E tests (Playwright) + Integration tests con Profiler. No se seleccionó Performance regression tests.
**Requirement Clarified**: Estrategia de testing de 3 capas: (1) Unit tests para flag 'initialized' con mock de Performance API; (2) E2E tests para verificar única llamada a /api/auth/state y preload en Network tab; (3) Integration tests con React Profiler para verificar re-renders

---

## Question 7/10
**Category**: Risk Management - Rollback Strategy
**Ambiguity Identified**: PRD no menciona estrategia de rollback si optimizaciones causan problemas en producción
**Question Asked**: Si las optimizaciones de Phase 1 causan problemas en producción, ¿cuál es la estrategia de rollback?
**User Response**: Opción 3 (Híbrida). Feature flags para optimizaciones de Fase 1 (localStorage versioning, OAuth preload) para recuperación inmediata + git revert para fix permanente. Mantiene integridad de rama principal.
**Requirement Clarified**: Implementar feature flags para todas las optimizaciones de Fase 1. Si hay problemas, toggle-off sin deploy nuevo. Luego git revert para fix permanente.

---

## Question 8/10
**Category**: Acceptance Criteria - Phase Gates
**Ambiguity Identified**: PRD lista 3 fases pero no define criterios EXACTOS para transición entre fases
**Question Asked**: ¿Cuáles son los criterios exactos para determinar que Phase 1 está completa y se puede pasar a Phase 2?
**User Response**: Opción 4 (Baseline + Métricas + Tests). Phase Gate riguroso: (1) Establecer baseline de performance actual; (2) Tests funcionales al 100%; (3) Performance API validar objetivos cumplidos/superados. Rigor para evitar que deuda técnica regrese en fases posteriores.
**Requirement Clarified**: REGLA DE PHASE GATE: No pasar a Fase 2 sin: (a) Baseline medido; (b) Tests 100% passing; (c) Performance API confirmando optimizaciones cumplen umbrales del PRD.

---

## Question 9/10
**Category**: Scope Boundaries - SVG Optimization
**Ambiguity Identified**: PRD F5 dice 'animar el wrapper' pero no especifica qué SVGs están en scope
**Question Asked**: ¿Qué SVGs específicos necesitan optimización de animación?
**User Response**: Opción 3 (Wrapper + refactor gradual). Crear componente utilidad <AnimatedSvgWrapper> con transformaciones CSS aceleradas por hardware. Aplicar a todos los auth components y establecer como estándar para futuros desarrollos. UI fluida (60fps) sin aumentar complejidad del código SVG.
**Requirement Clarified**: SOLUCIÓN ARQUITECTÓNICA: Crear <AnimatedSvgWrapper> component con CSS hardware-accelerated transforms. Aplicar a todos auth components. Establecer como estándar para futuros SVGs animados.

---

## Question 10/10
**Category**: Scope Boundaries - Exclusions
**Ambiguity Identified**: PRD define Non-Goals pero puede haber áreas grises que causen scope creep
**Question Asked**: ¿Qué está EXPLÍCITAMENTE FUERA del scope de este PRP?
**User Response**: TODAS las opciones están OUT: (1) Cambiar state management; (2) Rediseño UI de auth; (3) Extender a otros módulos no-auth; (4) Nuevos OAuth providers.
**Requirement Clarified**: REGLA DE SCOPE: Este PRP es SOLO optimizaciones de performance en capa auth existente. EXPLÍCITAMENTE PROHIBIDO: Cambiar Zustand/otro state management; Rediseñar UI visual; Aplicar optimizaciones fuera de auth; Agregar providers OAuth nuevos.

---

## Session Completion

**Status**: ✅ ALL 10 questions completed
**PRD Updated**: 2025-02-21
**Final Document**: `vercel-performance-fixes.md` (v2.0 - post-clarification)

### Key Changes Made to PRD

| Section | Original | Updated |
|---------|----------|---------|
| Non-Goals | Generic list | Explicit scope boundaries with ❌/✅ |
| Core Use Case | Simple 2FA setup | 2FA Management Center with conditional behavior |
| Functional Decisions | 7 functions | 10 functions (added F8-F10) |
| UX Decisions | Basic states | Added 2FA State A/B, beforeunload, feature detection |
| NEW Section | - | Security Rules (6 non-negotiable rules) |
| NEW Section | - | Technical Constraints (browser compatibility, APIs) |
| NEW Section | - | Testing Strategy (3-layer approach) |
| NEW Section | - | Rollback Strategy (hybrid approach) |
| NEW Section | - | Phase Gate Criteria (baseline + metrics) |
| NEW Section | - | Architecture Decisions (`<AnimatedSvgWrapper>`) |
| NEW Section | - | Definition of Done |
| Success Metrics | Table only | Added Performance API verification |
| Data & Logic | Simple flows | Added feature flag, Performance API |

### Ready for Implementation

The PRD is now **complete and unambiguous**. All critical decisions have been made:

1. ✅ **Security**: No TOTP secrets in storage, beforeunload warnings
2. ✅ **Architecture**: `<AnimatedSvgWrapper>` component standard
3. ✅ **Testing**: 3-layer strategy with specific tooling
4. ✅ **Rollback**: Feature flags + git revert hybrid
5. ✅ **Metrics**: Performance API with automated verification
6. ✅ **Phase Gate**: Baseline measurement required
7. ✅ **Scope**: Auth layer only, explicit exclusions

**Next Steps:**
1. Create implementation tickets from Phase 1 tasks
2. Establish baseline measurements
3. Start with `authStore` `initialized` flag (F1)

