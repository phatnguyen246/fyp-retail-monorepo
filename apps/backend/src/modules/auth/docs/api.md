# Auth API Guide

Tài liệu này mô tả cách dùng HTTP API của `auth` module trong backend hiện tại.

## Mục đích

`auth` module chịu trách nhiệm:

- customer register
- login
- logout
- lấy current authenticated user
- auth middleware:
  - `optionalAuth`
  - `requireAuth`
  - `requireAdmin`

Module này không sở hữu persistence của account. Nó đọc/tạo account thông qua internal adapter sang `account` module.

## Phụ thuộc để API hoạt động

Các điều kiện cần:

- Backend app phải khởi động được với MongoDB:
  - `MONGODB_URI`
- Auth JWT secret nên được cấu hình:
  - ưu tiên `AUTH_JWT_SECRET`
  - fallback sang `JWT_SECRET`
- `cookie-parser` phải được mount ở Express app
- `account` module phải được register cùng backend
- `cart` module nên được register nếu muốn hỗ trợ merge guest cart khi register
- Nên setup account indexes trước khi dùng thật:
  - `pnpm --filter @apps/backend run db:setup:account`

Trong code hiện tại:

- auth routes được mount tại `/auth`
- access token lưu trong HTTP-only cookie tên `auth_access_token`
- access token lifetime là `1 giờ`
- login có rate limit `5` lần trong `15 phút`
- `secure=true` nếu `NODE_ENV=production`

## Liên hệ với các module khác

Auth phụ thuộc vào:

- `account` module:
  - đọc account theo `accountId`
  - đọc account theo email
  - tạo customer account mới khi register
- `cart` module:
  - nếu request register có guest cart cookie thì guest cart sẽ được reassign sang customer mới

Auth middleware dựng request context từ JWT:

- `req.isAuthenticated`
- `req.accountId`
- `req.role`
- `req.email`
- `req.user.id`

Lưu ý quan trọng:

- `req.user.id` hiện được set bằng `accountId` để không phá các logic cũ trong cart/catalog
- `sub` trong JWT là `accountId`, không dùng email làm internal identity

## Danh sách endpoint

Base URL ví dụ:

```txt
http://localhost:3000/auth
```

### 1. `POST /auth/register`

Tạo customer account mới và đăng nhập ngay sau khi tạo.

Request body:

```json
{
  "email": "customer@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

Hành vi:

- normalize email bằng `trim + lowercase`
- check email đã tồn tại chưa
- hash password bằng bcrypt, salt rounds = `10`
- tạo account role = `customer`
- issue JWT
- set cookie `auth_access_token`
- nếu có cookie guest cart thì merge guest cart sang customer mới

Success response:

```json
{
  "data": {
    "accountId": "generated-account-id",
    "email": "customer@example.com",
    "role": "customer"
  }
}
```

Các lỗi thường gặp:

- `422 VALIDATION_ERROR`: body không hợp lệ
- `409 AUTH_CONFLICT`: email đã tồn tại

### 2. `POST /auth/login`

Đăng nhập bằng email và password.

Request body:

```json
{
  "email": "customer@example.com",
  "password": "password123"
}
```

Hành vi:

- normalize email
- đọc account theo email từ `account` module
- verify password bằng bcrypt
- issue JWT
- set cookie `auth_access_token`
- không merge guest cart

Success response:

```json
{
  "data": {
    "accountId": "generated-account-id",
    "email": "customer@example.com",
    "role": "customer"
  }
}
```

Các lỗi thường gặp:

- `422 VALIDATION_ERROR`: body không hợp lệ
- `401 AUTH_INVALID_CREDENTIALS`: email hoặc password sai
- `429 AUTH_RATE_LIMITED`: vượt rate limit login

### 3. `POST /auth/logout`

Xóa cookie đăng nhập hiện tại.

Request body:

- không cần body

Hành vi:

- clear cookie `auth_access_token`
- không logout all devices
- không dùng refresh token hay session store

Success response:

```json
{
  "data": {
    "success": true
  }
}
```

### 4. `GET /auth/me`

Lấy current authenticated user từ access token cookie hiện tại.

Yêu cầu:

- request phải có cookie `auth_access_token` hợp lệ

Success response:

```json
{
  "data": {
    "accountId": "generated-account-id",
    "email": "customer@example.com",
    "role": "customer"
  }
}
```

Các lỗi thường gặp:

- `401 AUTH_UNAUTHORIZED`: thiếu token hoặc token không hợp lệ

### 5. `GET /auth/health`

Health check đơn giản cho module auth.

## Cookie behavior

Cookie access token hiện có cấu hình:

- tên: `auth_access_token`
- `httpOnly: true`
- `sameSite: "lax"`
- `path: "/"`
- `secure: true` nếu `NODE_ENV=production`
- `maxAge: 3600000`

Hệ quả:

- frontend/Postman không đọc được token từ JavaScript nếu tuân thủ đúng `httpOnly`
- request tiếp theo phải gửi kèm cookie để gọi `/auth/me` hoặc truy cập admin routes

## Admin middleware trong hệ thống

Sau khi auth được register, `requireAdmin` đang được dùng để bảo vệ:

- `/admin/catalog/*`
- `/admin/inventory/*`

Điều kiện:

- phải có access token hợp lệ
- payload `role` phải là `admin`

Lỗi trả về:

- `401 AUTH_UNAUTHORIZED`
- `403 AUTH_FORBIDDEN`

## Cách chạy bằng Postman

### Chuẩn bị

1. Khởi động backend.
2. Đảm bảo MongoDB đã chạy.
3. Nên setup account indexes:

```bash
docker compose exec backend pnpm --filter @apps/backend run db:setup:account
```

4. Tạo `AUTH_JWT_SECRET` trong `.env` nếu chưa có.
5. Nếu cần tài khoản admin thì seed trước:

```bash
docker compose exec backend pnpm --filter @apps/backend run seed:account:admin
```

### Tạo Postman environment

Tạo biến:

```txt
baseUrl = http://localhost:3000
```

### Chạy luồng register

1. Tạo request `POST {{baseUrl}}/auth/register`
2. Chọn `Body -> raw -> JSON`
3. Dán body:

```json
{
  "email": "customer@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

4. Bấm `Send`
5. Kiểm tra tab `Cookies` của Postman, phải thấy cookie `auth_access_token`

### Chạy luồng me

1. Tạo request `GET {{baseUrl}}/auth/me`
2. Không cần Authorization header
3. Chỉ cần dùng cùng Postman workspace/session để cookie tự được gửi đi
4. Bấm `Send`

### Chạy luồng logout

1. Tạo request `POST {{baseUrl}}/auth/logout`
2. Bấm `Send`
3. Gọi lại `GET {{baseUrl}}/auth/me`
4. Kỳ vọng nhận `401 AUTH_UNAUTHORIZED`

### Test admin access bằng Postman

1. Seed admin account trước
2. Login bằng email/password admin qua `POST {{baseUrl}}/auth/login`
3. Gọi một admin route, ví dụ:

```txt
POST {{baseUrl}}/admin/catalog/products
```

4. Nếu cookie hợp lệ và role = `admin`, request sẽ đi qua middleware `requireAdmin`

## Checklist khi API không hoạt động

- Đã có `MONGODB_URI` chưa
- Đã có `AUTH_JWT_SECRET` hoặc `JWT_SECRET` chưa
- Đã chạy `db:setup:account` chưa
- Email đã normalize thành lowercase chưa
- Postman có đang giữ cookie `auth_access_token` không
- Có bị dính login rate limit không
- Nếu gọi admin route, account có role `admin` chưa

