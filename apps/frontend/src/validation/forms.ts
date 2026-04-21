import { z } from 'zod'

const requiredString = (message: string) => z.string().trim().min(1, message)

const nonNegativeNumber = (message: string) =>
  z.coerce.number({
    invalid_type_error: message,
  }).finite(message).min(0, message)

export const loginFormSchema = z.object({
  email: requiredString('Nhap dia chi email.').email('Email khong hop le.'),
  password: requiredString('Nhap mat khau.'),
})

export const registerFormSchema = loginFormSchema
  .extend({
    password: requiredString('Nhap mat khau.').min(6, 'Mat khau phai co it nhat 6 ky tu.'),
    confirmPassword: requiredString('Nhap xac nhan mat khau.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Mat khau khong khop.',
    path: ['confirmPassword'],
  })

export const orderLookupFormSchema = z.object({
  orderCode: requiredString('Nhập mã đơn hàng.'),
})

export const checkoutShippingSchema = z.object({
  recipientName: requiredString('Nhap ten nguoi nhan.'),
  email: requiredString('Nhap dia chi email.').email('Email khong hop le.'),
  phoneNumber: requiredString('Nhap so dien thoai nguoi nhan.'),
  street: requiredString('Nhap so nha va ten duong.'),
  provinceCode: requiredString('Chon tinh/thanh pho giao hang.'),
  provinceName: z.string().trim(),
  districtCode: requiredString('Chon quan/huyen giao hang.'),
  districtName: z.string().trim(),
  wardCode: requiredString('Chon phuong/xa giao hang.'),
  wardName: z.string().trim(),
  paymentMethod: z.enum(['cod', 'vnpay']),
  cartVariantIds: z.array(z.string().trim().min(1)).min(
    1,
    'Khong co san pham hop le de checkout. Hay quay lai gio hang de xu ly cac line dang bi loai.',
  ),
})

export const inventoryLookupSchema = z.object({
  variantId: requiredString('Please enter a variant ID to look up inventory.'),
})

export const inventoryRecordUpsertSchema = z.object({
  variantId: requiredString('Please enter a variant ID before saving inventory.'),
  stockQuantity: nonNegativeNumber(
    'Stock quantity and low-stock threshold must be greater than or equal to 0.',
  ),
  lowStockThreshold: nonNegativeNumber(
    'Stock quantity and low-stock threshold must be greater than or equal to 0.',
  ),
})

export const adminCloneProductSchema = z.object({
  productGroupCode: requiredString('Please enter a new group code before creating a product copy.'),
  title: z.string().trim().optional(),
})
