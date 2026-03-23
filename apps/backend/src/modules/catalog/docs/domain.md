# Catalog Domain Notes

Tài liệu này tóm tắt các khái niệm domain chính của `catalog` module.

## Core Entities

### Product

Product là aggregate trung tâm của catalog.

Những khái niệm quan trọng:

- business key là `productGroupCode`
- lifecycle status gồm `draft`, `active`, `inactive`, `discontinued`
- soft delete được theo dõi riêng qua `isDeleted`

### Variant

Variant là đơn vị bán cụ thể của product.

Những khái niệm quan trọng:

- business key là `sku`
- variant chứa `ram`, `rom`, `color`, pricing, media liên quan
- lifecycle status hiện tại của variant là `active` hoặc `inactive`

### Reference Entities

Catalog còn quản lý:

- `brand`
- `category`
- `tag`
- `badge` dưới dạng internal codes

## Storefront Visibility Rules

### Listing storefront

- chỉ trả product `active`
- loại soft-deleted product
- yêu cầu `hasActiveVariants = true`

### Search storefront

- trả product `active` hoặc `discontinued`
- loại soft-deleted product
- vẫn yêu cầu `hasActiveVariants = true`

### Detail storefront

- cho `active`
- cho `discontinued` nếu vẫn còn `active` variants

### Compare storefront

- vẫn giữ rule bảo thủ hơn, chỉ cho product storefront-visible theo rule `active`

## Derived Fields

Catalog hiện dùng nhiều derived fields trên product, ví dụ:

- `slug`
- `searchTitle`
- `defaultSelectedVariantId`
- `listingVariantSnapshot`
- `minSalePrice`
- `minOriginalPrice`
- `hasActiveVariants`
- `hasInStockVariants`

## Cross-Module Dependencies

- đọc inventory live từ `inventory`
- dùng storage cho variant image upload khi storage được cấu hình
