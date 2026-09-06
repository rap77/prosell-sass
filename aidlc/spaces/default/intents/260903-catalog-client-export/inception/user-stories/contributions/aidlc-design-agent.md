**Collaborator:** aidlc-design-agent

## Contribution

### 1. Persona Valeria — ¿creíble y suficiente, o falta un segundo persona?

Valeria es creíble y está bien acotada: rol, objetivo, punto de dolor concreto
(reformateo manual hoy) y frecuencia de uso están todos anclados en evidencia
de `requirements.md` (formato `docs/data39.csv`, endpoint `export.csv`
existente). Su nivel de "comodidad tecnológica: Media" es el dato más
importante de todo el documento de personas para este review de UX, porque
condiciona directamente varias de las decisiones de estado de UI que señalo
abajo (punto 4) — una vendedora que "no espera editar CSV a mano ni usar
línea de comandos" tampoco debería tener que interpretar un silencio del
sistema mientras se arma un ZIP pesado, ni descubrir por accidente que
faltaron fotos.

No falta un segundo persona. El feature no tiene superficie de interacción
para comprador, revisor/moderador ni super admin — es correcto mantenerlo en
uno solo. Confirmo la decisión de la Q1 de personas (single persona) sin
objeción.

### 2. Coherencia de experiencia en los acceptance criteria

La secuencia narrativa de US1.1 (click → un único ZIP → contenido esperado)
es coherente y fácil de seguir como flujo feliz. Dos observaciones sobre
huecos de experiencia, ambas ya tocadas parcialmente por el reviewer de
Requirements Analysis pero con una lectura adicional de UX que agrego acá:

- **AC1.1.5 (catálogo vacío)** especifica el contrato HTTP (404 + cuerpo
  descriptivo) pero no el estado de UI resultante. Desde la lente de "diseñar
  para el peor caso" y "prevención de errores sobre mensajes de error": si el
  sistema YA SABE, antes del click, que la organización de Valeria no tiene
  productos `published` (el catálogo se está listando en la misma pantalla),
  la mejor UX no es dejarla hacer click y después mostrarle un error — es
  deshabilitar proactivamente el botón "Exportar catálogo (formato cliente)"
  con un texto de ayuda ("No hay productos publicados para exportar"). El AC
  tal como está redactado solo cubre el camino reactivo (click → error), no
  el preventivo. Recomiendo agregar un AC explícito sobre el estado
  deshabilitado del botón cuando el conteo de `published` es cero.
- **AC1.1.6 (imagen no disponible)** resuelve bien el caso desde el lado del
  dato (el export no se aborta, sigue con las imágenes disponibles) pero deja
  a Valeria completamente a ciegas: la ausencia "queda registrada (log de
  aplicación) para diagnóstico posterior" — es decir, nadie salvo un
  desarrollador con acceso a logs se entera de que algo faltó. Esto es
  degradación silenciosa de datos hacia la usuaria final, justo el tipo de
  comportamiento que el principio "Show, do not tell" de este agente pide
  evitar. Una vendedora que sube el CSV+ZIP resultante a `facebook-auto-post`
  y descubre días después que a un vehículo le faltan fotos no tiene forma de
  saber, por el producto en sí, que el sistema ya lo sabía en el momento del
  export. Esto no exige bloquear el export (la posición de negocio de
  continuar es razonable), pero sí exige un canal de feedback observable —
  como mínimo, un resumen visible tras la descarga ("Export completo. N
  vehículos, M imágenes no pudieron incluirse — ver detalle") en vez de
  silencio total del lado del usuario.

### 3. AC1.2.3 — ¿AC negativo bien usado o genera confusión?

Documentar la AUSENCIA de un selector de disco como AC es, en este caso
puntual, una práctica de UX writing defendible — no una mala práctica
genérica. La razón: el propio FR3.1 le pide a la UI "un campo de texto
editable con un valor sugerido por defecto" para una "ruta/nombre base", y la
palabra "ruta" es exactamente el tipo de término que genera una expectativa
de selector de carpeta nativo (`<input type="file" webkitdirectory>` o File
System Access API) en una persona con comodidad tecnológica media. Fijar por
escrito que ese selector NO existe, y que la descarga sigue el mecanismo
estándar del navegador, previene ambigüedad real de implementación (el
propio `requirements.md` documenta que la File System Access API fue
evaluada y descartada por incompatibilidad con Firefox/Safari) — sin este AC,
un developer podría razonablemente intentar implementarlo.

Dicho esto, la redacción Given/When/Then de AC1.2.3 es más floja que las
demás: "When busco un botón... Then NO existe tal botón" no es una acción de
usuario disparando un evento observable, es una aserción de ausencia
estructural de UI — más cercana a una nota de alcance que a un escenario de
prueba ejecutable por un humano o por un test automatizado de interacción.
No lo marco como objeción bloqueante (la intención es clara y la
información es correcta), pero para Functional Design/QA sugiero
reformularlo como una restricción de diseño explícita del campo ("el campo
es de solo texto, sin `<input type=file>` ni API de selección de directorio")
en vez de forzarlo al molde Given/When/Then, que no le calza naturalmente.

### 4. Estados de UI faltantes: loading, progreso del ZIP, feedback de éxito

Este es el hueco más significativo desde la perspectiva de diseño de
interacción, y no está cubierto por ninguna historia actual:

- **Ninguna AC define un estado de carga** mientras el backend arma el ZIP.
  El propio `requirements.md` (NFR3, Open Questions) reconoce que el volumen
  de imágenes/filas puede ser grande y que hace falta un cap de recursos
  precisamente porque armar el ZIP completo en memoria no es instantáneo —
  eso implica una espera perceptible para Valeria entre el click y la
  descarga. Sin un estado de carga explícito (botón deshabilitado + spinner,
  o mensaje "Generando export..."), el riesgo concreto es que la usuaria
  interprete la demora como que el click no funcionó y vuelva a hacer click
  — generando requests duplicados contra un endpoint que ya es
  potencialmente costoso (el mismo riesgo de DoS que motiva NFR3 se agrava
  si la UI invita al double-click).
- **No hay AC de feedback de éxito más allá de la descarga del navegador.**
  Para un archivo chico esto alcanza, pero si el export tarda varios
  segundos (ver punto anterior), Valeria necesita alguna confirmación
  explícita en pantalla de que el proceso terminó bien — sobre todo
  combinado con el punto 2 (avisar si hubo imágenes faltantes). Sin esto, el
  único "feedback" es la barra de descargas del navegador, que no comunica
  nada sobre el contenido (cuántos vehículos, si hubo faltantes).
- **No hay AC sobre qué pasa si el usuario cierra la pestaña o navega fuera
  durante el armado del ZIP** — no exijo una historia nueva para esto (es
  edge case de bajo impacto), pero lo señalo como hueco de estados no
  contemplado si Functional Design decide usar un patrón de polling/job
  asíncrono en vez de una respuesta streaming directa.

Ninguno de estos tres puntos requiere una historia nueva obligatoriamente —
podrían resolverse como ACs adicionales dentro de US1.1 (loading + éxito) y
US1.3 (qué ve el usuario mientras se evalúa/excede el límite, no solo cuando
ya lo excedió). Pero tal como está el documento hoy, un developer podría
implementar el flujo completo sin ningún estado intermedio entre "click" y
"archivo descargado o error", lo cual no calza con el nivel de comodidad
tecnológica media declarado para Valeria ni con el principio de "diseñar
para el peor caso" (conexión lenta, catálogo grande).

## Positions

AGREE: La elección de un solo persona (Valeria) sin persona secundaria es correcta — el feature no tiene superficie de interacción para otros roles.
AGREE: Tratar el fix de `build_image_folder_name()` como AC dentro de la historia de negocio (Q2: A) es la decisión correcta de UX writing — el color mal armado en el nombre de carpeta es un defecto observable por la usuaria final (carpetas con nombre incompleto), no un detalle puramente interno.
AGREE: Documentar la ausencia del selector de carpeta como AC negativo (AC1.2.3) es una práctica válida en este caso puntual, porque el propio FR3.1 ("ruta/nombre base") crea una expectativa real de selector nativo que había sido evaluada y descartada — fijarlo por escrito previene una reimplementación no pedida.
OBJECT: AC1.1.5 y AC1.1.6 especifican el contrato de datos/HTTP pero no el estado de UI observable por Valeria (botón deshabilitado proactivamente cuando el catálogo está vacío; algún resumen visible de imágenes faltantes tras un export parcial). Sin esto, la especificación de UX del camino de error queda incompleta — coincide y refuerza el Finding #2 (Major) ya levantado por el reviewer de Requirements Analysis, pero agrego que el gap es también de diseño de interacción, no solo de contrato de API.
OBJECT: Ninguna historia ni AC define un estado de carga/progreso mientras se arma el ZIP, ni un feedback de éxito explícito en pantalla más allá de la descarga nativa del navegador. Dado que NFR3 reconoce explícitamente que el volumen de datos puede requerir un cap de recursos (es decir, la operación no es instantánea), la ausencia de un estado de carga es un hueco real de UX, no un detalle de implementación a resolver tácitamente en Functional Design — pido que se agregue como AC nuevo en US1.1 (o una historia US1.4 dedicada) antes de avanzar.
