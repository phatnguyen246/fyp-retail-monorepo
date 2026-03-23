# Catalog Field Mapping

## Identity Policy

- `_id` is the MongoDB technical key and uses native `ObjectId`.
- `productGroupCode` is the unique business identity for a `product`.
- `sku` is the unique business identity for a `variant`.
- `productGroupCode` and `sku` are used for import, lookup, sync, and upsert flows.
- MongoDB unique indexes must enforce:
  - `products.productGroupCode`
  - `variants.sku`
- Business keys are not reused after soft delete in the current MVP policy.

## Reference Policy

- Entity references are stored with `_id` in persisted catalog documents.
- Business lookup and import use `code`.
- Internal enums are stored as code strings.
- Product persistence shape stores:
  - `brandId`
  - `categoryId`
  - `tagIds`
  - `badges`
- `badges` remain internal code strings, not foreign-key references.

## Product-Level Fields

| Field | Kind | Writable by external input | Notes |
| --- | --- | --- | --- |
| `_id` | reference/support | no | MongoDB `ObjectId` |
| `productGroupCode` | core | yes | Unique business key |
| `title` | core | yes | Human-readable product title |
| `slug` | computed | no | Computed from `title` |
| `searchTitle` | computed | no | Computed normalized title for search |
| `brandId` | reference/support | no | Resolved from `brandCode` in service/import flow |
| `categoryId` | reference/support | no | Resolved from `categoryCode` in service/import flow |
| `productType` | core | yes | MVP uses `smartphone` |
| `shortDescription` | core | yes | Optional |
| `longDescription` | core | yes | Optional |
| `tagIds` | reference/support | no | Resolved from `tagCodes` in service/import flow |
| `badges` | core | yes | Internal badge codes |
| `specs` | core | yes | Product-level smartphone specs |
| `status` | core | yes | `draft`, `active`, `inactive`, `discontinued` |
| `contactWhenOutOfStock` | core | yes | Optional boolean with default `false` |
| `createdAt` | reference/support | no | Persistence timestamp |
| `updatedAt` | reference/support | no | Persistence timestamp |
| `createdBy` | reference/support | no | Optional actor identifier |
| `updatedBy` | reference/support | no | Optional actor identifier |
| `isDeleted` | reference/support | no | Soft delete flag |
| `deletedAt` | reference/support | no | Soft delete timestamp |

## Variant-Level Fields

| Field | Kind | Writable by external input | Notes |
| --- | --- | --- | --- |
| `_id` | reference/support | no | MongoDB `ObjectId` |
| `productId` | reference/support | no | Resolved from `productGroupCode` in service flow |
| `sku` | core | yes on create only | Unique business key |
| `variantAttributes.ram` | core | yes | Variant-level RAM |
| `variantAttributes.rom` | core | yes | Variant-level storage |
| `variantAttributes.color` | core | yes | Variant-level color |
| `ramSort` | core | yes | Ordering hint |
| `romSort` | core | yes | Ordering hint |
| `colorPriority` | core | yes | Ordering hint |
| `variantSortOrder` | core | yes | Ordering hint |
| `isPrimaryColor` | core | yes | Default `false` |
| `originalPrice` | core | yes | Non-negative number |
| `salePrice` | core | yes | Non-negative number |
| `currency` | core | yes | Default `VND` |
| `video` | core | yes | Optional video metadata |
| `mediaIds` | reference/support | no | Optional media metadata references |
| `status` | core | yes | `active`, `inactive` |
| `isInStock` | computed | no | Derived from inventory-aware flow |
| `createdAt` | reference/support | no | Persistence timestamp |
| `updatedAt` | reference/support | no | Persistence timestamp |
| `isDeleted` | reference/support | no | Soft delete flag |
| `deletedAt` | reference/support | no | Soft delete timestamp |

## Computed / Denormalized Fields

| Field | Level | Kind | Source |
| --- | --- | --- | --- |
| `slug` | product | computed | Derived from `title` |
| `searchTitle` | product | computed | Derived from `title` |
| `defaultSelectedVariantId` | product | computed, denormalized | Derived from variant selection rules |
| `listingVariantSnapshot` | product | computed, denormalized | Derived from selected variant |
| `minSalePrice` | product | computed, denormalized | Derived from active variants |
| `minOriginalPrice` | product | computed, denormalized | Derived from active variants |
| `hasActiveVariants` | product | computed, denormalized | Derived from variant status |
| `hasInStockVariants` | product | computed, denormalized | Derived from inventory-aware variant state |
| `isInStock` | variant | computed, denormalized | Derived from inventory-aware flow |

## Specs and Variant Boundary

- `specs` belongs to `product`.
- `ram`, `rom`, and `color` belong to `variantAttributes`.
- `slug` belongs to `product`.
- `sku` belongs to `variant`.
- `specs` must not contain `ram`, `rom`, or `color`.

## Status and Soft Delete Convention

- `status` represents business lifecycle only.
- Soft delete is represented only by `isDeleted` and `deletedAt`.
- `product.status` never stores `deleted`.
- `variant.status` never stores `draft` or `deleted`.
- When `isDeleted = true`, the document is excluded from normal read flows regardless of `status`.

## Admin CRUD Contract

- Public catalog health remains available at `/catalog/health`.
- Admin CRUD routes use `_id` in the path under `/admin/catalog`.
- Product admin create and update input still uses `brandCode`, `categoryCode`, and `tagCodes`.
- Variant admin create uses `POST /admin/catalog/products/:productId/variants`.
- Variant admin update and delete use `variantId` in the path.
- `sku` is immutable after create in the admin CRUD flow.
- Product soft delete cascades soft delete to its variants by setting `isDeleted = true` and `deletedAt`.
- Admin product detail returns the product and all linked variants, including soft-deleted variants.
