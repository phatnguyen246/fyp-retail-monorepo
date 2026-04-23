# Account Domain

## Purpose
The Account module represents user profile information used after authentication.

## Core Responsibilities
- Maintain profile fields (name, phone, address metadata).
- Expose account read/update operations.
- Keep account identity linked to the authenticated user.

## Invariants
- One account profile per user identity.
- Profile updates are validated and normalized.
- Sensitive identity data is not exposed outside intended boundaries.

## Typical Operations
1. Get current account profile.
2. Update profile attributes.
3. Resolve account data for checkout/order workflows.
