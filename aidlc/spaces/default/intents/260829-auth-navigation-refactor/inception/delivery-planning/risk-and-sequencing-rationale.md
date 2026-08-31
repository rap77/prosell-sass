# Risk and Sequencing Rationale

Con un único Unit (`U1`) y por lo tanto un único Bolt, no hay una decisión de secuenciación real
que tomar — no existe otro Bolt contra el cual ordenar este. No se aplicó ningún modelo formal de
puntuación (WSJF-style o similar): no tiene sentido puntuar un backlog de un solo ítem.

## Por qué un solo Bolt

Los 5 FR de `requirements.md` son cambios acoplados dentro de la misma área frontend (navegación
auth), ya agrupados en un único Unit por Units Generation (sin frontera de despliegue/servicio
distinta que justificara separarlos). Delivery Planning hereda esa topología: no hay ningún
argumento de riesgo, valor o walking-skeleton que amerite dividir el trabajo en más de un Bolt —
dividirlo introduciría coordinación artificial sin beneficio real, dado que los cambios (helper
OAuth, código muerto, JSDoc, tests) son pequeños y ya están acotados a los mismos ~6 archivos.

## Walking skeleton — no aplica

Practices Discovery afirmó que el equipo no corre la ceremonia de walking skeleton. Aun si la
corriera, un Bolt único que ya es todo el alcance del intent no se beneficia de una porción mínima
end-to-end previa — no hay "el resto" que construir después.

## Mayor riesgo identificado

El mayor riesgo del build, señalado ya en `requirements.md` como Open Question OQ1, es técnico: si
una construcción alternativa de URL para el redirect OAuth (Assumption A1 / FR2.2) sigue
disparando la regla de ESLint pese a preservar la navegación completa del navegador. Code
Generation debe traer evidencia concreta de esto al gate de esa etapa; no cambia la secuenciación
de Bolts (sigue siendo parte del único Bolt), pero sí puede requerir una decisión de alcance en ese
momento (aceptar 1-2 supresores mínimos justificados vs. cero).
