# Practices Discovery — Entrevista (260911-cross-org-export-ux)

Reverse Engineering y las 3 revisiones ciegas (quality, developer,
devsecops) ya resolvieron la mayoría de las ambigüedades técnicas. Los
hallazgos puramente mecánicos/objetivos de las revisiones (corrección
factual sobre el precedente de Bolts cross-stack de 260903; reutilizar
el patrón ya existente de `_resolve_org_codes()` batch-prefetch de
`bulk_upload_vehicles.py`; ubicar la función de mapeo de categorías en
el use case, no en el domain service sin dependencias) se integran
directo en el draft final del lead, sin necesidad de decisión humana.
Quedan dos preguntas genuinas de criterio de equipo:

## Q1 — Piso mínimo de tests para este intent

El lead propuso 4 puntos; quality sumó 3 más tras encontrar superficie
de test nueva no cubierta. Piso consolidado (específico de este intent,
no cambia el piso general del proyecto):

1. Regresión de **valor** (no solo de clave) para `clean_title`/`groups`
   — el bug real es de transformación inversa.
2. Regresión negativa explícita: el comportamiento por defecto después
   de agregar el sentinel "todas" sigue siendo "mi propia organización",
   nunca "todas", salvo elección explícita.
3. Test de resolución de `org_code` **por-producto** (no una sola vez
   para todo el loop).
4. Test de wiring del filtrado real de la grilla (`organization_id`
   llegando a `useInfiniteProducts`).
5. Test del filtro del picker por `product_count` (caso límite cuando
   el campo viene `undefined`).
6. Test de wiring de los 2 popups nuevos (carpeta base / grupos de
   Facebook) hacia el llamado de export.

```question
prompt: "¿Afirmás estos 6 puntos como piso mínimo de test para este intent, tal cual están redactados?"
header: "Piso de tests"
multiSelect: false
options:
  - label: "Sí, afirmar los 6 puntos tal cual"
    description: "Quedan como piso obligatorio específico de este intent"
  - label: "Ajustar la lista"
    description: "Quiero sacar, agregar o cambiar alguno de los 6 puntos"
```

[Answer]: Sí, afirmar los 6 puntos tal cual

## Q2 — Auditoría y confirmación de UI para "exportar todas las organizaciones"

DevSecOps marcó que el radio de explosión de un export exitoso pasa de
1 organización a ~29+ en un solo request — mecanismo de permiso igual,
pero impacto mayor. Dos decisiones puntuales:

```question
prompt: "Cuando alguien exporte TODAS las organizaciones de una vez, ¿el log de auditoría debe decirlo explícitamente (distinto del log ya existente para exportar una organización ajena puntual)?"
header: "Auditoría 'todas'"
multiSelect: false
options:
  - label: "Sí, marcarlo explícito en el log"
    description: "El logger.info() ya existente agrega un campo/valor que distinga \"todas\" de \"una organización puntual\""
  - label: "No hace falta distinguirlo"
    description: "El log actual (organización ajena exportada) alcanza igual para el caso \"todas\""
```

[Answer]: Sí, marcarlo explícito en el log

```question
prompt: "¿El banner de confirmación para exportar TODAS las organizaciones necesita un paso de confirmación más fuerte que el banner ya existente para exportar una organización ajena puntual (ej. texto de advertencia adicional, o escribir una palabra de confirmación)?"
header: "Confirmación 'todas'"
multiSelect: false
options:
  - label: "Sí, un paso más fuerte"
    description: "El banner actual (badge + Continuar/Cancelar) no alcanza para una acción de mayor impacto"
  - label: "No, el mismo banner alcanza"
    description: "Mismo patrón ya usado para exportar una organización ajena, sin fricción extra"
```

[Answer]: Sí, un paso más fuerte

## Consolidated Summary Confirmation

Piso de 6 tests afirmado, auditoría distinguible para "todas" afirmada,
confirmación de UI más fuerte para "todas" afirmada. Correcciones
mecánicas de las 3 revisiones (precedente de Bolt cross-stack, patrón
`_resolve_org_codes()`, layering de la función de categorías)
integradas en `team-practices.md`.

```question
prompt: "Does this all look correct before promoting to team.md/project.md?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, promover"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de promover"
```

[Answer]: Looks correct
