# Technology Stack

## Backend

| Technology     | Version               | Role                                    |
| -------------- | --------------------- | --------------------------------------- |
| Python         | 3.13                  | API and domain implementation           |
| FastAPI        | 0.128.0               | Async HTTP API and dependency injection |
| SQLAlchemy     | >=2.0.36              | Async ORM                               |
| asyncpg        | configured dependency | PostgreSQL async driver                 |
| PostgreSQL     | 17                    | Primary data store                      |
| Redis          | 7.4                   | Queue/cache support                     |
| Taskiq         | configured dependency | Background tasks                        |
| Pillow         | >=12.0.0              | Server-side image processing            |
| boto3          | configured dependency | S3-compatible storage integration       |
| uv / Hatchling | configured            | Python environment and packaging        |

## Frontend

| Technology                | Version                                                   | Role                               |
| ------------------------- | --------------------------------------------------------- | ---------------------------------- |
| Next.js                   | ^16.3.3                                                   | App Router web application and BFF |
| React                     | ^19.2.8                                                   | UI runtime                         |
| TypeScript                | ^5.5.0                                                    | Strict frontend typing             |
| TanStack Query            | ^5.0.0                                                    | Server-state caching and requests  |
| Zustand                   | ^5.0.11                                                   | Client state                       |
| Tailwind CSS              | 3.4.17                                                    | Styling                            |
| browser-image-compression | ^2.0.2                                                    | Browser-side image processing      |
| Zod                       | ^4.4.0 installed; existing code style is Zod 3-compatible | Boundary validation                |

## Platform and Delivery

- pnpm workspace and Turborepo orchestrate JavaScript/TypeScript work.
- Docker Compose provides local services.
- MinIO is local S3-compatible storage; DigitalOcean Spaces is the deployed object store.
- GitHub Actions runs CI, E2E, deployments, recovery, Graphify, and React Doctor workflows.
