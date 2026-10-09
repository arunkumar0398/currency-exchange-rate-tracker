FROM node:22-alpine AS test

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/server.js backend/fetcher.js backend/resolver.js backend/cache.js ./
COPY backend/test ./test
RUN npm test

FROM node:22-alpine AS runtime

WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=test /app/server.js /app/fetcher.js /app/resolver.js /app/cache.js ./

ENV PORT=3001
CMD ["node", "server.js"]
