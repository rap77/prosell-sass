# Security Design — u2-catalog-export-ui

Sin diseño de seguridad nuevo — `security-requirements.md` de este mismo
Unit ya estableció que U2 no tiene superficie de seguridad propia: la
resolución de tenant (NFR1.1/NFR1.2), la prevención de zip-slip (NFR2.1)
y el enforcement del cap (NFR3.1) son responsabilidad exclusiva de
`u1-catalog-export-api`, ya diseñados en el `security-design.md`/
`scalability-design.md` de ese Unit.

## Manejo de errores en la UI

El único punto donde U2 "toca" seguridad es el renderizado del mensaje
de error — usa directo `detail.message` del contrato
`ProductErrorResponse` (`contract-summary.md`) sin transformación ni
lógica adicional, evitando cualquier riesgo de inyección: React escapa
automáticamente el contenido de texto renderizado (sin `dangerouslySetInnerHTML`
en ningún punto de `frontend-components.md`).

## Sesión

U2 no maneja el token de sesión directamente — la cookie httpOnly viaja
automáticamente con el `fetch()` del navegador (`credentials: "include"`,
patrón ya vigente del resto de `apps/web`), sin lectura ni manipulación
del token en el código de este Unit.

## Fuente

Deriva de `security-requirements.md` (declara la ausencia de superficie
propia) y `frontend-components.md` (Functional Design, el punto exacto
donde se renderiza el mensaje de error).
