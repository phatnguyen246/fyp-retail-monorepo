# Module Boundaries

Tài liệu này mô tả ranh giới trách nhiệm giữa các backend modules.

## Account

Sở hữu:

- account persistence
- đọc/tạo account
- seed admin account

Không sở hữu:

- login/logout
- JWT
- auth middleware

## Auth

Sở hữu:

- register
- login
- logout
- current user
- auth middleware

Phụ thuộc:

- `account`
- một phần `cart` cho guest-cart reassignment khi register

## Catalog

Sở hữu:

- storefront product discovery
- storefront product detail
- product compare
- admin catalog CRUD
- variant image management
- catalog import/clone

Phụ thuộc:

- `inventory` cho stock live/hydration
- storage cho media upload

## Cart

Sở hữu:

- guest/customer cart
- add/update/remove/clear cart item
- build cart read model

Phụ thuộc:

- `catalog`
- `inventory`

## Inventory

Sở hữu:

- stock theo `variantId`
- admin inventory write/read
- low stock listing

Phụ thuộc:

- `catalog` để validate variant và sync availability

## Ordering

Sở hữu:

- create order
- list/detail/cancel order
- admin order operations

Phụ thuộc:

- `cart`
- `catalog`
- `inventory`
- `payment`

## Payment

Sở hữu:

- payment records
- tạo VNPAY payment URL
- handle VNPAY return/IPN callbacks

Phụ thuộc:

- `ordering`
- VNPAY configuration/environment
