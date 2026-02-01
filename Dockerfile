FROM node:18-alpine

WORKDIR /app

# Copy package files first (layer cache — only reinstalls if these change)
COPY backend/package.json ./package.json
COPY backend/package-lock.json ./package-lock.json

# Install production dependencies
RUN npm install --production

# Copy application source
COPY backend/server.js ./server.js
COPY backend/fetcher.js ./fetcher.js
COPY backend/resolver.js ./resolver.js
COPY backend/cache.js ./cache.js

# Railway injects PORT at runtime — default 3001 for local dev
ENV PORT=3001

# Shell form (not exec form) so $PORT expands at runtime
CMD node server.js