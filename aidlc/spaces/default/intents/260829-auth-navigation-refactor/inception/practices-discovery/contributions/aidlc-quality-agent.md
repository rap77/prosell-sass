**Collaborator:** aidlc-quality-agent

## Contribution

Verifiqué de forma independiente el borrador de `team-practices.md` contra la
configuración real de testing/CI (no contra la memoria global del usuario ni
contra lo que dice `org.md`). Confirmo el diagnóstico central del lead —
**test-after es la práctica real**, no TDD estricto — y agrego evidencia dura
adicional que el Step 4 debería usar para cerrar el Issue #1 sin necesidad de
preguntarlo como si fuera una incertidumbre abierta:

**Sobre TDD estricto vs. test-after (Issue #1).** No es una contradicción a
resolver por juicio humano en la entrevista — es una discrepancia entre dos
fuentes de naturaleza distinta que ya está resuelta por evidencia:

- `~/.claude/CLAUDE.md` ("Strict TDD Mode: enabled") es **configuración
  personal del usuario para el asistente**, aplica a _todas_ sus sesiones y
  proyectos, no es una afirmación de práctica de _este equipo_ en _este
  repo_. Es una instrucción de cómo quiere que Claude se comporte, no una
  observación verificable sobre el código.
- La evidencia del repositorio es unánime en la dirección contraria:
  - `apps/web/vitest.config.ts` (líneas 25-46) trae un comentario in-code
    explícito: los thresholds se bajaron de 80% a
    `lines:40 functions:40 branches:75 statements:40` porque "current
    measured coverage (June 2026): lines 48.51%" — es decir, el equipo
    **midió cobertura ya escrita después del hecho** y ajustó el piso para
    no bloquear CI, en vez de escribir tests primero para llegar al 80%.
    Ese es el patrón inverso de TDD.
  - El backend es todavía más débil: `ci.yml:89` corre
    `uv run pytest --cov=prosell --cov-report=xml` — genera el reporte pero
    **no pasa `--cov-fail-under`**, y confirmé que `apps/api/pyproject.toml`
    no declara `[tool.coverage.report] fail_under` en ningún lado. No hay
    NINGÚN piso de cobertura backend enforced mecánicamente, ni el 80% de
    `org.md` para `classic`, ni el 40% del frontend. Esto es más débil de
    lo que el borrador del lead deja ver (el borrador dice "no se encontró
    umbral" pero no remarca que la contradicción con el 80% default de
    `org.md` para el scope `classic` activo es total, no parcial).
  - Los aprendizajes ya persistidos en `project.md` para Code Generation
    son explícitos y repetidos (dos entradas independientes, 2026-08-26 y
    2026-08-28): "no hay que backfillear cobertura en archivos que ya
    carecían de test antes de tocarlos", "el piso de tests... nunca debe
    exceder lo que el FR/scope realmente exige". Estas son reglas
    _test-after_ codificadas por el propio equipo tras observar su forma
    real de trabajar, no una interpretación mía.
- **Recomendación**: la entrevista no debería preguntar "¿TDD o test-after?"
  como si estuviera abierto — debería presentar esta evidencia y pedir
  confirmación de que `Methodology: test-after` es correcto, dejando la
  instrucción de `CLAUDE.md` explícitamente fuera de alcance (es config de
  asistente, no práctica de equipo). Sí vale la pena preguntar el segundo
  eje que el lead ya identificó correctamente: si el equipo **acepta
  formalmente** el 40% frontend / sin piso backend como el nuevo default
  del scope `classic`, o si quiere reabrir el 80% de `org.md` como aspiración
  a futuro (sin que esto bloquee el intent activo, que es un refactor).

**Gaps de tooling/CI que la entrevista debería confirmar, no inferir:**

1. El backend no tiene NINGÚN gate de cobertura (ver arriba) — mientras que
   el frontend sí tiene uno, aunque rebajado. Preguntar si esta asimetría es
   aceptada o si el backend debería al menos tener un piso mínimo (aunque sea
   bajo) antes de cerrar esta discovery.
2. El hook `next-lint` de pre-commit está deshabilitado (comentado, TODO
   abierto) — el enforcement de ESLint completo vive solo en CI. Esto es un
   gap real de "shift-left" que debería registrarse como conocido, no
   asumirse resuelto.
3. `react-doctor` es bloqueante en pre-commit pero solo advisory en CI
   (`react-doctor.yml` no bloquea merge) — direcciones opuestas a lo
   esperable (normalmente el gate más fuerte va en CI, no solo local). Vale
   confirmar si es intencional.
4. Para el scope `classic` activo de este intent: no hay evidencia de
   `security-test-instructions.md` ni instrucciones de test de integración
   dedicadas más allá de la suite unit/component existente — consistente con
   el aprendizaje ya registrado de no generar esos artefactos por ceremonia
   cuando el cambio no lo amerita. El alcance de este intent
   (`260829-auth-navigation-refactor`) es un refactor de navegación
   auth/OAuth de frontend — de cara a Build and Test, el patrón de test
   correcto es unit/component (Vitest + Testing Library), no
   integración/E2E nuevo, salvo que Requirements Analysis diga lo contrario.
5. Confirmo con evidencia propia (no solo la citada por el lead) el Signal
   #17 de `code-quality-assessment.md`: `apps/web/tests/app/auth/{login,
register}/page.test.tsx` no tienen ninguna mención a "oauth" — las líneas
   con `eslint-disable @next/next/no-location-assign-relative-destination`
   que este intent va a tocar (Signal #16, handler OAuth duplicado) están
   hoy sin cobertura de test. Si el refactor de este intent consolida ese
   handler, la instrucción de test para Code Generation debería exigir
   cobertura del `onClick` OAuth como parte del refactor, no como deuda
   aparte — es exactamente el código que se va a mover/tocar.

## Positions

- AGREE: `Methodology: test-after` como diagnóstico correcto del borrador —
  la evidencia mecánica (threshold rebajado con justificación in-code,
  ausencia total de gate de cobertura backend, aprendizajes de proyecto ya
  persistidos) es unánime y no deja margen razonable para "TDD estricto"
  como práctica real de equipo.
- OBJECT: el borrador presenta el Issue #1 como una "tensión sin resolver"
  que debe llevarse tal cual a la entrevista humana — en cambio, la
  contradicción es resoluble por evidencia ANTES de la entrevista (la
  fuente "TDD estricto" es config personal del asistente, no una afirmación
  de práctica de equipo), y la entrevista debería solo confirmar el piso de
  cobertura aceptado, no relitigar la metodología completa.
- OBJECT: el borrador no marca con suficiente fuerza que el backend no
  tiene NINGÚN gate de cobertura (ni 80% ni ningún otro número) — esto es
  una asimetría de tooling entre frontend/backend que amerita su propia
  línea en `evidence.md`, separada de la nota general de "threshold no
  confirmado".
