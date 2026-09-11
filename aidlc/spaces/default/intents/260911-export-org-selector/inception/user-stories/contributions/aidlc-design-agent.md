**Collaborator:** aidlc-design-agent

## Contribution

**Personas — fidelidad al usuario real**

Valeria y Martín están bien construidas y son fieles al usuario real: se
apoyan en el permiso concreto (`ORG_ADMIN_VIEW_ALL`) en vez de un proxy de
rol, describen un pain point específico y verificable ("el botón ignora el
permiso que tiene en el resto de la app", "error genérico sin contexto de
organización") en vez de una generalidad vaga, y la reutilización explícita
de las personas de `260903-catalog-client-export` es correcta — es el mismo
usuario ampliando su objetivo, no un usuario nuevo que amerite research
propio. Tech Comfort y Frequency están declarados, lo cual ayuda a calibrar
expectativas de fricción tolerable (Valeria es usuaria administrativa
frecuente: cero fricción adicional es la barra correcta).

**ACs — comportamiento observable vs. implementación**

La gran mayoría de los ACs están correctamente formulados en términos de lo
que el usuario ve/recibe, no de cómo está implementado: "el archivo
descargado corresponde al catálogo publicado de la Organización B" (no "el
query param `organization_id` se envía"), "veo un mensaje que menciona el
nombre de la Organización C explícitamente" (no "el frontend parsea el 404 y
extrae el nombre"). Bien logrado — evita que las historias hablen el
lenguaje de FR1.1 en vez del lenguaje del usuario.

**Gaps de UX identificados (no cubiertos por ninguna AC actual)**

1. **Falta confirmación visual de QUÉ organización se está exportando, en
   el mismo punto del flujo de export.** AC1.1.3 asume correctamente que no
   hace falta volver a elegir la organización si ya está seleccionada en el
   header — eso es correcto por diseño (FR1.4, no resetear `viewingOrgId`).
   Pero ninguna AC cubre el caso de **error de usuario por falta de
   feedback**: `OrganizationPicker` vive en el header, lejos física y
   visualmente del botón "Exportar catálogo (formato cliente)" en
   `/catalog`. Un usuario que cambió de organización hace varias pantallas
   atrás (para revisar productos, por ejemplo) y después va a exportar
   puede no recordar cuál tiene activa — y el flujo de export, tal como
   está descrito, no le confirma nada antes ni durante la descarga. Esto es
   prevención de errores (uno de los principios base de diseño): más vale
   que el usuario vea "vas a exportar el catálogo de [Organización B]" en
   el propio banner/menú de export, que confiar en que recuerde el estado
   del header. Es asimétrico además con FR3.1, que sí menciona el nombre de
   la organización — pero solo en el camino de error (404 sin catálogo). Si
   el error dice el nombre de la organización, el éxito también debería
   confirmarlo (mismo toast/mensaje post-descarga, o el propio banner antes
   del click). Sugiero una AC adicional en US1 (o una nota para Functional
   Design) que confirme que el nombre de la organización activa aparece
   visible en el punto de export — ya sea en el banner, en el mensaje de
   confirmación, o en el toast de éxito.
2. **Nombre del archivo descargado no está cubierto por ninguna AC.** Un
   admin que exporta varias organizaciones seguidas (su caso de uso
   principal, según "Frequency" en la persona) necesita poder diferenciar
   los archivos descargados sin abrirlos. El backend de `260910` ya nombra
   carpetas internas con `{CÓDIGO_ORG}` — valdría una AC (o nota para
   Functional Design) que confirme si el nombre del archivo ZIP/CSV
   descargado en sí (no solo el contenido interno) refleja la organización
   exportada, para que el historial de descargas del navegador sea
   utilizable.
3. **Loading/estado intermedio durante el export no se menciona.** No es
   una historia nueva de UI (el mecanismo de carga ya existe, según
   Constraints/Out of Scope), pero como el mismo click ahora puede traer un
   catálogo de una organización distinta y potencialmente de tamaño
   diferente al propio, valdría dejar explícito en alguna AC o nota que el
   estado de carga/deshabilitado del botón durante la generación del
   ZIP no cambia — para que Build and Test no lo interprete como ausente
   por omisión y termine sin cubrirlo ni siquiera con un test de regresión
   trivial.

Ninguno de estos tres puntos contradice una decisión ya tomada en
`requirements.md` — son ACs adicionales/aclaratorias sobre comportamiento
observable que hoy quedan implícitos.

## Positions

- AGREE: Personas Valeria/Martín son fieles y correctamente reutilizadas — [razón: se apoyan en el permiso real (`ORG_ADMIN_VIEW_ALL`), no en un proxy de rol, y describen pain points verificables contra el código real citado en requirements.md]
- AGREE: Formato Given/When/Then y redacción de ACs en términos de comportamiento observable (archivo descargado, mensaje visible, ausencia de elemento de UI), no de implementación interna — [razón: ningún AC menciona `organization_id`, el store, o el endpoint directamente; todos hablan desde la perspectiva de qué ve/recibe el usuario]
- AGREE: Cobertura de US3 (sin cambios para usuario sin permiso) con ACs negativos explícitos en vez de un solo camino feliz — [razón: consistente con el principio de "diseñar para el peor caso" y con el piso de test ya afirmado en Practices Discovery de exigir un caso de gating negativo explícito]
- OBJECT: Falta un AC (o nota para Functional Design) que confirme que el nombre de la organización activa se muestra en el punto mismo del flujo de export (banner/mensaje de éxito), no solo inferido del estado del header — [razón: riesgo real de error de usuario por falta de feedback visual inmediato; asimetría con FR3.1, que sí muestra el nombre de la organización en el camino de error pero no en el de éxito]
- OBJECT: Falta un AC (o nota) sobre si el nombre del archivo descargado refleja la organización exportada — [razón: Valeria exporta "periódicamente" y potencialmente varias organizaciones seguidas; sin esto, el historial de descargas del navegador no permite diferenciar qué se descargó sin abrir cada archivo]
