# SuperClaude Framework - Cheatsheet Completo

> **Meta-programming configuration framework** que transforma Claude Code en una plataforma de desarrollo estructurada.
> Versión: 4.1.9+ | 30 comandos | 16 agentes especializados | 7 modos comportamentales | 8 servidores MCP

---

## 📊 Resumen Ejecutivo

| Componente         | Cantidad | Propósito                                             |
| ------------------ | -------- | ----------------------------------------------------- |
| **Slash Commands** | 30       | Cubren el ciclo de vida completo del desarrollo       |
| **Agents**         | 16       | Especialistas de dominio que se activan por contexto  |
| **Modes**          | 7        | Comportamientos adaptativos según complejidad         |
| **MCP Servers**    | 8        | Herramientas especializadas (docs, testing, UI, etc.) |

---

## 🚀 Instalación Rápida

```bash
# Opción 1: pipx (recomendado)
pipx install superclaude
superclaude install              # Instala los 30 comandos

# Opción 2: Desde Git
git clone https://github.com/SuperClaude-Org/SuperClaude_Framework.git
cd SuperClaude_Framework
./install.sh

# MCP Servers opcionales (2-3x más rápido, 30-50% menos tokens)
superclaude mcp --list           # Listar servidores disponibles
superclaude mcp                  # Instalación interactiva
```

---

## 📋 Comandos Esenciales (Quick Reference)

### 🧠 Planificación y Diseño (4)

| Comando          | Propósito                                  | Cuándo Usar                                         |
| ---------------- | ------------------------------------------ | --------------------------------------------------- |
| `/sc:brainstorm` | Descubrimiento interactivo de requisitos   | Requisitos vagos, ideas sin definir                 |
| `/sc:design`     | Arquitectura de sistemas                   | Diseñar APIs, microservicios, sistemas distribuidos |
| `/sc:estimate`   | Estimación de esfuerzo/tiempo              | Planificación de sprints, evaluación de tareas      |
| `/sc:spec-panel` | Análisis multi-experto de especificaciones | Revisión técnica profunda de PRDs                   |

### 💻 Desarrollo (5)

| Comando         | Propósito                                      | Cuándo Usar                                  |
| --------------- | ---------------------------------------------- | -------------------------------------------- |
| `/sc:implement` | Implementación de código con mejores prácticas | Nuevas características, features             |
| `/sc:build`     | Workflows de compilación                       | Compilar, empaquetar proyectos               |
| `/sc:improve`   | Mejoras sistemáticas de código                 | Refactorización, optimización                |
| `/sc:cleanup`   | Limpieza de código técnico                     | Eliminar código muerto, optimizar estructura |
| `/sc:explain`   | Explicación de código                          | Entender código complejo, documentación      |

### 🧪 Testing y Calidad (4)

| Comando            | Propósito                         | Cuándo Usar                    |
| ------------------ | --------------------------------- | ------------------------------ |
| `/sc:test`         | Generación y ejecución de tests   | Suites de prueba, cobertura    |
| `/sc:analyze`      | Análisis de código y arquitectura | Code reviews, auditorías       |
| `/sc:troubleshoot` | Debugging sistemático             | Bugs, problemas complejos      |
| `/sc:reflect`      | Retrospectivas y análisis         | Post-mortem, mejoras continuas |

### 📊 Gestión de Proyectos (3)

| Comando        | Propósito                   | Cuándo Usar                      |
| -------------- | --------------------------- | -------------------------------- |
| `/sc:pm`       | Project management          | Coordinación de tareas, roadmap  |
| `/sc:task`     | Tracking de tareas          | Gestión de TODOs, dependencias   |
| `/sc:workflow` | Automatización de workflows | Automatizar procesos repetitivos |

### 🔍 Investigación y Análisis (2)

| Comando              | Propósito                         | Cuándo Usar                                  |
| -------------------- | --------------------------------- | -------------------------------------------- |
| `/sc:research`       | Investigación web profunda        | Documentation, tendencias, mejores prácticas |
| `/sc:business-panel` | Análisis multi-experto de negocio | Análisis estratégico, viabilidad             |

### 🎯 Utilidades Clave (9)

| Comando           | Propósito                             | Cuándo Usar                            |
| ----------------- | ------------------------------------- | -------------------------------------- |
| `/sc:agent`       | Ejecutar agentes especializados       | Activar experticia específica          |
| `/sc:index-repo`  | Indexar repositorio                   | Optimizar contexto en código grandes   |
| `/sc:recommend`   | Recomendar comandos                   | No sé qué comando usar                 |
| `/sc:spawn`       | Tareas paralelas                      | Operaciones independientes simultáneas |
| `/sc:load`        | Cargar sesión guardada                | Retomar trabajo anterior               |
| `/sc:save`        | Guardar sesión actual                 | Persistir progreso                     |
| `/sc:sc`          | Mostrar todos los comandos            | Ayuda general                          |
| `/sc:select-tool` | Selección inteligente de herramientas | Decidir qué herramienta usar           |
| `/sc:git`         | Operaciones Git optimizadas           | Commits, branches, PRs                 |

---

## 🤖 Agents - Especialistas de Dominio

### Meta-Layer

| Agent        | Expertise                           | Auto-Activación                           |
| ------------ | ----------------------------------- | ----------------------------------------- |
| **pm-agent** | Auto-mejora continua, documentación | Post-implementación, detección de errores |

### Arquitectura y Diseño

| Agent                  | Expertise                             | Keywords Trigger                                     |
| ---------------------- | ------------------------------------- | ---------------------------------------------------- |
| **system-architect**   | Sistemas distribuidos, microservicios | "architecture", "microservices", "scalability"       |
| **backend-architect**  | APIs robustas, data integrity         | "API", "backend", "database", "REST", "GraphQL"      |
| **frontend-architect** | UI/UX, accesibilidad, componentes     | "UI", "frontend", "React", "component", "responsive" |
| **devops-architect**   | CI/CD, infraestructura, deployment    | "deploy", "CI/CD", "Docker", "Kubernetes"            |

### Calidad y Análisis

| Agent                    | Expertise                        | Keywords Trigger                                |
| ------------------------ | -------------------------------- | ----------------------------------------------- |
| **security-engineer**    | Seguridad, threat modeling       | "security", "auth", "vulnerability", "OWASP"    |
| **performance-engineer** | Optimización, escalabilidad      | "slow", "optimization", "bottleneck", "latency" |
| **root-cause-analyst**   | Debugging sistemático            | "bug", "issue", "debugging", "troubleshoot"     |
| **quality-engineer**     | Testing, QA, automatización      | "test", "QA", "validation", "coverage"          |
| **refactoring-expert**   | Clean code, SOLID, deuda técnica | "refactor", "clean code", "technical debt"      |

### Desarrollo Especializado

| Agent                    | Expertise                          | Keywords Trigger                               |
| ------------------------ | ---------------------------------- | ---------------------------------------------- |
| **python-expert**        | Python moderno, FastAPI, asyncio   | ".py", "Django", "FastAPI", "asyncio"          |
| **requirements-analyst** | Descubrir y especificar requisitos | "requirements", "PRD", "user story"            |
| **deep-research-agent**  | Investigación adaptativa multi-hop | "research", "investigate", "latest", "current" |

### Comunicación y Aprendizaje

| Agent                | Expertise                         | Keywords Trigger                           |
| -------------------- | --------------------------------- | ------------------------------------------ |
| **technical-writer** | Documentación técnica             | "documentation", "readme", "API docs"      |
| **learning-guide**   | Educación, tutoriales progresivos | "explain", "learn", "tutorial", "teaching" |

### Formas de Uso

```bash
# Invocación manual con @agent-
@agent-security "review authentication implementation"
@agent-frontend "design responsive navigation"
@agent-architect "plan microservices migration"

# Auto-activación por comandos
/sc:implement "JWT authentication"  # → security-engineer auto-activa
/sc:design "React dashboard"         # → frontend-architect auto-activa
/sc:troubleshoot "memory leak"       # → performance-engineer auto-activa
```

---

## 🧠 Modes - Comportamientos Adaptativos

| Mode                    | Propósito                      | Auto-Triggers                                 | Comportamiento Clave                                |
| ----------------------- | ------------------------------ | --------------------------------------------- | --------------------------------------------------- |
| **🧠 Brainstorming**    | Descubrimiento interactivo     | "brainstorm", peticiones vagas                | Preguntas socráticas, elicición de requisitos       |
| **🔍 Introspection**    | Análisis meta-cognitivo        | Error recovery, "analyze reasoning"           | Marcadores de pensamiento transparente (🤔, 🎯, 💡) |
| **🔬 Deep Research**    | Investigación sistemática      | `/sc:research`, keywords investigación        | 6-fases workflow, reasoning basado en evidencia     |
| **📋 Task Management**  | Coordinación compleja          | >3 pasos, >2 directorios                      | Plan por fases, persistencia de sesión              |
| **🎯 Orchestration**    | Selección inteligente de tools | Multi-tool ops, alto consumo de recursos      | Routing óptimo, ejecución paralela                  |
| **⚡ Token Efficiency** | Comunicación comprimida        | Alto uso de contexto, `--uc`                  | Sistemas de símbolos, 30-50% reducción de tokens    |
| **🎨 Standard**         | Balance por defecto            | Tareas simples sin indicadores de complejidad | Comunicación profesional estándar                   |

### Control Manual de Modes

```bash
# Forzar comportamientos específicos
/sc:implement "feature" --brainstorm      # Descubrimiento colaborativo
/sc:analyze code/ --introspect            # Transparencia en razonamiento
/sc:implement "system" --task-manage      # Coordinación jerárquica
/sc:implement "app" --orchestrate         # Optimización de tools
/sc:analyze large-codebase/ --uc          # Modo ultra-comprimido
```

---

## 🔌 MCP Servers - Herramientas Especializadas

| Server                  | Propósito                                    | Triggers                      | API Key Requerida |
| ----------------------- | -------------------------------------------- | ----------------------------- | ----------------- |
| **context7**            | Documentación oficial de librerías           | Imports, framework keywords   | ❌ No             |
| **sequential-thinking** | Reasoning multi-paso                         | `--think`, debugging          | ❌ No             |
| **magic**               | Generación de componentes UI modernos        | "component", "UI", frontend   | ✅ Sí             |
| **playwright**          | Browser automation, E2E testing              | "test", "e2e", "browser"      | ❌ No             |
| **morphllm-fast-apply** | Transformaciones de código patrón            | Multi-file edits, refactoring | ✅ Sí             |
| **serena**              | Entendimiento semántico, memoria de proyecto | Symbol ops, proyectos grandes | ❌ No             |
| **tavily**              | Web search, información en tiempo real       | `/sc:research`, "latest"      | ✅ Sí (free tier) |
| **chrome-devtools**     | Performance analysis, debugging              | "performance", "debug", LCP   | ❌ No             |

### Configuración de API Keys

```bash
# Para Magic server (generación de UI)
export TWENTYFIRST_API_KEY="your_key_here"

# Para Morphllm server (transformaciones bulk)
export MORPH_API_KEY="your_key_here"

# Para Tavily server (web search - tier gratuito disponible)
export TAVILY_API_KEY="tvly-your_api_key_here"  # Obtener en https://app.tavily.com

# Agregar al shell profile para persistencia
echo 'export TAVILY_API_KEY="your_key"' >> ~/.bashrc
```

### Combinaciones de Servers Recomendadas

```
Sin API Keys (Gratis):
  context7 + sequential-thinking + playwright + serena

1 API Key:
  + magic para desarrollo UI profesional

2 API Keys:
  + morphllm-fast-apply para refactoring a gran escala

Workflows Comunes:
  Learning:        context7 + sequential-thinking
  Web Dev:         magic + context7 + playwright
  Enterprise Ref:  serena + morphllm + sequential-thinking
  Deep Research:   tavily + sequential-thinking + serena + playwright
```

---

## 🔄 Flujos de Trabajo Comunes

### 1. Nuevo Feature (Full-Stack)

```bash
# Paso 1: Descubrir requisitos
/sc:brainstorm "user authentication system"
# → Preguntas socráticas sobre necesidades

# Paso 2: Diseñar arquitectura
/sc:design "JWT auth with refresh tokens"
# → system-architect + backend-architect + security-engineer

# Paso 3: Implementar
/sc:implement "authentication API + frontend login"
# → backend-architect + frontend-architect + security-engineer

# Paso 4: Testear
/sc:test "auth flow with edge cases"
# → quality-engineer + security-engineer

# Paso 5: Documentar
/sc:document "authentication API with examples"
# → technical-writer
```

### 2. Debugging de Problema Complejo

```bash
# Análisis sistemático
/sc:troubleshoot "intermittent API failures in production"
# → root-cause-analyst + performance-engineer + devops-architect

# Con transparencia de razonamiento
/sc:troubleshoot "memory leak in worker" --introspect
# → Marcadores meta-cognitivos de pensamiento

# Con optimización de tools
/sc:troubleshoot "slow database queries" --orchestrate
# → Coordinación óptima de MCP servers
```

### 3. Refactoring de Código Legacy

```bash
# Análisis primero
/sc:analyze legacy-codebase/ --focus maintainability
# → refactoring-expert + system-architect

# Mejora sistemática
/sc:improve legacy-codebase/ --focus "SOLID patterns"
# → refactoring-expert + quality-engineer

# Con persistencia de sesión
/sc:load legacy-project/
/sc:improve "extract UserService" --task-manage
# → Plan multi-fase con checkpoints
```

### 4. Investigación Profunda

```bash
# Research técnico
/sc:research "latest React Server Components patterns 2024"
# → deep-research-agent + tavily + sequential-thinking

# Con estrategia específica
/sc:research "microservices patterns" --strategy unified
# → Colaboración en refinamiento de plan

# Con profundidad exhaustiva
/sc:research "quantum computing breakthroughs" --depth exhaustive
# → 40+ fuentes, 5 hops, análisis académico
```

### 5. Análisis de Seguridad

```bash
# Auditoría de seguridad
/sc:analyze payment-system/ --focus security
# → security-engineer + quality-engineer + root-cause-analyst

# Con revisión de OWASP
/sc:implement "PCI-DSS compliant payment processing"
# → security-engineer + backend-architect + technical-writer
```

---

## 🎯 Casos de Uso Prácticos

### Web Development

```bash
# Componente React con tests
/sc:implement "accessible dashboard component with dark mode"
# → frontend-architect + learning-guide + quality-engineer

# API REST completa
/sc:design "REST API for user management"
/sc:implement "user CRUD endpoints with pagination"
# → backend-architect + security-engineer + technical-writer
```

### Data Science

```bash
# Pipeline de datos
/sc:implement "ETL pipeline with pandas and error handling"
# → python-expert + performance-engineer

# Optimización de queries
/sc:troubleshoot "slow data aggregation"
# → performance-engineer + python-expert
```

### DevOps

```bash
# Pipeline CI/CD
/sc:design "GitOps workflow with automated testing"
# → devops-architect + quality-engineer + security-engineer

# Monitoring stack
/sc:implement "observability with metrics, logs, traces"
# → devops-architect + performance-engineer
```

### Legacy Modernization

```bash
# Análisis de deuda técnica
/sc:analyze monolith/ --focus "technical debt"
# → refactoring-expert + system-architect

# Migración a microservicios
/sc:design "microservices migration strategy"
/sc:implement "extract payment service"
# → system-architect + backend-architect + devops-architect
```

---

## 🚩 Flags y Opciones Importantes

### Flags de Análisis

```bash
--think              # Activar sequential-thinking
--think-hard         # Análisis profundo multi-paso
--ultrathink         # Máxima profundidad de análisis
```

### Flags de Modo

```bash
--brainstorm         # Forzar modo descubrimiento
--introspect         # Transparencia en razonamiento
--task-manage        # Coordinación jerárquica
--orchestrate        # Optimización de tools
--uc, --ultracompressed # Comprimir comunicación (30-50% tokens)
```

### Flags de MCP

```bash
--c7                 # Usar Context7
--serena             # Usar Serena
--seq                # Usar Sequential-thinking
--all-mcp            # Habilitar todos los MCP servers
--no-mcp             # Deshabilitar MCP servers
```

### Flags de Control

```bash
--focus [domain]     # Optimizar para dominio específico
--scope [level]      # Controlar alcance de análisis
--concurrency N      # Controlar concurrencia (1-15)
```

---

## ✅ Buenas Prácticas

### 1. Empezar Naturalmente

```bash
# ✅ Bien - lenguaje natural con palabras clave de dominio
"Implement secure JWT authentication with rate limiting"
# → security-engineer + backend-architect + quality-engineer

# ❌ Mal - demasiado genérico
"Fix login"
# → Puede no activar los agentes correctos
```

### 2. Specificidad > Genericidad

```bash
# ✅ Específico - activa especialistas correctos
"optimize slow database queries with proper indexing"
# → performance-engineer + backend-architect

# ❌ Genérico - activación ambigua
"make it faster"
```

### 3. Combinar Modos para Tareas Complejas

```bash
# Descubrimiento + Coordinación + Transparencia
/sc:brainstorm "microservices architecture" --task-manage --introspect

# Análisis + Eficiencia + Orquestación
/sc:analyze legacy/ --uc --orchestrate
```

### 4. Usar Palabras Clave de Calidad

```bash
# Incluir calidad automáticamente
"implement responsive dashboard with accessibility compliance"
# → frontend-architect + learning-guide + quality-engineer

"secure API with comprehensive documentation"
# → backend-architect + security-engineer + technical-writer
```

### 5. Session Management para Proyectos Largos

```bash
# Guardar progreso
/sc:save "authentication-implementation-phase1"

# Retomar después
/sc:load "authentication-implementation-phase1"
# El contexto se restaura automáticamente
```

---

## 🛠️ Troubleshooting Rápido

### Agentes No Se Activan

```bash
# Problema: No se activa security-engineer
"implement authentication"  # ← Genérico

# Solución: Usar keywords explícitos
"implement JWT authentication security"  # ← Específico
"secure user login with encryption"       # ← Enfoque en seguridad
```

### Modo Incorrecto

```bash
# Forzar modo específico
/sc:brainstorm "web app" --brainstorm

# Usar lenguaje de incertidumbre para brainstorming
"I have a vague idea about..."
"Maybe we could build..."
```

### Issues con MCP Servers

```bash
# Verificar Node.js versión
node --version  # Debe ser v16+

# Sin MCP para troubleshooting
/sc:command --no-mcp

# Verificar configuración
cat ~/.claude.json
```

### Reset de Estado

```bash
# Reiniciar sesión de Claude Code
# Resetea el estado de modes y agents

# Verificar instalación
superclaude install --list
superclaude doctor
```

---

## 📊 Niveles de Proficiencia

### 🌱 Básico (Semana 1-2)

- [ ] Instalación y configuración completada
- [ ] 5-10 comandos esenciales dominados
- [ ] Workflows simples independientes
- [ ] Flags básicos entendidos

### 🌿 Intermedio (Semana 3-6)

- [ ] Coordinación multi-agent
- [ ] Workflows de proyectos complejos
- [ ] Session management
- [ ] Flags avanzados combinados

### 🌲 Avanzado (Mes 2+)

- [ ] Integración con cualquier framework
- [ ] Optimización de performance
- [ ] Patrones de integración custom
- [ ] Contribución al framework

---

## 🔗 Recursos Adicionales

- **GitHub**: https://github.com/SuperClaude-Org/SuperClaude_Framework
- **Issues**: https://github.com/SuperClaude-Org/SuperClaude_Framework/issues
- **Docs Completas**: https://github.com/SuperClaude-Org/SuperClaude_Framework/tree/master/docs

---

## 📝 Resumen de Comandos Más Usados

```bash
# Top 10 Comandos Esenciales
/sc:implement "feature"          # Implementar con mejores prácticas
/sc:analyze "codebase/"          # Análisis completo
/sc:test "feature"               # Testing y validación
/sc:troubleshoot "issue"         # Debugging sistemático
/sc:brainstorm "idea"            # Descubrir requisitos
/sc:design "system"              # Arquitectura de sistemas
/sc:research "topic"             # Investigación profunda
/sc:explain "code"               # Explicación educativa
/sc:improve "code"               # Refactorización
/sc:pm                           # Project management

# Flags Útiles
--think                          # Análisis profundo
--uc                             # Ahorro de tokens
--orchestrate                    # Optimización de tools
--focus [domain]                 # Especializar por dominio
--introspect                     # Transparencia de razonamiento
```

---

> **Nota**: Este cheatsheet es un resumen ejecutivo. Para documentación completa, consultar los archivos originales en el repositorio de SuperClaude Framework.
