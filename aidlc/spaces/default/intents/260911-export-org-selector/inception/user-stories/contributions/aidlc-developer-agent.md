**Collaborator:** aidlc-developer-agent

## Contribution

Evalué las 3 historias desde implementabilidad y tamaño (INVEST). En
general son chicas, bien acotadas y verificables sin acceso a
implementación interna — con una excepción puntual y un gap técnico real
que dejo abajo.

### Implementabilidad y verificabilidad de los AC

- **AC1.1.1, AC1.1.2, AC1.1.3**: implementables tal como están. Son
  verificables por comportamiento observable (el archivo descargado
  corresponde a una u otra organización) sin necesidad de inspeccionar
  código — alcanza con mockear `organizationStore.viewingOrgId` y
  observar el request/response del export. Ninguno prescribe la solución
  técnica (no dicen "usar un hook X" ni "un componente Y"), solo el
  comportamiento esperado — correcto para el nivel de historia de
  usuario. La referencia a `OrganizationPicker` en el Given no es
  sobre-especificación: es el mecanismo YA EXISTENTE que la persona ya
  usa hoy en el resto de la app, no una decisión de diseño nueva que la
  historia esté inventando — esa resolución ya se cerró en
  `requirements.md` (FR1.3), no en esta etapa.
- **AC2.1.1, AC2.1.2**: implementables y verificables por UI (contenido
  del mensaje de error). Tamaño correcto — un solo comportamiento
  observable por AC.
- **AC3.1.1, AC3.1.3**: verificables puramente por UI/ausencia de
  elementos — sin problema.
- **AC3.1.2** ("sin ningún parámetro `organization_id`"): este es el
  único AC que **no se puede verificar solo mirando la pantalla** — hace
  falta inspeccionar el request real (network tab / spy sobre el fetch en
  el test), no un efecto visual. No lo marco como defecto: es exactamente
  el tipo de AC técnico que `team.md` § Testing Posture ya viene pidiendo
  para este intent (regresión negativa de gating, punto 1) y hay
  precedente directo reusable (`OrganizationPicker.test.tsx` para mocks).
  Solo señalo que quien lea la historia sin contexto de implementación no
  la puede verificar a ojo — es una AC de "caja gris", aceptable acá
  porque el propio `team.md` ya la exige como test explícito.

### Tamaño (INVEST: Small, Estimable)

Las 3 historias son chicas y estimables sin ambigüedad — el alcance es
un solo hook de lectura sobre un store ya existente más un mensaje de
error condicional. No veo necesidad de partir ni fusionar ninguna (Q2 ya
lo confirmó con el humano). Son razonablemente independientes entre sí:
US3 no depende de que US1/US2 estén implementadas primero (es
"comportamiento sin cambios", verificable aun antes de tocar código, como
regresión).

### Gap técnico no cubierto por ninguna historia

Ninguna AC cubre el caso de que `viewingOrgId` apunte a una organización
que **ya no existe** (borrada) o a la que el admin ya no tiene acceso
(permiso revocado a mitad de sesión), a diferencia del caso ya cubierto
de "organización existe pero sin catálogo publicado" (US2/FR3.1). Esto
importa concretamente porque el mecanismo que US2/FR3.1 asume para
mostrar el nombre de la organización en el mensaje depende de
`useOrganizations()` (`GET /api/v1/admin/organizations`) — si la
organización fue borrada, es razonable esperar que ya no aparezca en esa
lista, y entonces el frontend no tiene de dónde sacar el `name` para
armar el mensaje de AC2.1.1. ¿Qué se espera ahí — un mensaje genérico sin
nombre, un fallback al ID, o simplemente no es un caso realista dado que
`viewingOrgId` vive en memoria de sesión (Zustand, no persistido) y por lo
tanto no puede sobrevivir a que la organización desaparezca entre que se
eligió y que se exporta? Si la respuesta es esta última (el store no
persiste entre sesiones, la ventana de inconsistencia es despreciable),
entonces no hace falta una historia nueva — pero vale la pena que quede
explícito en algún lado (Functional Design, no otra historia) en vez de
quedar implícito. No lo considero bloqueante para aprobar `stories.md`
tal como está.

## Positions

- AGREE: Las 3 historias son Must Have, tamaño Small, y no prescriben de
  más la solución técnica — reutilizar `OrganizationPicker` en los Given
  es documentar el mecanismo ya decidido en Requirements, no inventar uno
  nuevo en esta etapa. — razón: verificado contra `requirements.md`
  FR1.3/FR1.4 y `team.md` § Testing Posture, no hay sobre-especificación
  nueva introducida por `stories.md`.
- AGREE: AC3.1.2 es una AC de caja gris (requiere inspección de request,
  no solo UI) pero es aceptable porque el propio piso de test del equipo
  ya la exige explícitamente como caso de regresión negativa. — razón:
  `team.md` § Testing Posture, punto 1 del piso mínimo de test afirmado
  para este intent.
- OBJECT: Falta un caso explícito para `viewingOrgId` apuntando a una
  organización borrada o ya no accesible — ninguna AC de US2 lo cubre, y
  el mecanismo de "mostrar el nombre de la organización" (FR3.1) puede
  fallar silenciosamente en ese caso si `useOrganizations()` ya no la
  lista. — razón: es un caso técnico real y distinto del ya cubierto
  ("organización existe, sin catálogo"), no señalado ni en `stories.md`
  ni en las Open Questions de `requirements.md` (OQ1/OQ2 cubren otra
  cosa). Sugiero dejarlo como nota para Functional Design en vez de
  bloquear el gate de esta etapa.
