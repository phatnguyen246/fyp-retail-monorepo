FROM node:24-bookworm-slim

WORKDIR /app

RUN corepack enable

# Copy workspace manifests first to maximize dependency cache reuse.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["pnpm", "--filter", "@apps/backend", "dev"]
