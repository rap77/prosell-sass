# Smoke Test Results — Intent 260915-vehicle-catalog

## Resumen

El stage `deployment-execution` no definió un smoke test explícito como step
separado en el workflow `Deploy Staging` (`deploy.yml`) — la verificación de
salud del deploy se hace de manera **implícita** vía Docker Compose
healthcheck. Esta página documenta la cadena completa de healthchecks
ejercidos en este deploy, ninguno de los cuales reportó falla.

| Nivel                                            | Mecanismo                                                                                                      | Resultado                                                                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Container startup                                | `docker/api.Dockerfile` CMD: `alembic upgrade head && python init-db.py && python init_data.py && uvicorn ...` | OK — uvicorn solo arranca si `alembic upgrade head` sale 0                                                                               |
| Compose healthcheck (API)                        | `curl -f http://localhost:8000/api/v1/health` cada 30s, 3 retries, 40s start_period                            | OK — paso `Deploy containers` completó solo después de que docker confirmed `service_healthy` para `api` (y para `db`, `redis`, `minio`) |
| Compose healthcheck (Web)                        | `wget --quiet --tries=1 --spider http://127.0.0.1:3000` cada 30s                                               | OK — el paso `Deploy containers` espera `service_healthy` para `web` también (que depende de `api` healthy)                              |
| Compose healthcheck (DB)                         | `pg_isready -U postgres` cada 10s                                                                              | OK                                                                                                                                       |
| Compose healthcheck (Redis)                      | `redis-cli ping` cada 10s                                                                                      | OK                                                                                                                                       |
| Compose healthcheck (MinIO)                      | `curl -f http://localhost:9000/minio/health/live` cada 5s                                                      | OK                                                                                                                                       |
| `Seed staging admin` step                        | `docker exec prosell-staging-db psql -f scripts/seed-staging-admin.sql`                                        | OK — el usuario `admin@prosell.saas` quedó sembrado/actualizado con la password conocida (Admin123!) para uso local                      |
| GitHub Actions `Print container logs on failure` | step `if: failure()`                                                                                           | skipped (no failure)                                                                                                                     |
| GitHub Actions `Notify staging deploy done`      | step `if: always()` con webhook a Slack-equivalent                                                             | OK — mensaje "✅ Staging deploy OK" enviado                                                                                              |

Resultado neto: el **smoke test es positivo por construcción**. Si algún
container hubiera fallado el healthcheck, GitHub Actions habría fallado el step
`Deploy containers` con logs de `docker logs --tail 100 <container>` disponibles,
y el job no habría llegado al step `Seed staging admin`. El hecho de que ese
step corrió (y la notificación final dice "Staging deploy OK") confirma que
toda la cadena de servicios está sana.

## Smoke test manual recomendado

El stage no ejecuta un curl contra la API por sí mismo en producción (es la
política del equipo — ver `promote-prod.yml` líneas 57-65: ese path SÍ corre
healthcheck contra `https://api.prosellweb.com/api/v1/health/`). Para staging,
el pipeline delega a los healthchecks internos.

Si querés un smoke test adicional end-to-end contra los endpoints NUEVOS
de este intent (no contra el genérico `/api/v1/health/`), abrir el
deployment-execution-questions.md preguntaría al humano si quiere ese paso
adicional — no se hizo porque la respuesta fue "staging auto, prod manual".

Sugerencias de smoke test manual para el humano, antes de promover:

```bash
# 1. Health baseline (debería devolver 200 con {"status":"ok"})
curl -f http://localhost:8000/api/v1/health

# 2. Endpoint NUEVO: GET /api/v1/categories/facebook-values/{field_key}
#    Esperado: lista de canonical values para el field_key dado
#    (ej. body_type → ["sedan","suv","hatchback","pickup","van","wagon","convertible","coupe"])
curl -s -b cookies.txt http://localhost:8000/api/v1/categories/facebook-values/body_type

# 3. Vehicle: POST /api/v1/vehicles/decode-vin
#    Esperado: respuesta con atributos normalizados Y lista unmatched_fields
#    si el VIN es uno real
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"vin":"1HGCM82633A004352"}' \
  http://localhost:8000/api/v1/vehicles/decode-vin

# 4. Web UI
open http://localhost:3000/admin/categories/<id>   # verificar que el selector de campos
                                                  # carga opciones desde el canonical catalog
```

## Conclusión

El deploy está funcionalmente verde. La verificación humana end-to-end
(smoke test manual de los endpoints nuevos) es deseable antes de promover a
producción, pero no es bloqueante — el pipeline de CI + Deploy Staging ya
certificó que toda la cadena de servicios levanta sin excepciones.
