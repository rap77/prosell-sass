**Collaborator:** aidlc-quality-agent

## Contribution

Evalué cada AC de `stories.md` contra el criterio "¿puedo escribir un test
automatizado de pass/fail solo con esta frase?", con foco en los puntos
señalados: AC1.1.5, AC1.1.6, AC1.3.1/AC1.3.2, y si el piso de test ya
afirmado en Practices Discovery (NFR4 de `requirements.md`) queda cubierto
por alguna AC o queda huérfano.

### US1.1 — mayoría testeable sin ambigüedad

- **AC1.1.1, AC1.1.2, AC1.1.3, AC1.1.4, AC1.1.7**: completamente testeables
  tal como están redactadas. AC1.1.2 en particular es un caso ejemplar —
  cita el header exacto de 24 columnas, separador y orden, lo que permite un
  assert de igualdad de string sin interpretación. AC1.1.4 es la regresión
  del bug de color ya afirmada como piso de test (ítem 1 de NFR4) — bien
  reflejada como AC concreta y verificable (usar `exterior_color`, nunca
  vacío).

### AC1.1.5 — mejora real sobre el gap Critical/Major del reviewer, pero incompleta

El reviewer de Requirements Analysis marcó FR4.1 como no-testeable (Major)
por no especificar código HTTP ni cuerpo de respuesta. AC1.1.5 corrige la
mitad del problema: fija `HTTP 404` explícitamente — eso sí es testeable
con un simple `assert response.status_code == 404`. Pero "cuerpo de error
descriptivo" sigue sin un contrato concreto (¿qué campo? ¿qué mensaje
mínimo?). Sin eso, dos implementaciones distintas podrían pasar la AC tal
como está redactada (un `{"error": "..."}`y un `{"detail": "..."}` ambos
"descriptivos") y un test de contrato no tiene un campo fijo contra el cual
hacer assert. El proyecto ya tiene una convención de excepciones tipadas
por dominio con handler centralizado (`ProductError` → handler en
`product_router.py`) que probablemente ya fija un shape estándar (p.ej.
`{"detail": "..."}`) — si es así, alcanza con que Functional Design lo cite
explícitamente en vez de dejarlo implícito.

### AC1.1.6 — "se incluye igual" es verificable; "queda registrado" no lo es todavía

- "el vehículo se incluye igual en el CSV y en su carpeta con las imágenes
  que sí están disponibles" **sí es testeable sin ambigüedad**: assert de
  que la fila CSV existe para ese vehículo, y que su carpeta en el ZIP
  contiene exactamente las imágenes que no fallaron (conteo verificable).
- "la ausencia queda registrada (log de aplicación) para diagnóstico
  posterior" **no es testeable sin ambigüedad tal como está**: no se fija
  el nivel de log (`warning` vs `error`) ni los campos mínimos que debe
  llevar la entrada (¿id de producto? ¿URL de la imagen fallida?). Un test
  que solo verifica "se llamó al logger alguna vez" es una aserción débil
  que puede pasar sin realmente diagnosticar nada útil en producción — el
  propio propósito declarado de la AC ("para diagnóstico posterior") no
  queda garantizado por la redacción actual.

### AC1.3.1 / AC1.3.2 — el número pendiente no bloquea escribir el test, si el cap es inyectable

AC1.3.1 fija el COMPORTAMIENTO (rechazo con mensaje específico, no timeout,
no ZIP corrupto) — esto es testeable HOY sin conocer el número final,
siempre que el límite se implemente como un valor configurable/inyectable
(p.ej. setting o parámetro), no un literal hardcodeado. Con eso, Build and
Test puede parametrizar el límite a un valor bajo en el test y ejercitar la
ruta de "excede el límite" sin necesitar fixtures de escala real. AC1.3.2
declara explícitamente que el número queda diferido a NFR Design — postura
correcta y consistente con el Finding #4 del reviewer de Requirements
Analysis (pedía fijar el comportamiento aunque el número quede pendiente).
Esto SÍ queda resuelto por la historia tal como está. La única
recomendación es dejar constancia (Functional Design/Code Generation) de
que el cap debe ser inyectable para que el test no dependa de la resolución
final del número.

### Piso de test afirmado en Practices Discovery (NFR4) — cobertura asimétrica en las ACs

`requirements.md` NFR4 fija tres ítems de piso de test para este intent:

1. Regresión del bug de color (`exterior_color`).
2. Casos límite de `Organization.code` (1 carácter, 5 caracteres, ausente).
3. Test de contrato `Content-Type`/`Content-Disposition` del nuevo endpoint.

El ítem 1 fue explícitamente convertido en AC (**AC1.1.4**) — precedente
sentado por la respuesta a Q2 de `user-stories-questions.md` ("A: como
acceptance criterion dentro de la historia de export"). Los ítems 2 y 3 NO
tienen ninguna AC equivalente en `stories.md`: ni AC1.1.3 (que sí menciona
`<código_organización>` en el patrón de carpeta) fija los casos límite de
longitud/ausencia, ni ninguna AC menciona `Content-Type`/`Content-
Disposition`. Esto es una asimetría real: si el mismo criterio que se usó
para el ítem 1 (piso de test de equipo → AC explícita y visible) no se
aplica también a los ítems 2 y 3, quedan más expuestos a perderse en Build
and Test — dependen enteramente de que `traceability.json` preserve el
detalle de NFR4 ítem por ítem en vez de diferirlo en bloque como un solo
`Deferred`.

## Positions

AGREE: AC1.1.1, AC1.1.2, AC1.1.3, AC1.1.4 y AC1.1.7 son testeables pass/fail sin ambigüedad tal como están redactadas — ninguna requiere cambios de testabilidad.

AGREE: AC1.1.5 corrige la parte más grave del gap Critical/Major que el reviewer de Requirements Analysis señaló en FR4.1 (código HTTP ausente) al fijar `HTTP 404` explícitamente — mejora real y suficiente para avanzar el AC de estado.

OBJECT: "cuerpo de error descriptivo" en AC1.1.5 sigue sin un contrato de campo/shape concreto — recomiendo que Functional Design cite explícitamente la convención ya vigente de `ProductError` + handler centralizado (o el shape real que use) como el contrato exacto a testear, en vez de dejar "descriptivo" abierto a interpretación.

OBJECT: en AC1.1.6, la cláusula "queda registrado (log de aplicación) para diagnóstico posterior" no es testeable sin ambigüedad — falta especificar nivel de log mínimo y campos obligatorios (al menos id de producto y referencia de la imagen fallida). Recomiendo agregar esa precisión a la AC o a una nota técnica de Functional Design antes de Build and Test.

AGREE: la separación de US1.3 entre comportamiento testeable ahora (AC1.3.1) y número diferido a NFR Design (AC1.3.2) es un patrón de testabilidad válido y no bloquea escribir el test — con la condición de que el cap se implemente como valor inyectable/configurable, no hardcodeado, para que el test no dependa de que el número final ya esté fijado.

OBJECT: los ítems 2 (casos límite de `Organization.code`) y 3 (contrato Content-Type/Content-Disposition) del piso de test afirmado en NFR4 no tienen ninguna AC equivalente en `stories.md`, a diferencia del ítem 1 (bug de color) que sí fue promovido a AC1.1.4 siguiendo la respuesta a Q2. Recomiendo agregar dos ACs adicionales bajo US1.1 (o al menos una referencia explícita a NFR4 ítem por ítem en la trazabilidad) para que Build and Test no dependa de que `traceability.json` preserve el detalle de un NFR diferido en bloque.
