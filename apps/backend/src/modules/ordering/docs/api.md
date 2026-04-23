# Ordering API

## Overview
The Ordering module creates and manages customer orders, status transitions, and order history/detail retrieval.

## Base Path
`/orders`

## Endpoints
1. `POST /orders`
- Creates an order from checkout payload.
- Validates cart lines, shipping, and payment method.

2. `GET /orders`
- Returns paginated order history for the current user.

3. `GET /orders/:orderId`
- Returns order detail including line items, payment status, and status timeline.

4. `PATCH /orders/:orderId/cancel`
- Requests order cancellation when business rules allow.

## Status Lifecycle
Common statuses include:
- `PENDING`
- `CONFIRMED`
- `PROCESSING`
- `SHIPPED`
- `DELIVERED`
- `CANCELLED`

## Error Model
- `404 NOT_FOUND`: order not found
- `409 CONFLICT`: invalid status transition
- `422 VALIDATION_ERROR`: invalid request payload
