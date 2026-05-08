# Development stage - For hot-reload development
FROM node:22-alpine AS dev

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable pnpm

# Install pnpm globally if not available
RUN npm install -g pnpm

# Build argument for API URL
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
# Copy patches so pnpm can apply patchedDependencies
COPY patches ./patches

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web

# Expose port
EXPOSE 3000

# Environment variables for development
ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Default command for development (will be overridden in docker-compose)
CMD ["pnpm", "--filter", "@prosell/web", "dev"]
