## Sources

- Draft del lead: `team-practices.md`, `discovered-rules.md`, `evidence.md`
- Contribuciones ciegas: `contributions/aidlc-quality-agent.md`, `contributions/aidlc-developer-agent.md`, `contributions/aidlc-devsecops-agent.md`
- Evidencia de Reverse Engineering: `aidlc/spaces/default/codekb/prosell-sass/code-quality-assessment.md` (hallazgos #87-93)

Las cinco secciones de `memory/team.md` (Way of Working, Walking Skeleton, Deployment, Code Style) no tienen especialización nueva propuesta por el lead ni objeciones de fondo de los tres revisores — solo Testing Posture y un hallazgo de seguridad puntual necesitan tu decisión.

## Q1. Piso mínimo de test para este intent (catálogo canónico de vehículos de Facebook)

El scan encontró que dos catálogos de "valores que acepta Facebook" son incompatibles hoy (uno en inglés/minúscula del lado del decode de VIN, otro en español del catálogo nuevo), sin nada que lo detecte en runtime. Con eso y los gaps que señaló QA, el piso propuesto para este intent es:

1. Test de reconciliación cruzada valor-por-valor entre el catálogo de decode de VIN y el catálogo de opciones del schema (hallazgo central).
2. Test de `validate_attributes()` con un caso concreto de valor decodificado de VIN vs. las opciones del schema (aserción de comportamiento fijada, no solo humo).
3. Test de cobertura para el mapeo `FACEBOOK_FIELD_KEY_MAP` ↔ catálogo de valores (mismo patrón de riesgo, escala menor).
4. Test dedicado para la tabla de traducción de categorías (hoy solo cubierta indirectamente).
5. Test de regresión de migración legacy — condicional a que este intent generalice la herramienta de migración.
6. Test de wiring del contrato de adapter de publisher — condicional a que este intent extienda ese contrato.

A. Sí, afirmar los 6 puntos tal cual.
B. Afirmar, pero con un ajuste puntual (especificar en "Otro").
C. Recortar el piso — sacar uno o más puntos (especificar cuáles en "Otro").
D. No agregar ningún piso nuevo — dejar la postura general del equipo sin puntos específicos para este intent.
X. Otro (especificar)

[Answer]: A

## Q2. Riesgo de seguridad encontrado por devsecops: el export de catálogo (CSV) no sanitiza celdas contra fórmulas (ej. un valor que empiece con `=`, `+`, `-`, `@` se interpretaría como fórmula si se abre en Excel/Sheets). Este intent toca justo el mapeo de valores que se exportan.

A. Sí, agregar sanitización de fórmulas en el export de CSV como parte de este intent, ya que se está tocando ese mapeo de valores.
B. Documentarlo como riesgo residual aceptado, fuera de alcance de este intent (arreglo aparte).
C. No es un riesgo real para este dato — los valores de catálogo no llegan de una fuente no confiable (especificar por qué en "Otro").
X. Otro (especificar)

[Answer]: A

## Consolidated Summary Confirmation

- Q1 (Piso de test): A — afirmar los 6 puntos tal cual.
- Q2 (Riesgo CSV): A — sanitizar fórmulas en el export CSV dentro de este intent.

- Looks correct
- Request changes

[Answer]: Looks correct
