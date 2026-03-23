# API Overview

Tài liệu này là bản đồ API ở mức cross-module. Chi tiết request/response/business rules nằm trong docs của từng module.

## Route Groups

### Public / customer-facing

- `/auth`
- `/catalog`
- `/cart`
- `/inventory`
- `/orders`
- `/payments`
- `/payment` cho VNPAY callbacks

### Admin

- `/admin/catalog`
- `/admin/inventory`
- `/admin/orders`

## Module API Docs

- [auth/api.md](../../apps/backend/src/modules/auth/docs/api.md)
- [catalog/api.md](../../apps/backend/src/modules/catalog/docs/api.md)
- [cart/api.md](../../apps/backend/src/modules/cart/docs/api.md)
- [inventory/api.md](../../apps/backend/src/modules/inventory/docs/api.md)
- [ordering/api.md](../../apps/backend/src/modules/ordering/docs/api.md)
- [payment/api.md](../../apps/backend/src/modules/payment/docs/api.md)

## Health Endpoints

- `/auth/health`
- `/catalog/health`
- `/cart/health`
- `/inventory/health`
- `/orders/health`
- `/order/health`
- `/payments/health`

## Notes

- `account` không có public HTTP API riêng; đây là internal module
- route admin phụ thuộc auth middleware `requireAdmin`
- nhiều module public vẫn được chạy sau `optionalAuth`, nên request context auth có thể hiện diện ngay cả ở public route
