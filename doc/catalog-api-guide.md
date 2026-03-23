# Catalog Module API Guide

Tài liệu này mô tả cách dùng HTTP API của `catalog` module trong backend hiện tại, dựa trên code đang có trong `apps/backend/src/modules/catalog`.

## Mục đích

`catalog` module chịu trách nhiệm:

- phục vụ storefront product listing, search, product detail và compare,
- quản trị catalog qua nhóm route `/admin/catalog`,
- quản lý product, variant và variant images,
- import sản phẩm từ CSV,
- đọc tồn kho live từ `inventory` để trả `isInStock` và `hasInStockVariants`.

## Phạm vi endpoint hiện có

### Storefront / public

- `GET /catalog/health`
- `GET /catalog/products`
- `GET /catalog/search`
- `GET /catalog/products/:productId`
- `GET /catalog/products/:productId/:slug`
- `POST /catalog/compare`

### Admin

- `GET /admin/catalog/products`
- `POST /admin/catalog/products`
- `POST /admin/catalog/products/import`
- `POST /admin/catalog/products/:productId/clone`
- `GET /admin/catalog/products/:productId`
- `PATCH /admin/catalog/products/:productId`
- `DELETE /admin/catalog/products/:productId`
- `POST /admin/catalog/products/:productId/variants`
- `PATCH /admin/catalog/variants/:variantId`
- `DELETE /admin/catalog/variants/:variantId`
- `POST /admin/catalog/variants/:variantId/images`
- `GET /admin/catalog/variants/:variantId/images`
- `DELETE /admin/catalog/variants/:variantId/images/:mediaId`

## Base URL

Khi chạy local bằng `docker compose`, backend mặc định lắng nghe tại:

```text
http://localhost:3000
```

Base path của catalog:

```text
/catalog
```

Base path của admin catalog:

```text
/admin/catalog
```

## Phụ thuộc và điều kiện cần để API hoạt động

### 1. Phụ thuộc runtime bắt buộc

`catalog` không chạy độc lập. Trong app hiện tại nó phụ thuộc vào:

- `MongoDB`: lưu `products`, `variants`, `productMediaMetadata`, `brands`, `categories`, `tags`, `badges`
- `auth` module: bảo vệ toàn bộ `/admin/catalog/*` bằng `requireAdmin`
- `account` module: gián tiếp phục vụ `auth`
- `inventory` module: trả tồn kho live cho storefront
- `cookie-parser`: để auth cookie hoạt động
- `Firebase Storage`: chỉ bắt buộc với API upload/delete ảnh variant

Trong bootstrap hiện tại:

- `optionalAuth` được mount global trước catalog routes,
- catalog admin routes dùng `auth.middlewares.requireAdmin`,
- catalog tự tạo inventory adapter từ `inventory` persistence/service nội bộ.

### 2. Environment variables

Biến môi trường quan trọng:

- `MONGODB_URI`: bắt buộc, thiếu sẽ không boot được backend
- `AUTH_JWT_SECRET` hoặc `JWT_SECRET`: cần để login admin và gọi admin routes
- `FIREBASE_STORAGE_BUCKET`: cần nếu muốn dùng upload/delete ảnh

Lưu ý quan trọng về Firebase:

- code storage hiện tại chỉ gọi `applicationDefault()` của `firebase-admin`,
- vì vậy chỉ có `FIREBASE_STORAGE_BUCKET` là chưa đủ,
- môi trường chạy còn phải có Google Application Default Credentials hợp lệ, ví dụ `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`.

Lưu ý thêm:

- file `apps/backend/.env` có `FIREBASE_SERVICE_ACCOUNT_PATH`,
- nhưng bootstrap storage hiện tại không đọc biến này trực tiếp,
- nên nếu chỉ set `FIREBASE_SERVICE_ACCOUNT_PATH` mà không cấu hình ADC, các API ảnh vẫn có thể fail hoặc storage sẽ bị xem là unavailable.

### 3. Mongo indexes nên setup trước

Nên setup index trước khi dùng thật:

```bash
docker compose exec backend pnpm --filter @apps/backend run db:setup:catalog
docker compose exec backend pnpm --filter @apps/backend run db:setup:inventory
```

Các unique index quan trọng của catalog:

- `brands.code`
- `categories.code`
- `tags.code`
- `badges.code`
- `products.productGroupCode`
- `variants.sku`
- `productMediaMetadata.storagePath`

### 4. Reference data bắt buộc

`create product`, `update product`, `import products` đều validate:

- `brandCode`
- `categoryCode`
- `tagCodes`

đối chiếu với dữ liệu thật trong MongoDB.

Hiện tại catalog không có public/admin HTTP API để tạo:

- brand,
- category,
- tag,
- badge.

Vì vậy cần seed trước:

```bash
docker compose exec backend pnpm --filter @apps/backend run seed:catalog
```

Seed mặc định hiện có:

- Brands: `APPLE`, `SAMSUNG`, `XIAOMI`, `OPPO`, `VIVO`
- Categories: `SMARTPHONE`
- Tags: `gaming`, `camera-phone`, `battery-phone`, `flagship`, `budget`
- Badges: `new`, `hot`, `best_seller`, `installment`

### 5. Điều kiện auth cho admin routes

Toàn bộ `/admin/catalog/*` yêu cầu:

- request có cookie `auth_access_token` hợp lệ,
- account role phải là `admin`.

Admin account có thể seed bằng:

```bash
docker compose exec \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD=admin123 \
  backend \
  pnpm --filter @apps/backend run seed:account:admin
```

Lưu ý:

- script `seed:account:admin` không tự load `apps/backend/.env`,
- nên `ADMIN_EMAIL` và `ADMIN_PASSWORD` cần truyền từ shell/container environment,
- script này đã tự setup account indexes.

### 6. Điều kiện riêng cho storefront stock

Storefront không tin tuyệt đối vào `catalog.hasInStockVariants` hay `variant.isInStock` đã denormalize.

Thay vào đó:

- `GET /catalog/products`
- `GET /catalog/search`
- `GET /catalog/products/:productId`
- `POST /catalog/compare`

đều đọc live inventory từ `inventory` module.

Nếu inventory read fail:

- API storefront vẫn trả `200`,
- nhưng fallback an toàn sẽ coi toàn bộ variant là `out of stock`,
- tức `isInStock = false` và `hasInStockVariants = false`.

### 7. Điều kiện riêng cho image APIs

Các route ảnh:

- `POST /admin/catalog/variants/:variantId/images`
- `DELETE /admin/catalog/variants/:variantId/images/:mediaId`

yêu cầu storage adapter hoạt động. Nếu storage không sẵn sàng, service trả:

- `503 CATALOG_STORAGE_UNAVAILABLE`

Ngoài ra:

- variant tối đa `10` ảnh,
- mỗi ảnh tối đa `5 MB`,
- field multipart bắt buộc là `image`,
- chỉ chấp nhận `image/jpeg`, `image/png`, `image/webp`.

## Chạy nhanh local

### Cách 1. Chạy bằng Docker Compose

```bash
docker compose up -d mongo backend
docker compose exec backend pnpm --filter @apps/backend run db:setup:catalog
docker compose exec backend pnpm --filter @apps/backend run db:setup:inventory
docker compose exec backend pnpm --filter @apps/backend run seed:catalog
docker compose exec \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD=admin123 \
  backend \
  pnpm --filter @apps/backend run seed:account:admin
```

Nếu muốn test image APIs, cần thêm credential cho Google ADC vào container.

### Cách 2. Chạy local không dùng Docker

Ví dụ:

```bash
cd apps/backend
export MONGODB_URI=mongodb://localhost:27017/fyp-retail
export AUTH_JWT_SECRET=auth-jwt-secret
export FIREBASE_STORAGE_BUCKET=your-bucket-name
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/service-account.json
pnpm dev
```

Sau đó chạy seed/index setup bằng cách export cùng các biến môi trường cần thiết rồi gọi script tương ứng.

## Quy ước request/response

### 1. Path params

Các param sau phải là Mongo `ObjectId` hợp lệ:

- `productId`
- `variantId`
- `mediaId`

Nếu không hợp lệ, API trả `422 VALIDATION_ERROR`.

### 2. Response shape

#### Storefront

Toàn bộ storefront routes dùng response wrapper:

```json
{
  "data": {},
  "meta": {}
}
```

`meta` có thể vắng mặt nếu endpoint không cần.

#### Admin

Response shape của admin hiện chưa hoàn toàn thống nhất:

Các route có wrapper `{ "data": ... }`:

- `POST /admin/catalog/products`
- `GET /admin/catalog/products/:productId`
- `PATCH /admin/catalog/products/:productId`
- `POST /admin/catalog/products/import`
- `POST /admin/catalog/products/:productId/clone`

Các route trả raw JSON trực tiếp:

- `DELETE /admin/catalog/products/:productId`
- `POST /admin/catalog/products/:productId/variants`
- `PATCH /admin/catalog/variants/:variantId`
- `DELETE /admin/catalog/variants/:variantId`
- `POST /admin/catalog/variants/:variantId/images`
- `GET /admin/catalog/variants/:variantId/images`
- `DELETE /admin/catalog/variants/:variantId/images/:mediaId`

### 3. Error shape

Validation lỗi Zod:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "meta": {
    "issues": [
      {
        "path": "title",
        "message": "Too small: expected string to have >=1 characters",
        "code": "too_small"
      }
    ]
  }
}
```

Lỗi nghiệp vụ của catalog:

```json
{
  "code": "CATALOG_NOT_FOUND",
  "message": "Catalog product not found: 65f000000000000000000099",
  "meta": {
    "productId": "65f000000000000000000099"
  }
}
```

Các mã lỗi catalog thường gặp:

- `CATALOG_NOT_FOUND`
- `CATALOG_CONFLICT`
- `CATALOG_BAD_REQUEST`
- `CATALOG_UNPROCESSABLE_ENTITY`
- `CATALOG_STORAGE_UNAVAILABLE`
- `CATALOG_INTERNAL_ERROR`

## Tóm tắt endpoint

| Method | Path | Auth | Ghi chú |
| --- | --- | --- | --- |
| GET | `/catalog/health` | Public | Health check |
| GET | `/catalog/products` | Public | Listing/filter/sort storefront |
| GET | `/catalog/search` | Public | Search, bắt buộc có `q` hoặc `keyword` |
| GET | `/catalog/products/:productId` | Public | Product detail |
| GET | `/catalog/products/:productId/:slug` | Public | Product detail có slug |
| POST | `/catalog/compare` | Public | So sánh tối đa 3 sản phẩm |
| GET | `/admin/catalog/products` | Admin cookie | List product cho admin theo status/deleted |
| POST | `/admin/catalog/products` | Admin cookie | Tạo product |
| POST | `/admin/catalog/products/import` | Admin cookie | Import CSV |
| POST | `/admin/catalog/products/:productId/clone` | Admin cookie | Clone product thành draft |
| GET | `/admin/catalog/products/:productId` | Admin cookie | Lấy product + variants |
| PATCH | `/admin/catalog/products/:productId` | Admin cookie | Cập nhật product |
| DELETE | `/admin/catalog/products/:productId` | Admin cookie | Soft delete product và variants |
| POST | `/admin/catalog/products/:productId/variants` | Admin cookie | Tạo variant |
| PATCH | `/admin/catalog/variants/:variantId` | Admin cookie | Cập nhật variant |
| DELETE | `/admin/catalog/variants/:variantId` | Admin cookie | Soft delete variant |
| POST | `/admin/catalog/variants/:variantId/images` | Admin cookie | Upload ảnh variant |
| GET | `/admin/catalog/variants/:variantId/images` | Admin cookie | List ảnh variant |
| DELETE | `/admin/catalog/variants/:variantId/images/:mediaId` | Admin cookie | Xóa ảnh variant |

## Chi tiết API storefront

### 1. `GET /catalog/health`

Response:

```json
{
  "ok": true,
  "module": "catalog"
}
```

### 2. `GET /catalog/products`

Listing storefront.

Query params thường dùng:

| Param | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `q` hoặc `keyword` | Không | Từ khóa tìm kiếm theo `searchTitle` |
| `brand` hoặc `brandCode` | Không | Mã brand, ví dụ `APPLE` |
| `category` hoặc `categoryCode` | Không | Mã category, ví dụ `SMARTPHONE` |
| `tags` hoặc `tagCodes` | Không | Danh sách tag, phân tách bởi `,` hoặc `|` |
| `ram` | Không | Danh sách RAM variant |
| `rom` | Không | Danh sách ROM variant |
| `color` | Không | Danh sách màu variant |
| `minPrice` | Không | Lọc theo `product.minSalePrice >= minPrice` |
| `maxPrice` | Không | Lọc theo `product.minSalePrice <= maxPrice` |
| `page` | Không | Mặc định `1` |
| `limit` hoặc `pageSize` | Không | Mặc định `20` |
| `sortMode` | Không | `newest`, `price_asc`, `price_desc` |
| `sort` | Không | Kiểu `createdAt:desc`, `minSalePrice:asc`, `minSalePrice:desc` |
| `sortBy` + `sortOrder` | Không | Ví dụ `sortBy=minSalePrice&sortOrder=asc` |

Ví dụ:

```http
GET /catalog/products?brand=APPLE&page=1&limit=10
GET /catalog/products?q=IPHONE&sortMode=price_desc
GET /catalog/products?tags=camera-phone,battery-phone&ram=12GB&minPrice=22000000&maxPrice=23000000
GET /catalog/products?brand=APPLE&ram=12GB&rom=256GB&color=Blue
```

Lưu ý nghiệp vụ:

- storefront luôn chỉ trả product có `status = active`, `isDeleted != true`, `hasActiveVariants = true`
- `tags` dùng AND semantics, tức product phải có đủ tất cả tag được gửi lên
- bộ lọc `ram`, `rom`, `color` dùng same-variant semantics, tức cùng một variant phải match đồng thời các điều kiện đó
- nếu vừa truyền alias vừa truyền canonical name, giá trị phải giống nhau:
  - `q` và `keyword`
  - `brand` và `brandCode`
  - `category` và `categoryCode`
- `maxPrice` phải lớn hơn hoặc bằng `minPrice`

Ghi chú implementation hiện tại:

- schema vẫn chấp nhận `status` và `includeDeleted`,
- nhưng service storefront hiện không dùng hai field này,
- vì vậy kết quả vẫn luôn bị ép về `active + non-deleted + hasActiveVariants`.

Success response mẫu:

```json
{
  "data": [
    {
      "id": "65f000000000000000000006",
      "productId": "65f000000000000000000006",
      "title": "iPhone 16",
      "slug": "iphone-16",
      "productType": "smartphone",
      "shortDescription": "Apple smartphone",
      "badges": ["new"],
      "brand": {
        "id": "65f000000000000000000001",
        "code": "APPLE",
        "name": "Apple"
      },
      "category": {
        "id": "65f000000000000000000002",
        "code": "SMARTPHONE",
        "name": "Smartphone"
      },
      "tags": [
        {
          "id": "65f000000000000000000003",
          "code": "camera-phone",
          "name": "Camera Phone"
        }
      ],
      "listingVariantSnapshot": {
        "variantId": "65f000000000000000000007",
        "sku": "IP16-BLK-128",
        "color": "Black",
        "ram": "8GB",
        "rom": "128GB",
        "salePrice": 22990000,
        "originalPrice": 24990000,
        "currency": "VND"
      },
      "minSalePrice": 22990000,
      "minOriginalPrice": 24990000,
      "contactWhenOutOfStock": false,
      "defaultSelectedVariant": {
        "variantId": "65f000000000000000000007",
        "ram": "8GB",
        "rom": "128GB",
        "color": "Black",
        "salePrice": 22990000,
        "originalPrice": 24990000,
        "thumbnail": "https://storage.googleapis.com/catalog-assets/catalog/products/p123/variants/v456/front.webp",
        "inStock": true
      },
      "variantsSummary": [
        {
          "variantId": "65f000000000000000000007",
          "ram": "8GB",
          "rom": "128GB",
          "color": "Black",
          "salePrice": 22990000,
          "originalPrice": 24990000,
          "thumbnail": "https://storage.googleapis.com/catalog-assets/catalog/products/p123/variants/v456/front.webp",
          "inStock": true
        }
      ],
      "hasInStockVariants": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 3. `GET /catalog/search`

Search storefront. Query schema giống `GET /catalog/products` nhưng bắt buộc phải có `q` hoặc `keyword`.

Ví dụ:

```http
GET /catalog/search?q=dien thoai samsung
```

Nếu thiếu keyword:

- trả `422 VALIDATION_ERROR`

Response shape giống `GET /catalog/products`.

### 4. `GET /catalog/products/:productId`

Lấy product detail theo `productId`.

Ví dụ:

```http
GET /catalog/products/65f000000000000000000006
```

### 5. `GET /catalog/products/:productId/:slug`

Lấy product detail theo `productId` kèm slug.

Ví dụ:

```http
GET /catalog/products/65f000000000000000000006/iphone-16
GET /catalog/products/65f000000000000000000006/wrong-slug
```

Lưu ý:

- slug không được dùng để query DB,
- service chỉ validate/normalize slug path,
- dù slug sai vẫn có thể trả `200` nếu `productId` tồn tại và product visible,
- `meta.canonicalSlug` luôn trả slug chuẩn để frontend tự redirect nếu muốn.

Success response mẫu:

```json
{
  "data": {
    "id": "65f000000000000000000006",
    "productId": "65f000000000000000000006",
    "title": "iPhone 16",
    "slug": "iphone-16",
    "productType": "smartphone",
    "shortDescription": "Apple smartphone",
    "longDescription": "Apple smartphone long description",
    "specs": {
      "screen": {
        "size": "6.1 inches",
        "technology": "OLED",
        "resolution": "2556 x 1179",
        "refreshRate": "60Hz"
      },
      "chipset": "A18",
      "rearCamera": "48MP",
      "frontCamera": "12MP",
      "battery": "3561mAh",
      "operatingSystem": "iOS 18",
      "sim": "Dual SIM",
      "network": "5G",
      "charging": "USB-C",
      "dimensions": "147.6 x 71.6 x 7.8 mm",
      "weight": "170g",
      "material": "Aluminum",
      "waterResistance": "IP68"
    },
    "defaultSelectedVariantId": "65f000000000000000000007",
    "defaultVariant": {
      "id": "65f000000000000000000007",
      "sku": "IP16-BLK-128",
      "variantAttributes": {
        "ram": "8GB",
        "rom": "128GB",
        "color": "Black"
      },
      "originalPrice": 24990000,
      "salePrice": 22990000,
      "currency": "VND",
      "video": null,
      "isInStock": true,
      "media": [
        {
          "id": "65f000000000000000000090",
          "url": "https://storage.googleapis.com/catalog-assets/catalog/products/p123/variants/v456/front.webp",
          "fileName": "front.webp",
          "mimeType": "image/webp",
          "size": 1024,
          "sortOrder": 0
        }
      ]
    },
    "variants": []
  },
  "meta": {
    "canonicalSlug": "iphone-16"
  }
}
```

### 6. `POST /catalog/compare`

So sánh tối đa `3` product.

Request body:

```json
{
  "productIds": [
    "65f000000000000000000006",
    "65f000000000000000000008"
  ]
}
```

Rule:

- `productIds` phải unique
- tối thiểu `1`
- tối đa `3`
- tất cả product phải storefront-visible

Success response mẫu:

```json
{
  "data": {
    "items": [
      {
        "product": {
          "id": "65f000000000000000000006",
          "title": "iPhone 16",
          "slug": "iphone-16",
          "specs": {
            "chipset": "A18",
            "battery": "3561mAh"
          },
          "defaultSelectedVariantId": "65f000000000000000000007",
          "hasInStockVariants": true
        },
        "defaultVariant": {
          "id": "65f000000000000000000007",
          "sku": "IP16-BLK-128",
          "variantAttributes": {
            "ram": "8GB",
            "rom": "128GB",
            "color": "Black"
          },
          "originalPrice": 24990000,
          "salePrice": 22990000,
          "currency": "VND",
          "video": null,
          "isInStock": true,
          "media": []
        }
      }
    ]
  }
}
```

## Chi tiết API admin

### `GET /admin/catalog/products`

List product cho admin theo lifecycle status và soft-delete state.

Yêu cầu auth:

- admin cookie

Query:

- `status` optional: `draft`, `active`, `inactive`, `discontinued`
- `deleted` optional: `false`, `true`, `all`
- `page` optional, default `1`
- `limit` optional, default `20`
- `sortBy` optional: `createdAt`, `updatedAt`, `title`, `status`, `minSalePrice`
- `sortOrder` optional: `asc`, `desc`

Rule:

- `status` chỉ lọc business lifecycle
- soft delete vẫn lọc riêng bằng `deleted`
- mặc định endpoint trả tất cả lifecycle status nhưng chỉ lấy product chưa soft delete (`deleted = false`)
- `deleted = true` chỉ trả soft-deleted product
- `deleted = all` trả cả deleted và non-deleted
- list item là summary cho admin table, không kèm full variants graph

Success response:

```json
{
  "data": [
    {
      "_id": "65f000000000000000000006",
      "productGroupCode": "APPLE_IPHONE_16",
      "title": "iPhone 16",
      "status": "active",
      "isDeleted": false,
      "brand": {
        "_id": "65f000000000000000000001",
        "code": "APPLE",
        "name": "Apple"
      },
      "category": {
        "_id": "65f000000000000000000002",
        "code": "SMARTPHONE",
        "name": "Smartphone"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### `POST /admin/catalog/products`

Tạo product mới.

Yêu cầu auth:

- admin cookie

Request body:

```json
{
  "productGroupCode": "APPLE_IPHONE_17",
  "title": "iPhone 17",
  "brandCode": "APPLE",
  "categoryCode": "SMARTPHONE",
  "productType": "smartphone",
  "shortDescription": "Apple smartphone",
  "longDescription": "Apple smartphone long description",
  "tagCodes": ["camera-phone", "battery-phone"],
  "badges": ["new"],
  "specs": {
    "screen": {
      "size": "6.3 inches",
      "technology": "OLED"
    },
    "chipset": "A19",
    "battery": "4000mAh"
  },
  "status": "draft",
  "contactWhenOutOfStock": false
}
```

Rule:

- bắt buộc: `productGroupCode`, `title`, `brandCode`, `categoryCode`
- `productType` hiện chỉ hỗ trợ `smartphone`
- `tagCodes` và `badges` chấp nhận mảng JSON hoặc chuỗi CSV
- `title` sẽ được normalize, `slug` và `searchTitle` sẽ được tự tính
- `productGroupCode` phải unique
- `brandCode`, `categoryCode`, `tagCodes` phải tồn tại trong reference collections

Success response:

```json
{
  "data": {
    "_id": "65f000000000000000000100",
    "productGroupCode": "APPLE_IPHONE_17",
    "title": "iPhone 17",
    "slug": "iphone-17",
    "searchTitle": "iphone 17",
    "status": "draft"
  }
}
```

### 2. `GET /admin/catalog/products/:productId`

Lấy chi tiết admin của product và toàn bộ variants.

Response:

```json
{
  "data": {
    "product": {
      "_id": "65f000000000000000000006",
      "productGroupCode": "APPLE_IPHONE_16"
    },
    "variants": [
      {
        "_id": "65f000000000000000000007",
        "sku": "IP16-BLK-128"
      }
    ]
  }
}
```

Lưu ý:

- admin detail không lọc soft-deleted variant/product khỏi payload nếu document còn tồn tại trong DB

### 3. `PATCH /admin/catalog/products/:productId`

Cập nhật product.

Request body hỗ trợ các field mutable:

```json
{
  "title": "iPhone 16 Ultra",
  "brandCode": "APPLE",
  "categoryCode": "SMARTPHONE",
  "shortDescription": "Updated short description",
  "longDescription": "Updated long description",
  "tagCodes": ["camera-phone"],
  "badges": ["hot"],
  "specs": {
    "screen": {
      "refreshRate": "120Hz"
    },
    "battery": "4200mAh"
  },
  "status": "active",
  "contactWhenOutOfStock": true
}
```

Rule:

- phải có ít nhất một mutable field
- không cho đổi `productGroupCode`
- `specs` được merge từng field, không thay toàn bộ object một cách mù quáng
- nếu đổi `title`, `searchTitle` sẽ được tính lại và derived fields sẽ được rebuild
- không update được product đã soft delete

Success response:

```json
{
  "data": {
    "_id": "65f000000000000000000006",
    "title": "iPhone 16 Ultra",
    "searchTitle": "iphone 16 ultra"
  }
}
```

### 4. `DELETE /admin/catalog/products/:productId`

Soft delete product.

Behavior:

- set `product.isDeleted = true`
- soft delete toàn bộ variant thuộc product
- rebuild derived fields

Response hiện tại là raw JSON:

```json
{
  "product": {
    "_id": "65f000000000000000000006",
    "isDeleted": true
  },
  "variants": [
    {
      "_id": "65f000000000000000000007",
      "isDeleted": true
    }
  ]
}
```

Nếu product đã soft delete từ trước:

- service vẫn trả admin detail hiện tại

### 5. `POST /admin/catalog/products/import`

Import CSV bằng multipart form-data.

Request:

- content type: `multipart/form-data`
- field file bắt buộc: `file`
- tối đa: `5 MB`
- tên file phải kết thúc bằng `.csv`

CSV header hiện tại:

```csv
productGroupCode,title,brandCode,categoryCode,productType,productStatus,shortDescription,longDescription,tagCodes,badges,contactWhenOutOfStock,screenSize,screenTechnology,screenResolution,screenRefreshRate,chipset,rearCamera,frontCamera,battery,operatingSystem,sim,network,charging,dimensions,weight,material,waterResistance,sku,ram,rom,color,ramSort,romSort,colorPriority,variantSortOrder,isPrimaryColor,originalPrice,salePrice,currency,videoUrl,videoThumbnailUrl,variantStatus
```

Ví dụ một dòng:

```csv
APPLE_IPHONE_16,iPhone 16,APPLE,SMARTPHONE,smartphone,draft,Apple smartphone,Apple smartphone long description,"camera-phone,battery-phone",new,false,6.1 inches,OLED,2556 x 1179,60Hz,A18,48MP,12MP,3561mAh,iOS 18,Dual SIM,5G,USB-C,"147.6 x 71.6 x 7.8 mm",170g,Aluminum,IP68,IP16-BLK-128,8GB,128GB,Black,1,1,1,1,true,24990000,22990000,VND,https://cdn.example.com/iphone-16/video.mp4,https://cdn.example.com/iphone-16/video.jpg,active
```

Behavior:

- upsert product theo `productGroupCode`
- upsert variant theo `sku`
- sau mỗi batch sẽ rebuild derived fields cho các product bị chạm tới

Ghi chú rất quan trọng:

- dù CSV có cột `productStatus`,
- implementation hiện tại vẫn hard-code product import về `status: "draft"`
- nghĩa là import không thể tạo product active ngay theo code hiện tại

Success response:

```json
{
  "data": {
    "products": [
      {
        "productId": "65f000000000000000000101",
        "productGroupCode": "XIAOMI_15"
      }
    ]
  },
  "meta": {
    "rowCount": 1,
    "productCount": 1,
    "variantCount": 1
  }
}
```

### 6. `POST /admin/catalog/products/:productId/clone`

Clone product thành product mới với `status = draft`.

Request body:

```json
{
  "productGroupCode": "APPLE_IPHONE_16_COPY",
  "title": "iPhone 16 Copy"
}
```

Rule:

- `productGroupCode` mới là bắt buộc
- title mới là optional; nếu không truyền thì dùng title của source product
- clone chỉ clone product document
- không clone variants
- source product không được soft deleted

Success response:

```json
{
  "data": {
    "productGroupCode": "APPLE_IPHONE_16_COPY",
    "title": "iPhone 16 Copy",
    "status": "draft"
  }
}
```

### 7. `POST /admin/catalog/products/:productId/variants`

Tạo variant cho product.

Request body:

```json
{
  "sku": "IP16-BLU-256",
  "variantAttributes": {
    "ram": "8GB",
    "rom": "256GB",
    "color": "Blue"
  },
  "ramSort": 1,
  "romSort": 2,
  "colorPriority": 2,
  "variantSortOrder": 2,
  "isPrimaryColor": false,
  "originalPrice": 26990000,
  "salePrice": 24990000,
  "currency": "VND",
  "video": {
    "url": "https://cdn.example.com/iphone-16-blue/video.mp4",
    "thumbnailUrl": "https://cdn.example.com/iphone-16-blue/video.jpg"
  },
  "status": "active"
}
```

Rule:

- `sku` phải unique
- `salePrice <= originalPrice`
- product cha phải tồn tại
- product cha không được soft deleted
- product cha không được ở trạng thái `discontinued`
- sau khi tạo, product derived fields sẽ được rebuild

Response hiện tại là raw variant JSON.

### 8. `PATCH /admin/catalog/variants/:variantId`

Cập nhật variant.

Request body hỗ trợ partial update:

```json
{
  "variantAttributes": {
    "color": "Titan Blue"
  },
  "salePrice": 23990000,
  "video": null,
  "status": "inactive"
}
```

Rule:

- phải có ít nhất một field
- `variantAttributes` được merge với current value
- `video` có thể là:
  - string URL,
  - object `{ url, thumbnailUrl }`,
  - `null` để clear video
- pricing invariant vẫn phải đúng sau khi merge patch với current values
- variant soft-deleted không được update
- product cha soft-deleted hoặc `discontinued` cũng không cho update variant

Response hiện tại là raw variant JSON.

### 9. `DELETE /admin/catalog/variants/:variantId`

Soft delete variant.

Behavior:

- set `variant.isDeleted = true`
- rebuild derived fields của product cha

Response hiện tại là raw variant JSON.

Nếu variant đã soft delete từ trước:

- service trả lại variant hiện tại, không ném lỗi

### 10. `POST /admin/catalog/variants/:variantId/images`

Upload một ảnh cho variant.

Request:

- content type: `multipart/form-data`
- field file bắt buộc: `image`
- chỉ chấp nhận:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
- tối đa `5 MB`
- tối đa `10` ảnh mỗi variant

Behavior:

- file name thật khi lưu sẽ bị đổi sang UUID + extension phù hợp
- metadata được ghi vào `productMediaMetadata`
- `mediaId` được gắn vào `variant.mediaIds`
- `sortOrder` tự tăng theo gallery hiện có

Điều kiện nghiệp vụ:

- variant phải tồn tại
- variant không được soft delete
- product cha phải tồn tại
- product cha không được soft delete
- product cha không được `discontinued`
- storage phải available

Response hiện tại là raw media metadata JSON:

```json
{
  "_id": "65f000000000000000000091",
  "productId": "65f000000000000000000006",
  "variantId": "65f000000000000000000007",
  "url": "https://storage.googleapis.com/your-bucket/catalog/products/65f.../variants/65f.../generated.png",
  "storagePath": "catalog/products/65f.../variants/65f.../generated.png",
  "fileName": "generated.png",
  "mimeType": "image/png",
  "size": 1024,
  "sortOrder": 0
}
```

### 11. `GET /admin/catalog/variants/:variantId/images`

List media metadata của variant.

Response hiện tại là raw array:

```json
[
  {
    "_id": "65f000000000000000000090",
    "variantId": "65f000000000000000000007",
    "url": "https://storage.googleapis.com/.../front.webp",
    "fileName": "front.webp",
    "mimeType": "image/webp",
    "size": 1024,
    "sortOrder": 0
  }
]
```

Lưu ý:

- route này chỉ yêu cầu variant tồn tại,
- service hiện không chặn trường hợp variant đã soft delete.

### 12. `DELETE /admin/catalog/variants/:variantId/images/:mediaId`

Xóa một ảnh của variant.

Behavior:

1. xóa object trong storage,
2. remove `mediaId` khỏi `variant.mediaIds`,
3. xóa metadata trong MongoDB.

Nếu bước xóa storage fail:

- API trả `500 CATALOG_INTERNAL_ERROR`,
- metadata trong MongoDB được giữ nguyên.

Response hiện tại là raw media metadata của record vừa bị xóa.

## Ghi chú nghiệp vụ quan trọng

### 1. Storefront chỉ hiển thị product visible

Storefront `list`, `search`, `detail`, `compare` chỉ làm việc với product:

- `status = active`
- `isDeleted != true`
- `hasActiveVariants = true`

Nên:

- product `draft`, `inactive`, `discontinued`, `soft deleted` sẽ không hiện ra ngoài storefront.

### 2. Default variant của storefront là live decision

Storefront không chỉ đọc `defaultSelectedVariantId` denormalized từ product.

Nó sẽ chọn lại variant mặc định theo ưu tiên:

1. active và còn hàng,
2. `ramSort`,
3. `romSort`,
4. `isPrimaryColor`,
5. `colorPriority`,
6. `variantSortOrder`,
7. `_id`.

Điều này giải thích vì sao `defaultVariant` hoặc `defaultSelectedVariantId` trên storefront có thể đổi khi tồn kho thay đổi.

### 3. Product derived fields được rebuild tự động

Các thao tác sau sẽ kéo theo rebuild:

- create/update/delete variant
- soft delete product
- import CSV
- một số update product như đổi title

Derived fields gồm:

- `slug`
- `defaultSelectedVariantId`
- `listingVariantSnapshot`
- `minSalePrice`
- `minOriginalPrice`
- `hasActiveVariants`
- `hasInStockVariants`

## Hướng dẫn dùng Postman

### 1. Chuẩn bị environment

Tạo Postman environment với các biến:

| Variable | Giá trị gợi ý |
| --- | --- |
| `baseUrl` | `http://localhost:3000` |
| `adminEmail` | `admin@example.com` |
| `adminPassword` | `admin123` |
| `productId` | để trống ban đầu |
| `variantId` | để trống ban đầu |
| `mediaId` | để trống ban đầu |

Nếu dùng Postman Web:

- nên bật Desktop Agent để cookie và file upload hoạt động ổn định.

### 2. Đăng nhập admin

Tạo request:

- Method: `POST`
- URL: `{{baseUrl}}/auth/login`
- Headers: `Content-Type: application/json`
- Body:

```json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
```

Sau khi login thành công:

- Postman cookie jar sẽ giữ `auth_access_token`,
- các request admin sau đó chỉ cần gọi cùng domain `{{baseUrl}}`,
- không cần tự gắn Bearer token.

Có thể thêm Tests script để lưu thông tin user:

```javascript
const body = pm.response.json();
pm.environment.set("adminAccountId", body.data.accountId);
```

### 3. Test storefront APIs

Ví dụ:

- `GET {{baseUrl}}/catalog/products?brand=APPLE&page=1&limit=10`
- `GET {{baseUrl}}/catalog/search?q=iphone`
- `GET {{baseUrl}}/catalog/products/{{productId}}`
- `POST {{baseUrl}}/catalog/compare`

Body compare:

```json
{
  "productIds": ["{{productId}}"]
}
```

Storefront routes không cần auth.

### 4. Test admin create product

Request:

- Method: `POST`
- URL: `{{baseUrl}}/admin/catalog/products`
- Body: raw JSON

Ví dụ body:

```json
{
  "productGroupCode": "APPLE_IPHONE_17",
  "title": "iPhone 17",
  "brandCode": "APPLE",
  "categoryCode": "SMARTPHONE",
  "tagCodes": ["camera-phone"],
  "specs": {
    "chipset": "A19"
  }
}
```

Tests script gợi ý để lưu `productId`:

```javascript
const body = pm.response.json();
pm.environment.set("productId", body.data._id);
```

### 5. Test create variant

Request:

- Method: `POST`
- URL: `{{baseUrl}}/admin/catalog/products/{{productId}}/variants`
- Body: raw JSON

Ví dụ:

```json
{
  "sku": "IP17-BLK-128",
  "variantAttributes": {
    "ram": "8GB",
    "rom": "128GB",
    "color": "Black"
  },
  "originalPrice": 29990000,
  "salePrice": 27990000
}
```

Vì route này trả raw variant JSON, Tests script để lưu `variantId`:

```javascript
const body = pm.response.json();
pm.environment.set("variantId", body._id);
```

### 6. Test import CSV

Request:

- Method: `POST`
- URL: `{{baseUrl}}/admin/catalog/products/import`
- Body type: `form-data`
- Key: `file`
- Value: chọn file `.csv`

Lưu ý:

- tên field phải đúng là `file`,
- file quá `5 MB` hoặc không phải `.csv` sẽ fail.

### 7. Test upload ảnh variant

Request:

- Method: `POST`
- URL: `{{baseUrl}}/admin/catalog/variants/{{variantId}}/images`
- Body type: `form-data`
- Key: `image`
- Value: chọn file ảnh `.jpg`, `.png` hoặc `.webp`

Tests script gợi ý:

```javascript
const body = pm.response.json();
pm.environment.set("mediaId", body._id);
```

Nếu nhận lỗi `CATALOG_STORAGE_UNAVAILABLE`:

- kiểm tra `FIREBASE_STORAGE_BUCKET`,
- kiểm tra `GOOGLE_APPLICATION_CREDENTIALS`,
- kiểm tra credential có quyền truy cập bucket.

### 8. Test list và delete ảnh

List:

- `GET {{baseUrl}}/admin/catalog/variants/{{variantId}}/images`

Delete:

- `DELETE {{baseUrl}}/admin/catalog/variants/{{variantId}}/images/{{mediaId}}`

### 9. Test clone và soft delete

Clone:

- `POST {{baseUrl}}/admin/catalog/products/{{productId}}/clone`

Body:

```json
{
  "productGroupCode": "APPLE_IPHONE_17_COPY",
  "title": "iPhone 17 Copy"
}
```

Soft delete product:

- `DELETE {{baseUrl}}/admin/catalog/products/{{productId}}`

Soft delete variant:

- `DELETE {{baseUrl}}/admin/catalog/variants/{{variantId}}`

### 10. Một flow Postman ngắn gọn nên chạy theo

1. `POST /auth/login`
2. `POST /admin/catalog/products`
3. `POST /admin/catalog/products/{{productId}}/variants`
4. `POST /admin/catalog/variants/{{variantId}}/images`
5. `GET /catalog/products`
6. `GET /catalog/products/{{productId}}`
7. `POST /catalog/compare`
8. `DELETE /admin/catalog/variants/{{variantId}}/images/{{mediaId}}`

## Tổng kết

Muốn catalog API chạy ổn định, cần đảm bảo đủ 4 nhóm điều kiện:

1. MongoDB + catalog indexes
2. reference data đã seed
3. auth admin hoạt động để gọi `/admin/catalog/*`
4. Firebase Storage + Google ADC nếu dùng image APIs

Nếu chỉ test storefront list/search/detail/compare:

- không cần auth,
- không cần Firebase Storage,
- nhưng vẫn cần MongoDB, catalog data và inventory module hoạt động để dữ liệu stock phản ánh đúng.
