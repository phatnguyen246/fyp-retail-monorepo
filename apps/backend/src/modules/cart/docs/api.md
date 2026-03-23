# Cart Module API Guide

## Mục đích

Tài liệu này hướng dẫn sử dụng HTTP API của `cart module` trong backend hiện tại.

Phạm vi đã implement:

- xem cart hiện tại,
- thêm item vào cart,
- cập nhật quantity,
- xóa một item,
- clear toàn bộ cart,
- giữ item stale trong cart và tự loại item invalid khỏi phần được tính checkout.

Phạm vi chưa có trong module hiện tại:

- toggle `selected` bằng API riêng,
- merge cart,
- coupon, shipping, promotion,
- admin cart management,
- checkout trực tiếp từ cart.

## Base URL

Khi chạy local bằng Docker Compose, backend mặc định lắng nghe tại:

```text
http://localhost:3000
```

Base path của cart:

```text
/cart
```

## Route hiện có

### Public / storefront

- `GET /cart/health`
- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:variantId`
- `DELETE /cart/items/:variantId`
- `DELETE /cart`

## Phụ thuộc và điều kiện cần để API hoạt động

### 1. Service dependencies

`cart module` không hoạt động độc lập. Các phần sau phải chạy bình thường:

- `MongoDB`
- `cookie-parser`
- `catalog module`
- `inventory module`

Lý do:

- cart lưu document vào MongoDB,
- cart đọc `cart_guest_id` từ `req.cookies`,
- cart đọc product/variant/media từ `catalog`,
- cart validate stock thực tế bằng `inventory`.

### 2. Điều kiện về app composition

Trong app backend hiện tại:

- `cart`, `catalog`, `inventory`, `ordering` đã được register,
- `cookie-parser` đã được mount ở Express app,
- global error handler đã bật chuẩn lỗi chung.

Lưu ý quan trọng:

- `cart` đã sẵn sàng đọc `req.user.id` để support `customer`,
- nhưng app bootstrap hiện tại chưa mount `auth module`,
- vì vậy khi chạy app đúng theo repo hiện tại, flow thực tế là `guest cart`.

Nếu muốn test `customer cart`, app cần thêm auth middleware sao cho request context có:

```text
req.user.id
```

### 3. Mongo indexes

Nên setup index trước khi dùng thật:

```bash
docker compose exec backend pnpm --filter @apps/backend run db:setup:cart
```

Các module phụ thuộc cũng nên có index tương ứng:

```bash
docker compose exec backend pnpm --filter @apps/backend run db:setup:catalog
docker compose exec backend pnpm --filter @apps/backend run db:setup:inventory
```

Index quan trọng của cart:

- unique `ownerType + ownerKey`

### 4. Điều kiện dữ liệu để API nghiệp vụ chạy thành công

Để add hoặc update quantity thành công, backend cần đồng thời đọc được:

- `variant` từ catalog,
- `product` cha của variant,
- inventory record của variant.

Các điều kiện nghiệp vụ bắt buộc:

- `variant` tồn tại,
- `variant.isDeleted != true`,
- `variant.status = active`,
- `product` tồn tại,
- `product.isDeleted != true`,
- `product.status = active`,
- inventory xác nhận còn hàng,
- `stockQuantity` đủ cho quantity yêu cầu.

Hệ quả:

- nếu `catalog` không có variant hoặc product hợp lệ, cart mutation sẽ fail,
- nếu `inventory` báo hết hàng hoặc stock không đủ, cart mutation sẽ fail,
- khi read cart, item invalid vẫn được giữ lại để người dùng thấy và tự xóa.

### 5. Điều kiện về guest cookie

Guest cart dùng cookie HTTP-only:

```text
cart_guest_id
```

Behavior hiện tại:

- `GET /cart` không phát cookie nếu guest chưa có cart,
- `POST /cart/items` mới phát cookie khi add thành công và guest chưa có cookie,
- các request sau phải gửi lại cùng cookie này để thao tác đúng cart cũ.

Hệ quả:

- nếu gọi `PATCH /cart/items/:variantId` hoặc `DELETE /cart/items/:variantId` mà không có cookie guest, request được xem là anonymous không có cart,
- `PATCH` khi line không tồn tại sẽ trả `404`,
- `DELETE` line không tồn tại vẫn trả `200` theo idempotent rule.

## Cookie và ownership

### Guest

- Không cần auth.
- Cart được định danh bằng `cart_guest_id`.
- Cookie được set sau `POST /cart/items` thành công đầu tiên.

### Customer

- Chỉ hoạt động nếu app có auth middleware gắn `req.user.id`.
- Khi có `req.user.id`, module ưu tiên owner `customer` thay vì guest cookie.
- Flow này chưa tự hoạt động trong app composition hiện tại vì repo chưa mount auth module vào backend app.

## Cart read model

`GET /cart` trả về:

```json
{
  "data": {
    "id": "cart-id-or-null",
    "items": [
      {
        "variantId": "65f000000000000000000602",
        "productId": "65f000000000000000000601",
        "productName": "iPhone 16",
        "variantLabel": "8GB / 128GB / Black",
        "thumbnailUrl": "https://storage.googleapis.com/...",
        "quantity": 2,
        "unitPrice": 22990000,
        "lineTotal": 45980000,
        "currency": "VND",
        "selected": true,
        "isAvailable": true,
        "availabilityStatus": "available",
        "availabilityMessage": null
      }
    ],
    "summary": {
      "totalQuantity": 2,
      "selectedQuantity": 2,
      "totalAmount": 45980000
    }
  }
}
```

Ý nghĩa các field summary:

- `totalQuantity`: tổng quantity của mọi item đang lưu trong cart,
- `selectedQuantity`: tổng quantity của item vừa `selected` vừa đang hợp lệ,
- `totalAmount`: tổng tiền của item vừa `selected` vừa đang hợp lệ.

Hệ quả quan trọng:

- badge cart nên dùng `summary.totalQuantity`,
- khu vực checkout summary nên dùng `summary.selectedQuantity` và `summary.totalAmount`.

## Availability status

Cart item có thể trả các status sau:

- `available`
- `variant_missing`
- `variant_deleted`
- `product_missing`
- `product_deleted`
- `variant_inactive`
- `product_inactive`
- `out_of_stock`
- `insufficient_stock`

Behavior khi item stale:

- item vẫn hiện trong `items[]`,
- `selected` có thể bị auto chuyển sang `false` khi read/reconcile,
- item invalid không được tính vào `summary.totalAmount`.

## Chi tiết từng endpoint

### 1. `GET /cart/health`

Mục đích:

- health check đơn giản cho module cart.

Success response:

```json
{
  "ok": true,
  "module": "cart"
}
```

### 2. `GET /cart`

Mục đích:

- lấy cart hiện tại của requester.

Behavior:

- nếu chưa có cart thì trả `200` với cart rỗng,
- nếu guest chưa có cookie thì không phát cookie ở route này,
- nếu cart đang chứa stale item thì service có thể auto-deselect item invalid trước khi trả response.

Ví dụ response khi chưa có cart:

```json
{
  "data": {
    "id": null,
    "items": [],
    "summary": {
      "totalQuantity": 0,
      "selectedQuantity": 0,
      "totalAmount": 0
    }
  }
}
```

### 3. `POST /cart/items`

Mục đích:

- thêm một variant vào cart,
- nếu variant đã có sẵn thì tăng quantity của line hiện tại thay vì tạo dòng trùng.

Request body:

```json
{
  "variantId": "65f000000000000000000602",
  "quantity": 1
}
```

Ghi chú:

- `quantity` là optional,
- nếu bỏ qua thì mặc định là `1`,
- nếu guest chưa có cookie và add thành công, response sẽ set `cart_guest_id`.

Success response:

```json
{
  "data": {
    "cartId": "65f000000000000000000615",
    "item": {
      "variantId": "65f000000000000000000602",
      "productId": "65f000000000000000000601",
      "productName": "iPhone 16",
      "variantLabel": "8GB / 128GB / Black",
      "thumbnailUrl": "https://storage.googleapis.com/...",
      "quantity": 1,
      "unitPrice": 22990000,
      "lineTotal": 22990000,
      "currency": "VND",
      "selected": true,
      "isAvailable": true,
      "availabilityStatus": "available",
      "availabilityMessage": null
    },
    "summary": {
      "totalQuantity": 1,
      "selectedQuantity": 1,
      "totalAmount": 22990000
    }
  }
}
```

Lưu ý nghiệp vụ:

- nếu item từng bị auto-deselect và user add lại đúng variant đó, đây được xem là explicit reactivation,
- service sẽ validate lại catalog + inventory,
- chỉ khi hợp lệ mới tăng quantity và set lại `selected = true`.

### 4. `PATCH /cart/items/:variantId`

Mục đích:

- cập nhật quantity của line hiện có.

Request body:

```json
{
  "quantity": 3
}
```

Behavior:

- `quantity` phải `>= 1`,
- line không tồn tại trả `404`,
- nếu stock không đủ hoặc variant/product không còn hợp lệ để bán thì trả `409`,
- update thành công được xem là explicit action trên line và response trả item mới + summary mới.

Success response:

```json
{
  "data": {
    "cartId": "65f000000000000000000615",
    "item": {
      "variantId": "65f000000000000000000602",
      "quantity": 3,
      "selected": true,
      "isAvailable": true,
      "availabilityStatus": "available"
    },
    "summary": {
      "totalQuantity": 3,
      "selectedQuantity": 3,
      "totalAmount": 68970000
    }
  }
}
```

### 5. `DELETE /cart/items/:variantId`

Mục đích:

- xóa một line khỏi cart.

Behavior:

- line tồn tại thì xóa thật,
- line không tồn tại vẫn trả `200`,
- response cho biết `removed = true|false`.

Success response:

```json
{
  "data": {
    "cartId": "65f000000000000000000615",
    "variantId": "65f000000000000000000602",
    "removed": true,
    "summary": {
      "totalQuantity": 0,
      "selectedQuantity": 0,
      "totalAmount": 0
    }
  }
}
```

### 6. `DELETE /cart`

Mục đích:

- clear toàn bộ cart hiện tại.

Behavior:

- giữ nguyên cart document,
- chỉ set `items = []`,
- không archive hay close cart.

Success response:

```json
{
  "data": {
    "cartId": "65f000000000000000000615",
    "cleared": true,
    "summary": {
      "totalQuantity": 0,
      "selectedQuantity": 0,
      "totalAmount": 0
    }
  }
}
```

## Chuẩn lỗi hiện tại

Validation lỗi bám global error handler:

- `422 VALIDATION_ERROR`

Ví dụ:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "meta": {
    "issues": [
      {
        "path": "quantity",
        "message": "Too small: expected number to be >0",
        "code": "too_small"
      }
    ]
  }
}
```

Lỗi nghiệp vụ đặc thù của cart:

- `404 CART_ITEM_NOT_FOUND`
- `409 CART_VARIANT_UNAVAILABLE`
- `409 CART_QUANTITY_EXCEEDS_STOCK`

Ví dụ `404` khi update line không tồn tại:

```json
{
  "code": "CART_ITEM_NOT_FOUND",
  "message": "Cart item not found for variant: 65f000000000000000000699",
  "meta": {
    "variantId": "65f000000000000000000699"
  }
}
```

Ví dụ `409` khi stock không đủ:

```json
{
  "code": "CART_QUANTITY_EXCEEDS_STOCK",
  "message": "Requested quantity exceeds stock for variant: 65f000000000000000000602",
  "meta": {
    "variantId": "65f000000000000000000602",
    "requestedQuantity": 5,
    "availableQuantity": 3,
    "availabilityStatus": "insufficient_stock"
  }
}
```

## Cách chạy bằng Postman

### Chuẩn bị

1. Khởi động backend và database:

```bash
docker compose up -d
```

2. Setup index cần thiết:

```bash
docker compose exec backend pnpm --filter @apps/backend run db:setup:cart
docker compose exec backend pnpm --filter @apps/backend run db:setup:catalog
docker compose exec backend pnpm --filter @apps/backend run db:setup:inventory
```

3. Nếu cần dữ liệu catalog mẫu:

```bash
docker compose exec backend pnpm --filter @apps/backend run seed:catalog
```

4. Xác nhận backend sống:

```text
GET http://localhost:3000/cart/health
```

### Tạo Postman environment

Tạo environment với ít nhất biến:

- `baseUrl = http://localhost:3000`
- `variantId = <variant ObjectId hợp lệ trong catalog + inventory>`

### Guest flow cơ bản trong Postman

#### Bước 1. Add item lần đầu

Request:

```http
POST {{baseUrl}}/cart/items
Content-Type: application/json
```

Body:

```json
{
  "variantId": "{{variantId}}"
}
```

Kết quả mong đợi:

- status `200`,
- response có `data.item`,
- Postman tự lưu cookie `cart_guest_id` cho domain `localhost`.

#### Bước 2. Xem cart hiện tại

Request:

```http
GET {{baseUrl}}/cart
```

Kết quả mong đợi:

- Postman tự gửi cookie đã lưu,
- cart trả lại đúng item vừa add.

#### Bước 3. Cập nhật quantity

Request:

```http
PATCH {{baseUrl}}/cart/items/{{variantId}}
Content-Type: application/json
```

Body:

```json
{
  "quantity": 3
}
```

#### Bước 4. Xóa item

Request:

```http
DELETE {{baseUrl}}/cart/items/{{variantId}}
```

#### Bước 5. Clear cart

Request:

```http
DELETE {{baseUrl}}/cart
```

### Cách kiểm tra cookie trong Postman

Trong Postman desktop:

- mở request bất kỳ đến `localhost:3000`,
- bấm nút `Cookies`,
- kiểm tra domain `localhost`,
- xác nhận có `cart_guest_id` sau khi `POST /cart/items` thành công.

Lưu ý:

- `GET /cart` khi chưa có cart sẽ không tạo cookie,
- nếu bạn xóa cookie thủ công trong Postman rồi gọi `PATCH` hoặc `DELETE`, API sẽ xử lý như guest chưa có cart.

### Cách chạy các case lỗi trong Postman

#### 1. Body invalid

Gửi:

```json
{
  "variantId": "{{variantId}}",
  "quantity": 0
}
```

Kết quả mong đợi:

- `422 VALIDATION_ERROR`

#### 2. Variant không tồn tại hoặc inactive

Gửi `variantId` hợp lệ về format nhưng không còn bán được.

Kết quả mong đợi:

- `409 CART_VARIANT_UNAVAILABLE`

#### 3. Quantity vượt stock

Gửi `PATCH /cart/items/:variantId` với quantity lớn hơn stock thực tế.

Kết quả mong đợi:

- `409 CART_QUANTITY_EXCEEDS_STOCK`

#### 4. Update line không tồn tại

Gọi:

```http
PATCH {{baseUrl}}/cart/items/65f000000000000000000699
```

Body:

```json
{
  "quantity": 2
}
```

Kết quả mong đợi:

- `404 CART_ITEM_NOT_FOUND`

### Gợi ý collection Postman tối thiểu

Bạn nên tạo một collection `Cart API` gồm các request theo thứ tự:

1. `GET /cart/health`
2. `GET /cart`
3. `POST /cart/items`
4. `PATCH /cart/items/:variantId`
5. `DELETE /cart/items/:variantId`
6. `DELETE /cart`

Nếu cần debug ownership guest:

- xóa cookie `cart_guest_id`,
- gọi lại `POST /cart/items`,
- kiểm tra cookie mới được tạo sau response thành công.

## Kiểm thử bằng lệnh

Sau khi thay đổi code, có thể verify toàn bộ backend test bằng:

```bash
docker compose exec backend pnpm --filter @apps/backend test -- --reporter=verbose
```

## Liên hệ tài liệu khác

- [auth/docs/api.md](../../auth/docs/api.md)
- [ordering/docs/api.md](../../ordering/docs/api.md)
