---
status: testing
phase: 01-hybrid-publisher
source: [01-00-wave0-infra-SUMMARY.md, 01-01-publication-entity-SUMMARY.md, 01-02-image-pipeline-SUMMARY.md, 01-03-playwright-strategy-SUMMARY.md, 01-04-update-delete-SUMMARY.md, 01-05-auto-republish-SUMMARY.md, 01-06-graph-api-router-SUMMARY.md, 01-07-frontend-modal-SUMMARY.md]
started: 2026-03-15T19:00:00Z
updated: 2026-03-15T19:00:00Z
---

## Current Test

UAT Round 1 completo: 7/10 pass, 3 issues detectados.

Issues arreglados:
1. [MAJOR] Botón X sticky — header con `sticky top-0` y fondo blanco
2. [MAJOR] Campo Modelo pre-llenado — pasando year/make/model desde catalog mock
3. [CRITICAL] /docs funciona — importando `IPublicationRepository` a nivel módulo

Siguiente paso: Re-ejecutar UAT para validar fixes.

## Tests

### 1. Catalog page loads
expected: Navegá a http://localhost:3000/dashboard/catalog. Deberías ver una tabla con 3 vehículos mock (Toyota Corolla, Honda Civic, Ford Focus). La columna "Estado FB" muestra badges: el Corolla sin badge, el Civic con badge verde "Publicado", el Focus con badge rojo "Atención Requerida". La columna "Acción" muestra: "Preparar Publicación" para el Corolla, "Actualizar" para el Civic y el Focus.
result: pass

### 2. Modal abre sin perder posición
expected: Hacé scroll hacia abajo en la tabla (si hay scroll) y hacé click en "Preparar Publicación" del Toyota Corolla. El modal se abre como overlay sin que la página navegue ni el scroll se resetee. La lista de vehículos sigue visible detrás del overlay oscuro.
result: issue
reported: "el modal esta bien excepto un detalle en el boton de cerrar si bajo con el scroll se pierde y no me deja cerrar la ventana"
severity: major

### 3. Form pre-llena datos del vehículo
expected: Con el modal del Corolla abierto, los campos muestran: Título con "2020 Toyota Corolla" (o similar), Precio con 18000, ZIP con 10001. Los selects de Marca, Año, Tipo de vehículo también vienen pre-seleccionados desde los datos del mock.
result: issue
reported: "si en el titulo sale corola pero en el modelo no, el titulo deberia armarse con los datos del formulario no al reves"
severity: major

### 4. Campos de vehículo completos
expected: En el modal, la sección "Datos del vehículo" muestra selects para: Tipo de vehículo, Año, Marca, y campos para Modelo, Millaje, Carrocería, Color exterior, Color interior, Estado del vehículo, Tipo de combustible, Transmisión, VIN, y checkbox de "Título limpio". Los selects de Marca tienen todas las marcas de autos (Toyota, Honda, Ford, BMW, etc.), los de Color tienen todas las opciones en español.
result: pass

### 5. Hero shot selector funciona
expected: En el modal del Corolla, la sección de fotos muestra una grilla de imágenes. La primera imagen tiene el badge "PORTADA". Al hacer click en la segunda imagen, ésta se mueve a la posición 0 y el badge "PORTADA" aparece sobre ella. La selección es por click simple, sin arrastrar.
result: pass

### 6. Validación Zod bloquea submit
expected: Con el modal abierto, dejá el dropdown "Página de Facebook" en "Seleccioná..." y hacé click en "Publicar en Facebook". Debería aparecer el mensaje de error "Seleccioná una página de Facebook" debajo del dropdown sin cerrar el modal.
result: pass

### 7. Vehículo publicado muestra "Actualizar"
expected: En la fila del Honda Civic, el botón dice "Actualizar" (no "Preparar Publicación") y el badge de estado muestra "Publicado" en verde. Hacé click en "Actualizar" — el modal se abre con el título "Actualizar Publicación".
result: pass

### 8. Botón Eliminar/Finalizar en modo update
expected: Dentro del modal de actualización del Honda Civic (abierto en el paso anterior), hay un botón rojo "Eliminar / Finalizar" en la esquina inferior izquierda del modal, separado del botón "Actualizar publicación" que está a la derecha.
result: pass

### 9. Category B — banner de seguridad
expected: Hacé click en "Actualizar" en la fila del Ford Focus (el vehículo con error de bloqueo). El modal se abre y muestra un banner rojo en la parte superior con el texto "Facebook solicita validación de seguridad. Abrí tu cuenta en un navegador para resolver el desafío." Debajo hay un checkbox con el texto "Ya validé mi cuenta de Facebook" y un botón "Desbloquear y Reintentar" (disabled hasta que se marque el checkbox).
result: pass

### 10. API endpoints accesibles
expected: Navegá a http://localhost:8000/docs. En la lista de endpoints deberías ver la sección "publisher" con: POST /api/v1/publisher/{product_id}/publish, PATCH /api/v1/publisher/{publication_id}, DELETE /api/v1/publisher/{publication_id}, POST /api/v1/publisher/{publication_id}/unlock.
result: issue
reported: "sale en blanco — /docs no carga, /openapi.json returns 500 InternalServerError"
severity: critical

## Summary

total: 10
passed: 7
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "El botón de cerrar el modal siempre es accesible independientemente del scroll"
  status: failed
  reason: "User reported: el modal esta bien excepto un detalle en el boton de cerrar si bajo con el scroll se pierde y no me deja cerrar la ventana"
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "El campo Modelo viene pre-llenado desde los datos del vehículo, y el Título se auto-compone de Año + Marca + Modelo"
  status: failed
  reason: "User reported: si en el titulo sale corola pero en el modelo no, el titulo deberia armarse con los datos del formulario no al reves"
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Los endpoints del publisher están expuestos en /docs y funcionan correctamente"
  status: failed
  reason: "/docs appears blank, /openapi.json returns 500 InternalServerError. Pydantic error: `TypeAdapter[typing.Annotated[ForwardRef('Annotated[SqlAlchemyPublicationRepository, Depends(get_publication_repository)]')]` is not fully defined"
  severity: critical
  test: 10
  root_cause: "Pydantic ForwardRef error in publisher endpoints — possible cyclical import or incomplete type definition in dependency injection"
  artifacts: ["prosell-api container logs"]
  missing: []
  debug_session: "logs show: pydantic.errors.PydanticUserError: TypeAdapter[...ForwardRef...] is not fully defined; you should define [...] and all referenced types, then call .rebuild() on the instance."
