FROM node:24-bookworm-slim

WORKDIR /app

RUN corepack enable

# Copy workspace manifests first to maximize dependency cache reuse.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "--filter", "@apps/frontend", "exec", "vite", "--host", "0.0.0.0", "--port", "5173"]
