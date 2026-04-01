FROM node:24-bookworm-slim

WORKDIR /app

RUN corepack enable

# Copy the same workspace files that were previously mounted by docker compose.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/frontend apps/frontend

RUN pnpm install --filter @apps/frontend --frozen-lockfile

EXPOSE 5173

CMD ["pnpm", "--filter", "@apps/frontend", "exec", "vite", "--host", "0.0.0.0", "--port", "5173"]
