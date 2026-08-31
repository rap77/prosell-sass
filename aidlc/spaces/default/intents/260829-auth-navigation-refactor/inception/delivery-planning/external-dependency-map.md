# External Dependency Map

Vacío — este intent está completamente contenido en el trabajo de IA/equipo interno, sin
dependencias externas que puedan bloquear el único Bolt.

- **APIs externas**: el endpoint de OAuth authorize del backend (`${NEXT_PUBLIC_API_URL}/api/auth/oauth/{provider}/authorize`)
  ya existe y no cambia en este intent — no es una dependencia nueva ni gateada.
- **Disponibilidad de datos**: no aplica.
- **Aprobaciones externas**: ninguna — el gate manual de producción (afirmado como permanente en
  Practices Discovery) es interno al equipo, no un hand-off externo.
- **Hand-offs de otro equipo**: ninguno — equipo de una sola persona, sin coordinación cross-team.

Los gaps de seguridad de pipeline (sin SAST real, sin DAST, secret-scanning liviano, Dependabot sin
cobertura de deps de la app) fueron registrados en Practices Discovery como aceptados y no
bloqueantes — no gatean este Bolt.
