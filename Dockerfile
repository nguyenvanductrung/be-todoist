# ═══════════════════════════════════════════════════════════════════
# Todoist Clone — Backend (multi-stage build)
# Stage 1: Build TypeScript + Generate Prisma Client
# Stage 2: Production runtime
# ═══════════════════════════════════════════════════════════════════

# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema + config and generate client
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy source and build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy Prisma schema + config (needed for migrations at runtime)
COPY prisma ./prisma
COPY prisma.config.ts ./

# Copy generated Prisma client from build stage
COPY --from=build /app/generated ./generated

# Copy compiled JavaScript from build stage
COPY --from=build /app/dist ./dist

# Expose the API port
EXPOSE 3001

# Run database migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
