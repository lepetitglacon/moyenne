# --- Stage 1: Build Frontend ---
FROM node:20-alpine as frontend-builder

WORKDIR /app

# Copy frontend package files
COPY package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source code (sans server/)
COPY public ./public
COPY src ./src
COPY index.html ./
COPY vite.config.* ./
COPY tsconfig.* ./

# Build the frontend (outputs to /app/dist)
RUN npm run build

# --- Stage 2: Serve with nginx ---
FROM nginx:alpine

# Copy built files to nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]