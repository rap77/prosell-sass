# =============================================================================
# web.prod.Dockerfile — ProSell Web (Next.js production, standalone output)
# Multi-stage: builder compiles, runner is minimal (no node_modules needed)
# =============================================================================

# ---- Builder ----------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable pnpm

ARG NEXT_PUBLIC_API_URL=https://api.prosellweb.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY patches ./patches

RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web

# Limit Node.js memory to prevent OOM during build
# Turbopack can consume excessive memory; cap it to leave room for the OS
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN pnpm --filter @prosell/web build

# ---- Runner -----------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Standalone output includes all needed dependencies bundled
COPY --from=builder /app/apps/web/.next/standalone ./
# Static assets must be placed where the standalone server expects them
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
