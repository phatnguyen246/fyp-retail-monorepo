import { z } from 'zod'

const requiredString = (message: string) => z.string().trim().min(1, message)

const nonNegativeNumber = (message: string) =>
  z.coerce.number({
    invalid_type_error: message,
  }).finite(message).min(0, message)

const positiveInteger = (message: string) =>
  z.coerce.number({
    invalid_type_error: message,
  }).int(message).positive(message)

export const loginFormSchema = z.object({
  email: requiredString('Please enter your email address.').email('Invalid email address.'),
  password: requiredString('Please enter your password.'),
})

export const registerFormSchema = loginFormSchema
  .extend({
    password: requiredString('Please enter your password.').min(6, 'Password must be at least 6 characters.'),
    confirmPassword: requiredString('Please confirm your password.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const orderLookupFormSchema = z.object({
  orderCode: requiredString('Please enter the order code.'),
})

export const checkoutShippingSchema = z.object({
  recipientName: requiredString('Please enter the recipient name.'),
  email: requiredString('Please enter your email address.').email('Invalid email address.'),
  phoneNumber: requiredString('Please enter the recipient phone number.'),
  street: requiredString('Please enter street and house number.'),
  provinceCode: positiveInteger('Please select a province/city.'),
  provinceName: z.string().trim(),
  districtCode: positiveInteger('Please select a district.'),
  districtName: z.string().trim(),
  wardCode: positiveInteger('Please select a ward.'),
  wardName: z.string().trim(),
  paymentMethod: z.enum(['cod', 'vnpay']),
  cartVariantIds: z.array(z.string().trim().min(1)).min(
    1,
    'No valid items available for checkout. Please go back to cart and resolve excluded lines.',
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
