# Catalog Index Query Mapping

This note documents the MongoDB indexes that support the current catalog query paths and the foundational discovery filters already modeled in the catalog module.

## Current implemented query paths

| Query pattern | Collection | Supporting index | Reason |
| --- | --- | --- | --- |
| Admin product detail, update, soft delete by `_id` | `products` | MongoDB default `_id` index | Primary key lookup for admin CRUD flows. |
| Duplicate check or import-style lookup by `productGroupCode` | `products` | `products_product_group_code_unique` | Supports unique business-key reads and writes. |
| Duplicate check or lookup by `sku` | `variants` | `variants_sku_unique` | Supports unique business-key reads and writes. |
| Admin product detail and derived-field rebuild by `productId` | `variants` | `variants_product_status` | Prefix on `productId` supports listing variants for one product. |
| Variant gallery listing by `variantId`, ordered by `sortOrder` and `createdAt` | `productMediaMetadata` | `product_media_variant_sort_created_at` | Matches the media listing filter and sort shape. |

## Foundational discovery indexes

| Query pattern | Collection | Supporting index | Reason |
| --- | --- | --- | --- |
| Filter products by soft-delete, status, category, and brand | `products` | `products_deleted_status_category_brand` | Covers the main catalog list filter shape already described by the discovery schema. |
| Sort newest products first by `createdAt` | `products` | `products_created_at_desc` | Supports MVP newest-first ordering. |
| Lookup product by `slug` | `products` | `products_slug` | Supports future slug-based reads without treating slug as a unique business key. |
| Search by normalized `searchTitle` | `products` | `products_search_title` | Supports title-based matching on the persisted normalized field. |
| Filter products by tags | `products` | `products_tag_ids` | Codebase persistence stores `tagIds`, not `tags`. |
| Filter active variants inside one product | `variants` | `variants_product_status` | Matches product-scoped variant listing with status filtering. |
| Filter or group variants by RAM and ROM | `variants` | `variants_ram_rom` | Supports attribute-driven filtering on the persisted nested fields. |
| Filter variants by color | `variants` | `variants_color` | Supports color-specific variant filtering. |
| Sort or filter variants by `salePrice` | `variants` | `variants_sale_price` | Supports basic price-driven variant discovery. |

## Implementation notes

- Story wording mentions `tags`, but the current product persistence model stores tag references in `tagIds`.
- Story wording also mentions stock-related indexing, but catalog persistence does not own a stable stock field. The current model only has derived `isInStock`, so Task J intentionally adds no stock index.
- Task J intentionally adds no index on `defaultSelectedVariantId` because the current codebase does not query products by that field.
- `slug` is indexed for lookup support only. The current codebase does not enforce slug uniqueness, so it is not treated as a unique identifier in this story.

## How to run

Use the backend workspace script from the Docker container:

```bash
docker compose exec backend pnpm --filter @apps/backend db:setup:catalog
```
