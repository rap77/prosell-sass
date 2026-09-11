# Tech Stack Decisions — u1-export-org-confirmation

Sin decisiones de stack nuevas — este Unit reutiliza exclusivamente
tecnología ya vigente en el proyecto (`technology-stack.md` del codekb),
confirmado sin cambios en la etapa de Reverse Engineering de este mismo
intent.

## Stack reutilizado (sin cambios)

| Tecnología         | Uso en este Unit                                                 |
| ------------------ | ---------------------------------------------------------------- |
| TypeScript 5.5+    | Tipado de la unión discriminada `organization`                   |
| React 19           | Render condicional del badge                                     |
| Zustand 5          | Lectura de `organizationStore.viewingOrgId` (store ya existente) |
| TanStack Query v5  | `useOrganizations()` (hook ya existente)                         |
| TailwindCSS 3.4.17 | Estilos del badge (clases utilitarias existentes)                |

## Sin dependencias nuevas

Ninguna. El Unit es una modificación de un componente existente,
reutilizando hooks y stores ya presentes en el codebase.
