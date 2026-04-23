import { expect, test } from '@playwright/test'

function createProductDetailPayload({
  productId = '65f100000000000000000010',
  slug = 'dien-thoai-iphone-16',
  variantId = '65f100000000000000000020',
  price = 24990000,
  stock = 8,
} = {}) {
  return {
    data: {
      id: productId,
      productId,
      title: 'iPhone 16',
      slug,
      status: 'active',
      productType: 'smartphone',
      shortDescription: 'Mocked storefront product',
      longDescription: 'Mocked product description',
      badges: ['hot'],
      brand: {
        id: '65f100000000000000000001',
        code: 'APPLE',
        name: 'Apple',
      },
      category: {
        id: '65f100000000000000000003',
        code: 'SMARTPHONE',
        name: 'Smartphone',
      },
      tags: [],
      specs: {
        chipset: 'A18',
        battery: '3561mAh',
      },
      minSalePrice: price,
      minOriginalPrice: price + 2000000,
      hasInStockVariants: true,
      defaultSelectedVariantId: variantId,
      defaultVariant: {
        id: variantId,
        sku: 'IP16-BLU-256',
        variantAttributes: {
          ram: '8GB',
          rom: '256GB',
          color: 'Blue',
        },
        originalPrice: price + 2000000,
        salePrice: price,
        currency: 'VND',
        availableQuantity: stock,
        isInStock: true,
        media: [],
      },
      variants: [
        {
          id: variantId,
          sku: 'IP16-BLU-256',
          variantAttributes: {
            ram: '8GB',
            rom: '256GB',
            color: 'Blue',
          },
          originalPrice: price + 2000000,
          salePrice: price,
          currency: 'VND',
          availableQuantity: stock,
          isInStock: true,
          media: [],
        },
      ],
    },
    meta: {
      canonicalSlug: slug,
    },
  }
}

function buildCartPayload(items) {
  const normalizedItems = [...items]
  const summary = normalizedItems.reduce(
    (acc, item) => {
      const quantity = Number(item.quantity) || 0
      acc.totalQuantity += quantity

      if (item.selected === true && item.isAvailable === true) {
        acc.selectedQuantity += quantity
        acc.totalAmount += Number(item.lineTotal) || 0
      }

      return acc
    },
    {
      totalQuantity: 0,
      selectedQuantity: 0,
      totalAmount: 0,
    },
  )

  return {
    data: {
      id: 'cart-mocked',
      items: normalizedItems,
      summary,
    },
  }
}

async function mockLocationApi(page) {
  await page.route('https://provinces.open-api.vn/**', async (route) => {
    const url = new URL(route.request().url())
    const pathname = url.pathname

    if (pathname === '/api/p' || pathname === '/api/p/') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ code: 1, name: 'Ha Noi' }]),
      })
      return
    }

    if (pathname.startsWith('/api/p/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 1,
          name: 'Ha Noi',
          districts: [{ code: 2, name: 'Ba Dinh' }],
        }),
      })
      return
    }

    if (pathname.startsWith('/api/d/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 2,
          name: 'Ba Dinh',
          wards: [{ code: 3, name: 'Phuc Xa' }],
        }),
      })
      return
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: `No mock for ${pathname}` }),
    })
  })
}

function createOrderDetailPayload({
  orderId,
  orderCode,
  paymentMethod,
  paymentStatus,
} = {}) {
  return {
    data: {
      id: orderId,
      orderCode,
      paymentMethod,
      paymentStatus,
      orderStatus: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
      statusLogs: [
        {
          changedAt: '2026-01-01T00:00:00.000Z',
          changedBy: 'guest',
          toStatus: 'pending',
        },
      ],
      items: [
        {
          variantId: '65f100000000000000000020',
          thumbnailUrl: null,
          productName: 'iPhone 16',
          variantLabel: '8GB / 256GB / Blue',
          sku: 'IP16-BLU-256',
          unitPrice: 24990000,
          quantity: 1,
          lineTotal: 24990000,
        },
      ],
      itemCount: 1,
      subtotal: 24990000,
      discountTotal: 0,
      shippingFee: 0,
      grandTotal: 24990000,
      recipientName: 'Nguyen Van A',
      email: 'guest@example.com',
      phoneNumber: '0900000000',
      shippingAddressLine: '123 Pho Hue, Phuc Xa, Ba Dinh, Ha Noi',
    },
  }
}

async function mockCommonGuestApis(page, { cartItems }) {
  const state = {
    cartItems: [...cartItems],
  }

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')
    const method = request.method()

    const sendJson = async (status, payload) => {
      await route.fulfill({
        status,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(payload),
      })
    }

    if (path === '/auth/me' && method === 'GET') {
      return sendJson(401, {
        code: 'AUTH_UNAUTHORIZED',
        message: 'Unauthorized',
      })
    }

    if (path === '/catalog/products/65f100000000000000000010/dien-thoai-iphone-16' && method === 'GET') {
      return sendJson(
        200,
        createProductDetailPayload({
          productId: '65f100000000000000000010',
          slug: 'dien-thoai-iphone-16',
          variantId: '65f100000000000000000020',
          price: 24990000,
          stock: 8,
        }),
      )
    }

    if (path === '/cart' && method === 'GET') {
      return sendJson(200, buildCartPayload(state.cartItems))
    }

    if (path === '/cart/items' && method === 'POST') {
      state.cartItems = [
        {
          variantId: '65f100000000000000000020',
          productId: '65f100000000000000000010',
          productName: 'iPhone 16',
          variantLabel: '8GB / 256GB / Blue',
          thumbnailUrl: null,
          quantity: 1,
          unitPrice: 24990000,
          lineTotal: 24990000,
          currency: 'VND',
          selected: true,
          isAvailable: true,
          availabilityStatus: 'available',
          availableQuantity: 8,
        },
      ]

      return sendJson(200, { data: { ok: true } })
    }

    return sendJson(404, {
      code: 'MOCK_NOT_FOUND',
      message: `No mock for ${method} ${path}`,
    })
  })

  return state
}

test('guest can add item and complete COD checkout to order detail', async ({ page }) => {
  await mockLocationApi(page)
  const mockState = await mockCommonGuestApis(page, { cartItems: [] })

  const orderId = 'order-cod-001'
  const orderCode = 'ORD-COD-001'

  await page.route('**/api/orders', async (route) => {
    if (route.request().method() !== 'POST') {
      return route.fallback()
    }

    mockState.cartItems = []

    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        data: {
          id: orderId,
          orderCode,
          paymentMethod: 'cod',
        },
      }),
    })
  })

  await page.route(`**/api/orders/${orderId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(
        createOrderDetailPayload({
          orderId,
          orderCode,
          paymentMethod: 'cod',
          paymentStatus: 'pending',
        }),
      ),
    })
  })

  await page.goto('/products/65f100000000000000000010/dien-thoai-iphone-16', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible()
  await page.getByRole('button', { name: 'Add to cart' }).click()

  await page.goto('/cart', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('iPhone 16')).toBeVisible()
  await page.getByRole('link', { name: 'Proceed to checkout' }).click()

  await expect(page).toHaveURL(/\/checkout/)
  await page.locator('#checkout-recipient-name').fill('Nguyen Van A')
  await page.locator('#checkout-recipient-email').fill('guest@example.com')
  await page.locator('#checkout-recipient-phone').fill('0900000000')
  await page.locator('#checkout-shipping-street').fill('123 Pho Hue')

  await page.locator('select').nth(0).selectOption('1')
  await page.locator('select').nth(1).selectOption('2')
  await page.locator('select').nth(2).selectOption('3')

  await page.getByRole('button', { name: 'Place COD order' }).click()

  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}`))
  await expect(page.getByText(orderCode)).toBeVisible()
  await expect(page.getByText('Cash on delivery')).toBeVisible()
})

test('guest can place VNPAY order and frontend opens payment url before redirecting', async ({ page }) => {
  await page.addInitScript(() => {
    const openedUrls = []
    window.__openedUrls = openedUrls
    window.open = (url) => {
      if (typeof url === 'string') {
        openedUrls.push(url)
      }
      return null
    }
  })

  await mockLocationApi(page)
  const mockState = await mockCommonGuestApis(page, { cartItems: [] })

  const orderId = 'order-vnpay-001'
  const orderCode = 'ORD-VNPAY-001'
  const paymentUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?txnRef=order-vnpay-001'

  await page.route('**/api/orders', async (route) => {
    if (route.request().method() !== 'POST') {
      return route.fallback()
    }

    mockState.cartItems = []

    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        data: {
          id: orderId,
          orderCode,
          paymentMethod: 'vnpay',
        },
      }),
    })
  })

  await page.route('**/api/payments/vnpay/create-url', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        data: {
          paymentUrl,
        },
      }),
    })
  })

  await page.route(`**/api/orders/${orderId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(
        createOrderDetailPayload({
          orderId,
          orderCode,
          paymentMethod: 'vnpay',
          paymentStatus: 'pending',
        }),
      ),
    })
  })

  await page.goto('/products/65f100000000000000000010/dien-thoai-iphone-16', {
    waitUntil: 'domcontentloaded',
  })
  await page.getByRole('button', { name: 'Add to cart' }).click()

  await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
  await page.locator('#checkout-recipient-name').fill('Nguyen Van A')
  await page.locator('#checkout-recipient-email').fill('guest@example.com')
  await page.locator('#checkout-recipient-phone').fill('0900000000')
  await page.locator('#checkout-shipping-street').fill('123 Pho Hue')
  await page.locator('select').nth(0).selectOption('1')
  await page.locator('select').nth(1).selectOption('2')
  await page.locator('select').nth(2).selectOption('3')

  await page.getByLabel('VNPAY').check()
  await page.getByRole('button', { name: 'Continue to VNPAY' }).click()

  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}`))
  await expect(page.getByText(orderCode)).toBeVisible()
  await expect(page.getByText('Pending payment')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue payment' })).toBeVisible()

  const openedUrls = await page.evaluate(() => window.__openedUrls || [])
  expect(openedUrls).toContain(paymentUrl)
})

test('cart reconcile UI supports recovering insufficient and excluded lines', async ({ page }) => {
  const cartItems = [
    {
      variantId: 'variant-insufficient',
      productId: 'product-1',
      productName: 'iPhone 16',
      variantLabel: '8GB / 256GB / Blue',
      thumbnailUrl: null,
      quantity: 5,
      unitPrice: 24990000,
      lineTotal: 124950000,
      currency: 'VND',
      selected: false,
      isAvailable: false,
      availabilityStatus: 'insufficient_stock',
      availableQuantity: 2,
    },
    {
      variantId: 'variant-out',
      productId: 'product-2',
      productName: 'Samsung S25',
      variantLabel: '12GB / 512GB / Black',
      thumbnailUrl: null,
      quantity: 1,
      unitPrice: 28990000,
      lineTotal: 28990000,
      currency: 'VND',
      selected: false,
      isAvailable: false,
      availabilityStatus: 'out_of_stock',
      availableQuantity: 0,
    },
    {
      variantId: 'variant-recover',
      productId: 'product-3',
      productName: 'Pixel 10',
      variantLabel: '12GB / 256GB / White',
      thumbnailUrl: null,
      quantity: 1,
      unitPrice: 21990000,
      lineTotal: 21990000,
      currency: 'VND',
      selected: false,
      isAvailable: true,
      availabilityStatus: 'available',
      availableQuantity: 4,
    },
  ]

  const state = {
    items: [...cartItems],
  }

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')

    const sendJson = async (status, payload) => {
      await route.fulfill({
        status,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(payload),
      })
    }

    if (path === '/auth/me' && method === 'GET') {
      return sendJson(401, {
        code: 'AUTH_UNAUTHORIZED',
        message: 'Unauthorized',
      })
    }

    if (path === '/cart' && method === 'GET') {
      return sendJson(200, buildCartPayload(state.items))
    }

    if (path.startsWith('/cart/items/') && method === 'PATCH') {
      const variantId = path.split('/').at(-1)
      const body = JSON.parse(request.postData() || '{}')
      const quantity = Number(body.quantity) || 1

      state.items = state.items.map((item) => {
        if (item.variantId !== variantId) {
          return item
        }

        if (item.variantId === 'variant-insufficient') {
          return {
            ...item,
            quantity,
            lineTotal: quantity * item.unitPrice,
            selected: true,
            isAvailable: true,
            availabilityStatus: 'available',
            availableQuantity: 2,
          }
        }

        if (item.variantId === 'variant-recover') {
          return {
            ...item,
            quantity,
            lineTotal: quantity * item.unitPrice,
            selected: true,
            isAvailable: true,
            availabilityStatus: 'available',
          }
        }

        return item
      })

      return sendJson(200, { data: { ok: true } })
    }

    if (path.startsWith('/cart/items/') && method === 'DELETE') {
      const variantId = path.split('/').at(-1)
      state.items = state.items.filter((item) => item.variantId !== variantId)
      return sendJson(200, { data: { ok: true } })
    }

    return sendJson(404, {
      code: 'MOCK_NOT_FOUND',
      message: `No mock for ${method} ${path}`,
    })
  })

  await page.goto('/cart', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText('Out of stock')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reduce to 2 to recover' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Re-include in checkout' })).toBeVisible()

  await page.getByRole('button', { name: 'Reduce to 2 to recover' }).click()
  await page.getByRole('button', { name: 'Re-include in checkout' }).click()

  await expect(page.getByText('Included in checkout')).toHaveCount(2)
  await expect(page.locator('dt:has-text("Selected for checkout") + dd')).toContainText('3')
})
