# Personas — 260911-cross-org-export-ux

## Persona 1: Ana, Super Admin de plataforma

- **Rol**: `super_admin`, permiso `ORG_ADMIN_VIEW_ALL`.
- **Objetivos**:
  - Ver y exportar el catálogo de cualquier organización de la
    plataforma, o de todas a la vez, sin tener que repetir la
    exportación organización por organización.
  - Confiar en que el CSV exportado en formato cliente tiene datos
    reales y correctos, listos para entregar sin retrabajo manual.
  - Tener trazabilidad clara cuando exporta el catálogo completo de la
    plataforma (operación de mayor radio de explosión que un export
    puntual).
- **Puntos de dolor actuales**:
  - Tiene que exportar organización por organización, 29+ veces, para
    obtener el catálogo completo.
  - El selector de organización en el header no filtra realmente lo
    que ve en `/catalog` — solo alimenta el export, así que no puede
    verificar visualmente qué va a exportar antes de hacerlo.
  - El selector lista organizaciones vacías, dificultando encontrar las
    que sí tienen productos.
- **Prioridad**: Alta — es quien más se beneficia de FR2, FR3, FR4,
  FR5, FR6.

## Persona 2: Marcos, Vendedor/Dealer

- **Rol**: seller/dealer, sin `ORG_ADMIN_VIEW_ALL`.
- **Objetivos**:
  - Exportar el catálogo de SU organización en el formato exacto que
    el sistema externo del cliente espera, sin columnas vacías ni
    valores mal transformados.
  - Poder confirmar o ajustar la carpeta de imágenes y los grupos de
    Facebook al momento de exportar, sin tener que editar el CSV a
    mano después.
- **Puntos de dolor actuales**:
  - El CSV exportado hoy tiene columnas vacías o con el valor crudo
    interno (`VIN`, tipo de carrocería, estado del título, grupos de
    Facebook, categoría/tipo, ubicación) en vez del valor esperado por
    el formato cliente.
  - No hay forma de indicar la carpeta base de imágenes ni los grupos
    de Facebook al exportar — tiene que completarlos a mano después.
- **Prioridad**: Alta — es quien se beneficia de FR7, FR8, FR9. NUNCA
  ve la opción "todas las organizaciones" ni el filtrado cross-org de
  grilla (fuera de su permiso).
