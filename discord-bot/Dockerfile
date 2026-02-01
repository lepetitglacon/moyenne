FROM node:20-alpine AS builder

# better-sqlite3 nécessite des outils de compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ---

FROM node:20-alpine

# Dépendances runtime pour better-sqlite3
RUN apk add --no-cache libstdc++

WORKDIR /app

# Copie node_modules compilés
COPY --from=builder /app/node_modules ./node_modules

# Copie du code source
COPY . .

# Crée dossier data et user non-root
RUN mkdir -p /app/data && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV DB_PATH=/app/data/bot.sqlite

CMD ["node", "index.js"]
