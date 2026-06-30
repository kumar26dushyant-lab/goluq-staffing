# GoLuQ — single container: builds the SPA + the Node server, serves both.
# Runs on your Oracle VM next to Sarathi/Nidaan (Evolution reachable on localhost).
FROM node:20-bookworm-slim

# Build tools for better-sqlite3 native module
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm run build:server

ENV HOST=0.0.0.0
ENV PORT=8090
EXPOSE 8090

CMD ["node", "server-dist/index.mjs"]
