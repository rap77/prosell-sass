# Practices Discovery — Entrevista

Estas preguntas cubren solo lo que el borrador del lead y las tres revisiones independientes (quality, developer, devsecops) NO pudieron establecer con evidencia mecánica. Lo confirmado por evidencia dura (trunk-based dev, conventional commits, deploy-on-merge a staging + approval manual a prod, testing posture test-after) no se vuelve a preguntar acá.

## Q1 — Way of Working (estrategia de merge)

El historial de `main` es mixto: commits antiguos parecen merge commits tradicionales, pero el patrón reciente es compatible con squash-merge. ¿Cómo mergeamos las branches de feature a `main`?

A. Squash-merge — cada branch se aplasta a un solo commit en `main` (el default del framework)
B. Merge commit tradicional — se preserva el historial completo de la branch
C. Depende del tamaño del cambio (squash para chico, merge commit para grande)
X. Other (please specify)

[Answer]: A. Squash-merge

## Q2 — Walking Skeleton

¿Construimos primero una porción mínima que atraviese todo el sistema de punta a punta? Un "walking skeleton" es una versión mínima que corre el camino completo, construida primero para probar que las piezas conectan antes de meter las features reales.

A. Sí, siempre para trabajo greenfield significativo
B. No, no corremos esa ceremonia — vamos directo a las features
C. Depende del scope del cambio
X. Other (please specify)

[Answer]: B. No

## Q3 — Testing Posture (piso de cobertura)

Confirmado por evidencia: el equipo escribe tests después de implementar (test-after), no TDD estricto. Pero encontramos una asimetría: el frontend tiene un piso de cobertura configurado (bajado de 80% a 40/40/75/40 tras medir cobertura real) y el backend NO tiene ningún piso de cobertura declarado (ni en `pyproject.toml` ni en CI). ¿Cómo queremos dejarlo?

A. Aceptar la asimetría tal cual está (40% frontend, sin piso en backend) como práctica actual
B. Agregar un piso de cobertura al backend también (a definir el número más adelante)
C. Subir el piso del frontend de vuelta más cerca del 80% original
X. Other (please specify)

[Answer]: A. Aceptar tal cual

## Q4 — Testing Posture (gates de lint pre-commit vs CI)

El hook `next-lint` (ESLint completo) está deshabilitado en pre-commit y solo corre en CI; en cambio `react-doctor` SÍ bloquea en pre-commit pero es solo advisory en CI — direcciones opuestas a lo que uno esperaría. ¿Es así a propósito?

A. Sí, a propósito — ESLint completo es lento, se corre solo en CI; react-doctor es rápido y vale bloquear localmente
B. No, fue un descuido — debería alinearse (ambos bloqueantes localmente, o ambos solo en CI)
X. Other (please specify)

[Answer]: A. Sí, a propósito

## Q5 — Deployment (gate manual de producción)

El deploy a producción requiere un `workflow_dispatch` manual con el texto exacto `"deploy"`, pero es un equipo de una sola persona — no hay una segunda persona que apruebe. ¿Es una política permanente (gate manual como salvaguarda propia, aunque seas vos mismo quien lo dispara) o una adaptación temporal mientras el equipo es de una persona?

A. Permanente — el gate manual queda aunque el equipo crezca, es una salvaguarda intencional
B. Temporal — cuando haya más de una persona, el gate pasa a requerir aprobación de otra persona
X. Other (please specify)

[Answer]: A. Permanente

## Q6 — Code Style (patrón de error handling en frontend)

El backend tiene un patrón sólido y consistente de manejo de errores por dominio (`<Dominio>DomainException` + handler centralizado). El frontend, en el área de navegación auth que toca este intent, no replica ese patrón. ¿Debería adoptarse un patrón equivalente en el frontend como convención de equipo hacia adelante, o es fuera de alcance para esta práctica general (solo se resuelve puntualmente en este intent si aplica)?

A. Sí, adoptar un patrón equivalente de error handling en frontend como convención de equipo
B. No, fuera de alcance como práctica general — se evalúa caso por caso en cada intent
X. Other (please specify)

[Answer]: A. Sí, adoptar

## Q7 — Security (gaps de escaneo automatizado)

DevSecOps encontró gaps reales sin cubrir hoy: no hay SAST real (GGA es un revisor de estilo con IA, no un analizador de seguridad), no hay DAST pese a que se publica a staging en cada merge, el secret-scanning es un script liviano solo en pre-commit local (sin backstop en CI), y Dependabot solo cubre GitHub Actions — no hay escaneo de CVEs para las dependencias reales de la app (npm/pnpm, Python/uv). ¿Cómo tratamos estos gaps ahora?

A. Registrarlos como gaps conocidos y aceptados por ahora, sin bloquear el trabajo actual — se atienden en un intent de seguridad dedicado más adelante
B. Marcar alguno como bloqueante ya (especificar cuál en la respuesta)
X. Other (please specify)

[Answer]: A. Registrar como gap aceptado

## Consolidated Summary Confirmation

¿Está todo correcto antes de generar el artefacto final integrado (team-practices.md + discovered-rules.md)?

[Answer]: Looks correct
