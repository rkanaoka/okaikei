FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
# Docker define a env var HOSTNAME automaticamente com o ID do container, e o
# server.js standalone do Next usa HOSTNAME como endereço de bind — sem isto,
# ele escuta só no IP da bridge do container, nunca em 127.0.0.1 (quebra o
# healthcheck e qualquer `docker exec ... wget 127.0.0.1`).
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
