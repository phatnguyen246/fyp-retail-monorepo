FROM node:24-bookworm-slim

WORKDIR /app

RUN corepack enable

# Copy the same workspace files that were previously mounted by docker compose.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN pnpm install --filter @apps/backend --frozen-lockfile

COPY apps/backend apps/backend

EXPOSE 3000

CMD ["pnpm", "--filter", "@apps/backend", "dev"]
