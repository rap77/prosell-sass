# MasterMind → Codex Compatibility Layer

Este directorio expone una interfaz estable para que Codex pueda operar el framework MasterMind de este repo sin depender del runtime nativo de Claude.

## Entry point canónico

```bash
bash scripts/mm/mm.sh <command> [args...]
```

## Comandos operables

### Handler-backed

- `init`
- `discover`
- `complete-task`
- `review`
- `safe-commit`
- `verify-criteria`
- `ship`

### Utilidades Codex

- `status`
- `next-task`
- `brain-plan <TASK_ID>`
- `catalog`
- `help <mm-command>`

## Ejemplos

```bash
# Ver el estado actual de tasks/todo.md
bash scripts/mm/mm.sh status

# Ver la próxima task pendiente con contexto de tasks/plan.md
bash scripts/mm/mm.sh next-task

# Ver qué cerebros y estrategia usará un bloque
bash scripts/mm/mm.sh brain-plan M3

# Obtener payload estructurado para ejecutar una task desde Codex
bash scripts/mm/mm.sh complete-task M3 --bundle-json

# Ver el markdown fuente de un comando orientado a workflow
bash scripts/mm/mm.sh help plan-phase
```

## Diseño

### Fuente de verdad

La definición original del framework sigue en:

- `.claude/commands/mm/*.md`
- `.claude/commands/mm/*handler.py`
- `.mastermind/config.yaml`
- `tasks/plan.md`
- `tasks/todo.md`
- `.planning/*`

### Adaptación para Codex

Codex usa:

- `scripts/mm/mm.sh` como dispatcher estable
- `.claude/commands/codex/mm-task.sh` para transformar `/mm:complete-task` en bundle/payload consumible
- `scripts/mm/brain_router.py` para decidir qué cerebros deben acompañar cada bloque
- lectura directa de los markdowns `.claude/commands/mm/*.md` para comandos de workflow sin handler

## Modelo de ejecución de `complete-task`

### UX externa

Para el usuario, `complete-task M3` ejecuta el **bloque padre completo** (`M3`).

### Ejecución interna

Dentro del worker:

1. Se procesan subtasks pendientes secuencialmente
2. Cada subtask hace ciclo completo: `in_progress → build → test → typecheck → review → checkpoint`
3. Cada checkpoint actualiza:
   - `.planning/task-progress.json`
   - `tasks/todo.md`
   - tracking de tiempo (`checkpoint-time-tracker.py` / `update-todo-times.py`)
4. Al terminar el bloque padre:
   - suena la notificación de finalización
   - corre `review → verify-criteria`
   - corre un **review final de Codex**
   - corrige hallazgos confirmados del review
   - revalida (`tests/typecheck/lint`) si hubo cambios
   - recién entonces corre `safe-commit`
   - si GGA falla, se corrige y se reintenta hasta quedar limpio

## Cierre obligatorio del bloque

Antes de considerar un bloque como “cerrado”, la secuencia obligatoria es:

1. implementación completa del bloque
2. tests + typecheck + lint
3. `review`
4. `verify-criteria`
5. **review final de Codex**
6. corrección de findings confirmados
7. **actualización de la fuente de verdad** (`tasks/todo.md`, criterios/estado en `tasks/plan.md` y artefacto canónico equivalente si aplica)
8. revalidación
9. `safe-commit`

Si el review o GGA encuentra problemas:

- se corrigen
- se revalidan
- se reintenta el paso correspondiente

No se salta directamente de implementación a commit.

## Sincronización de la fuente de verdad

Al final del bloque, antes del commit, Codex debe dejar sincronizados los artefactos canónicos del proyecto:

- `tasks/todo.md` — estado real de tareas/subtasks
- `tasks/plan.md` — criterios de aceptación, notas de cierre o estado canónico si el bloque lo requiere
- documento canónico equivalente del framework si el bloque cambió planificación/roadmap/fase

La regla es: **si el estado real cambió, la fuente de verdad también debe cambiar antes del cierre**.

## Brain routing

`brain-plan` y `complete-task --bundle-json` ahora incluyen un `brain_routing` estructurado con:

- `primary_brains`
- `support_brains`
- `final_evaluator`
- `optional_cascades`
- `worker_strategy`
- `execution_plan`

Reglas base:

- **Frontend-heavy** → #4 + (#2/#3 si aplica) + #6 → #7
- **Backend-heavy** → #5 + #6 → #7
- **Full-stack** → #4 + #5 + apoyos → #6 → #7
- **QA-heavy** → #6 → #7
- **Producto/discovery** → #1 (+ #2) → #7

## Cobertura actual

### Automatizado

- init
- discover
- complete-task
- review
- safe-commit
- verify-criteria
- ship
- status
- next-task
- brain-plan

### Workflow asistido por documento

Estos comandos no tienen un handler ejecutable completo; Codex debe leer su `.md` y orquestar el flujo:

- `plan-phase`
- `ask-*`
- `audit`
- `project-health-check`
- `execute-milestone`
- `execute-phase`
- `execute-prp`
- `propose`
- `explore-first`
- `improve-prompt`
- `prd-clarifier`
- `generate-prp`
- `ux-spec-to-prompt`
- `complete-phase`
- `new-milestone`

## Regla operativa para futuras sesiones

Si una sesión quiere usar MasterMind desde Codex:

1. Ejecutar `bash scripts/mm/mm.sh catalog`
2. Ver estado con `status` o `next-task`
3. Inspeccionar cerebros con `brain-plan <TASK_ID>` si el bloque es complejo
4. Si el comando es handler-backed, usar `bash scripts/mm/mm.sh <command> ...`
5. Si el comando es workflow-doc, usar `bash scripts/mm/mm.sh help <command>` y seguir el protocolo del markdown
