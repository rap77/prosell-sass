# Monitoring Design — U2 (`u2-vehicle-catalog-ui`)

Implementa `nfr-design/security-design.md` (manejo de errores) con el stack de monitoreo ya vigente del frontend — sin herramienta nueva.

## Metrics & KPIs

Sin métrica nueva — este Unit no introduce un SLI/SLO propio distinto del ya vigente para el frontend.

## Alerts

Sin alerta automatizada nueva.

## SLIs / SLOs

Sin SLI/SLO nuevo.

## Logs & Tracing

Un fallo de red en cualquiera de los 3 flujos se maneja con `extractErrorMessage()` + toast (NFR4.2/NFR4.3) — sin logging estructurado adicional del lado del cliente más allá de lo que la plataforma de monitoreo de frontend ya vigente captura (errores no manejados, si los hubiera).
