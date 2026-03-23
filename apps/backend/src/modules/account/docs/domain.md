# Account Module Guide

Tài liệu này mô tả `account` module trong backend hiện tại.

Lưu ý:

- Ở MVP hiện tại, `account` module chưa expose public HTTP API riêng
- Module này chủ yếu cung cấp internal services cho `auth` và seed script cho admin account

## Mục đích

`account` module chịu trách nhiệm:

- persistence model của account
- tạo account
- đọc account theo `accountId`
- đọc account theo email
- đảm bảo email unique
- giữ role của account
- seed admin account

Module này không chịu trách nhiệm:

- login
- logout
- issue/verify JWT
- auth middleware

Những phần đó thuộc `auth` module.

## Data model hiện tại

Document account tối thiểu gồm:

- `_id`: MongoDB `ObjectId`
- `accountId`: internal identity ổn định
- `email`: email đã normalize
- `passwordHash`
- `role`: `customer` hoặc `admin`
- `createdAt`
- `updatedAt`

Lưu ý:

- internal identity dùng `accountId`, không dùng email
- `accountId` hiện được generate bằng `randomUUID()`
- email chỉ là login identifier

## Phụ thuộc để account module hoạt động

Các điều kiện cần:

- MongoDB phải hoạt động
- backend phải có `MONGODB_URI`
- nên setup account indexes trước khi dùng thật
- bcrypt là dependency cần thiết cho luồng seed admin vì script seed tự hash password trước khi tạo account

## Indexes bắt buộc

Hiện tại account module tạo 2 unique index:

- `accountId`
- `email`

Script setup:

```bash
docker compose exec backend pnpm --filter @apps/backend run db:setup:account
```

Nếu chưa setup index:

- duplicate email vẫn có thể được chặn ở service layer
- nhưng về dữ liệu thực tế vẫn không an toàn bằng unique index trong database

## Internal services hiện có

`account` module hiện expose các service nội bộ sau:

- `createAccount`
- `getAccountById`
- `getAccountByEmail`
- `ensureEmailAvailable`
- `seedAdminAccount`

Các service này được tạo trong backend bootstrap và được `auth` gọi thông qua internal adapter.

## Quan hệ với auth module

Quan hệ hiện tại:

- `account` sở hữu entity + repository + business cơ bản của account
- `auth` gọi sang `account` qua internal adapter `account-auth.reader`

Điều này có nghĩa:

- `auth` không truy cập thẳng `accountRepository`
- `auth` không sở hữu logic account business
- `account` có thể tiếp tục mở rộng sau này cho:
  - profile
  - change email
  - account status
  - admin account management

## Luồng đang dùng account module

### 1. Customer register

Luồng do `auth` orchestration:

1. `auth` validate email/password
2. `auth` normalize email
3. `auth` gọi `account.getAccountByEmail`
4. Nếu chưa tồn tại:
   - `auth` hash password
   - `auth` gọi `account.createAccount`
5. `account` tạo document mới:
   - `accountId`
   - `email`
   - `passwordHash`
   - `role = customer`
6. `auth` issue JWT và set cookie

### 2. Login

1. `auth` normalize email
2. `auth` gọi `account.getAccountByEmail`
3. `auth` verify password
4. `auth` issue JWT

### 3. Current user

1. `auth` verify access token
2. lấy `sub = accountId`
3. `auth` gọi `account.getAccountById`

## Seed admin account

Hiện tại đã có seed script tạo admin account.

Command:

```bash
docker compose exec backend pnpm --filter @apps/backend run seed:account:admin
```

Biến môi trường cần có:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=strong-password
ADMIN_ACCOUNT_ID=optional-custom-account-id
```

Behavior:

- nếu `ADMIN_ACCOUNT_ID` không có thì service tự generate bằng `randomUUID()`
- nếu email đã tồn tại và role đã là `admin`, script xem như thành công
- nếu email đã tồn tại nhưng là account không phải admin, script sẽ fail conflict

## Cách dùng bằng Postman

Vì `account` hiện chưa có public HTTP endpoints riêng, nên Postman không gọi trực tiếp `account` module.

Postman nên được dùng theo 2 hướng:

### 1. Test account gián tiếp qua auth API

Bạn có thể test các hành vi account qua các request auth:

- `POST /auth/register`
  - tạo account customer mới
- `POST /auth/login`
  - đọc account theo email
- `GET /auth/me`
  - đọc account theo `accountId`

Nói cách khác:

- muốn test create/read account bằng Postman thì hiện tại hãy đi qua `auth` API

### 2. Tạo admin account bằng terminal trước, rồi dùng Postman đăng nhập

Quy trình đề xuất:

1. Chạy setup index:

```bash
docker compose exec backend pnpm --filter @apps/backend run db:setup:account
```

2. Set `.env`:

```env
ADMIN_EMAIL=admin@fyp-retail.local
ADMIN_PASSWORD=Adm1n!9vK#2pL@7x
ADMIN_ACCOUNT_ID=acc_admin_01hyz9r8k3m4n5p6q7t8u9v0w
```

3. Seed admin:

```bash
docker compose exec backend pnpm --filter @apps/backend run seed:account:admin
```

4. Mở Postman
5. Gọi:

```txt
POST http://localhost:3000/auth/login
```

Body:

```json
{
  "email": "admin@fyp-retail.local",
  "password": "Adm1n!9vK#2pL@7x"
}
```

6. Sau khi login thành công, Postman sẽ giữ cookie `auth_access_token`
7. Tiếp tục gọi các admin routes như:

```txt
POST http://localhost:3000/admin/catalog/products
GET http://localhost:3000/admin/inventory/low-stock
```

## Điều kiện cần để auth API dùng được account module

Nếu auth API lỗi do account layer, hãy kiểm tra:

- MongoDB đã chạy chưa
- `MONGODB_URI` đã đúng chưa
- đã setup unique indexes chưa
- email đã normalize lowercase chưa
- script seed admin có chạy thành công chưa
- collection `accounts` có dữ liệu không

## Những gì account module chưa hỗ trợ ở MVP

Hiện chưa có:

- public account CRUD API
- change email
- forgot password
- reset password
- change password
- profile fields như `displayName`, `phoneNumber`, `avatar`
- account status
- soft delete account

Nếu sau này cần UI quản trị account, có thể thêm HTTP routes riêng cho `account` module mà không phá identity hiện tại, vì toàn bộ ownership và token subject đã dùng `accountId`.

