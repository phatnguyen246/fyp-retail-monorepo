# Inventory API

## Overview
The Inventory module tracks stock quantities and provides availability checks for catalog, cart, and ordering.

## Base Path
`/inventory`

## Endpoints
1. `GET /inventory/products/:productId`
- Returns stock and availability for a product.

2. `POST /inventory/reservations`
- Reserves stock for a pending checkout/order flow.

3. `POST /inventory/release`
- Releases previously reserved stock.

4. `POST /inventory/commit`
- Commits reserved stock after successful order placement/payment.

## Error Model
- `404 NOT_FOUND`: product or reservation not found
- `409 CONFLICT`: insufficient stock or reservation conflict
- `422 VALIDATION_ERROR`: invalid payload
