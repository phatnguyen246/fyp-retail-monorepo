# Payment Module API Guide

## Mục đích

Tài liệu này hướng dẫn sử dụng API của `payment module` trong backend `apps/backend`.

Phạm vi hiện tại của module:

- Hỗ trợ `COD` và `VNPAY`.
- Với `VNPAY`, flow là `2 bước`:
  1. Tạo order trước qua `POST /orders`.
  2. Tạo URL thanh toán qua `POST /payments/vnpay/create-url`.
- Callback chính thức của VNPAY được xử lý qua:
  - `GET /payment/vnpay/return`
  - `GET /payment/vnpay/ipn`

Module này chưa có API public để:

- tra cứu danh sách payment,
- refund,
- retry nhiều payment attempt cho cùng một order.

Ngoài các API public ở trên, backend hiện có thêm một `reconcile job` nội bộ để quét lại các payment VNPAY đang `pending` và chủ động query trạng thái giao dịch từ VNPAY khi IPN bị lỡ.

## Base URL

Khi chạy local bằng Docker Compose, backend mặc định lắng nghe tại:

```text
http://localhost:3000
```

## Phụ thuộc và điều kiện cần

### 1. Service dependencies

`payment module` không hoạt động độc lập. Để gọi được API thanh toán, các phần sau phải hoạt động:

- `MongoDB`
- `auth module`
- `cart module`
- `catalog module`
- `inventory module`
- `ordering module`

Lý do:

- `POST /payments/vnpay/create-url` cần đọc order đã tạo trước đó.
- `IPN` cần cập nhật `payment`, cập nhật `order.paymentStatus`, và có thể commit stock.
- `POST /orders` phụ thuộc cart, catalog, inventory để tạo order hợp lệ trước khi payment có thể sử dụng.

### 2. Biến môi trường bắt buộc cho VNPAY

`COD` không cần cấu hình VNPAY.

`VNPAY` chỉ hoạt động khi backend có đủ các biến môi trường sau:

```env
VNP_VERSION=2.1.0
VNP_TMNCODE=YOUR_TMN_CODE
VNP_HASH_SECRET=YOUR_SECRET_KEY
VNP_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_API_URL=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
VNP_RETURN_URL=http://localhost:3000/payment/vnpay/return
VNP_IPN_URL=http://localhost:3000/payment/vnpay/ipn
VNP_LOCALE=vn
VNP_CURRENCY=VND
```

Lưu ý:

- `VNP_TMNCODE`, `VNP_HASH_SECRET`, `VNP_PAYMENT_URL`, `VNP_RETURN_URL` là bắt buộc khi gọi flow VNPAY.
- `VNP_API_URL` là bắt buộc nếu muốn chạy reconcile job để hỏi ngược trạng thái giao dịch từ VNPAY.
- Validation config là `lazy`, nghĩa là app vẫn boot được nếu env thiếu, nhưng request VNPAY sẽ lỗi `500 PAYMENT_CONFIGURATION_ERROR`.
- `VNP_IPN_URL` hiện được dùng làm cấu hình merchant/callback, không nằm trong URL redirect trả cho client.

### 3. Mongo indexes

Collection `payments` nên được tạo index trước khi dùng ở môi trường thật:

```bash
pnpm --filter @apps/backend run db:setup:payment
```

Index chính:

- unique `paymentCode`
- unique `providerTxnRef`
- non-unique `orderId`
- non-unique `status`
- non-unique `createdAt`

### 4. Điều kiện nghiệp vụ để tạo VNPAY URL

`POST /payments/vnpay/create-url` chỉ hoạt động khi:

- order đã tồn tại,
- order được tạo với `paymentMethod = "vnpay"`,
- `order.paymentStatus` chưa ở trạng thái kết thúc: `paid`, `failed`, `cancelled`,
- `order.orderStatus` chưa là `cancelled` hoặc `completed`,
- `order.grandTotal > 0`,
- requester có quyền truy cập order đó.

### 5. Điều kiện truy cập

Quy tắc truy cập hiện tại:

- `customer` chỉ được tạo payment URL cho order của chính mình.
- `guest` chỉ được tạo payment URL cho guest order.
- `admin` bị chặn ở public route này và sẽ nhận `403 PAYMENT_FORBIDDEN`.

## Tổng quan flow

### Flow COD

1. Client gọi `POST /orders` với `paymentMethod = "cod"`.
2. Hệ thống tạo order.
3. Hệ thống tạo payment record nội bộ `provider = "internal"`, `status = "pending"`.
4. Stock bị trừ ngay trong checkout.
5. Không có bước tạo payment URL.

### Flow VNPAY

1. Client chuẩn bị cart.
2. Client gọi `POST /orders` với `paymentMethod = "vnpay"`.
3. Hệ thống tạo:
   - order `paymentStatus = pending`
   - payment record `provider = vnpay`, `status = pending`
4. Client gọi `POST /payments/vnpay/create-url`.
5. Backend trả `paymentUrl`.
6. Frontend hoặc Postman mở URL đó để redirect sang VNPAY.
7. VNPAY gọi:
   - `GET /payment/vnpay/return`
   - `GET /payment/vnpay/ipn`
8. Chỉ `IPN` mới cập nhật DB chính thức.

### Reconcile pending VNPAY payments

Khi `IPN` bị lỡ do tunnel/downstream network issue, có thể chạy job nội bộ:

```bash
pnpm --filter @apps/backend run job:vnpay:reconcile
```

CLI options hỗ trợ:

```bash
pnpm --filter @apps/backend run job:vnpay:reconcile -- --limit=50 --min-age-minutes=2 --max-age-hours=48 --ip=127.0.0.1
```

Job này sẽ:

- quét payment `provider = vnpay` và `status = pending`,
- gọi `querydr` sang VNPAY bằng `providerTxnRef`,
- nếu VNPAY xác nhận đã thanh toán thì cập nhật payment/order và commit stock bằng cùng logic với `IPN`,
- nếu giao dịch vẫn chưa hoàn tất thì giữ nguyên `pending`.

## API hiện có

### 1. Health check

`GET /payments/health`

Mục đích:

- kiểm tra module `payment` đã được mount hay chưa.

Ví dụ response:

```json
{
  "ok": true,
  "module": "payment"
}
```

### 2. Tạo order trước khi thanh toán

`POST /orders`

Đây không phải route của `payment module`, nhưng là điều kiện bắt buộc để sử dụng flow VNPAY.

Request body:

```json
{
  "cartVariantIds": ["65f000000000000000000902"],
  "phoneNumber": "0900000000",
  "shippingAddressLine": "123 Payment Street",
  "paymentMethod": "vnpay"
}
```

Input rules:

- `cartVariantIds`: mảng ObjectId string, ít nhất 1 phần tử.
- `phoneNumber`: bắt buộc.
- `shippingAddressLine`: bắt buộc.
- `paymentMethod`: `cod | vnpay`, mặc định là `cod`.

Response thành công:

```json
{
  "data": {
    "id": "65f000000000000000000906",
    "orderCode": "ORD-20260316-280697",
    "accountId": "acc_customer_1",
    "phoneNumber": "0900000000",
    "shippingAddressLine": "123 Payment Street",
    "paymentMethod": "vnpay",
    "paymentStatus": "pending",
    "orderStatus": "pending",
    "itemCount": 1,
    "subtotal": 19990000,
    "discountTotal": 0,
    "shippingFee": 0,
    "grandTotal": 19990000,
    "createdAt": "2026-03-16T00:00:00.000Z",
    "updatedAt": "2026-03-16T00:00:00.000Z",
    "items": [],
    "statusLogs": []
  }
}
```

Ghi chú:

- Với `vnpay`, order được tạo trước nhưng stock chưa bị trừ ngay.
- Với `cod`, stock bị trừ ngay khi checkout thành công.

### 3. Tạo VNPAY payment URL

`POST /payments/vnpay/create-url`

Mục đích:

- lấy `paymentUrl` để redirect người dùng sang VNPAY.

Headers:

```http
Content-Type: application/json
Cookie: auth_access_token=...   // chỉ cần cho customer
```

Request body:

- phải truyền đúng `một trong hai` field:
  - `orderId`
  - `orderCode`
- `bankCode` là optional

Ví dụ dùng `orderId`:

```json
{
  "orderId": "65f000000000000000000906"
}
```

Ví dụ dùng `orderCode`:

```json
{
  "orderCode": "ORD-20260316-GUEST01"
}
```

Ví dụ dùng thêm `bankCode`:

```json
{
  "orderId": "65f000000000000000000906",
  "bankCode": "NCB"
}
```

Response thành công:

```json
{
  "data": {
    "orderId": "65f000000000000000000906",
    "orderCode": "ORD-20260316-280697",
    "paymentCode": "PAY-20260316-280697",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1999000000&vnp_Command=pay&vnp_CreateDate=20260316120000&vnp_CurrCode=VND&vnp_ExpireDate=20260316121500&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD+20260316+280697&vnp_OrderType=other&vnp_ReturnUrl=http://localhost:3000/payment/vnpay/return&vnp_TmnCode=TESTTMN&vnp_TxnRef=PAY-20260316-280697&vnp_Version=2.1.0&vnp_SecureHash=..."
  }
}
```

Business rules:

- Nếu order chưa có payment record `pending`, backend sẽ tự dùng initial payment record đã tạo từ checkout.
- `paymentCode` cũng chính là `vnp_TxnRef`.
- `paymentUrl` là chuỗi URL đầy đủ để redirect.

### 4. Return URL

`GET /payment/vnpay/return`

Mục đích:

- verify checksum,
- trả kết quả hiển thị cho frontend hoặc công cụ kiểm tra,
- không cập nhật DB.

Ví dụ response thành công:

```json
{
  "success": true,
  "code": "00",
  "transactionStatus": "00",
  "payload": {
    "vnp_ResponseCode": "00",
    "vnp_TransactionStatus": "00",
    "vnp_TxnRef": "PAY-20260316-280697"
  }
}
```

Ví dụ checksum sai:

```json
{
  "success": false,
  "code": "97",
  "message": "Invalid checksum",
  "payload": null
}
```

### 5. IPN URL

`GET /payment/vnpay/ipn`

Mục đích:

- nhận callback chính thức từ VNPAY,
- verify checksum,
- cập nhật `payments`,
- cập nhật `orders.paymentStatus`,
- commit stock cho order VNPAY nếu thanh toán thành công.

Ví dụ response thành công:

```json
{
  "RspCode": "00",
  "Message": "success"
}
```

Ví dụ checksum sai:

```json
{
  "RspCode": "97",
  "Message": "Fail checksum"
}
```

Lưu ý rất quan trọng:

- Chỉ `IPN` mới cập nhật database.
- Route này phải được VNPAY gọi được từ bên ngoài nếu bạn test end-to-end.
- Nếu bạn chỉ chạy local `http://localhost:3000`, VNPAY Sandbox sẽ không gọi được IPN từ internet.
- Khi test thật với Sandbox, cần public backend bằng tunnel như `ngrok`, `cloudflared`, hoặc công cụ tương đương.

## Mã lỗi thường gặp

### `POST /payments/vnpay/create-url`

`422 VALIDATION_ERROR`

- không truyền `orderId` và `orderCode`,
- hoặc truyền cả hai,
- hoặc `orderId` không đúng format ObjectId,
- hoặc body sai kiểu dữ liệu.

Ví dụ:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "meta": {
    "issues": [
      {
        "path": "orderId",
        "message": "Exactly one of orderId or orderCode is required",
        "code": "custom"
      }
    ]
  }
}
```

`403 PAYMENT_FORBIDDEN`

- admin gọi public route tạo payment URL.

`404 PAYMENT_NOT_FOUND`

- order không tồn tại,
- hoặc order không thuộc quyền truy cập của requester.

`409 PAYMENT_CONFLICT`

- order dùng `paymentMethod = cod`,
- order đã `paid`, `failed`, `cancelled`,
- order đã `cancelled` hoặc `completed`,
- `grandTotal <= 0`.

`500 PAYMENT_CONFIGURATION_ERROR`

- thiếu env VNPAY cần thiết.

## Trạng thái liên quan

### Payment status

- `pending`
- `paid`
- `failed`
- `cancelled`

### Order payment behavior

- `cod`
  - tạo order xong là stock đã commit.
  - không dùng `POST /payments/vnpay/create-url`.
- `vnpay`
  - create order trước,
  - payment ban đầu là `pending`,
  - stock chỉ commit khi `IPN` thành công.

## Hướng dẫn chạy thử bằng Postman

## Chuẩn bị

### 1. Khởi động hệ thống

Từ root repo:

```bash
docker compose up -d
```

Nếu cần setup index:

```bash
docker compose exec backend pnpm --filter @apps/backend run db:setup:payment
docker compose exec backend pnpm --filter @apps/backend run db:setup:ordering
docker compose exec backend pnpm --filter @apps/backend run db:setup:cart
docker compose exec backend pnpm --filter @apps/backend run db:setup:inventory
```

### 2. Tạo environment trong Postman

Tạo các biến:

```text
baseUrl = http://localhost:3000
customerEmail = customer1@example.com
customerPassword = 123456
```

Bạn có thể đổi `customerEmail` và `customerPassword` theo dữ liệu test thực tế.

### 3. Bật cookie jar của Postman

Rất quan trọng vì backend dùng cookie:

- `auth_access_token` cho customer auth
- `cart_guest_id` cho guest cart

Nếu dùng Postman cùng một host `localhost:3000`, cookie thường sẽ được lưu tự động sau các request login hoặc add-to-cart.

## Kịch bản A: Customer thanh toán bằng VNPAY

### Bước 1. Đăng ký hoặc đăng nhập

Nếu chưa có tài khoản:

`POST {{baseUrl}}/auth/register`

```json
{
  "email": "{{customerEmail}}",
  "password": "{{customerPassword}}",
  "confirmPassword": "{{customerPassword}}"
}
```

Hoặc đăng nhập:

`POST {{baseUrl}}/auth/login`

```json
{
  "email": "{{customerEmail}}",
  "password": "{{customerPassword}}"
}
```

Kết quả mong đợi:

- Postman nhận `Set-Cookie` với `auth_access_token`.
- Các request sau tới cùng host sẽ tự gửi cookie này.

### Bước 2. Thêm sản phẩm vào cart

`POST {{baseUrl}}/cart/items`

Ví dụ body:

```json
{
  "variantId": "65f000000000000000000902",
  "quantity": 1
}
```

Lưu ý:

- `variantId` phải tồn tại thật trong catalog/inventory của môi trường bạn đang chạy.
- Nếu variant không tồn tại hoặc hết hàng, order sau đó sẽ không tạo được.

### Bước 3. Tạo order VNPAY

`POST {{baseUrl}}/orders`

```json
{
  "cartVariantIds": ["65f000000000000000000902"],
  "phoneNumber": "0900000000",
  "shippingAddressLine": "123 Payment Street",
  "paymentMethod": "vnpay"
}
```

Kết quả mong đợi:

- response trả về `data.id` và `data.orderCode`
- `paymentStatus = pending`
- order đã được tạo nhưng chưa thanh toán

### Bước 4. Tạo VNPAY URL

`POST {{baseUrl}}/payments/vnpay/create-url`

```json
{
  "orderId": "PASTE_ORDER_ID_HERE"
}
```

Kết quả mong đợi:

- response trả về `paymentCode`
- response trả về `paymentUrl`

### Bước 5. Mở `paymentUrl`

Có 2 cách:

- copy `paymentUrl` sang browser để mở trang VNPAY Sandbox,
- hoặc dùng Postman Visualizer/Send and Download chỉ để xem redirect URL, nhưng thực tế browser tiện hơn.

### Bước 6. Kiểm tra kết quả

Sau khi thanh toán ở VNPAY Sandbox:

- frontend hoặc bạn có thể mở `GET /orders/:orderId` để xem `paymentStatus`
- nếu IPN đã xử lý thành công thì order sẽ có `paymentStatus = paid`

## Kịch bản B: Guest thanh toán bằng VNPAY

### Bước 1. Tạo guest cart

`POST {{baseUrl}}/cart/items`

```json
{
  "variantId": "65f000000000000000000902",
  "quantity": 1
}
```

Kết quả mong đợi:

- backend trả `Set-Cookie: cart_guest_id=...`
- Postman giữ cookie này cho các bước sau

### Bước 2. Tạo order guest với `paymentMethod = vnpay`

`POST {{baseUrl}}/orders`

```json
{
  "cartVariantIds": ["65f000000000000000000902"],
  "phoneNumber": "0900000000",
  "shippingAddressLine": "123 Guest Street",
  "paymentMethod": "vnpay"
}
```

### Bước 3. Tạo payment URL bằng `orderCode`

`POST {{baseUrl}}/payments/vnpay/create-url`

```json
{
  "orderCode": "PASTE_ORDER_CODE_HERE"
}
```

Ghi chú:

- guest không có `auth_access_token`
- route vẫn hoạt động nếu order là guest order

## Kịch bản C: Test callback thủ công trong Postman

Kịch bản này phù hợp để kiểm tra backend logic nội bộ mà không cần redirect thật sang VNPAY.

### Test Return URL

Gọi:

`GET {{baseUrl}}/payment/vnpay/return?...`

Bạn phải truyền query đúng format VNPAY, gồm:

- `vnp_TxnRef`
- `vnp_ResponseCode`
- `vnp_TransactionStatus`
- `vnp_SecureHash`

Vì backend có verify checksum, request giả lập sẽ chỉ pass nếu bạn ký đúng bằng `VNP_HASH_SECRET`.

### Test IPN URL

Gọi:

`GET {{baseUrl}}/payment/vnpay/ipn?...`

Lưu ý:

- Đây là callback hệ thống, không phải route dành cho frontend.
- Nếu checksum sai, backend trả `RspCode = 97`.
- Nếu checksum đúng và trạng thái thành công, backend sẽ cập nhật payment/order thật.

## Một số lưu ý vận hành

- Không dùng `POST /payments/vnpay/create-url` cho order `cod`.
- Không cập nhật DB dựa trên `Return URL`.
- Nếu user bỏ dở ở VNPAY sau khi đã tạo order, cart hiện tại đã được consume từ bước checkout.
- Nếu IPN thành công tới muộn sau khi order đã `cancelled`, hệ thống sẽ ghi `payment` là `paid` nhưng giữ order `cancelled`. Đây là case manual handling ngoài MVP.
- `POST /payments/vnpay/create-url` có thể được gọi lại để lấy cùng một logical payment flow cho order VNPAY còn `pending`.

## Danh sách endpoint liên quan

- `GET /payments/health`
- `POST /payments/vnpay/create-url`
- `GET /payment/vnpay/return`
- `GET /payment/vnpay/ipn`
- `POST /orders`
- `GET /orders/:orderId`
- `POST /auth/register`
- `POST /auth/login`
- `POST /cart/items`
