# Frontend Discovery From Backend Source

## Scope and evidence

Tài liệu này suy ra frontend từ source code backend hiện tại của repo ở commit `daaf7505b2bda910d92bd7e524aae84c9d998e17`.

Nguồn đọc chính:

- `apps/backend/src/bootstrap/modules.js`
- `apps/backend/src/modules/*/http/*.routes.js`
- `apps/backend/src/modules/*/validation/*.schema.js`
- `apps/backend/src/modules/*/services/*.service.js`
- `apps/backend/src/modules/*/tests/*http.integration.spec.js`
- `apps/frontend/src/App.vue`

Kết luận nền tảng:

- frontend hiện tại vẫn là scaffold Vite/Vue mặc định, chưa phản ánh sản phẩm thật
- route map bên dưới là route map suy ra từ backend, chưa phải UI đã tồn tại
- backend hiện là nguồn chân lý tốt nhất cho scope frontend

## Executive summary

Những page có cơ sở mạnh nhất từ backend hiện tại:

- storefront auth: login, register, session bootstrap
- storefront catalog: list, search, product detail, compare
- storefront cart: cart, checkout
- storefront order: guest/customer order detail, customer order history
- payment: VNPAY return page
- admin catalog: product list, create, detail/edit, clone, import, variant/image management
- admin ordering: order list, detail, update status, cancel
- admin inventory: low-stock list, create/update inventory by variant

Những page chưa có đủ backend để làm gọn:

- profile page
- address book
- change password
- guest order lookup theo phone hoặc orderCode
- admin inventory list tổng quát có ngữ cảnh product / sku
- brand/category/tag/badge lookup management
- admin dashboard thật

Hidden rules quan trọng nhất cho frontend:

- auth dùng cookie `auth_access_token`, không có refresh token
- guest cart dùng cookie `cart_guest_id`
- `register` merge guest cart, `login` không merge guest cart
- storefront list chỉ thấy `active`; search và detail có thể thấy `discontinued`; compare không cho `discontinued`
- cart giữ item stale trong UI nhưng tự bỏ chọn item invalid khi đọc cart
- checkout lấy `quantity` từ cart hiện tại, không lấy từ request body
- checkout không hề ép `selected = true`; backend chỉ cần `cartVariantIds` tồn tại trong cart
- COD trừ kho ngay lúc checkout; VNPAY chỉ trừ kho ở IPN success
- `GET /payment/vnpay/return` không mutate DB; `GET /payment/vnpay/ipn` mới là callback chính thức
- soft delete product sẽ soft delete variants; không có restore endpoint
- clone product chỉ clone product metadata và luôn tạo product mới ở `draft`; không clone variants
- import CSV parse được `productStatus`, nhưng service hiện vẫn persist product ở `draft`

## Page Inventory

### Bảng 1: Storefront / account pages

| Page | Suggested route | Access | Route type | Mục tiêu | API mở page | API thao tác |
| --- | --- | --- | --- | --- | --- | --- |
| Session bootstrap | không cần route riêng | guest/customer/admin | app init | hydrate current session | `GET /auth/me` | `POST /auth/logout` |
| Login | `/login` | guest | standalone | đăng nhập customer hoặc admin | không bắt buộc preload | `POST /auth/login` |
| Register | `/register` | guest | standalone | tạo customer account và auto login | không bắt buộc preload | `POST /auth/register` |
| Catalog list | `/` hoặc `/products` | guest/customer | standalone | browse catalog active | `GET /catalog/products` | đổi query param để filter/sort/page |
| Search results | `/search` | guest/customer | standalone hoặc cùng list page | tìm kiếm keyword | `GET /catalog/search` | đổi query param, compare add/remove |
| Product detail | `/products/:productId/:slug` | guest/customer | standalone | xem detail, chọn variant, add to cart | `GET /catalog/products/:productId/:slug` | `POST /cart/items`, `POST /catalog/compare` |
| Compare | `/compare` hoặc modal | guest/customer | route riêng hoặc modal | so sánh tối đa 3 product | `POST /catalog/compare` | add/remove compare candidates |
| Cart | `/cart` | guest/customer | standalone | xem và chỉnh cart hiện tại | `GET /cart` | `POST /cart/items`, `PATCH /cart/items/:variantId`, `DELETE /cart/items/:variantId`, `DELETE /cart` |
| Checkout | `/checkout` | guest/customer | standalone | tạo order từ cart | `GET /cart` và thường `GET /auth/me` | `POST /orders`, sau đó có thể `POST /payments/vnpay/create-url` |
| VNPAY return | `/payment/vnpay/return` | guest/customer | bắt buộc route riêng | nhận redirect từ VNPAY | `GET /payment/vnpay/return` | có thể retry poll order detail phía frontend |
| Customer order history | `/account/orders` | customer | standalone trong account layout | xem order của chính customer | `GET /orders` | click detail, cancel |
| Order detail / tracking | `/orders/:orderId` | guest/customer | standalone | xem detail order và timeline | `GET /orders/:orderId` | `POST /orders/:orderId/cancel` nếu customer |

### Bảng 1: Admin pages

| Page | Suggested route | Access | Route type | Mục tiêu | API mở page | API thao tác |
| --- | --- | --- | --- | --- | --- | --- |
| Admin product list | `/admin/products` | admin | standalone | xem product list, filter soft delete/status | `GET /admin/catalog/products` | create, clone, import, detail, delete |
| Admin product create | `/admin/products/create` | admin | standalone | tạo product | có thể preload constant data nội bộ frontend | `POST /admin/catalog/products` |
| Admin product detail / edit | `/admin/products/:productId` | admin | standalone | sửa product, xem variants | `GET /admin/catalog/products/:productId` | `PATCH /admin/catalog/products/:productId`, `DELETE /admin/catalog/products/:productId`, `POST /admin/catalog/products/:productId/variants` |
| Admin product import | modal trên list hoặc `/admin/products/import` | admin | modal hoặc standalone | import CSV | không cần preload phức tạp | `POST /admin/catalog/products/import` |
| Admin variant image manager | nested section / modal | admin | section hoặc modal | list/upload/delete ảnh variant | `GET /admin/catalog/variants/:variantId/images` | `POST /admin/catalog/variants/:variantId/images`, `DELETE /admin/catalog/variants/:variantId/images/:mediaId` |
| Admin order list | `/admin/orders` | admin | standalone | xem toàn bộ order | `GET /admin/orders` | detail, status update, cancel |
| Admin order detail | `/admin/orders/:orderId` | admin | standalone | xem detail và timeline | `GET /admin/orders/:orderId` | `PATCH /admin/orders/:orderId/status`, `POST /admin/orders/:orderId/cancel` |
| Admin low-stock inventory | `/admin/inventory/low-stock` | admin | standalone | xem record low stock | `GET /admin/inventory/low-stock` | điều hướng tới editor theo variantId |
| Admin inventory record editor | `/admin/inventory/variants/:variantId` hoặc modal từ product detail | admin | standalone hoặc modal | create/update stock cho variant | `GET /admin/inventory/variants/:variantId` | `POST /admin/inventory/records`, `PATCH /admin/inventory/variants/:variantId` |

### Bảng 1: Không có page đủ backend

| Page giả định | Trạng thái backend | Ghi chú |
| --- | --- | --- |
| Profile | chưa có API | không có endpoint update profile |
| Address book | chưa có API | `shippingAddressLine` nằm trực tiếp trên order create |
| Change password | chưa có API | auth chỉ có register/login/logout/me |
| Guest order lookup theo phone / orderCode | chưa có API phù hợp | guest detail chỉ bằng `orderId`; payment create-url có thể dùng `orderCode` nhưng order detail thì không |
| Brand/category/tag management | chưa có HTTP API | hiện chỉ seed dữ liệu reference |
| Admin inventory list tổng quát | chưa có API | chỉ có read theo variant và low-stock list |
| Admin dashboard | chưa có API | không có aggregate dashboard endpoint |

## Role and access

### Guest

Dùng được:

- catalog list/search/detail/compare
- cart
- checkout
- VNPAY create-url cho guest order
- VNPAY return page
- order detail của guest order bằng `orderId`

Không dùng được:

- `GET /orders`
- `POST /orders/:orderId/cancel`
- mọi admin route

Frontend behavior nên làm:

- không chặn catalog/cart/checkout cho guest
- nếu guest mở route customer-only như `/account/orders`, redirect sang login
- không nên chặn `/orders/:orderId` từ router vì guest order detail là hợp lệ

### Customer

Dùng được thêm:

- `GET /orders`
- `GET /orders/:orderId` cho order của chính mình
- `POST /orders/:orderId/cancel` cho order của chính mình
- `POST /payments/vnpay/create-url` cho order của chính mình

Frontend behavior nên làm:

- account layout có thể gọi `GET /auth/me` một lần để hydrate session
- nếu `GET /auth/me` trả `401`, hạ app về guest state
- customer không được thấy admin controls

### Admin

Dùng được:

- toàn bộ `/admin/catalog/*`
- toàn bộ `/admin/orders/*`
- toàn bộ `/admin/inventory/*`

Không dùng được:

- public create order flow
- public create VNPAY URL flow

Frontend behavior nên làm:

- admin area cần route guard cứng dựa trên `role = admin`
- nếu đã login nhưng role không phải admin, hiển thị 403 hoặc redirect về storefront
- admin không nên đi qua checkout/payment UI public

## UI Read Model

### Bảng 3: Data inventory

| Entity | Field | Ý nghĩa UI | Dùng ở đâu | Bắt buộc |
| --- | --- | --- | --- | --- |
| Current user | `accountId`, `email`, `role` | hydrate session, layout, guards | app init, header, admin guard | bắt buộc |
| Catalog list item | `id`, `title`, `slug` | identity và deep link | product card | bắt buộc |
| Catalog list item | `brand`, `category`, `tags` | nhãn tham chiếu hiển thị | card, filter chips | bổ sung nhưng rất hữu ích |
| Catalog list item | `listingVariantSnapshot`, `defaultSelectedVariant`, `variantsSummary` | card pricing, thumbnail, option summary | product card | gần như bắt buộc |
| Catalog list item | `minSalePrice`, `minOriginalPrice`, `hasInStockVariants`, `contactWhenOutOfStock` | price block, stock badge, CTA | product card | bắt buộc |
| Product detail | `longDescription`, `specs`, `defaultSelectedVariantId`, `defaultVariant`, `variants[]` | render detail page và variant picker | product detail | bắt buộc |
| Product detail meta | `meta.canonicalSlug` | canonical navigation / redirect strategy | product detail | bổ sung quan trọng |
| Compare item | `product.*`, `defaultVariant` | so sánh specs và default offer | compare page | bắt buộc |
| Cart item | `variantId`, `productId`, `productName`, `variantLabel`, `thumbnailUrl` | row identity và display | cart list | bắt buộc |
| Cart item | `quantity`, `unitPrice`, `lineTotal`, `currency` | pricing | cart row, summary | bắt buộc |
| Cart item | `selected`, `isAvailable`, `availabilityStatus`, `availabilityMessage` | disable CTA, message stale item | cart row, checkout gating | bắt buộc |
| Cart summary | `totalQuantity`, `selectedQuantity`, `totalAmount` | badge, subtotal | header cart badge, cart summary, checkout summary | bắt buộc |
| Order summary | `id`, `orderCode`, `paymentMethod`, `paymentStatus`, `orderStatus`, `grandTotal`, `createdAt` | list row và status badge | customer/admin order list | bắt buộc |
| Order detail | `phoneNumber`, `shippingAddressLine`, `items[]`, `statusLogs[]` | detail section và timeline | order detail | bắt buộc |
| Payment create-url | `orderId`, `orderCode`, `paymentCode`, `paymentUrl` | redirect sang VNPAY và giữ context | checkout / payment step | bắt buộc |
| Inventory public read | `variantId`, `stockQuantity`, `isInStock` | stock badge kỹ thuật | ít khi là page trực tiếp | đủ cho logic |
| Inventory admin record | `id`, `variantId`, `stockQuantity`, `lowStockThreshold`, `isInStock`, `isLowStock`, `recordExists` | inventory editor và low-stock UI | admin inventory | bắt buộc |
| Admin product list item | `productGroupCode`, `title`, `status`, `isDeleted`, `brand`, `category`, `listingVariantSnapshot`, `minSalePrice`, `hasActiveVariants`, `hasInStockVariants` | admin table row | admin product list | bắt buộc |
| Admin product detail | `product` raw doc, `variants` raw docs | edit form và variant editor | admin product detail | đủ để sửa nhưng không đủ để hydrate reference labels đẹp |

### Read model conclusions

- storefront list/search/detail đủ dữ liệu để render card, section detail và compare mà không cần thêm request thứ hai
- admin product list đủ tốt cho table page, nhưng admin product detail trả raw `product` và `variants`, không hydrate `brand/category/tag` labels
- admin inventory low-stock trả inventory record thuần, không có `sku`, `productName`, `productId`; muốn UX tốt sẽ thiếu ngữ cảnh
- customer/admin order list không có pagination, filter, sort query; frontend chỉ có thể hiển thị full list hiện tại

## Form and validation

### Auth forms

- Login fields: `email`, `password`
- Register fields: `email`, `password`, `confirmPassword`
- Frontend nên validate sớm:
  - email hợp lệ
  - password không rỗng với login
  - password tối thiểu 6 ký tự với register
  - confirm password match
- Register success: auto login qua cookie, có thể redirect về catalog hoặc checkout nếu người dùng đang có guest cart
- Login success: redirect về trang trước hoặc account/admin landing tùy role

### Catalog storefront filters

Backend thực sự support:

- `q` hoặc `keyword`
- `brand` hoặc `brandCode`
- `category` hoặc `categoryCode`
- `tags` hoặc `tagCodes`
- `ram`, `rom`, `color`
- `minPrice`, `maxPrice`
- `page`, `limit`
- `sortMode = newest | price_asc | price_desc`

Rule quan trọng:

- tags dùng AND semantics
- `ram + rom + color` phải match trên cùng một variant, không phải cộng dồn khác variant

### Checkout form

Fields bắt buộc:

- `cartVariantIds[]`
- `phoneNumber`
- `shippingAddressLine`
- `paymentMethod = cod | vnpay`, default `cod`

Frontend nên validate sớm:

- có ít nhất một cart item được checkout
- phone và address không rỗng
- payment method hợp lệ

Rule ẩn:

- quantity không nằm trong form checkout; backend lấy từ cart line hiện tại
- backend không ép `selected = true`, nên frontend phải tự ràng buộc người dùng chỉ checkout item được UI chọn

### Admin product form

Fields create bắt buộc:

- `productGroupCode`
- `title`
- `brandCode`
- `categoryCode`
- `tagCodes[]`

Fields create có default:

- `productType = smartphone`
- `status = draft`
- `contactWhenOutOfStock = false`
- `badges = []`
- `specs = {}`

Fields update chỉ nhận patch và yêu cầu ít nhất một field mutable.

Rule ẩn:

- brand/category/tag phải tồn tại trong DB reference, nhưng backend không expose API lookup tương ứng
- frontend admin create/edit sẽ cần source options riêng hoặc backend extension

### Admin variant form

Fields create bắt buộc:

- `sku`
- `variantAttributes.ram`
- `variantAttributes.rom`
- `variantAttributes.color`
- `originalPrice`
- `salePrice`

Fields default:

- `currency = VND`
- `status = active`
- `ramSort`, `romSort`, `colorPriority`, `variantSortOrder` default `0`
- `isPrimaryColor = false`

Validation quan trọng:

- `salePrice` không được vi phạm invariant pricing so với `originalPrice`

### Admin import form

- request là multipart với field file tên `file`
- file phải có đuôi `.csv`
- max file size `5 MB`
- mỗi row chứa product fields và variant fields cùng lúc

Rule ẩn:

- import là upsert product theo `productGroupCode` và upsert variant theo `sku`
- dù row có `productStatus`, product hiện vẫn được persist ở `draft`

### Inventory form

Create:

- `variantId`
- `stockQuantity`
- `lowStockThreshold` optional, default theo module

Update:

- `stockQuantity` hoặc `lowStockThreshold`
- patch rỗng bị reject

## Page-by-page analysis

### Session bootstrap

- Đây không phải page độc lập; đây là concern của app shell
- Mục tiêu là biết current role để chọn layout, header và guard
- API mở: `GET /auth/me`
- Nếu `401`, frontend nên coi như guest, không spam redirect trừ khi route hiện tại bắt buộc auth
- State matrix: `loading` spinner nhỏ ở app shell, `success` hydrate session, `error/401` fallback guest

### Login page

- Access: guest; customer/admin đã login nên bị redirect khỏi page này
- Mục tiêu: set auth cookie và lấy current user tối thiểu
- Primary action: submit login
- Sau success: redirect theo previous intent; admin có thể vào admin area, customer vào storefront hoặc route đang bảo vệ
- Error UI: map `AUTH_INVALID_CREDENTIALS` thành form-level error; `AUTH_RATE_LIMITED` thành alert khóa submit tạm thời
- State matrix: `loading | success | error | locked`

### Register page

- Access: guest
- Mục tiêu: tạo customer mới và auto login
- Primary action: submit register
- Secondary action: link sang login
- Sau success: redirect về catalog hoặc checkout nếu trước đó đang checkout guest
- Hidden rule: nếu có `cart_guest_id`, register sẽ reassign guest cart sang customer mới
- State matrix: `loading | success | validation error | conflict`

### Catalog list page

- Access: guest/customer
- Mục tiêu: browse active catalog
- API mở: `GET /catalog/products`
- Search/filter/sort/pagination có hỗ trợ backend thật
- Primary action: mở product detail
- Secondary action: filter, sort, pagination, add compare, add cart nhanh nếu UI muốn
- Empty state: không có product match filter
- Error state: lỗi network / backend; vì list là page chính nên cần retry button
- Skeleton loading nên có vì list page là critical path

### Search results page

- Access: guest/customer
- Khác biệt quan trọng so với list page: backend search cho phép product `discontinued` xuất hiện
- Nên dùng route riêng kiểu `/search?q=` để phản ánh semantics khác với list page
- Search input nên debounce vì đây là GET query endpoint
- Compare button phù hợp ở đây vì search là nơi người dùng hay đối chiếu sản phẩm
- Empty state: không match keyword

### Product detail page

- Access: guest/customer
- API mở: `GET /catalog/products/:productId/:slug`
- Data đủ để render gallery, specs, price block, variant picker, stock state
- Primary action: add to cart
- Secondary action: compare, copy link, quay lại list/search
- Hidden rule: `meta.canonicalSlug` luôn được trả; frontend có thể giữ URL hiện tại hoặc canonicalize route
- Trạng thái đặc biệt:
  - `status = discontinued`: detail vẫn có thể xem nếu product thuộc search-visible set
  - `hasInStockVariants = false`: disable buy CTA, có thể chuyển sang contact CTA nếu `contactWhenOutOfStock = true`
- State matrix: `loading | success | not found | out-of-stock`

### Compare page

- Access: guest/customer
- Backend cho tối đa 3 `productIds`, unique, gọi bằng `POST /catalog/compare`
- Điều này ngụ ý compare state nằm ở frontend, không có deep-link GET sẵn từ backend
- Có thể làm route `/compare?ids=...` ở frontend rồi POST body theo ids
- Primary action: remove item, mở detail của từng product
- Empty state: ít hơn 2 sản phẩm được chọn

### Cart page

- Access: guest/customer
- API mở: `GET /cart`
- Actions:
  - add item: `POST /cart/items`
  - update quantity: `PATCH /cart/items/:variantId`
  - remove line: `DELETE /cart/items/:variantId`
  - clear cart: `DELETE /cart`
- Hidden rules:
  - `GET /cart` không tự phát guest cookie nếu chưa có cart
  - `POST /cart/items` mới phát `cart_guest_id` khi guest add thành công lần đầu
  - stale item vẫn hiện nhưng bị auto deselect nếu invalid
  - add/update thành công luôn set `selected = true`
  - delete line là idempotent; patch line missing trả `404`
- UI cần:
  - quantity stepper
  - remove button
  - clear cart confirm
  - stale item warning block
- State matrix: `loading | success | empty | error | stale/disabled`

### Checkout page

- Access: guest/customer
- API mở page: thường `GET /cart`, thêm `GET /auth/me` nếu cần hydrate user
- API submit: `POST /orders`
- Với `paymentMethod = cod`:
  - success nên điều hướng sang order detail hoặc order success page
- Với `paymentMethod = vnpay`:
  - create order trước
  - sau đó gọi `POST /payments/vnpay/create-url`
  - redirect browser sang `paymentUrl`
- Hidden rules:
  - backend chỉ checkout item có trong cart theo `cartVariantIds`
  - backend không enforce `selected = true`
  - create order luôn tạo payment record khởi tạo
  - checkout thành công sẽ remove purchased lines khỏi cart
- State matrix: `loading | success | validation error | checkout conflict | payment pending`

### VNPAY return page

- Access: guest/customer
- Bắt buộc có route riêng vì VNPAY redirect về backend callback URL shape
- API nên gọi khi mount: `GET /payment/vnpay/return` với query từ VNPAY
- Hidden rules cực quan trọng:
  - endpoint này chỉ verify checksum và echo kết quả sơ bộ
  - endpoint này không mutate DB
  - DB mutation thực sự nằm ở IPN, có thể đến trước hoặc sau return page
- Vì không có payment detail API, frontend nên giữ `orderId` hoặc `orderCode` từ trước lúc redirect và sau return page thì refetch order detail; nếu order vẫn `pending`, nên có retry hoặc poll ngắn
- State matrix: `loading | success | pending reconciliation | failed | invalid checksum`

### Customer order history page

- Access: customer
- API mở: `GET /orders`
- Không có filter/pagination/sort query từ backend; hiện chỉ list full theo `createdAt desc`
- Primary action: mở order detail
- Secondary action: cancel order nếu status cho phép
- Empty state: customer chưa có order

### Order detail / tracking page

- Access: customer owner hoặc guest nếu là guest order
- API mở: `GET /orders/:orderId`
- Data quan trọng: `orderStatus`, `paymentStatus`, `items[]`, `statusLogs[]`
- Actions:
  - customer cancel qua `POST /orders/:orderId/cancel`
  - guest không có cancel action
  - customer và guest đều có thể dùng page này làm success/tracking page
- Hidden rules:
  - guest truy cập customer order sẽ nhận `404`, không phải `403`
  - guest detail không kiểm tra `cart_guest_id`; `orderId` vì thế là dữ liệu nhạy cảm
- State matrix: `loading | success | not found | cancel disabled`

### Admin product list page

- Access: admin
- API mở: `GET /admin/catalog/products`
- Backend support thật:
  - `status`
  - `deleted = false | true | all`
  - `page`, `limit`
  - `sortBy = createdAt | updatedAt | title | status | minSalePrice`
  - `sortOrder = asc | desc`
- Không có keyword search ở backend admin list
- Primary actions: create, open detail, clone, import, soft delete
- Soft delete có confirm modal là hợp lý
- Empty state: không có product theo filter

### Admin product create / detail / edit

- Access: admin
- Create API: `POST /admin/catalog/products`
- Detail API: `GET /admin/catalog/products/:productId`
- Edit API: `PATCH /admin/catalog/products/:productId`
- Delete API: `DELETE /admin/catalog/products/:productId`
- Detail response hiện là raw `product` + `variants`; frontend phải tự map form model
- Hidden rules:
  - product soft deleted không được update tiếp
  - product `discontinued` vẫn sửa product được, nhưng không được mutate variants
  - không có restore product
- UI đề xuất:
  - một page detail/edit có sections: core info, specs, variants, images
  - separate create page cho product mới
- State matrix: `loading | success | not found | validation error | locked by deletion`

### Admin product import

- Access: admin
- Đây phù hợp là modal hoặc utility page riêng từ product list
- Submit là multipart field `file`
- Success response có `rowCount`, `productCount`, `variantCount`
- Hidden rule: import product vẫn ra `draft` bất kể row `productStatus`
- Error display nên hỗ trợ message file-level thay vì field-level thuần túy

### Admin variant management

- Access: admin, nested trong product detail
- Create variant: `POST /admin/catalog/products/:productId/variants`
- Update variant: `PATCH /admin/catalog/variants/:variantId`
- Delete variant: `DELETE /admin/catalog/variants/:variantId`
- Hidden rules:
  - product `discontinued` chặn create/update/delete variant
  - deleted variant không update tiếp
  - delete variant là soft delete
- Variant editor nên disable khi product bị deleted hoặc discontinued

### Admin variant image manager

- Access: admin, nested dưới variant
- APIs:
  - list: `GET /admin/catalog/variants/:variantId/images`
  - upload: `POST /admin/catalog/variants/:variantId/images`
  - delete: `DELETE /admin/catalog/variants/:variantId/images/:mediaId`
- Upload rules:
  - multipart field `image`
  - max 1 file / request
  - max 5 MB
  - mime types: jpeg, png, webp
  - tối đa 10 ảnh / variant
- Nếu storage unavailable, backend trả `503`
- UI cần progress/disable state khi upload và confirm modal khi delete

### Admin order list / detail

- Access: admin
- List API: `GET /admin/orders`
- Detail API: `GET /admin/orders/:orderId`
- Update status: `PATCH /admin/orders/:orderId/status`
- Cancel: `POST /admin/orders/:orderId/cancel`
- Limitations:
  - không có pagination/filter/search backend
  - detail có timeline `statusLogs`
- Hidden rules:
  - valid transition chỉ là `pending -> confirmed -> completed`
  - unpaid VNPAY order không được `confirmed` hay `completed`
  - cancel chỉ được khi `pending` hoặc `confirmed`

### Admin inventory pages

- Access: admin
- Low-stock page API: `GET /admin/inventory/low-stock`
- Variant inventory read: `GET /admin/inventory/variants/:variantId`
- Create record: `POST /admin/inventory/records`
- Update record: `PATCH /admin/inventory/variants/:variantId`
- Hidden rules:
  - create/update inventory sẽ sync ngược `variant.isInStock` và `product.hasInStockVariants`
  - không có transaction cross-collection; sync fail có thể khiến inventory đã ghi nhưng response là lỗi `500`
  - public read fallback trả stock 0 nếu record chưa tồn tại
- UX constraint:
  - low-stock response thiếu `sku` và `productName`; page low-stock sẽ nghèo ngữ cảnh nếu backend không mở thêm lookup

## Action Inventory

### Bảng 2: Action inventory

| Page | Action | API | Success behavior | Error behavior |
| --- | --- | --- | --- | --- |
| Login | submit login | `POST /auth/login` | set cookie, hydrate role, redirect | form-level error hoặc rate-limit alert |
| Register | submit register | `POST /auth/register` | set cookie, merge guest cart nếu có, redirect | validation hoặc conflict |
| Catalog list/search | change filter/sort/page | `GET /catalog/products` hoặc `GET /catalog/search` | refetch list | empty state hoặc error alert |
| Product detail | add to cart | `POST /cart/items` | toast, update cart badge, có thể stay on page | availability conflict |
| Compare | compare submit | `POST /catalog/compare` | render compare result | validation nếu >3 ids hoặc duplicate |
| Cart | update quantity | `PATCH /cart/items/:variantId` | update row + summary | stale/conflict, refetch cart |
| Cart | remove line | `DELETE /cart/items/:variantId` | update row + summary | idempotent false remove vẫn 200 |
| Cart | clear cart | `DELETE /cart` | empty cart state | generic error |
| Checkout | create order COD | `POST /orders` | redirect order detail/success | validation hoặc checkout conflict |
| Checkout | create order VNPAY | `POST /orders` rồi `POST /payments/vnpay/create-url` | redirect browser sang VNPAY | giữ order context và hiển thị retry |
| Order detail | customer cancel | `POST /orders/:orderId/cancel` | refetch detail, toast | conflict nếu status không cho hủy |
| Admin product list | create product | `POST /admin/catalog/products` | redirect detail hoặc stay form | field/global validation |
| Admin product list | import CSV | `POST /admin/catalog/products/import` | show summary counts, refetch list | file-level validation |
| Admin product list/detail | clone product | `POST /admin/catalog/products/:productId/clone` | open cloned product | conflict on `productGroupCode` |
| Admin product detail | update product | `PATCH /admin/catalog/products/:productId` | toast, maybe keep page | validation/not found/conflict |
| Admin product detail | soft delete product | `DELETE /admin/catalog/products/:productId` | refetch list/detail state | confirm modal + conflict handling |
| Admin product detail | create variant | `POST /admin/catalog/products/:productId/variants` | append variant, refetch detail | conflict on SKU or product locked |
| Admin product detail | update variant | `PATCH /admin/catalog/variants/:variantId` | refetch detail | validation/conflict |
| Admin product detail | delete variant | `DELETE /admin/catalog/variants/:variantId` | refetch detail | conflict/not found |
| Admin variant images | upload image | `POST /admin/catalog/variants/:variantId/images` | append image list | file/storage errors |
| Admin variant images | delete image | `DELETE /admin/catalog/variants/:variantId/images/:mediaId` | remove image from gallery | confirm modal + storage error |
| Admin order detail | update status | `PATCH /admin/orders/:orderId/status` | refetch detail/list | invalid transition |
| Admin order detail | cancel order | `POST /admin/orders/:orderId/cancel` | refetch detail/list | conflict if completed |
| Admin inventory editor | create/update record | `POST /admin/inventory/records` or `PATCH /admin/inventory/variants/:variantId` | toast, refresh related product state | not found/conflict/sync failed |

## Business rules inventory

### Bảng 4: Business rules inventory

| Rule | Module / source | Ảnh hưởng UI |
| --- | --- | --- |
| List storefront chỉ thấy `active` | `catalog-storefront.service-helpers.js` | catalog list không nên có tab cho `draft/inactive/discontinued` |
| Search storefront thấy `active + discontinued` | `search-products.service.js` | search result có thể render badge `discontinued` và disable buy CTA |
| Detail storefront cho `discontinued`, compare thì không | `get-product-detail-storefront.service.js`, `compare-products.service.js` | product detail cho discontinued hợp lệ; compare nên chặn product discontinued |
| Inventory read fail vẫn trả 200 nhưng fallback out-of-stock | `catalog-live-inventory.helpers.js` và test catalog | UI storefront không nên crash; chỉ hiển thị out-of-stock an toàn |
| Register merge guest cart | `auth/services/register.service.js` | sau register có thể giữ cart continuity |
| Login không merge guest cart | `auth/services/login.service.js` và auth test | frontend không nên hứa guest cart sẽ merge khi login |
| Cart stale item vẫn visible nhưng deselected | `cart-service.helpers.js` | cần row warning thay vì ẩn item |
| Add/update cart luôn set `selected = true` | `add-cart-item.service.js`, `update-cart-item.service.js` | mọi add/update là re-activate selection |
| Delete cart line idempotent | `remove-cart-item.service.js` | delete button không cần coi 404 là case bình thường |
| Checkout dùng quantity từ cart, không từ body | `ordering/create-order.service.js` + schema | checkout form không cần field quantity |
| Checkout không enforce `selected = true` | `cart/adapters/internal/order-cart.reader.js` + `ordering/create-order.service.js` | frontend phải tự giới hạn subset checkout |
| COD commit stock lúc checkout | `ordering/create-order.service.js` | order success COD có thể coi stock đã trừ ngay |
| VNPAY chỉ commit stock khi IPN success | `payment/handle-vnpay-ipn.service.js` | return page phải chờ reconciliation |
| Return URL không mutate DB | `payment/handle-vnpay-return.service.js` | return page chỉ là trạng thái sơ bộ |
| Guest order detail mở bằng `orderId` không cần auth/cookie | `ordering-service.helpers.js` | `orderId` guest là sensitive; không có guest lookup form an toàn |
| Customer/admin cancel chỉ được ở `pending` hoặc `confirmed` | `ordering-service.helpers.js` | cancel button phải hide/disable ngoài các status này |
| Admin chỉ được `pending -> confirmed -> completed` | `ordering-service.helpers.js` | admin detail chỉ show transition buttons hợp lệ |
| Admin không confirm/complete unpaid VNPAY | `ordering-service.helpers.js` | disable admin status buttons khi `paymentStatus != paid` |
| Cancel paid order giữ `paymentStatus = paid` | `cancel-customer-order.service.js`, `cancel-admin-order.service.js` | UI có thể thấy `orderStatus = cancelled` nhưng `paymentStatus = paid` |
| Late success IPN có thể làm payment `paid` trong khi order vẫn `cancelled` | payment IPN service và test | payment badge và order badge có thể lệch, UI phải render cả hai |
| Inventory write sync catalog nhưng không có transaction | `inventory/create/update service` | lỗi `INVENTORY_CATALOG_SYNC_FAILED` cần thông báo rằng dữ liệu có thể đã ghi một phần |
| Soft delete product cũng soft delete variants | `soft-delete-product.service.js` | delete product cần confirm rõ ảnh hưởng dây chuyền |
| Không có restore product/variant | route surface | UI không nên có restore button |
| Không được mutate variants của product `discontinued` | `catalog-admin.service-helpers.js` | variant controls phải disable nếu product discontinued |
| Clone product chỉ clone product metadata, không clone variants | `clone-product.service.js` | clone action nên được mô tả rõ trong UI |
| Import product luôn persist `draft` | `import-products.service.js` | sau import vẫn cần review/activate bằng admin |

## Technical integration

### Auth and cookies

- Auth dùng cookie HTTP-only `auth_access_token`
- Guest cart dùng cookie HTTP-only `cart_guest_id`
- Frontend phải gửi request với credentials include
- Không có refresh token, không có session store, không có logout all devices
- `optionalAuth` được mount global trước các module, nên public route vẫn có thể biết current user nếu cookie hợp lệ

### Error contract

- Validation lỗi: `422 VALIDATION_ERROR` với `meta.issues[]`
- Business error: `{ code, message, meta? }`
- Unknown error: `500 INTERNAL_ERROR`
- Frontend nên có mapper chung từ `code` sang UI message, đồng thời map field errors từ `meta.issues`

### Date, money, pagination, search

- Date trong JSON response là ISO string do serialize từ JS Date
- Money hiện là number nguyên kiểu VND, không phải string decimal
- Storefront/admin product list dùng `page` và `limit`
- Customer/admin order list hiện không có pagination backend
- Search/filter hiện chủ yếu là query params GET

### Uploads

- Product import: multipart field `file`, `.csv`, max `5 MB`
- Variant image upload: multipart field `image`, max `5 MB`, 1 file, mime `jpeg/png/webp`

### Query / cache / retry suggestions

- Debounce:
  - `GET /catalog/search`
- Cache được:
  - catalog list
  - catalog detail
  - compare response theo ids
  - public inventory reads nếu thật sự cần
- Không nên cache lâu:
  - cart
  - order detail trong payment flow
  - payment create-url
- Retry button nên có:
  - catalog list/search/detail
  - cart read
  - payment return reconciliation
- Polling có thể cần ngắn hạn:
  - chỉ cho VNPAY return page, vì IPN có thể đến trễ và không có payment detail API riêng
- Prefetch hợp lý:
  - product detail từ card hover/click
  - customer order detail khi mở order history row nếu muốn UX mượt

## Business flows

### Browse catalog

- Bắt đầu: catalog list hoặc search page
- APIs: `GET /catalog/products`, `GET /catalog/search`
- States: loading, success, empty, error
- Kết thúc: product detail hoặc compare/cart

### View product detail

- Bắt đầu: click từ list/search/compare
- APIs: `GET /catalog/products/:productId/:slug`
- States: loading, success, not found, out-of-stock, discontinued
- Kết thúc: add to cart hoặc back to listing

### Add to cart / update cart

- Bắt đầu: product detail hoặc card CTA
- APIs: `POST /cart/items`, `GET /cart`, `PATCH /cart/items/:variantId`, `DELETE /cart/items/:variantId`, `DELETE /cart`
- States: success, stale item, insufficient stock, unavailable variant
- Kết thúc: cart page hoặc stay on current page with updated badge

### Checkout COD

- Bắt đầu: cart hoặc checkout page
- APIs: `POST /orders`
- States: validation error, checkout invalid, success
- Kết thúc: order detail/success page; stock đã commit; purchased cart lines bị remove

### Checkout VNPAY

- Bắt đầu: checkout page
- APIs: `POST /orders`, `POST /payments/vnpay/create-url`, `GET /payment/vnpay/return`, `GET /orders/:orderId`
- States: order created pending, redirecting to VNPAY, return pending reconciliation, paid, failed, cancelled
- Kết thúc: order detail/tracking page

### Customer order management

- Bắt đầu: account orders page hoặc direct order detail
- APIs: `GET /orders`, `GET /orders/:orderId`, `POST /orders/:orderId/cancel`
- States: loading, success, empty, not found, cancel disabled
- Kết thúc: detail refreshed hoặc list refreshed

### Admin manage products

- Bắt đầu: admin product list
- APIs: list/create/detail/update/delete/clone/import/variant/image routes
- States: loading, success, validation error, conflict, locked by soft delete/discontinued
- Kết thúc: list refresh hoặc detail refresh

### Admin manage orders

- Bắt đầu: admin order list
- APIs: `GET /admin/orders`, `GET /admin/orders/:orderId`, `PATCH /admin/orders/:orderId/status`, `POST /admin/orders/:orderId/cancel`
- States: loading, success, invalid transition, cancel conflict
- Kết thúc: detail/list refreshed

### Admin manage inventory

- Bắt đầu: low-stock page hoặc product detail variant section
- APIs: `GET /admin/inventory/low-stock`, `GET /admin/inventory/variants/:variantId`, `POST /admin/inventory/records`, `PATCH /admin/inventory/variants/:variantId`
- States: loading, success, not found, sync failed
- Kết thúc: inventory updated và catalog availability sync

## UI state matrix

| Page | loading | success | empty | error | disabled / locked |
| --- | --- | --- | --- | --- | --- |
| Catalog list/search | skeleton grid | cards + meta | no results | retry block | filter chips still usable |
| Product detail | skeleton detail | gallery + specs + CTA | không áp dụng | retry / not found | buy CTA disabled when no stock / discontinued |
| Cart | skeleton rows | rows + summary | empty cart CTA back to catalog | retry block | stale rows deselected and warned |
| Checkout | form skeleton | review + submit | no checkoutable items | validation/conflict | submit disabled while creating order / payment URL |
| VNPAY return | centered pending card | paid / failed result | không áp dụng | invalid checksum / retry | continue button disabled khi chưa biết order state cuối |
| Order history | list skeleton | order rows | no orders | retry block | cancel hidden when status invalid |
| Order detail | section skeleton | detail + timeline | không áp dụng | 404 / retry | cancel hidden for guest or invalid status |
| Admin product list | table skeleton | rows + filters | no products | retry block | delete disabled while request in flight |
| Admin product detail | form skeleton | form + variants + images | no variants section | retry / not found | variant mutation locked when product deleted or discontinued |
| Admin order detail | detail skeleton | detail + timeline + status actions | không áp dụng | retry / not found | invalid transition buttons disabled |
| Admin inventory editor | card skeleton | stock form | missing record treated as create state | sync failed / retry | save disabled while request in flight |

## Gaps and backend limitations that affect frontend

- frontend app hiện chưa có route/business UI thật trong `apps/frontend`
- không có reference lookup API cho `brand/category/tag/badge`
- admin product detail trả raw docs, không hydrate reference labels
- admin inventory low-stock thiếu `sku`, `productName`, `productId`
- không có guest order lookup theo phone / orderCode
- không có payment detail API riêng; VNPAY return page phải dựa vào stored order context và refetch order
- không có pagination/filter/search cho order list customer hoặc admin
- không có restore product/variant
- không có profile/address/change-password/account management APIs
- không có admin dashboard aggregate APIs

## Implementation priority

### Milestone 1: storefront critical path

- session bootstrap
- login
- register
- catalog list
- catalog search
- product detail
- cart
- checkout
- VNPAY return
- order detail shared route

### Milestone 2: account / order convenience

- customer order history
- better pending / failed payment reconciliation UX
- compare page
- canonical slug handling

### Milestone 3: admin commerce core

- admin product list
- admin product create
- admin product detail/edit
- admin clone/import actions
- admin order list/detail/status/cancel

### Milestone 4: admin operations and media

- admin variant CRUD nested in product detail
- admin variant image manager
- admin low-stock inventory page
- inventory record create/update UI

### Defer or require backend follow-up

- profile / address / change password
- guest order lookup UX an toàn hơn
- brand/category/tag management
- admin inventory list đầy đủ ngữ cảnh
- admin dashboard

## Final conclusion

Nếu frontend cần bám sát backend hiện tại, tuyến triển khai đúng là:

1. storefront catalog -> cart -> checkout -> payment return -> order detail
2. session/login/register để hỗ trợ customer flow và admin guard
3. admin product/order management
4. inventory và media tooling sau

Các phần gây rủi ro cao nhất cho frontend hiện tại không phải ở route discovery nữa, mà ở các khoảng trống backend sau:

- reference lookup cho admin form
- guest order retrieval UX sau payment redirect
- low-stock inventory thiếu product context
- order list thiếu pagination/filter
