# Design System Mapping — 260911-export-org-selector

## Convención de stack (de `team-practices.md` § Code Style y `technology-stack.md`)

TailwindCSS 3.4.17 (utility classes, sin `var()` en className), sin sistema
de componentes UI de terceros documentado más allá de los ya existentes en
`apps/web/src/components/`. El badge nuevo debe reutilizar clases/patrones
Tailwind ya presentes en el proyecto (spacing scale existente: 4/8/16/24/
32/48px per `wireframing-guide.md`), no introducir un design token nuevo.

## Mapeo del badge de organización

| Elemento                          | Origen                                                                                            | Nota                                                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contenedor del badge              | Clases Tailwind utilitarias (`inline-flex`, `items-center`, `gap-*`, `rounded-*`, `px-*`, `py-*`) | Reutilizar el mismo patrón de badge/chip si ya existe uno en `apps/web/src/components/` (Functional Design debe confirmar si hay un componente `Badge`/`Chip` reusable antes de escribir CSS ad-hoc) |
| Color de fondo/texto              | Paleta ya definida en `tailwind.config.ts` (no inventar colores nuevos)                           | Debe cumplir contraste WCAG AA (ver `accessibility-checklist.md`)                                                                                                                                    |
| Ícono (opcional, 🏢 en el mockup) | Librería de íconos ya usada en el proyecto, si existe                                             | Decorativo — no reemplaza el texto, ver accesibilidad                                                                                                                                                |
| Tipografía                        | Escala tipográfica ya vigente del proyecto                                                        | Sin tamaño de fuente nuevo                                                                                                                                                                           |

## Sin componentes nuevos de design system

- `ExportSummaryBanner`: componente EXISTENTE, se modifica (agrega un
  slot/prop condicional), no se crea uno nuevo.
- `OrganizationPicker`: componente EXISTENTE, sin ningún cambio.
- No se agrega ningún componente reusable nuevo a la librería de
  componentes del proyecto — el badge es contenido interno de
  `ExportSummaryBanner`, no un componente exportado independiente (salvo
  que Functional Design identifique una razón concreta de reutilización
  en otro lugar de la app, lo cual está fuera del alcance conocido de
  este intent).

## Precisión de ubicación de código (developer-agent, Practices Discovery)

Ya documentado en `team-practices.md` § Code Style: si la vía de
implementación reutiliza `viewingOrgId` global (afirmado en Requirements
Analysis), el código de consumo debe seguir la organización ya existente
del proyecto (`code-structure.md`) — no crear una ubicación nueva fuera de
lo ya establecido.
