FROM node:20-alpine

# better-sqlite3 nécessite des outils de compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm ci --only=production

# Copie du code source
COPY . .

# Crée le dossier pour la base de données
RUN mkdir -p /app/data

# Variables d'environnement par défaut
ENV NODE_ENV=production

# Commande de démarrage
CMD ["node", "index.js"]
