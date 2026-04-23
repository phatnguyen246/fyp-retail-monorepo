# API Overview (Cross-Module)

This document is the high-level API map across modules.
Detailed request/response contracts and business rules are maintained in each module's docs.

## Backend Module Map
- Auth module: registration, login, token lifecycle
- Account module: internal account/profile domain services
- Catalog module: product discovery, detail, compare, search
- Cart module: cart lines, reconciliation, checkout eligibility
- Inventory module: stock read/update and stock lifecycle operations
- Ordering module: order creation, detail, history, cancellation
- Payment module: COD and VNPAY payment workflows
- Notification module: outbound order-related notifications
- Dashboard module: admin metrics and read-only aggregates

## Routing Notes
- `account` is primarily an internal module and may not expose public HTTP endpoints directly.
- Admin routes are protected by authorization middleware (for example `requireAdmin`).
- Some public modules may run with optional authentication context.

## Source of Truth
Use module-level docs under `apps/backend/src/modules/*/docs/` for exact API behavior.
