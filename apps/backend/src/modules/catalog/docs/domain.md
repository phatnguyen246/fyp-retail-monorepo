# Catalog Domain

## Purpose
The Catalog module provides searchable product data and discovery metadata for storefront experiences.

## Core Concepts
- Product entity with canonical slug and visibility flags.
- Discovery facets for brand, price range, and sort options.
- Compare set for side-by-side product analysis.

## Invariants
- Product slug is stable and canonicalized.
- Search/indexed fields are normalized.
- Hidden or inactive products are excluded from public discovery.
