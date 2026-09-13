**Collaborator:** aidlc-design-agent

## Contribution

### Fidelidad de personas

Ana (Super Admin, `ORG_ADMIN_VIEW_ALL`) y Marcos (Vendedor/Dealer, sin
ese permiso) capturan bien los dos perfiles de usuario real que este
intent afecta, porque la diferenciación no es cosmética — está anclada
en un permiso real del sistema que determina qué ve cada uno (US2.1 vs
AC2.1.2, US3.1/US3.2 vs US3.3). Los puntos de dolor de cada persona
mapean 1:1 a necesidades reales del `## Intent Analysis` de
`requirements.md` (Ana: repetir el export 29+ veces, selector que no
filtra la grilla, organizaciones vacías; Marcos: columnas del CSV mal
transformadas, sin forma de indicar carpeta/grupos al exportar) — no
son personas genéricas rellenadas por plantilla.

Un matiz que las personas no capturan explícitamente: la frecuencia de
uso. Si Ana exporta "todas las organizaciones" con la periodicidad que
sugiere el dolor real ("29+ veces" era el problema viejo), y Marcos
exporta su propio catálogo con cierta regularidad, eso importa para
evaluar la fricción acumulada de los popups nuevos (ver abajo) — no es
un defecto de las personas, pero sí un dato ausente que hubiera ayudado
a calibrar mejor el costo de UX de US8/US9.

### Enfoque de las 9 historias

El desglose por área de FR (no por journey ni por persona) es razonable
para este intent — cada grupo de historias (US1-US9) es una unidad de
valor demostrable e independiente, y los ACs están en Given/When/Then
consistente con el guardrail de fase Inception. La priorización MoSCoW
tiene sentido: US1-US4 y US7 como Must Have son efectivamente los que
resuelven el dolor real reportado; US5/US6 como Should Have son
mitigación de riesgo razonable para el radio de explosión de "exportar
todas"; US8/US9 como Could Have es correcto porque el export sigue
funcionando con los defaults embebidos si el usuario cancela o si estas
historias no se priorizan.

US3.3 (Marcos sin cambio de comportamiento) es una historia de
regresión bien puesta — protege explícitamente la experiencia actual de
Marcos de un efecto colateral no deseado, que es exactamente el tipo de
historia que se olvida cuando el foco está en el actor que gana
capacidad nueva (Ana).

### Cuidado de UX en los popups nuevos (US8, US9) — foco del pedido

Ambos popups tienen los tres elementos mínimos bien cubiertos:

- **Default sensato**: AC8.1.1 y AC9.1.1 sugieren un valor concreto
  verificado carácter a carácter contra `docs/data39.csv`, no un
  placeholder inventado.
- **Cancelación limpia**: AC8.1.2 y AC9.1.2 especifican explícitamente
  que cancelar (`null`) no dispara el export — mismo patrón ya usado
  para el popup de nombre de archivo existente, consistente con lo que
  ya conoce el usuario.
- **Scoping correcto del fallback**: AC9.2.1 deja explícito que el
  valor del popup de grupos de Facebook es SOLO fallback para productos
  sin `facebook_groups` propio — evita que el usuario tema perder datos
  ya cargados.

Dicho esto, encuentro tres huecos genuinos de UX que las historias
actuales no resuelven (los marco como OBJECT abajo, no bloqueantes para
el gate, pero sí materia para Functional Design):

1. **Fricción acumulada de popups nativos por export.** FR8.1/FR9.1 dicen
   que ambos popups aparecen "en TODO export" (propia org, ajena, o
   todas), y el propio FR8.1 aclara que ya existe HOY un tercer
   `window.prompt()` para el nombre de archivo. Eso son 3
   `window.prompt()` secuenciales en cada click de export — 4 puntos de
   interrupción contando el banner de confirmación en el caso "todas"
   (US5). Ninguna historia contempla recordar el último valor ingresado
   (ej. `localStorage`) para que un usuario que exporta repetidamente no
   tenga que re-tipear la misma carpeta/grupos cada vez. Es una
   paradoja de UX real: el feature estrella de este intent (US4, exportar
   "todas" de una vez) existe para eliminar la fricción repetitiva de
   "29+ exports", pero US8/US9 reintroducen fricción repetitiva nueva en
   CADA export futuro, incluido el de "todas".

2. **El default de US8 expone el path de una persona ajena a todos los usuarios.**
   El valor sugerido `Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/`
   es la ruta local de un usuario específico ("juanl"), no un placeholder
   genérico — y FR8.1 dice que aparece en TODO export, para CUALQUIER
   organización. Un dealer sin ninguna relación con "juanl" (ej. Marcos,
   si su organización no es la de ese ejemplo) va a ver ese nombre ajeno
   como sugerencia por defecto, lo cual puede generar confusión ("¿quién
   es juanl? ¿por qué aparece esto?"). Entiendo que el valor está
   confirmado deliberadamente byte a byte contra `docs/data39.csv` — no
   objeto la exactitud del dato, objeto que ninguna historia evalúe el
   costo de UX de mostrar ese valor específico a usuarios que no tienen
   ningún contexto para entenderlo. Vale la pena que Functional Design lo
   revise explícitamente (aunque sea para aceptarlo tal cual por ahora).

3. **Orden y comportamiento de cancelación parcial no especificados.**
   Con 3 popups secuenciales (archivo, carpeta base, grupos), ninguna
   historia define en qué orden aparecen ni qué pasa si el usuario
   confirma el primero y cancela el segundo o el tercero — se infiere
   que cualquier cancelación aborta todo el flujo (consistente con
   AC8.1.2/AC9.1.2 tomadas individualmente), pero no está declarado
   explícitamente como comportamiento del flujo combinado.

Un cuarto punto, menor y no exclusivo de US8/US9: ninguna historia
cubre el estado de carga/feedback visual durante un export "todas" que,
según NFR3, arma el ZIP completo en memoria a escala de plataforma —
podría tardar sensiblemente más que un export de una sola organización.
No lo marco como objeción porque no hay evidencia de que el export
actual de una sola organización tenga ya un indicador de progreso (no
sería una regresión), pero es la operación de mayor radio de explosión
del intent y no tiene ninguna historia de "el usuario sabe que está en
curso".

## Positions

AGREE: Las 2 personas están bien fundamentadas en permisos reales del sistema y en el `## Intent Analysis` de requirements.md, no son genéricas. El desglose de 9 historias por área de FR con priorización MoSCoW es coherente y cada AC está en formato BDD verificable. US8/US9 cubren correctamente default sensato, cancelación limpia (AC8.1.2/AC9.1.2) y scoping correcto del fallback (AC9.2.1). US3.3 protege explícitamente la experiencia de Marcos de efectos colaterales no deseados.
OBJECT: (1) Ninguna historia evalúa ni mitiga la fricción acumulada de 3 `window.prompt()` secuenciales por export (archivo existente + carpeta base nueva + grupos nuevos) — recomendaría a Functional Design considerar recordar el último valor ingresado para reducir la re-tipeada repetitiva, dado que el propósito de este intent es justamente reducir trabajo repetitivo. (2) El default de US8 (`Users/juanl/...`) expone el path de una persona específica ajena como sugerencia a CUALQUIER organización que exporte — el valor está correctamente verificado contra `docs/data39.csv`, pero ninguna historia evalúa el costo de confusión de mostrarlo a usuarios sin contexto. (3) El orden de los 3 popups secuenciales y el comportamiento ante una cancelación parcial (confirmar uno, cancelar otro) no están especificados explícitamente. Ninguno de estos tres puntos es bloqueante para el gate de User Stories — los planteo como judgment calls para que Functional Design los resuelva explícitamente, no como errores de las historias actuales.
