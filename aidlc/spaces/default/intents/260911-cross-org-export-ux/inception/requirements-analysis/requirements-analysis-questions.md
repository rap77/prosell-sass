# Requirements Analysis — Preguntas (260911-cross-org-export-ux)

Reverse Engineering y Practices Discovery ya resolvieron la mayoría de
las ambigüedades técnicas (mecanismo cross-tenant ya existe en el
repositorio; patrón de mapeo de valores identificado; precedente de
`_resolve_org_codes()` para resolución batch). Quedan las 5 preguntas de
diseño de producto ya señaladas como abiertas en Practices Discovery,
más una de alcance detectada al redactar este archivo.

## Q1 — Alcance de los popups nuevos (carpeta base / grupos de Facebook)

El pedido original dice "se pide al usuario una carpeta base por popup
**igual que ya se pide el nombre del archivo al exportar**" — el popup
de nombre de archivo aparece en TODO export (propia organización, una
organización ajena, o [si se construye] todas). ¿Los popups nuevos de
carpeta base y grupos de Facebook deben aparecer de la misma forma, en
cualquier export (no solo cuando se elige "todas las organizaciones")?

```question
prompt: "¿Los popups de carpeta base y grupos de Facebook deben aparecer en TODO export (propia org, una org ajena, o todas), igual que ya pasa con el popup de nombre de archivo?"
header: "Alcance popups"
multiSelect: false
options:
  - label: "A. Sí, en todo export"
    description: "Mismo criterio que el popup de nombre de archivo ya existente"
  - label: "B. Solo para exportar todas las organizaciones"
    description: "Los popups nuevos aparecen únicamente en el modo \"todas\", no en un export puntual de una org"
  - label: "X. Other (please specify)"
    description: "Otra combinación"
```

[Answer]: A. Sí, en todo export

## Q2 — Forma del sentinel "todas las organizaciones"

`organizationStore.viewingOrgId` hoy es `string | null` (`null` =
"mi propia organización"). Agregar "todas" necesita una tercera forma
de ese estado.

```question
prompt: "¿Cómo preferís representar \"todas las organizaciones\" en el estado del selector — un valor especial reservado (ej. la palabra \"__all__\") en el mismo campo que ya existe, o un campo separado que indique el modo (propia / una específica / todas)?"
header: "Sentinel 'todas'"
multiSelect: false
options:
  - label: "A. Valor especial en el mismo campo (Recommended)"
    description: "Menos cambios de estado, un único campo sigue siendo la fuente de verdad"
  - label: "B. Campo/modo separado"
    description: "Más explícito, pero dos piezas de estado que se deben mantener sincronizadas"
  - label: "X. Other (please specify)"
    description: "Otra forma"
```

[Answer]: A. Valor especial en el mismo campo

## Q3 — Mapeo de árbol de categorías a las 2 columnas planas del CSV

El árbol real de categorías tiene 3-4 niveles (ej. "Vehículos y
Transporte" > "Vehículos Terrestres" > "Carros y Camionetas"), pero el
CSV cliente solo tiene 2 columnas planas: `category` y `type`.

```question
prompt: "¿Qué nivel del árbol de categorías va en la columna \"category\" y cuál en \"type\" del CSV cliente?"
header: "Mapeo categorías"
multiSelect: false
options:
  - label: "A. category = nivel 1 (vertical), type = nivel 2 (categoría)"
    description: "Ej. category=\"Vehículos y Transporte\", type=\"Vehículos Terrestres\" — ignora niveles más profundos"
  - label: "B. category = nivel 2, type = nivel 3/hoja"
    description: "Ej. category=\"Vehículos Terrestres\", type=\"Carros y Camionetas\" — más cercano al ejemplo de data39.csv (\"Vehiculos\"/\"Auto-camioneta\")"
  - label: "X. Other (please specify)"
    description: "Otra combinación, o un mapeo explícito por categoría en vez de por nivel"
```

[Answer]: B. category = nivel 2, type = nivel 3/hoja (ejemplo confirmado por el usuario: category="Vehiculos", type="Auto/Camioneta", exacto como en data39.csv)

## Q4 — Fidelidad de `location`/`state`

`location_state` se guarda como código (ej. "FL"), pero el CSV de
muestra espera el nombre completo (ej. "florida"). Reconstruir el
nombre completo exacto requeriría una tabla de códigos que hoy no
existe.

```question
prompt: "Para la columna \"location\" del CSV, ¿aceptás exportar el código de estado tal cual está guardado (ej. \"Orlando FL\"), o hace falta agregar una tabla de códigos a nombre completo (ej. \"Orlando florida\") para calzar exacto con el formato de muestra?"
header: "Fidelidad location"
multiSelect: false
options:
  - label: "A. Aceptar el código tal cual (Recommended)"
    description: "Sin tabla nueva — \"Orlando FL\" en vez de \"Orlando florida\""
  - label: "B. Agregar tabla de códigos a nombre completo"
    description: "Calza exacto con el formato de muestra, pero agrega una tabla de mantenimiento nueva"
  - label: "X. Other (please specify)"
    description: "Otra vía"
```

[Answer]: A. Aceptar el código tal cual

## Q5 — Política del límite de productos para "exportar todas"

`EXPORT_MAX_PRODUCTS=500` hoy es un límite por organización. Con
"todas las organizaciones" (29+ organizaciones), es mucho más probable
llegar al límite en una sola descarga.

```question
prompt: "Para el export \"todas las organizaciones\", ¿qué política de límite preferís?"
header: "Límite de productos"
multiSelect: false
options:
  - label: "A. Mantener 500, pero como límite global (Recommended)"
    description: "Si se supera, falla con el mismo error 413 ya existente — simple, sin cambio de arquitectura"
  - label: "B. Subir el límite específicamente para el modo \"todas\""
    description: "Requiere elegir un número nuevo y justificarlo"
  - label: "X. Other (please specify)"
    description: "Ej. paginar el export en múltiples ZIPs, u otra estrategia"
```

[Answer]: A. Mantener 500, como límite global

## Q6 — Mecanismo exacto de la confirmación de UI más fuerte para "todas"

Ya afirmado en Practices Discovery que hace falta más que el banner
actual (badge + Continuar/Cancelar) para exportar todas las
organizaciones. Falta el mecanismo exacto.

```question
prompt: "¿Qué mecanismo de confirmación adicional preferís para exportar TODAS las organizaciones?"
header: "Confirmación 'todas'"
multiSelect: false
options:
  - label: "A. Texto de advertencia adicional, mismo Continuar/Cancelar (Recommended)"
    description: "Ej. \"Vas a exportar el catálogo de TODAS las organizaciones (29 en total)\" — sin fricción extra de tipeo"
  - label: "B. Palabra de confirmación tipeada"
    description: "El usuario debe escribir una palabra exacta (ej. \"todas\") antes de habilitar \"Continuar\" — mismo patrón que el gate de deploy a producción"
  - label: "X. Other (please specify)"
    description: "Otro mecanismo"
```

[Answer]: A. Texto de advertencia adicional, mismo Continuar/Cancelar

## Q7 — Seguimiento de Q3: ¿nombres reales del árbol o vocabulario del cliente?

El ejemplo que diste (`category="Vehiculos"`, `type="Auto/Camioneta"`)
no coincide literalmente con NINGÚN nivel del árbol real de categorías
de la plataforma (`"Vehículos y Transporte" > "Vehículos Terrestres" >
"Carros y Camionetas"`, con acentos y nombres más largos) — es el
vocabulario del CSV de muestra del cliente (`data39.csv`), un sistema
externo distinto. Esto cambia el approach de implementación: no es leer
directo un nombre de nivel del árbol, sino traducir cada categoría real
a un valor equivalente en el vocabulario del cliente.

```question
prompt: "¿Querés que el CSV exporte los nombres REALES del árbol de categorías de la plataforma (con acentos, nombres completos), o preferís una tabla de traducción nueva que mapee cada categoría real al vocabulario más simple del cliente (como en tu ejemplo \"Vehiculos\"/\"Auto/Camioneta\")?"
header: "Vocabulario categorías"
multiSelect: false
options:
  - label: "A. Nombres reales del árbol, tal cual"
    description: "Sin tabla nueva — el CSV tendrá acentos y nombres más largos que el data39.csv de muestra"
  - label: "B. Tabla de traducción al vocabulario del cliente (Recommended)"
    description: "Coincide exacto con tu ejemplo y con data39.csv — requiere mantener una tabla nueva categoría-real → valor-cliente"
  - label: "X. Other (please specify)"
    description: "Otra combinación"
```

[Answer]: B. Tabla de traducción al vocabulario del cliente

## Consolidated Summary Confirmation

- Los popups de carpeta base y grupos de Facebook aparecen en TODO export (propia org, una org ajena, o todas).
- El sentinel "todas las organizaciones" es un valor especial reservado en el mismo campo `viewingOrgId`, no un campo/modo separado.
- El mapeo category/type del CSV usa una tabla de traducción nueva del árbol real de categorías al vocabulario del cliente (ej. category="Vehiculos", type="Auto/Camioneta") — no los nombres reales del árbol tal cual.
- La columna `location` acepta el código de estado tal cual está guardado (ej. "Orlando FL"), sin tabla de nombres completos nueva.
- `EXPORT_MAX_PRODUCTS=500` pasa a ser un límite global (no por-organización) para el modo "todas" — si se supera, falla con el mismo error 413 ya existente.
- La confirmación de UI más fuerte para "todas" es texto de advertencia adicional (mencionando la cantidad de organizaciones) sobre el mismo banner Continuar/Cancelar, sin palabra de confirmación tipeada.

Does this all look correct before I generate the requirements artifact?

```question
prompt: "Does this all look correct before I generate the requirements artifact?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, generá el artefacto"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de generar"
```

[Answer]: Looks correct
