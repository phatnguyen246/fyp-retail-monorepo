# Docs Index

Thư mục `docs/` chỉ chứa tài liệu ở mức repository hoặc system-level.

Các tài liệu chi tiết theo module đã được colocate vào:

- `apps/backend/src/modules/*/docs/`

Điều này giúp ownership rõ ràng hơn:

- tài liệu shared/cross-cutting ở root
- tài liệu implementation/business/API cụ thể ở ngay module sở hữu

## Đọc theo thứ tự nếu muốn hiểu toàn dự án

1. [../README.md](../README.md)
2. [project-overview.md](./project-overview.md)
3. [architecture/system-design.md](./architecture/system-design.md)
4. [architecture/module-boundaries.md](./architecture/module-boundaries.md)
5. [api/overview.md](./api/overview.md)

## Root Docs Responsibilities

`docs/` hiện chỉ giữ các phần:

- tổng quan dự án
- kiến trúc hệ thống
- ranh giới module
- điều hướng API ở mức cross-module
- conventions dùng chung

Không đặt ở đây:

- detailed API guide của từng module
- ghi chú indexing/query/storage riêng của module
- business rules chỉ thuộc một module

## Module Docs

Các module backend hiện có docs riêng tại:

- [account/docs](../apps/backend/src/modules/account/docs/README.md)
- [auth/docs](../apps/backend/src/modules/auth/docs/README.md)
- [catalog/docs](../apps/backend/src/modules/catalog/docs/README.md)
- [cart/docs](../apps/backend/src/modules/cart/docs/README.md)
- [inventory/docs](../apps/backend/src/modules/inventory/docs/README.md)
- [ordering/docs](../apps/backend/src/modules/ordering/docs/README.md)
- [payment/docs](../apps/backend/src/modules/payment/docs/README.md)
