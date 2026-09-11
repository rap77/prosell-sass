# Personas — 260911-export-org-selector

## Persona 1: Admin con permiso cross-org

- **Name**: Valeria, la Admin de Grupo
- **Role**: `admin` / `super_admin` — gestiona catálogo de múltiples
  organizaciones (grupos de dealers/concesionarias) desde una sola cuenta.
- **Goals**:
  - Exportar el catálogo en formato cliente de CUALQUIER organización que
    administra, no solo la propia, sin pasos extra ni tener que loguearse
    como otro usuario.
  - Que el flujo de export use el mismo mecanismo de "ver como otra
    organización" que ya usa en el resto de la app (lista de productos,
    cola de revisión, auditoría).
- **Pain Points**:
  - Hoy el botón de exportar ignora el permiso que tiene en todo el resto
    de la app — siempre descarga SU propio catálogo, sin aviso de por qué.
  - Si la organización que eligió no tiene catálogo publicado, hoy recibe
    un error genérico sin contexto de a qué organización correspondía.
- **Tech Comfort**: Alta — usuario administrativo frecuente del panel.
- **Frequency**: Exporta catálogos periódicamente, para clientes/canales
  externos que consumen el formato CSV+ZIP.

## Persona 2: Usuario sin permiso cross-org

- **Name**: Martín, el Vendedor
- **Role**: rol estándar de vendedor/dealer, sin `ORG_ADMIN_VIEW_ALL`.
- **Goals**: Exportar el catálogo de SU PROPIA organización, como siempre
  lo hizo.
- **Pain Points**: Ninguno relacionado a este intent — su expectativa es
  que nada cambie.
- **Tech Comfort**: Media.
- **Frequency**: Exporta su catálogo ocasionalmente.

Referencia: mismas dos personas base ya usadas en
`260903-catalog-client-export/inception/user-stories/personas.md`
(reutilizadas, no reescritas desde cero — el rol de "Valeria" ya existía
para el caso de uso de export en general; este intent especializa su
objetivo al caso cross-org).
