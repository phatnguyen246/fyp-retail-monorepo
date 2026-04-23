# Auth API

## Overview
The Auth module handles user registration, sign-in, token lifecycle, and sign-out flows.

## Base Path
`/auth`

## Endpoints
1. `POST /auth/register`
- Creates a new account.
- Validates email uniqueness and password policy.

2. `POST /auth/login`
- Authenticates user credentials.
- Returns access and refresh tokens.

3. `POST /auth/refresh-token`
- Exchanges a valid refresh token for a new access token.

4. `POST /auth/logout`
- Revokes active refresh tokens for the current session context.

## Error Model
- `400 BAD_REQUEST`: malformed payload
- `401 UNAUTHORIZED`: invalid credentials or token
- `409 CONFLICT`: duplicate account data (for example, existing email)
- `422 VALIDATION_ERROR`: payload validation failure

## Notes
- All responses use JSON.
- Validation should happen before side effects.
