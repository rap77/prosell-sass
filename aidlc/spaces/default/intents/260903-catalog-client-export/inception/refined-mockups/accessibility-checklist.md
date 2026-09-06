# Accessibility Checklist — Export de catálogo (formato cliente + ZIP)

Nivel objetivo: **WCAG 2.1 AA** — el mismo ya vigente para el resto del panel
de catálogo (Q4: A, sin requisito nuevo para este feature).

## Perceivable

- [ ] El texto de la opción de menú, el banner de resumen y los toasts cumplen contraste mínimo 4.5:1 (heredado del theme vigente, sin color nuevo).
- [ ] Ningún estado se comunica solo por color (el estado de error usa ícono + texto, no solo un borde rojo — hereda el patrón ya vigente del componente Toast).

## Operable

- [ ] La opción de menú, el banner (Continuar/Cancelar) y el botón de export son 100% operables por teclado (Tab, Enter/Space, Arrow keys dentro del menú).
- [ ] El botón de export muestra un indicador de foco visible (heredado del componente de botón compartido, sin `outline: none`).
- [ ] Mientras `isExporting = true`, el botón queda deshabilitado y no es un trampa de teclado — el foco puede salir libremente.
- [ ] `window.prompt()` nativo es accesible por definición del navegador (foco automático, cerrable con Escape, anunciado por lectores de pantalla) — no requiere trabajo adicional.

## Understandable

- [ ] El mensaje de error de catálogo vacío (AC1.1.5) y el de límite excedido (AC1.3.1) describen el problema en texto claro, sin jerga técnica ni códigos de error crudos.
- [ ] El banner de resumen y el prompt de ruta no disparan cambios de contexto inesperados (no navegan a otra pantalla, no hacen submit automático).
- [ ] El export solo se dispara con una acción explícita del usuario en cada paso (clic en el ítem de menú → Continuar en el banner → confirmar el prompt) — nunca automático.

## Robust

- [ ] El nuevo ítem de menú y el banner usan HTML semántico nativo (`<button>`, `role="menuitem"` sobre el componente de menú ya validado) — sin `<div>` con handlers de click simulando controles interactivos.
- [ ] `aria-live="polite"` en el banner de resumen y en el texto de estado del botón (`aria-live="assertive"` en el caso de catálogo vacío, por ser bloqueante) para que los lectores de pantalla anuncien los cambios de estado sin que el usuario tenga que buscarlos.

## Fuera de alcance (confirmado en la entrevista, Q4)

No se definió ningún requisito de accesibilidad nuevo o distinto al ya
vigente en el resto de `catalog/page.tsx` — este checklist verifica que el
feature nuevo NO rompa lo ya cumplido, no que introduzca un estándar más
alto.
