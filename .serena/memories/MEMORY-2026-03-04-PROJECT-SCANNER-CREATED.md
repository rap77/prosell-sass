# Memory - MasterMind Framework

## Actualización 2026-03-04

### Skill Creado: project-scanner
- Ubicación: `~/.claude/skills/project-scanner/SKILL.md`
- Propósito: Escanear proyectos externos y generar briefs estructurados
- Estado: Creado y probado

### Mejoras Identificadas
El usuario sugirió mejorar el skill para incluir:
1. Preguntas de clarificación después del escaneo
2. Re-análisis basado en respuestas del usuario
3. Recomendaciones para actualizar documentación del proyecto

### Próximas Mejoras al Skill
Añadir fase de "Validación con Usuario" al flujo:
```
ESCANEO → PREGUNTAS CLARIFICACIÓN → RE-ANÁLISIS → RECOMMENDATIONS
```

## Git Rules

### CRITICAL: NUNCA usar `--no-verify`
- **El usuario lo prohibió explícitamente**
- Si GGA hook tarda mucho, esperar a que termine
- Si hay problemas con el hook, investigar y solucionar - NO saltearlo
- Esto es una regla fija, sin excepciones
