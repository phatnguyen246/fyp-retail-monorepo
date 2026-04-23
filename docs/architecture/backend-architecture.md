# Backend Architecture

This document describes the current backend architecture of `apps/backend`, based on real module wiring in `src/bootstrap/modules.js`.

## Runtime Components (Docker Compose)
- `backend` (`Express`, default port `3000`)
- `mongo` (`MongoDB` persistence)
- `VNPAY` external payment gateway integration
- `SMTP/Mailtrap` email provider integration
- `Firebase Storage` (optional media storage adapter)

## Backend Startup Flow
1. `index.js` loads environment variables and calls `createApp()`.
2. `createApp()` connects MongoDB and initializes optional adapters.
3. Global middlewares are mounted (`express.json()`, `cookie-parser()`, etc.).
4. `registerModules()` wires domain modules and cross-module dependencies.
5. Routes are mounted and the app starts listening.

## Module Responsibilities

## Account
- Owns account persistence and account-level services.
- Does not own auth session/token lifecycle.

## Auth
- Handles register/login/logout/current-user.
- Uses Account services for profile binding.
- Supports guest-to-customer cart merge after registration/login.

## Catalog
- Owns product, variant, and reference data.
- Integrates inventory read models for availability display.
- Integrates media storage adapter for variant images.

## Cart
- Manages guest/customer carts.
- Validates purchasable lines using Catalog and Inventory.
- Reconciles stale cart lines against current product/stock states.

## Inventory
- Tracks stock by `variantId`.
- Exposes admin stock update APIs and read APIs.

## Ordering
- Orchestrates order lifecycle.
- Creates orders from checkout/cart context.
- Handles status transitions and cancellation.
- Coordinates with Payment and Notification modules.

## Payment
- Manages payment records.
- Generates VNPAY checkout URLs.
- Handles return/IPN callbacks, signature verification, and reconciliation.

## Notification
- Sends outbound transactional emails.
- Used for order confirmation and related events.

## Dashboard
- Provides read-only admin metrics and reporting aggregates.

## Core Business Flows

## Register/Login
1. User signs up or signs in.
2. Auth issues JWT/cookie credentials.
3. Guest cart can be merged into customer ownership.

## Add to Cart + Reconcile
1. Cart validates product/variant and stock availability.
2. Cart line is stored in MongoDB.
3. Reconcile updates line states (`active`, `insufficient_stock`, `out_of_stock`, etc.).

## COD Checkout
1. Ordering builds checkout snapshot from cart/catalog/inventory.
2. Stock is committed for COD orders.
3. Order and payment records are created.
4. Checked-out lines are removed from cart.
5. Confirmation email is sent in non-blocking mode.
6. Best-effort rollback applies on intermediate failures.

## VNPAY Checkout
1. Ordering creates `pending` order with deferred stock commit.
2. Payment module creates signed VNPAY URL.
3. Client is redirected to VNPAY.
4. Return callback supports user experience; IPN is reconciliation source of truth.
5. Payment/order status and stock commit/release are updated from IPN outcome.

## Cancel Order
1. Customer/admin requests cancellation under allowed transitions.
2. Ordering validates transition rules.
3. Stock is restored when required.
4. Order timeline and payment state are reconciled.

## Operational Principles
- IPN is the primary reconciliation channel for payment finality.
- Multi-step side effects use best-effort rollback.
- Email sending is non-blocking and should not fail the core transaction.
- Global error handling normalizes API error responses across modules.
