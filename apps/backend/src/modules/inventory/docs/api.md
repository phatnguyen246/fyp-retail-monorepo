# Inventory Module API Guide

Tài liệu này hướng dẫn sử dụng HTTP API của `inventory` module trong backend hiện tại.

## Mục đích

`inventory` module chịu trách nhiệm quản lý tồn kho tối giản ở mức `variantId`:

- lưu `stockQuantity` theo SKU,
- cho phép admin tạo và cập nhật inventory record,
- cung cấp read API cho module khác và storefront,
- phát hiện low stock theo `lowStockThreshold`,
- đồng bộ availability ngược sang `catalog` sau mỗi lần admin write.

Phạm vi hiện tại chưa phải warehouse management đầy đủ. Module này không có:

- multi-warehouse,
- reservation,
- inventory transaction ledger,
- inbound/outbound workflow,
- reorder automation.

## Base URL

Khi chạy local bằng Docker Compose, backend mặc định lắng nghe tại:

```text
http://localhost:3000
```

Inventory có 2 nhóm route:

- public read routes: `/inventory`
- admin routes: `/admin/inventory`

## Phụ thuộc và điều kiện cần để API hoạt động

### 1. Runtime dependencies

Các điều kiện cần ở mức app:

- `MongoDB` phải chạy bình thường
- biến môi trường `MONGODB_URI` phải tồn tại
- backend phải mount:
  - `express.json()`
  - `cookie-parser`
  - global error handler
- các module sau phải được register cùng app:
  - `auth`
  - `catalog`
  - `inventory`

Lý do:

- inventory lưu dữ liệu vào MongoDB,
- admin routes dùng auth middleware `requireAdmin`,
- create/update inventory phụ thuộc trực tiếp vào `catalog` để:
  - validate `variantId`,
  - sync `catalog.variant.isInStock`,
  - rebuild `catalog.product.hasInStockVariants`.

### 2. Auth và quyền truy cập

Public read routes của inventory không yêu cầu đăng nhập.

Admin routes yêu cầu:

- request có cookie `auth_access_token` hợp lệ,
- account hiện tại có `role = admin`.

Lưu ý quan trọng:

- backend hiện dùng cookie-based auth, không dùng Bearer token cho các admin route này,
- cookie được set bởi `POST /auth/login`,
- Postman cần giữ lại cookie này cho domain `localhost`.

### 3. Điều kiện dữ liệu nghiệp vụ

#### Public read routes

Các route read public không validate catalog variant tồn tại.

Nếu inventory record chưa tồn tại, API vẫn trả thành công với fallback an toàn:

- `stockQuantity = 0`
- `isInStock = false`

#### Admin write routes

Để `POST /admin/inventory/records` hoặc `PATCH /admin/inventory/variants/:variantId` chạy thành công, cần đồng thời thỏa:

- `variantId` là ObjectId hợp lệ,
- variant phải tồn tại trong `catalog`,
- variant không bị soft-delete,
- với `PATCH`, inventory record phải tồn tại từ trước.

Nếu catalog variant không tồn tại hoặc đã bị soft-delete:

- API trả `404 INVENTORY_CATALOG_VARIANT_NOT_FOUND`

Nếu inventory record chưa tồn tại mà gọi `PATCH`:

- API trả `404 INVENTORY_NOT_FOUND`

### 4. Mongo indexes

Nên setup index trước khi dùng thật:

```bash
docker compose exec backend pnpm --filter @apps/backend run db:setup:inventory
```

Catalog cũng nên có index vì inventory write phụ thuộc catalog:

```bash
docker compose exec backend pnpm --filter @apps/backend run db:setup:catalog
```

Index quan trọng của inventory:

- unique `variantId`
- index thường `stockQuantity`

### 5. Seed admin account

Admin route của inventory không dùng được nếu chưa có admin account.

Repo hiện có script seed admin, nhưng bạn phải truyền biến môi trường:

```bash
docker compose exec \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD=password123 \
  backend \
  pnpm --filter @apps/backend run seed:account:admin
```

Lưu ý:

- script này không tạo catalog product/variant,
- `seed:catalog` hiện chỉ seed reference data như brand/category/tag/badge,
- inventory write vẫn cần một `variantId` thật từ catalog.

## Cách module này tích hợp với catalog

Inventory write không hoạt động độc lập.

Sau khi create/update inventory record thành công:

1. inventory derive `isInStock = stockQuantity > 0`
2. inventory gọi internal adapter sang `catalog`
3. catalog cập nhật `variant.isInStock`
4. catalog rebuild `product.hasInStockVariants`

Hệ quả quan trọng:

- inventory là source of truth cho stock quantity,
- catalog giữ read model availability để phục vụ các flow storefront hiện tại,
- nếu sync catalog thất bại sau khi inventory đã ghi DB, API trả:
  - `500 INVENTORY_CATALOG_SYNC_FAILED`

Lưu ý rất quan trọng:

- phase hiện tại không có transaction/rollback giữa inventory và catalog,
- vì vậy có thể xảy ra trường hợp inventory record đã được ghi nhưng response vẫn là lỗi `500` do sync catalog hỏng.

## Response format

### 1. Public read routes

Public inventory read trả raw JSON, không bọc trong `{ "data": ... }`.

Ví dụ:

```json
{
  "variantId": "65f000000000000000000302",
  "stockQuantity": 5,
  "isInStock": true
}
```

### 2. Admin routes

Admin inventory routes trả payload theo dạng:

```json
{
  "data": { ... }
}
```

Ví dụ:

```json
{
  "data": {
    "id": "65f000000000000000000313",
    "variantId": "65f000000000000000000302",
    "stockQuantity": 5,
    "lowStockThreshold": 3,
    "isInStock": true,
    "isLowStock": false,
    "recordExists": true,
    "createdAt": "2026-03-12T00:00:00.000Z",
    "updatedAt": "2026-03-12T00:00:00.000Z"
  }
}
```

### 3. Error format

Validation error:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "meta": {
    "issues": [
      {
        "path": "stockQuantity",
        "message": "Expected number, received nan",
        "code": "invalid_type"
      }
    ]
  }
}
```

HTTP error do service ném ra:

```json
{
  "code": "INVENTORY_CATALOG_VARIANT_NOT_FOUND",
  "message": "Catalog variant unavailable for inventory: 65f000000000000000000399",
  "meta": {
    "variantId": "65f000000000000000000399"
  }
}
```

## Danh sách endpoint

### Public routes

### 1. `GET /inventory/health`

Health check đơn giản cho module inventory.

Success response:

```json
{
  "ok": true,
  "module": "inventory"
}
```

### 2. `GET /inventory/variants/:variantId`

Đọc inventory read model theo một variant.

Đây là route read-only, không validate catalog.

Nếu record chưa tồn tại, route vẫn trả `200` với fallback out-of-stock.

Ví dụ:

```http
GET /inventory/variants/65f000000000000000000302
```

Success response khi record tồn tại:

```json
{
  "variantId": "65f000000000000000000302",
  "stockQuantity": 5,
  "isInStock": true
}
```

Success response khi record chưa tồn tại:

```json
{
  "variantId": "65f000000000000000000399",
  "stockQuantity": 0,
  "isInStock": false
}
```

### 3. `POST /inventory/variants/read`

Đọc batch inventory theo nhiều `variantId`.

Request body:

```json
{
  "variantIds": [
    "65f000000000000000000302",
    "65f000000000000000000323"
  ]
}
```

Behavior:

- `variantIds` phải là array không rỗng,
- các phần tử phải là ObjectId hợp lệ,
- request body là `strict`, field thừa sẽ bị validation error,
- input được deduplicate trước khi query.

Success response:

```json
[
  {
    "variantId": "65f000000000000000000302",
    "stockQuantity": 5,
    "isInStock": true
  },
  {
    "variantId": "65f000000000000000000323",
    "stockQuantity": 0,
    "isInStock": false
  }
]
```

### Admin routes

Tất cả route dưới đây yêu cầu cookie admin hợp lệ.

### 4. `POST /admin/inventory/records`

Tạo inventory record mới cho một variant.

Request body:

```json
{
  "variantId": "65f000000000000000000302",
  "stockQuantity": 5,
  "lowStockThreshold": 3
}
```

Rule:

- `variantId` bắt buộc,
- `stockQuantity` bắt buộc,
- `lowStockThreshold` optional, default = `3`,
- mọi số phải là integer không âm,
- mỗi `variantId` chỉ có một inventory record.

Success response:

```json
{
  "data": {
    "id": "65f000000000000000000313",
    "variantId": "65f000000000000000000302",
    "stockQuantity": 5,
    "lowStockThreshold": 3,
    "isInStock": true,
    "isLowStock": false,
    "recordExists": true,
    "createdAt": "2026-03-12T00:00:00.000Z",
    "updatedAt": "2026-03-12T00:00:00.000Z"
  }
}
```

Lỗi thường gặp:

- `401 AUTH_UNAUTHORIZED`
- `403 AUTH_FORBIDDEN`
- `404 INVENTORY_CATALOG_VARIANT_NOT_FOUND`
- `409 INVENTORY_CONFLICT`
- `422 VALIDATION_ERROR`
- `500 INVENTORY_CATALOG_SYNC_FAILED`

### 5. `GET /admin/inventory/variants/:variantId`

Đọc full inventory record view theo variant.

Khác với `PATCH`, route này không bắt buộc record phải tồn tại.

Nếu record chưa tồn tại, API vẫn trả `200` với:

- `recordExists = false`
- `stockQuantity = 0`
- `isInStock = false`

Ví dụ response khi record chưa tồn tại:

```json
{
  "data": {
    "id": null,
    "variantId": "65f000000000000000000399",
    "stockQuantity": 0,
    "lowStockThreshold": null,
    "isInStock": false,
    "isLowStock": false,
    "recordExists": false,
    "createdAt": null,
    "updatedAt": null
  }
}
```

### 6. `PATCH /admin/inventory/variants/:variantId`

Cập nhật inventory record hiện có.

Request body:

```json
{
  "stockQuantity": 0,
  "lowStockThreshold": 2
}
```

Rule:

- body phải có ít nhất một field mutable,
- chỉ hỗ trợ:
  - `stockQuantity`
  - `lowStockThreshold`
- các giá trị phải là integer không âm,
- record phải tồn tại trước,
- catalog variant tương ứng phải còn tồn tại.

Success response:

```json
{
  "data": {
    "id": "65f000000000000000000313",
    "variantId": "65f000000000000000000302",
    "stockQuantity": 0,
    "lowStockThreshold": 2,
    "isInStock": false,
    "isLowStock": true,
    "recordExists": true,
    "createdAt": "2026-03-12T00:00:00.000Z",
    "updatedAt": "2026-03-16T12:00:00.000Z"
  }
}
```

Lỗi thường gặp:

- `401 AUTH_UNAUTHORIZED`
- `403 AUTH_FORBIDDEN`
- `404 INVENTORY_NOT_FOUND`
- `404 INVENTORY_CATALOG_VARIANT_NOT_FOUND`
- `422 VALIDATION_ERROR`
- `500 INVENTORY_CATALOG_SYNC_FAILED`

### 7. `POST /admin/inventory/variants/read`

Batch read bản admin.

Hiện tại logic read vẫn dùng cùng read contract như public batch route, nhưng response được bọc trong `{ "data": ... }`.

Request body:

```json
{
  "variantIds": [
    "65f000000000000000000302",
    "65f000000000000000000323"
  ]
}
```

Success response:

```json
{
  "data": [
    {
      "variantId": "65f000000000000000000302",
      "stockQuantity": 5,
      "isInStock": true
    },
    {
      "variantId": "65f000000000000000000323",
      "stockQuantity": 0,
      "isInStock": false
    }
  ]
}
```

### 8. `GET /admin/inventory/low-stock`

Lấy danh sách inventory record đang low stock.

Điều kiện low stock:

```text
stockQuantity <= lowStockThreshold
```

Behavior:

- chỉ trả record đã tồn tại,
- được sort theo:
  - `stockQuantity` tăng dần
  - `updatedAt` tăng dần

Success response:

```json
{
  "data": [
    {
      "id": "65f000000000000000000313",
      "variantId": "65f000000000000000000302",
      "stockQuantity": 0,
      "lowStockThreshold": 2,
      "isInStock": false,
      "isLowStock": true,
      "recordExists": true,
      "createdAt": "2026-03-12T00:00:00.000Z",
      "updatedAt": "2026-03-16T12:00:00.000Z"
    }
  ]
}
```

## Validation notes

Inventory validation hiện dùng `zod`.

Các rule đáng chú ý:

- mọi request body đều `strict`
- `variantId` phải là MongoDB ObjectId hợp lệ
- `stockQuantity` phải là integer không âm
- `lowStockThreshold` phải là integer không âm
- `PATCH` body không được rỗng
- batch read yêu cầu `variantIds.length >= 1`

## Hướng dẫn dùng Postman

### 1. Chuẩn bị môi trường chạy backend

Khởi động MongoDB và backend:

```bash
docker compose up -d mongo backend
```

Setup index cần thiết:

```bash
docker compose exec backend pnpm --filter @apps/backend run db:setup:inventory
docker compose exec backend pnpm --filter @apps/backend run db:setup:catalog
```

Seed admin account:

```bash
docker compose exec \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD=password123 \
  backend \
  pnpm --filter @apps/backend run seed:account:admin
```

### 2. Tạo Postman environment

Tạo các biến:

- `baseUrl = http://localhost:3000`
- `adminEmail = admin@example.com`
- `adminPassword = password123`
- `productId =` để trống ban đầu
- `variantId =` để trống ban đầu

### 3. Đăng nhập admin để lấy cookie

Tạo request:

- Method: `POST`
- URL: `{{baseUrl}}/auth/login`
- Headers:
  - `Content-Type: application/json`
- Body:

```json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
```

Success response:

```json
{
  "data": {
    "accountId": "generated-account-id",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

Sau khi request thành công:

- Postman sẽ lưu cookie `auth_access_token` cho domain `localhost`,
- các request tiếp theo tới `{{baseUrl}}` sẽ tự gửi cookie nếu dùng cùng cookie jar.

Nếu muốn kiểm tra:

- mở tab `Cookies` trong Postman,
- kiểm tra cookie `auth_access_token` đã xuất hiện cho `localhost`.

### 4. Lấy `variantId` để test inventory

Inventory admin write bắt buộc cần một `variantId` có thật trong catalog.

Repo hiện chưa có admin route list products riêng cho catalog, nên cách ít ma sát nhất là:

1. gọi `GET {{baseUrl}}/catalog/products`
2. lấy `data[0].productId`
3. gọi `GET {{baseUrl}}/catalog/products/:productId`
4. lấy một trong các giá trị:
   - `data.defaultSelectedVariantId`
   - hoặc `data.variants[0].id`

Gán giá trị này vào biến Postman `variantId`.

Lưu ý:

- nếu hệ thống chưa có product/variant nào trong catalog thì bạn sẽ không tạo inventory record được,
- `seed:catalog` chỉ tạo brand/category/tag/badge, không tạo product/variant.

### 5. Tạo inventory record trong Postman

Request:

- Method: `POST`
- URL: `{{baseUrl}}/admin/inventory/records`
- Headers:
  - `Content-Type: application/json`
- Body:

```json
{
  "variantId": "{{variantId}}",
  "stockQuantity": 5,
  "lowStockThreshold": 3
}
```

Nếu thành công:

- inventory record được tạo,
- `catalog.variant.isInStock` sẽ được sync thành `true`,
- `catalog.product.hasInStockVariants` cũng được rebuild.

### 6. Kiểm tra public read API

Request:

- Method: `GET`
- URL: `{{baseUrl}}/inventory/variants/{{variantId}}`

Expected response:

```json
{
  "variantId": "{{variantId}}",
  "stockQuantity": 5,
  "isInStock": true
}
```

### 7. Cập nhật stock về 0

Request:

- Method: `PATCH`
- URL: `{{baseUrl}}/admin/inventory/variants/{{variantId}}`
- Headers:
  - `Content-Type: application/json`
- Body:

```json
{
  "stockQuantity": 0
}
```

Expected behavior:

- inventory trả `isInStock = false`
- catalog availability được sync lại
- nếu `lowStockThreshold >= 0` thì record thường sẽ trở thành low stock

### 8. Kiểm tra low-stock list

Request:

- Method: `GET`
- URL: `{{baseUrl}}/admin/inventory/low-stock`

Expected:

- record vừa update về `0` xuất hiện trong danh sách,
- response được bọc trong `{ "data": [...] }`

### 9. Một số lỗi Postman thường gặp

### `401 AUTH_UNAUTHORIZED`

Nguyên nhân:

- chưa login,
- cookie `auth_access_token` chưa được Postman gửi lại,
- cookie hết hạn hoặc không hợp lệ.

### `403 AUTH_FORBIDDEN`

Nguyên nhân:

- đã login nhưng account không có role `admin`.

### `404 INVENTORY_CATALOG_VARIANT_NOT_FOUND`

Nguyên nhân:

- `variantId` không tồn tại,
- hoặc variant đã bị soft-delete trong catalog.

### `404 INVENTORY_NOT_FOUND`

Nguyên nhân:

- gọi `PATCH` cho variant chưa có inventory record.

### `409 INVENTORY_CONFLICT`

Nguyên nhân:

- đã có inventory record cho `variantId` này rồi,
- mỗi variant chỉ được có một record.

### `422 VALIDATION_ERROR`

Nguyên nhân phổ biến:

- `variantId` không phải ObjectId hợp lệ,
- `stockQuantity` âm,
- `PATCH` body rỗng,
- body có field thừa.

## Gợi ý test nhanh theo thứ tự

Nếu muốn smoke test inventory nhanh bằng Postman, thứ tự nên là:

1. `POST /auth/login`
2. `GET /catalog/products`
3. `GET /catalog/products/:productId`
4. `POST /admin/inventory/records`
5. `GET /inventory/variants/:variantId`
6. `PATCH /admin/inventory/variants/:variantId`
7. `GET /admin/inventory/low-stock`

Thứ tự này bám đúng dependency thực tế của codebase hiện tại và ít phải thao tác DB thủ công nhất.
