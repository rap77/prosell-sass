# User Flow — Catálogo Canónico de Vehículos para Facebook

Flujo principal (happy path) para los dos flujos identificados en `rough-mockups-questions.md` Q2.

## Flujo A: Crear/Editar Vehículo con Valores Canónicos

```
[Usuario abre formulario] -> [Elige Categoria canonica] -> [Elige Marca/Tipo canonicos]
        |                                                          |
        v                                                          v
[Ingresa VIN] -> [Sistema decodifica VIN, normaliza valores] -> [Usuario guarda]
                                                                     |
                                                                     v
                                                        [Validacion OK: vehiculo guardado
                                                         con valores canonicos consistentes]
```

<!-- Text fallback: El usuario abre el formulario, elige categoría y marca/tipo canónicos, ingresa el VIN (que el sistema decodifica y normaliza), y guarda — el vehículo queda persistido con valores canónicos consistentes, sin errores de mapeo. -->

## Flujo B: Editar Default de Ubicación por Producto

```
[Usuario abre detalle de producto] -> [Ve ubicacion default de organizacion]
        |
        v
[Usuario edita ubicacion para ESTE producto] -> [Guarda]
        |
        v
[Proximo export/publish de este producto usa la ubicacion editada]
```

<!-- Text fallback: El usuario abre el detalle del producto, ve el default de ubicación heredado de la organización, lo sobrescribe específicamente para ese producto y guarda — el próximo export o publicación de ese producto usa la ubicación editada en vez del default de organización. -->

## Assumptions & Open Questions

None.
