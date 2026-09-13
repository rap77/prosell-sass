# Accessibility Checklist — 260911-cross-org-export-ux

Nivel objetivo: **WCAG 2.1 AA** (baseline existente del proyecto,
confirmado en Q3 — sin nivel distinto para este intent).

## Perceivable

- [x] La opción "Todas las organizaciones" no se distingue SOLO por
      color — usa separador real (`<hr>`/borde) + ícono distinto + posición
      fija (Q1), no solo un cambio de fondo.
- [x] El texto de advertencia del banner "todas" (AC5.1.1) va acompañado
      de un ícono (⚠), no depende solo de color para transmitir urgencia.
- [x] Contraste de texto/UI: 4.5:1 (texto) / 3:1 (componentes),
      heredado de los tokens ya verificados del design system — sin colores
      nuevos introducidos por este intent.

## Operable

- [x] El picker extendido mantiene navegación completa por teclado
      (Arrow keys + Enter + Escape) — mismo patrón ya existente, sin
      regresión por agregar la opción "todas".
- [x] El botón "Continuar" del banner, en estado `exporting-all`, sigue
      siendo enfocable (deshabilitado visualmente pero no removido del DOM)
      — evita una trampa de foco.
- [x] Los 3 `window.prompt()` secuenciales (archivo, carpeta, grupos FB)
      son nativos del navegador — heredan foco y cierre por Escape sin
      anotación adicional necesaria (limitación ya aceptada, no un gap de
      este intent).
- [x] Touch targets: sin cambios de tamaño en elementos existentes — el
      picker y el banner reutilizan los mismos componentes ya dimensionados
      a 44x44px mínimo.

## Understandable

- [x] El aria-label de "Todas las organizaciones"
      (`"Ver el catálogo de todas las organizaciones"`) es más descriptivo
      que el label visible, evitando ambigüedad para usuarios de screen
      reader sobre qué implica esa opción.
- [x] El texto de advertencia del banner "todas" explica en lenguaje
      simple qué va a pasar (cantidad de organizaciones), no un mensaje
      técnico genérico.
- [x] El error del límite de productos (AC4.3.1, 413) reutiliza el
      mismo mensaje ya existente para el caso de una sola organización —
      consistencia de vocabulario entre ambos casos.

## Robust

- [x] `aria-live="polite"` en el indicador de organización activa de
      la grilla (M2) — anuncia el cambio de filtro sin interrumpir al
      usuario.
- [x] `aria-live="assertive"` en el estado `exporting-all` del banner —
      cambio de estado de mayor importancia (operación de mayor radio de
      explosión) amerita anuncio inmediato, no aplazado.
- [x] `role="alert"` en la advertencia de "todas" — prioridad de
      anuncio mayor que el badge cross-org existente.

## Fuera de alcance de este checklist (documentado, no un gap)

- Auditoría de accesibilidad de `window.prompt()` en sí — es un
  mecanismo nativo del navegador, fuera del control de estilos/ARIA de
  la aplicación; aceptado como limitación conocida por el equipo (ver
  `stories.md` § Notes for Functional Design, hallazgo de design).
