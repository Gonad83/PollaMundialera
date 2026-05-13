# mundial2026-backend/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ─── Instalar dependencias ────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# ─── Generar Prisma client ────────────────────────────────────────────────────
FROM base AS prisma
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

# ─── Imagen final ─────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

# Copiar dependencias y cliente Prisma
COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma

# Copiar código fuente
COPY src ./src
COPY prisma ./prisma
COPY package*.json ./

# Script de arranque: migraciones + seed + servidor
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001
CMD ["./docker-entrypoint.sh"]
