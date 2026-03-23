# System Design

## Runtime Topology

Khi chạy bằng Docker Compose, hệ thống hiện tại gồm 3 service:

- `mongo`
- `backend`
- `frontend`

URL local mặc định:

- backend: `http://localhost:3000`
- frontend: `http://localhost:5173`
- mongo: `mongodb://localhost:27017`

## Backend Bootstrap

Luồng backend hiện tại:

1. load environment qua `dotenv/config`
2. connect MongoDB
3. initialize Firebase Storage nếu có bucket config
4. mount `express.json()` và `cookie-parser()`
5. register modules
6. mount global error handler

## Main Architectural Style

Backend đang theo hướng module-per-domain, với mỗi module thường có các lớp:

- `adapters/`
- `constants/`
- `http/`
- `models/`
- `services/`
- `validation/`
- `tests/`

Một số module còn có:

- `seeds/`
- `utils/`
- `docs/`

## Key Cross-Module Flows

### Storefront discovery

- `catalog` đọc product/variant/reference
- `catalog` hydrate stock live qua `inventory`

### Cart flow

- `cart` resolve owner từ auth context hoặc guest cookie
- `cart` phụ thuộc `catalog` và `inventory`

### Order flow

- `ordering` orchestration giữa `cart`, `catalog`, `inventory`, `payment`

### Payment flow

- order được tạo trước
- `payment` tạo VNPAY URL
- callback VNPAY update payment/order và có thể commit stock

### Inventory sync flow

- admin write inventory
- `inventory` sync availability ngược sang `catalog`

## Storage and External Systems

### MongoDB

MongoDB là persistence chính cho các domain modules.

### Firebase Storage

Storage hiện được dùng cho catalog variant image upload và là optional dependency.

### VNPAY

VNPAY là external payment gateway hiện đang được tích hợp.
