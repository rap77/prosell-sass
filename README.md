# prosell-sass


---

## 🧠 MasterMind Framework

This project uses [MasterMind Framework](https://github.com/rap77/mastermind-framework) for expert consultation.

The framework provides 7 specialized brains that can be consulted via Claude Code:

- **#1 Product Strategy** - What & Why
- **#2 UX Research** - User Experience
- **#3 UI Design** - Visual Design
- **#4 Frontend** - Frontend Architecture
- **#5 Backend** - Backend Architecture
- **#6 QA/DevOps** - Quality & Operations
- **#7 Growth/Data** - Growth & Evaluation

Run `mastermind install status` for more information.

---

## 🔄 MM-Flow: Multi-Project Orchestration Engine

**MM-Flow** es el sistema de orquestación inteligente que reemplaza GSD. Diseñado para:

- 🎯 **Multi-proyecto:** Ejecutar mastermind + prosell-sass en paralelo usando la misma PostgreSQL
- 🤖 **Multi-backend:** Cambiar automáticamente entre Claude, OpenRouter, z.ai basado en tokens disponibles AHORA
- 🌙 **Night Mode:** Dejar prosell-sass ejecutando 8 horas sin intervención mientras duermes
- 📊 **Smart Token Management:** Prioriza z.ai (5 resets/día), fallback a OpenRouter, Claude como último recurso
- 🔐 **Row-Level Security:** prosell-sass NO puede ver datos de mastermind, incluso en DB compartida

### Arquitectura MM-Flow

```
┌─────────────────────────────────────────┐
│     MM-Flow Smart Backend Manager       │
│  (Consulta PostgreSQL cada 5 minutos)   │
└─────────────────────────────────────────┘
        ↓
        ├─→ Query: "¿Quién tiene MÁS tokens disponibles AHORA?"
        │
        ├─→ Mastermind proyecto:
        │   Claude: 85K/100K (85%) ← Usándose
        │   OpenRouter: 128K/128K (100%) ← Standby
        │   z.ai: 150K/200K (75%) ← Standby
        │
        ├─→ Prosell-sass proyecto:
        │   z.ai: 120K/200K (60%) ← Usándose
        │   OpenRouter: 100K/128K (78%)
        │   Claude: AGOTADO
        │
        └─→ DECISIÓN AUTOMÁTICA:
            • Si Claude < 5K tokens → switchea a OpenRouter
            • Si OpenRouter < 5K tokens → usa z.ai
            • Checkpoint automático ANTES de cambiar
            • Brain #7 valida output en AMBOS proyectos

┌─────────────────────────────────────────┐
│      PostgreSQL (Shared mastermind_bd)  │
├─────────────────────────────────────────┤
│ • organizations (2: acme-corp, prosell) │
│ • projects (2: mastermind, paperclip-v3)│
│ • backend_sessions (tracking tokens)    │
│ • mm_flow_state (fase actual + status)  │
│ • context_checkpoints (snapshots)       │
│ • brain_consultations (audit trail)     │
│ • RLS: org_id aísla datos automáticamente│
└─────────────────────────────────────────┘
```

### CLI Commands (MM-Flow)

```bash
# Inicializar contexto para prosell-sass
mm-flow init --org prosell-sass --project paperclip-v3

# Ejecutar una fase manual
mm-flow execute-phase --phase 19 --project paperclip-v3

# Night mode: 8 horas de ejecución autónoma
mm-flow night-run --project paperclip-v3 --phase 19 --max-hours 8

# Ver estado actual (backends, tokens, reset countdown)
mm-flow status --project paperclip-v3

# Salida esperada:
# ┌──────────┬──────────┬────────┬──────────────────┐
# │ Backend  │ Used/Limit│ %Used │ Status           │
# ├──────────┼──────────┼────────┼──────────────────┤
# │ z.ai     │ 50K/200K │ 25%   │ ✅ READY         │
# │ OpenRtr  │ 100K/128K│ 78%   │ ⏳ 18h 30m 45s   │
# │ Claude   │ 100K/100K│ 100%  │ ❌ DEPLETED      │
# └──────────┴──────────┴────────┴──────────────────┘
```

### Setup (compartido con mastermind)

```bash
# PostgreSQL ya está corriendo en localhost:5433/mastermind_bd
# Docker (desde root de mastermind):
docker compose up -d

# Sincronizar dependencias
cd apps/api && uv sync

# CLI está en .planning/.mm-flow/cli/commands.py
# Importar en tu flujo de trabajo:
from pathlib import Path
sys.path.insert(0, str(Path.home() / '.planning/.mm-flow'))
from cli.commands import execute_mm_flow_command
```

### Monitoring & Debugging

**Ver tokens de todos los backends:**
```sql
SELECT backend, tokens_used, tokens_limit, is_active, next_reset_time, depletion_timestamp
FROM backend_sessions
WHERE project_id = 'paperclip-v3'
ORDER BY tokens_available DESC;
```

**Ver historial de checkpoints:**
```sql
SELECT phase, reason, created_at, tokens_at_checkpoint
FROM context_checkpoints
WHERE project_id = 'paperclip-v3'
ORDER BY created_at DESC
LIMIT 10;
```

**Ver cambios de backend:**
```sql
SELECT from_backend, to_backend, created_at
FROM context_checkpoints
WHERE project_id = 'paperclip-v3' AND reason = 'backend_switch'
ORDER BY created_at DESC;
```

### Night Mode Safeguards

```python
# Ejecutar una fase de forma segura overnight
executor = NightModeExecutor(
    org_id="prosell-sass",
    project_id="paperclip-v3",
    phase=19,
    max_hours=8
)

result = executor.run()
# Pausará automáticamente si:
# • Todos los backends < 10K tokens (MIN_TOKENS_SAFETY)
# • 3+ errores consecutivos (MAX_CONSECUTIVE_ERRORS)
# • Checkpointea cada 30 minutos (PERIODIC_CHECKPOINT_SECONDS)
# • Logs en ~/.mm-flow/night-run-2026-04-12.log
```
