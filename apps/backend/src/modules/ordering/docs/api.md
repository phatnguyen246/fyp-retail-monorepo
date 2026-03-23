# Ordering Module API Guide

## Mục đích

Tài liệu này hướng dẫn sử dụng API của `ordering module` trong backend `apps/backend`.

Phạm vi hiện tại của module:

- Tạo order từ các item đã có trong cart.
- Hỗ trợ cả `guest` và `customer` tạo order.
- Hỗ trợ `customer` xem danh sách order của chính mình.
- Hỗ trợ `guest` xem lại order detail bằng `orderId` của guest order.
- Hỗ trợ `admin` xem toàn bộ order, cập nhật trạng thái, và hủy order.
- Hỗ trợ `paymentMethod = "cod"` và `paymentMethod = "vnpay"` theo implementation hiện tại.

Module này hiện chưa có API để:

- sửa item của order sau khi tạo,
- xóa order,
- tra cứu guest order theo `phoneNumber`,
- liệt kê order cho guest,
- quản lý shipment,
- refund hoặc đổi trả.

## Base URL

Khi chạy local bằng Docker Compose, backend mặc định lắng nghe tại:

```text
http://localhost:3000
```

## Route hiện có

### Public / customer-facing

- `GET /orders/health`
- `POST /orders`
- `GET /orders`
- `GET /orders/:orderId`
- `POST /orders/:orderId/cancel`

### Admin

- `GET /admin/orders`
- `GET /admin/orders/:orderId`
- `PATCH /admin/orders/:orderId/status`
- `POST /admin/orders/:orderId/cancel`

### Ghi chú tương thích

Ngoài `GET /orders/health`, app hiện vẫn có thêm route health cũ:

- `GET /order/health`

## Phụ thuộc và điều kiện cần để API hoạt động

### 1. Service dependencies

`ordering module` không hoạt động độc lập. Trong app hiện tại, các phần sau cần hoạt động bình thường:

- `MongoDB`
- `auth module`
- `cart module`
- `catalog module`
- `inventory module`
- `payment module`

Lý do:

- `POST /orders` đọc subset item từ `cart` qua internal adapter.
- `POST /orders` luôn validate lại dữ liệu sản phẩm với `catalog`.
- `POST /orders` luôn kiểm tra lại tồn kho với `inventory`.
- `POST /orders` hiện có tạo payment record khởi tạo thông qua `payment checkout adapter`.
- Admin route phụ thuộc `auth` middleware để xác định quyền `admin`.
- Customer list/cancel route phụ thuộc `auth` middleware để xác định `accountId`.

### 2. Mongo indexes

Nên setup index trước khi dùng ở môi trường thật:

```bash
pnpm --filter @apps/backend run db:setup:ordering
```

Nếu dùng `vnpay`, nên setup thêm index cho payment:

```bash
pnpm --filter @apps/backend run db:setup:payment
```

Index quan trọng của `ordering`:

- unique `orderCode`
- non-unique `createdAt`
- non-unique `accountId + createdAt`

### 3. Điều kiện về cart

`POST /orders` hiện là `cart-only checkout`.

Điều đó có nghĩa:

- request phải gửi `cartVariantIds`,
- mỗi `variantId` phải đang tồn tại trong cart của đúng requester,
- quantity lấy từ cart line hiện tại, không lấy từ body create order,
- module `order` không đọc trực tiếp cart repository, mà đi qua cart internal adapter.

Đây là hệ quả quan trọng cho guest:

- guest phải có `cart_guest_id` cookie trước khi gọi `POST /orders`,
- nếu guest chưa từng thêm item vào cart và chưa có cookie này, create order sẽ fail.

Cookie guest cart hiện tại là:

```text
cart_guest_id
```

### 4. Điều kiện về auth và ownership

#### Guest

- Có thể tạo order nếu đã có guest cart hợp lệ.
- Có thể xem lại `GET /orders/:orderId` nếu đó là guest order.
- Không có API list order.
- Không có quyền cancel order.

Lưu ý:

- guest detail hiện tra cứu trực tiếp bằng `orderId`,
- route này không yêu cầu auth cookie,
- route này cũng không kiểm tra `cart_guest_id`,
- vì vậy `orderId` của guest order nên được coi là dữ liệu nhạy cảm.

#### Customer

- Có thể tạo order.
- Order sẽ lưu `accountId`.
- Có thể gọi `GET /orders` để xem danh sách order của chính mình.
- Có thể gọi `GET /orders/:orderId` cho order thuộc chính mình.
- Có thể gọi `POST /orders/:orderId/cancel` khi order đang ở trạng thái cho phép hủy.

#### Admin

- Không tạo order qua public flow.
- Phải dùng admin route:
  - `GET /admin/orders`
  - `GET /admin/orders/:orderId`
  - `PATCH /admin/orders/:orderId/status`
  - `POST /admin/orders/:orderId/cancel`

### 5. Điều kiện nghiệp vụ khi create order

Một item chỉ được phép đi vào order nếu tất cả các điều kiện sau đều đúng:

- `variant` tồn tại,
- `variant` không bị xóa,
- `variant.status = active`,
- `product` tồn tại,
- `product` không bị xóa,
- `product.status = active`,
- snapshot bắt buộc đọc được từ catalog:
  - `sku`
  - `product title`
  - `salePrice`
- inventory xác nhận còn hàng,
- inventory có đủ `stockQuantity` so với quantity trong cart.

`order` không tin tuyệt đối vào dữ liệu trong cart. Cart chỉ là nguồn xác định subset item và quantity ban đầu.

### 6. Điều kiện về payment method

Hiện tại `POST /orders` chấp nhận:

- `cod`
- `vnpay`

Nếu dùng `vnpay`, hãy coi `payment module` là dependency bắt buộc trong app hiện tại.

Để flow `vnpay` hoạt động đầy đủ, backend còn cần cấu hình môi trường VNPAY ở `payment module`. Xem thêm:

- [payment/docs/api.md](../../payment/docs/api.md)

### 7. Điều kiện về trạng thái

Trạng thái order hiện tại:

- `pending`
- `confirmed`
- `completed`
- `cancelled`

Luật chuyển trạng thái:

- Khi create order: luôn bắt đầu ở `pending`
- Admin có thể đổi:
  - `pending -> confirmed`
  - `confirmed -> completed`
- Customer hoặc admin có thể cancel khi order đang ở:
  - `pending`
  - `confirmed`

Luật bổ sung cho `vnpay`:

- Admin không được `confirm` hoặc `complete` một order `vnpay` nếu `paymentStatus` chưa là `paid`.

### 8. Điều kiện về stock

Behavior hiện tại phụ thuộc vào `paymentMethod`:

#### COD

- Stock bị trừ ngay khi checkout thành công.
- Nếu order bị hủy sau đó ở trạng thái được phép, stock sẽ được cộng lại.

#### VNPAY

- Order được tạo trước.
- Stock chưa bị trừ ngay tại bước create order.
- Việc commit stock sẽ phụ thuộc payment flow phía sau.

## Tổng quan flow

### Flow guest checkout

1. Guest thêm item vào cart để backend phát sinh `cart_guest_id`.
2. Guest gọi `POST /orders` với `cartVariantIds`, `phoneNumber`, `shippingAddressLine`, và `paymentMethod`.
3. Backend đọc đúng subset item từ cart của guest.
4. Backend validate lại với catalog và inventory.
5. Backend tạo order.
6. Backend trả về order detail, trong đó có `data.id` và `data.orderCode`.
7. Guest có thể gọi lại `GET /orders/:orderId`.

### Flow customer checkout

1. Customer đăng nhập.
2. Customer thêm item vào cart.
3. Customer gọi `POST /orders`.
4. Order được tạo với `accountId` của customer.
5. Customer dùng `GET /orders` để xem danh sách order của chính mình.

### Flow admin xử lý order

1. Admin gọi `GET /admin/orders`.
2. Admin xem detail bằng `GET /admin/orders/:orderId`.
3. Admin đổi trạng thái bằng `PATCH /admin/orders/:orderId/status`.
4. Nếu cần, admin hủy bằng `POST /admin/orders/:orderId/cancel`.

## Authentication và cookie

### Cookie auth

Customer/admin route dùng auth cookie hiện tại:

```text
auth_access_token
```

Thường cookie này được cấp từ:

- `POST /auth/register`
- `POST /auth/login`

### Cookie guest cart

Guest checkout cần cookie:

```text
cart_guest_id
```

Cookie này thường được backend set sau khi guest gọi:

- `POST /cart/items`

## Dữ liệu response

### Summary response

List endpoint trả summary view gồm các field chính:

- `id`
- `orderCode`
- `accountId`
- `phoneNumber`
- `shippingAddressLine`
- `paymentMethod`
- `paymentStatus`
- `orderStatus`
- `itemCount`
- `subtotal`
- `discountTotal`
- `shippingFee`
- `grandTotal`
- `createdAt`
- `updatedAt`

### Detail response

Detail endpoint và create order response trả thêm:

- `items`
- `statusLogs`

## API chi tiết

### 1. Health check

`GET /orders/health`

Mục đích:

- kiểm tra `ordering module` đã được mount hay chưa.

Ví dụ response:

```json
{
  "ok": true,
  "module": "ordering"
}
```

### 2. Tạo order

`POST /orders`

Mục đích:

- tạo order từ các item đang có trong cart.

Request body:

```json
{
  "cartVariantIds": [
    "65f000000000000000000702"
  ],
  "phoneNumber": "0900000000",
  "shippingAddressLine": "123 Nguyen Trai, Quan 1, TP.HCM",
  "paymentMethod": "cod"
}
```

Input rules:

- `cartVariantIds`: bắt buộc, là mảng ObjectId string, tối thiểu 1 phần tử.
- `cartVariantIds` sẽ được unique hóa nếu request gửi trùng.
- `phoneNumber`: bắt buộc.
- `shippingAddressLine`: bắt buộc.
- `paymentMethod`: optional, hỗ trợ `cod | vnpay`, mặc định là `cod`.

Quy tắc quyền:

- `guest` được phép gọi.
- `customer` được phép gọi.
- `admin` bị chặn ở service layer.

Điều kiện thành công:

- requester có cart owner hợp lệ,
- tất cả `cartVariantIds` đều đang nằm trong cart của requester,
- tất cả item đều pass validate với catalog + inventory.

Response thành công mẫu:

```json
{
  "data": {
    "id": "65f000000000000000000906",
    "orderCode": "ORD-20260316-280697",
    "accountId": "acc_customer_1",
    "phoneNumber": "0900000000",
    "shippingAddressLine": "123 Nguyen Trai, Quan 1, TP.HCM",
    "paymentMethod": "cod",
    "paymentStatus": "pending",
    "orderStatus": "pending",
    "itemCount": 1,
    "subtotal": 39980000,
    "discountTotal": 0,
    "shippingFee": 0,
    "grandTotal": 39980000,
    "createdAt": "2026-03-16T00:00:00.000Z",
    "updatedAt": "2026-03-16T00:00:00.000Z",
    "items": [
      {
        "productId": "65f000000000000000000701",
        "variantId": "65f000000000000000000702",
        "sku": "ORDER-BLK-128",
        "productName": "Checkout Phone",
        "variantLabel": "8GB / 128GB / Black",
        "thumbnailUrl": "https://example.com/media.webp",
        "unitPrice": 19990000,
        "quantity": 2,
        "lineTotal": 39980000
      }
    ],
    "statusLogs": [
      {
        "fromStatus": null,
        "toStatus": "pending",
        "changedBy": "customer:acc_customer_1",
        "changedAt": "2026-03-16T00:00:00.000Z"
      }
    ]
  }
}
```

Ghi chú:

- Nếu `paymentMethod = "cod"`, stock bị trừ ngay khi create order thành công.
- Nếu `paymentMethod = "vnpay"`, order vẫn được tạo nhưng stock chưa bị trừ ngay tại bước này.
- Sau khi order tạo thành công, cart lines tương ứng sẽ được remove theo cơ chế best-effort.

### 3. Danh sách order của customer

`GET /orders`

Mục đích:

- lấy danh sách order của customer hiện tại.

Quy tắc quyền:

- chỉ `customer` đã đăng nhập mới gọi được,
- route này không dành cho guest,
- route này không dành cho admin.

Response thành công mẫu:

```json
{
  "data": [
    {
      "id": "65f000000000000000000906",
      "orderCode": "ORD-20260316-280697",
      "accountId": "acc_customer_1",
      "phoneNumber": "0900000000",
      "shippingAddressLine": "123 Nguyen Trai, Quan 1, TP.HCM",
      "paymentMethod": "cod",
      "paymentStatus": "pending",
      "orderStatus": "pending",
      "itemCount": 1,
      "subtotal": 39980000,
      "discountTotal": 0,
      "shippingFee": 0,
      "grandTotal": 39980000,
      "createdAt": "2026-03-16T00:00:00.000Z",
      "updatedAt": "2026-03-16T00:00:00.000Z"
    }
  ]
}
```

Ghi chú:

- Kết quả được lọc theo `accountId` trong auth context.
- Client không thể truyền `accountId` trong query để xem order của người khác.

### 4. Xem order detail

`GET /orders/:orderId`

Mục đích:

- lấy chi tiết một order theo `orderId`.

Quy tắc quyền:

- `customer` chỉ xem được order của chính mình,
- `guest` chỉ xem được guest order,
- `admin` không dùng route này, admin phải dùng `GET /admin/orders/:orderId`.

Behavior quan trọng:

- guest không thể dùng route này để xem order của customer,
- customer không thể xem order của account khác,
- guest lookup chỉ theo `orderId`, không có lookup theo `phoneNumber`.

Response thành công có cùng shape với response detail của `POST /orders`.

### 5. Customer hủy order

`POST /orders/:orderId/cancel`

Mục đích:

- cho customer hủy order của chính mình.

Quy tắc quyền:

- chỉ `customer` đã đăng nhập,
- guest không có quyền cancel,
- admin phải dùng route admin riêng.

Điều kiện hủy:

- order phải thuộc customer hiện tại,
- `orderStatus` phải là `pending` hoặc `confirmed`.

Behavior:

- nếu stock đã commit trước đó, hệ thống sẽ restock,
- `orderStatus` chuyển thành `cancelled`,
- `paymentStatus` chuyển thành `cancelled` nếu payment chưa `paid`,
- nếu payment đang `paid`, `paymentStatus` giữ nguyên là `paid`.

### 6. Admin list order

`GET /admin/orders`

Mục đích:

- lấy toàn bộ order trong hệ thống.

Quy tắc quyền:

- yêu cầu tài khoản `admin`.

Response:

- trả về mảng order summary.

### 7. Admin xem order detail

`GET /admin/orders/:orderId`

Mục đích:

- lấy chi tiết một order bất kỳ.

Quy tắc quyền:

- yêu cầu tài khoản `admin`.

### 8. Admin cập nhật trạng thái order

`PATCH /admin/orders/:orderId/status`

Mục đích:

- cập nhật trạng thái xử lý order.

Request body:

```json
{
  "orderStatus": "confirmed"
}
```

Input rules:

- chỉ chấp nhận `confirmed` hoặc `completed`.

Luật chuyển trạng thái:

- `pending -> confirmed`
- `confirmed -> completed`

Các chuyển trạng thái khác sẽ fail.

Luật bổ sung:

- nếu order là `vnpay` mà `paymentStatus` chưa là `paid`, admin không thể chuyển trạng thái xử lý.

### 9. Admin hủy order

`POST /admin/orders/:orderId/cancel`

Mục đích:

- cho admin hủy order ở trạng thái sớm.

Điều kiện hủy:

- `orderStatus` phải là `pending` hoặc `confirmed`.

Behavior:

- nếu stock đã commit trước đó, hệ thống sẽ restock,
- `orderStatus` chuyển thành `cancelled`,
- `statusLogs` được append thêm bản ghi mới.

## Các lỗi thường gặp

### 400 Bad Request

Thường gặp khi:

- thiếu `phoneNumber`,
- thiếu `shippingAddressLine`,
- `cartVariantIds` rỗng hoặc sai format,
- `orderId` sai ObjectId format,
- body `PATCH /admin/orders/:orderId/status` gửi status không hợp lệ.

### 403 Forbidden

Thường gặp khi:

- `admin` gọi public detail route,
- customer không đăng nhập nhưng gọi route customer-only,
- customer cố cancel khi chưa đăng nhập đúng quyền.

### 404 Not Found

Thường gặp khi:

- order không tồn tại,
- customer truy cập order của account khác,
- guest cố xem customer order.

### 409 Conflict

Thường gặp khi:

- `cartVariantIds` tham chiếu item không có trong cart hiện tại,
- một item trong cart không còn hợp lệ để checkout,
- stock thay đổi trong lúc checkout,
- payment/order đang ở trạng thái không còn phù hợp cho action hiện tại.

## Hướng dẫn chạy bằng Postman

## 1. Chuẩn bị môi trường

### Bước 1: chạy backend

Ví dụ với Docker Compose:

```bash
docker compose up -d
```

### Bước 2: setup index

```bash
docker compose exec backend pnpm --filter @apps/backend run db:setup:ordering
docker compose exec backend pnpm --filter @apps/backend run db:setup:payment
```

Nếu bạn chỉ dùng `cod`, index payment vẫn nên setup trong app hiện tại để flow nhất quán với implementation đang có.

### Bước 3: tạo Postman Environment

Tạo một environment với biến:

```text
baseUrl = http://localhost:3000
```

## 2. Chạy flow guest

### Bước 1: thêm item vào cart để lấy guest cookie

Request:

- Method: `POST`
- URL: `{{baseUrl}}/cart/items`

Body:

```json
{
  "variantId": "65f000000000000000000702",
  "quantity": 1
}
```

Kỳ vọng:

- response thành công,
- Postman lưu cookie `cart_guest_id` cho domain `localhost`.

Kiểm tra cookie trong Postman:

- mở mục `Cookies`
- chọn domain `localhost`
- xác nhận có `cart_guest_id`

### Bước 2: tạo guest order

Request:

- Method: `POST`
- URL: `{{baseUrl}}/orders`

Body:

```json
{
  "cartVariantIds": ["65f000000000000000000702"],
  "phoneNumber": "0900000000",
  "shippingAddressLine": "456 Le Loi, Quan 1, TP.HCM",
  "paymentMethod": "cod"
}
```

Kỳ vọng:

- response `201`,
- response có `data.id` là `orderId`,
- response có `data.orderCode`.

### Bước 3: xem lại guest order

Request:

- Method: `GET`
- URL: `{{baseUrl}}/orders/{{orderId}}`

Kỳ vọng:

- guest xem được nếu `orderId` là của guest order,
- request này không bắt buộc phải gửi lại `cart_guest_id`.

Ghi chú:

- guest không có `GET /orders`,
- guest không có `POST /orders/:orderId/cancel`.

## 3. Chạy flow customer

### Bước 1: đăng ký hoặc đăng nhập customer

Đăng ký:

- Method: `POST`
- URL: `{{baseUrl}}/auth/register`

Body:

```json
{
  "email": "customer@example.com",
  "password": "123456",
  "confirmPassword": "123456"
}
```

Hoặc đăng nhập:

- Method: `POST`
- URL: `{{baseUrl}}/auth/login`

Body:

```json
{
  "email": "customer@example.com",
  "password": "123456"
}
```

Kỳ vọng:

- Postman lưu cookie `auth_access_token`.

### Bước 2: thêm item vào cart

Request:

- Method: `POST`
- URL: `{{baseUrl}}/cart/items`

Body:

```json
{
  "variantId": "65f000000000000000000702",
  "quantity": 2
}
```

### Bước 3: tạo order

Request:

- Method: `POST`
- URL: `{{baseUrl}}/orders`

Body:

```json
{
  "cartVariantIds": ["65f000000000000000000702"],
  "phoneNumber": "0900000000",
  "shippingAddressLine": "789 Tran Hung Dao, Quan 5, TP.HCM",
  "paymentMethod": "cod"
}
```

### Bước 4: xem list order của customer

Request:

- Method: `GET`
- URL: `{{baseUrl}}/orders`

Kỳ vọng:

- chỉ thấy các order có `accountId` của customer hiện tại.

### Bước 5: xem detail hoặc cancel

Xem detail:

- `GET {{baseUrl}}/orders/{{orderId}}`

Cancel:

- `POST {{baseUrl}}/orders/{{orderId}}/cancel`

Lưu ý:

- customer chỉ cancel được khi order đang là `pending` hoặc `confirmed`.

## 4. Chạy flow admin

### Điều kiện

App hiện không có public register route cho admin. Bạn cần một tài khoản admin đã tồn tại sẵn, ví dụ:

- account seed sẵn trong môi trường local,
- hoặc cookie admin có sẵn từ một flow nội bộ khác.

Nếu có admin account và login được qua `POST /auth/login`, Postman sẽ lưu `auth_access_token` như flow customer.

### Bước 1: list order

- Method: `GET`
- URL: `{{baseUrl}}/admin/orders`

### Bước 2: xem detail

- Method: `GET`
- URL: `{{baseUrl}}/admin/orders/{{orderId}}`

### Bước 3: cập nhật trạng thái

- Method: `PATCH`
- URL: `{{baseUrl}}/admin/orders/{{orderId}}/status`

Body:

```json
{
  "orderStatus": "confirmed"
}
```

Sau đó có thể chuyển tiếp sang:

```json
{
  "orderStatus": "completed"
}
```

### Bước 4: hủy order

- Method: `POST`
- URL: `{{baseUrl}}/admin/orders/{{orderId}}/cancel`

## 5. Chạy flow VNPAY từ Postman

`ordering module` hỗ trợ tạo order với `paymentMethod = "vnpay"`, nhưng để hoàn tất thanh toán bạn cần gọi thêm payment API.

Ví dụ create order:

```json
{
  "cartVariantIds": ["65f000000000000000000702"],
  "phoneNumber": "0900000000",
  "shippingAddressLine": "12 Nguyen Hue, Quan 1, TP.HCM",
  "paymentMethod": "vnpay"
}
```

Sau khi có order, gọi tiếp:

- Method: `POST`
- URL: `{{baseUrl}}/payments/vnpay/create-url`

Body:

```json
{
  "orderId": "{{orderId}}"
}
```

Response sẽ chứa `paymentUrl`.

Thực tế sử dụng:

- Postman có thể gọi API để lấy URL,
- nhưng bước redirect thanh toán nên mở `paymentUrl` bằng browser để mô phỏng đúng hơn flow VNPAY,
- callback và IPN của VNPAY thuộc `payment module`, không phải `ordering module`.

Chi tiết đầy đủ xem thêm:

- [payment/docs/api.md](../../payment/docs/api.md)

## Checklist nhanh khi API không chạy được

- Backend đã chạy ở `http://localhost:3000`
- MongoDB đã kết nối thành công
- Đã setup index cho `ordering`
- Guest đã có cookie `cart_guest_id`
- Customer/admin đã có cookie `auth_access_token`
- Cart đã có item đúng `variantId`
- Product và variant còn `active`
- Inventory còn đủ stock
- Nếu dùng `vnpay`, env của payment module đã cấu hình đủ
