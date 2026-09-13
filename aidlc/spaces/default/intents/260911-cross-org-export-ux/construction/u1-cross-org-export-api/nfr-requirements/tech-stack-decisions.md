# Tech Stack Decisions — u1-cross-org-export-api

`technology-stack.md` (codekb, scan enfocado `260911-cross-org-export-ux`)
ya confirma que **no se requiere ninguna dependencia nueva** para este
Unit — esta sección documenta las herramientas ya instaladas que se
usan (extendiendo la selección ya afirmada en `260903-catalog-client-export`)
y las dos decisiones internas nuevas de esta pasada.

## Selecciones (heredadas de 260903, sin cambio)

| Categoría                        | Tecnología                                                             | Ya instalada               | Justificación                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Serialización CSV                | `csv` (stdlib Python)                                                  | Sí                         | Sin cambio respecto a `260903`.                                                                                         |
| Armado de ZIP                    | `zipfile` (stdlib Python)                                              | Sí                         | Sin cambio.                                                                                                             |
| Lectura de imágenes ya subidas   | `boto3` (vía `IDOSpacesService.get_object()`, ya agregado en `260903`) | Sí (`>=1.35.0`)            | Sin cambio — el puerto ya existe, este intent no lo modifica.                                                           |
| Framework web / routing          | FastAPI                                                                | Sí (`[standard]==0.128.0`) | Endpoint existente extendido con `all_organizations`/`base_folder`/`facebook_groups_fallback`, sin cambio de framework. |
| Validación de errores tipados    | Pydantic + jerarquía `ProductError`                                    | Sí (`==2.12.5`)            | Sin cambio.                                                                                                             |
| Resolución de vertical/categoría | SQLAlchemy 2.0 async (`CategoryRepository.get_by_id_cross_tenant()`)   | Sí                         | Reutiliza el repositorio ya existente para el walk-up jerárquico (BR1.3) — sin ORM ni query builder nuevo.              |

## Decisiones nuevas de esta etapa

### `CategoryTranslationEntry` como diccionario estático en código (no tabla de BD)

Consistente con `entities.md` ("configuración estática... sin
interfaz de administración") y con la Assumption de `requirements.md`
("estructura simple, sin interfaz de admin nueva"): se implementa como
un diccionario/constante Python en el dominio (indexado por
`vertical_category_id`), NO como una tabla SQLAlchemy nueva ni una
migración Alembic nueva. Razones:

- Sin ciclo de vida de negocio propio (no se crea/edita/elimina desde
  UI) — no justifica el costo de un modelo + repositorio + migración
  nuevos para una única entrada confirmada hoy (vertical "Vehículos y
  Transporte").
- Sobre-ingeniería evitada: si en el futuro la tabla de traducción
  necesita gestión dinámica (múltiples verticales, edición sin
  redeploy), esa es una decisión de un intent futuro con su propia
  justificación — no de este.

### Cache de resolución de vertical por request (no una tabla de cache persistente)

Un dict `{category_id_hoja: vertical_category_id}` construido en memoria
DENTRO del alcance de una sola request de export (no un cache
compartido entre requests, no Redis) — evita repetir el walk-up
jerárquico (BR1.3) cuando varios productos del mismo lote comparten
`category_id` o vertical. Mismo criterio de simplicidad ya aplicado al
patrón de batch de `org_code` (BR2.3): resolver una vez, reusar dentro
del loop, sin persistir el resultado más allá de la request.

## Descartado explícitamente

- **Tabla de BD nueva para `CategoryTranslationEntry`**: evaluada y
  descartada — ver decisión arriba.
- **Cache compartido/persistente (Redis) para la resolución de
  vertical**: evaluado y descartado — el volumen (≤500 productos,
  categorías con profundidad acotada) no justifica infraestructura de
  cache compartida; un dict por-request alcanza.
- **`httpx` directo contra `image_urls` públicas**: ya descartado en
  `260903` a favor de `get_object()` — sin cambio en este intent.
- **Librería de terceros para CSV/ZIP**: sin justificación — sin
  cambio respecto a `260903`.

## Sin cambios de infraestructura

Sin necesidad de Redis/Taskiq (operación síncrona, sin tarea en
background) ni de ningún componente de infraestructura nuevo — el
endpoint sigue viviendo enteramente dentro del servicio FastAPI ya
desplegado, en ambos modos (puntual y "todas").
