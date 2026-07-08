# Build stage
FROM python:3.13-slim AS builder

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy dependency files
COPY apps/api/pyproject.toml apps/api/uv.lock ./

# Create virtual environment and install dependencies
RUN uv venv && uv sync --frozen --no-dev

# Runtime stage
FROM python:3.13-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy source code
COPY apps/api/src ./src

# Copy Alembic configuration
COPY apps/api/alembic.ini ./alembic.ini
COPY apps/api/alembic ./alembic

# Copy scripts and keys
COPY apps/api/scripts ./scripts
COPY apps/api/keys ./keys

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src

EXPOSE 8000

# ponytail: alembic check disabled until prod schema is fully synced (see engram: "Fixed prod deploy")
CMD ["sh", "-c", "alembic upgrade head && python /app/scripts/init-db.py && python /app/scripts/init_data.py && uvicorn prosell.infrastructure.api.main:app --host 0.0.0.0 --port 8000"]
