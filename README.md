# FYP Retail System Monorepo

Monorepo này chứa mã nguồn cho FYP Retail System với trọng tâm hiện tại nằm ở backend retail API. Tài liệu được tổ chức theo hướng docs-as-code:

- tài liệu hệ thống và cross-cutting nằm ở root `docs/`
- tài liệu chi tiết của từng module nằm cạnh module sở hữu nó trong `apps/backend/src/modules/*/docs/`

## Project Overview

Hiện tại repo có 2 app:

- `apps/backend`: phần nghiệp vụ chính, dùng `Express + MongoDB`
- `apps/frontend`: `Vue 3 + Vite`, hiện vẫn ở mức scaffold cơ bản

Nếu bạn mới vào dự án và muốn hiểu sản phẩm thực tế, nên bắt đầu từ backend.

## Repository Structure

```text
.
├── README.md
├── docs/
├── apps/
│   ├── backend/
│   └── frontend/
├── docker-compose.yml
├── docker-compose.test.yml
└── pnpm-workspace.yaml
```

## Applications

### Backend

Đường dẫn: `apps/backend`

Backend được tổ chức theo domain modules:

- `account`
- `auth`
- `catalog`
- `cart`
- `inventory`
- `ordering`
- `payment`

### Frontend

Đường dẫn: `apps/frontend`

Frontend hiện vẫn là scaffold Vite/Vue mặc định. Nó chưa phản ánh đầy đủ storefront hoặc admin app.

## Backend Modules

| Module | Base path | Docs |
| --- | --- | --- |
| `account` | internal only | [account/docs](./apps/backend/src/modules/account/docs/README.md) |
| `auth` | `/auth` | [auth/docs](./apps/backend/src/modules/auth/docs/README.md) |
| `catalog` | `/catalog`, `/admin/catalog` | [catalog/docs](./apps/backend/src/modules/catalog/docs/README.md) |
| `cart` | `/cart` | [cart/docs](./apps/backend/src/modules/cart/docs/README.md) |
| `inventory` | `/inventory`, `/admin/inventory` | [inventory/docs](./apps/backend/src/modules/inventory/docs/README.md) |
| `ordering` | `/orders`, `/admin/orders` | [ordering/docs](./apps/backend/src/modules/ordering/docs/README.md) |
| `payment` | `/payments`, `/payment` | [payment/docs](./apps/backend/src/modules/payment/docs/README.md) |

## Documentation Map

### Root / Shared Documentation

- [docs/README.md](./docs/README.md)
- [docs/project-overview.md](./docs/project-overview.md)
- [docs/architecture/system-design.md](./docs/architecture/system-design.md)
- [docs/architecture/module-boundaries.md](./docs/architecture/module-boundaries.md)
- [docs/api/overview.md](./docs/api/overview.md)

### Module Documentation

- [catalog](./apps/backend/src/modules/catalog/docs/README.md)
- [auth](./apps/backend/src/modules/auth/docs/README.md)
- [cart](./apps/backend/src/modules/cart/docs/README.md)
- [inventory](./apps/backend/src/modules/inventory/docs/README.md)
- [ordering](./apps/backend/src/modules/ordering/docs/README.md)
- [payment](./apps/backend/src/modules/payment/docs/README.md)
- [account](./apps/backend/src/modules/account/docs/README.md)

## Local Development

Chạy local bằng Docker Compose:

```bash
docker compose up -d mongo backend frontend
```

Docker Compose sẽ đọc biến môi trường từ:

- `apps/backend/.env.dev`
- `apps/frontend/.env.dev`

URL mặc định:

- backend: `http://localhost:3000`
- frontend: `http://localhost:5173`

## Testing

Chạy test backend:

```bash
docker compose exec backend pnpm --filter @apps/backend test
```

## Environment Notes

Một số biến môi trường backend quan trọng:

- `MONGODB_URI`
- `AUTH_JWT_SECRET` hoặc `JWT_SECRET`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_SERVICE_ACCOUNT_PATH`
- bộ biến `VNP_*` cho VNPAY

Chi tiết hơn xem:

- [docs/project-overview.md](./docs/project-overview.md)
- [payment/docs/api.md](./apps/backend/src/modules/payment/docs/api.md)
