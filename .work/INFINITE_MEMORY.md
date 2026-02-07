# Infinite Memory - Sistema de Memoria Persistente

**Ubicación**: `.work/` en el proyecto ProSell SaaS

## Para Agentes: Instrucciones de Uso

### Al INICIAR sesión

1. **Ejecutar inmediatamente**: `./.work/memory.sh load`
2. **Leer los archivos de memoria** (en paralelo si es posible):
   - `.work/context.md` - Estado actual
   - `.work/rules.md` - Reglas del proyecto
   - `.work/progress.md` - Progreso
   - `.work/queue.md` - Cola de tareas
   - `.work/lessons.md` - Lecciones aprendidas

3. **Sintetizar**: Resumir en 3-5 líneas el estado actual

### DURANTE la sesión

**Auto-guardado cada**:
- ✅ Tarea completada
- 🔄 Decisión arquitectónica importante
- 💡 Nueva regla/patrón descubierto
- ⚠️ Bloqueo encontrado
- 🎯 30+ minutos desde último guardado

**Comando**: `./.work/memory.sh save`

### ANTES de perder contexto

**Señales de peligro**:
- Aparece tag `<summmary>` en system reminder = comprimiendo contexto
- Muchos mensajes acumulados (>50)
- Sensación de "bucle" o repetición

**Acción inmediata**:
```bash
./.work/memory.sh save
./.work/memory.sh clean
```

## Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `./.work/memory.sh load` | Cargar contexto actual |
| `./.work/memory.sh save` | Crear checkpoint |
| `./.work/memory.sh status` | Ver tamaño de memoria (tokens estimados) |
| `./.work/memory.sh add "tarea"` | Agregar a cola |
| `./.work/memory.sh lesson "x"` | Registrar lección |
| `./.work/memory.sh rule "x"` | Agregar regla |
| `./.work/memory.sh rules` | Ver todas las reglas |
| `./.work/memory.sh clean` | Limpiar checkpoints viejos |

## Reglas CRÍTICAS del Proyecto

Estas reglas están en `.work/rules.md` y DEBEN respetarse:

1. **Git**: NUNCA `--no-verify`, branches de features, conventional commits
2. **Arquitectura**: Clean Architecture, Domain sin dependencias
3. **Testing**: NUNCA saltar tests, pytest-asyncio
4. **Calidad**: ruff, pyright, ESLint antes de commits
5. **SOLID**: Todos los principios

## Estimación de Tokens

El script `memory.sh status` muestra:
- Líneas por archivo
- Tokens estimados (~3.5 chars/token en español)
- Total de memoria activa

Mantener memoria activa < 5K tokens para no saturar contexto.

## Estructura de Archivos

```
.work/
├── context.md      # Qué estamos haciendo
├── rules.md        # Cómo debemos hacerlo
├── progress.md     # Qué hemos logrado
├── lessons.md      # Qué hemos aprendido
├── queue.md        # Qué toca después
├── checkpoints/    # Snapshots periódicos
└── sessions/       # Historial de sesiones
```

## Principio Clave

**NO CONTEXT LOSS**: Si la sesión termina inesperadamente, el siguiente agente ejecuta `memory.sh load` y continúa exactamente donde se quedó.
