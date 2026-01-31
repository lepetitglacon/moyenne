FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY package*.json ./

# Install backend dependencies (production only)
RUN npm ci --only=production

# Copy backend source code
COPY . .

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "index.js"]