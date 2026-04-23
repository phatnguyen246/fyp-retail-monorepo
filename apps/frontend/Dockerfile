FROM node:24-bookworm-slim

WORKDIR /app

RUN corepack enable

# Copy the same workspace files that were previously mounted by docker compose.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/location-client/package.json packages/location-client/package.json

RUN pnpm install --filter @apps/frontend --frozen-lockfile

COPY apps/frontend apps/frontend
COPY packages/location-client packages/location-client

EXPOSE 5173

CMD ["pnpm", "--filter", "@apps/frontend", "exec", "vite", "--host", "0.0.0.0", "--port", "5173"]
