# Catalog API

## Overview
The Catalog module serves product discovery, detail pages, compare data, and search.

## Base Path
`/catalog`

## Endpoints
1. `GET /catalog/discovery`
- Returns discovery options (facets, sort options, ranges).

2. `GET /catalog/products/:slug`
- Returns product detail by canonical slug.
- Returns `404 NOT_FOUND` when missing.

3. `GET /catalog/search?q=...`
- Returns product listing by keyword.
- Returns `422 VALIDATION_ERROR` when required query fields are missing.

4. `GET /catalog/compare?ids=...`
- Returns compare-ready product data for selected IDs.

## Query/Response Notes
- Supports pagination and stable sorting where configured.
- Search input is normalized before lookup.

## Error Model
- `404 NOT_FOUND`: product does not exist
- `422 VALIDATION_ERROR`: invalid query/payload
