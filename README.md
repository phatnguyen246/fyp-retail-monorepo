# FYP Retail Monorepo

This monorepo contains the source code for the FYP Retail System.
Documentation follows a docs-as-code structure:

- System-level and cross-cutting documents live in `docs/`
- Module-specific implementation and API docs live beside each module in `apps/backend/src/modules/*/docs/`

## Applications

The repository currently includes two apps:

- `apps/backend`: primary business domain APIs (`Express + MongoDB`)
- `apps/frontend`: `Vue 3 + Vite` storefront/admin client

## Quick Start

## Prerequisites
- Docker and Docker Compose
- Node.js + pnpm (optional if you run only inside containers)

## Run with Docker Compose
```bash
docker compose up -d
```

Docker Compose loads environment variables from configured `.env` files in this repository.

## Default URLs
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

## Testing

Run backend tests:
```bash
docker compose exec backend pnpm test
```

Run frontend tests:
```bash
docker compose exec frontend pnpm test
```

Run Playwright e2e tests:
```bash
docker compose run --rm frontend pnpm test:e2e
```

## Important Backend Environment Variables
- `AUTH_JWT_SECRET` (or `JWT_SECRET`)
- MongoDB connection variables
- VNPAY variables with `VNP_*` prefix

See module docs and `docs/` for detailed architecture and API navigation.
