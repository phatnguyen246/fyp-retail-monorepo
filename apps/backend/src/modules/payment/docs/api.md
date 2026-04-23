# Payment API

## Overview
The Payment module orchestrates payment flows for COD and VNPAY.

## Base Path
`/payments`

## Endpoints
1. `POST /payments/vnpay/create-url`
- Generates a VNPAY redirect URL for an order.

2. `GET /payments/vnpay/return`
- Handles VNPAY return callback and updates payment/order status.

3. `POST /payments/cod/confirm`
- Confirms COD selection for order creation flow.

## Payment Status
- `pending`
- `paid`
- `failed`
- `cancelled`

## Error Model
- `400 BAD_REQUEST`: malformed signature or callback parameters
- `404 NOT_FOUND`: target order not found
- `409 CONFLICT`: payment state conflict
- `422 VALIDATION_ERROR`: invalid payload
