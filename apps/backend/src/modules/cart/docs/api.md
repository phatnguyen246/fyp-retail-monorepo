# Cart API

## Overview
The Cart module manages shopping cart lines, quantities, stock-aware reconciliation, and checkout eligibility.

## Base Path
`/cart`

## Endpoints
1. `GET /cart`
- Returns current cart lines and computed totals.

2. `POST /cart/items`
- Adds a product line to cart.

3. `PATCH /cart/items/:lineId`
- Updates quantity or line state.

4. `DELETE /cart/items/:lineId`
- Removes a cart line.

5. `POST /cart/reconcile`
- Re-evaluates lines against inventory and product availability.

## Reconcile States
- `active`: line can be checked out
- `insufficient_stock`: quantity exceeds available stock
- `out_of_stock`: no stock available
- `inactive`: excluded line (can be re-activated when valid)

## Error Model
- `404 NOT_FOUND`: cart or line does not exist
- `409 CONFLICT`: business conflict (for example, unavailable stock)
- `422 VALIDATION_ERROR`: invalid payload
