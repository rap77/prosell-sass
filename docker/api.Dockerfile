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

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy source code
COPY apps/api/src ./src

# Copy scripts and keys
COPY scripts ./scripts
COPY apps/api/keys ./keys

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src

EXPOSE 8000

# Create entrypoint script
RUN echo '#!/bin/sh\n\
set -e\n\
# Run database initialization if tables dont exist\n\
python /app/scripts/init-db.py || echo "DB init may have failed or already initialized"\n\
# Start the application\n\
exec "$@"\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "prosell.infrastructure.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
