# Personas — Export de catálogo (formato cliente)

## Valeria, la vendedora/dealer

- **Rol**: Vendedor/dealer (seller) — dueña del catálogo de su organización en ProSell.
- **Objetivos**: Mantener su inventario publicado sincronizado con `facebook-auto-post`, la herramienta externa que usa para republicar/gestionar listados en Facebook Marketplace. Necesita sacar los datos y las fotos de ProSell en el formato exacto que esa herramienta consume, sin reformatear nada a mano.
- **Puntos de dolor**: Hoy el único export de catálogo disponible (`export.csv`) usa un formato genérico que no calza con lo que `facebook-auto-post` espera (mismo formato que ella usa para _importar_ vehículos, `docs/data39.csv`). Tiene que reconstruir el CSV y organizar las fotos manualmente, vehículo por vehículo.
- **Comodidad tecnológica**: Media — usa el panel de ProSell con regularidad (catálogo, cola de revisión), pero no espera tener que editar archivos CSV a mano ni usar herramientas de línea de comandos.
- **Frecuencia de uso de este feature**: Cada vez que actualiza su inventario publicado y necesita sincronizar con la herramienta externa — no diario, pero recurrente (semanal o por lote de altas nuevas).

Es el único persona relevante para este feature — no hay interacción de comprador, revisor/moderador, ni super admin en el flujo de export.
