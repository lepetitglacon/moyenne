# Build context: root of monorepo
# docker build -f packages/discord-bot/Dockerfile -t moyenne-bot .

FROM node:20-alpine AS builder

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace config first (cache layer)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package.json files
COPY packages/discord-bot/package.json ./packages/discord-bot/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @moyenne/discord-bot

# Copy source code
COPY packages/discord-bot ./packages/discord-bot

# ---

FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Runtime deps for better-sqlite3
RUN apk add --no-cache libstdc++

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json ./

# Copy built node_modules and source
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/discord-bot ./packages/discord-bot

# Create data directory and non-root user
RUN mkdir -p /app/data && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

WORKDIR /app/packages/discord-bot

ENV NODE_ENV=production
ENV DB_PATH=/app/data/bot.sqlite

CMD ["node", "index.js"]
