# Dockerfile for Streaming Platform backend
# Multi-stage build: install deps, then ship slim runtime image.
# CloudRun deploys from this Dockerfile directly via `mcp__cloudbase-mcp__manageCloudRun`.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts || npm install --omit=dev --ignore-scripts

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# CloudRun HTTP functions listen on $PORT (default 3000). The backend already reads PORT.
EXPOSE 3000
CMD ["node", "src/index.js"]
