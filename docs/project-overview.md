# Project Overview

Đây là tài liệu tổng quan cấp repository, giúp người mới hiểu nhanh repo này đang chứa gì và nên bắt đầu đọc từ đâu.

## Snapshot

Monorepo hiện tại gồm:

- `apps/backend`: phần nghiệp vụ chính của retail system
- `apps/frontend`: frontend scaffold `Vue 3 + Vite`
- `docs/`: tài liệu hệ thống, shared conventions, và navigation

Kết luận quan trọng:

- backend là phần phản ánh sản phẩm thực tế nhất ở thời điểm hiện tại
- frontend chưa phải nguồn chân lý cho toàn bộ UX hoặc feature coverage

## Cách đọc repo nhanh nhất

1. đọc [../README.md](../README.md)
2. đọc [architecture/backend-architecture.md](./architecture/backend-architecture.md)
4. đọc [api/overview.md](./api/overview.md)
5. sau đó đi vào docs của module sở hữu nghiệp vụ bạn đang quan tâm

## Documentation Ownership

### Root `docs/`

Giữ các phần:

- project overview
- system design
- module boundaries
- API navigation ở mức cross-module
- repository-wide workflows

### Module `docs/`

Giữ các phần:

- detailed API guide
- business rules
- technical notes
- storage/index/query mapping
- module-specific flows

## Module Docs

- [account](../apps/backend/src/modules/account/docs/README.md)
- [auth](../apps/backend/src/modules/auth/docs/README.md)
- [catalog](../apps/backend/src/modules/catalog/docs/README.md)
- [cart](../apps/backend/src/modules/cart/docs/README.md)
- [inventory](../apps/backend/src/modules/inventory/docs/README.md)
- [ordering](../apps/backend/src/modules/ordering/docs/README.md)
- [payment](../apps/backend/src/modules/payment/docs/README.md)

## Development Entry Points

- backend bootstrap: `apps/backend/src/bootstrap/`
- backend modules: `apps/backend/src/modules/`
- frontend app: `apps/frontend/src/`

## Further Reading

- [backend-architecture.md](./architecture/backend-architecture.md)
- [api/overview.md](./api/overview.md)
