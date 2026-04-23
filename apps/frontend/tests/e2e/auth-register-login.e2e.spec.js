import { expect, test } from '@playwright/test'

test('customer can register and login again with persisted account', async ({ page, browser }) => {
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`
  const email = `e2e.${uniqueSuffix}@example.com`
  const password = 'password123'

  await page.goto('/register', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#email')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('#password')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('#confirmPassword')).toBeVisible({ timeout: 15_000 })

  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('#confirmPassword').fill(password)
  await page.getByRole('button', { name: 'Sign up' }).click()

  await expect(page).toHaveURL(/\/catalog\/products/)
  await page.goto('/account')
  await expect(page).toHaveURL(/\/account/)
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()
  await expect(page.getByText(email).first()).toBeVisible()

  const meAfterRegister = await page.request.get('/api/auth/me', {
    headers: {
      'X-Auth-Scope': 'customer',
    },
  })

  expect(meAfterRegister.status()).toBe(200)

  const meAfterRegisterBody = await meAfterRegister.json()
  expect(meAfterRegisterBody?.data?.email).toBe(email)
  expect(meAfterRegisterBody?.data?.role).toBe('customer')

  await page.request.post('/api/auth/logout', {
    headers: {
      'X-Auth-Scope': 'customer',
    },
  })
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login/)

  const secondContext = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
  })

  try {
    const secondPage = await secondContext.newPage()

    await secondPage.goto('/login', { waitUntil: 'domcontentloaded' })
    await expect(secondPage.locator('#email')).toBeVisible({ timeout: 15_000 })
    await expect(secondPage.locator('#password')).toBeVisible({ timeout: 15_000 })
    await secondPage.locator('#email').fill(email)
    await secondPage.locator('#password').fill(password)
    await secondPage.getByRole('button', { name: 'Sign in' }).click()

    await expect(secondPage).toHaveURL(/\/catalog\/products/)
    await secondPage.goto('/account')
    await expect(secondPage).toHaveURL(/\/account/)
    await expect(secondPage.getByText(email).first()).toBeVisible()
    await expect(secondPage.getByText('Customer')).toBeVisible()

    const meAfterLogin = await secondPage.request.get('/api/auth/me', {
      headers: {
        'X-Auth-Scope': 'customer',
      },
    })

    expect(meAfterLogin.status()).toBe(200)

    const meAfterLoginBody = await meAfterLogin.json()
    expect(meAfterLoginBody?.data?.email).toBe(email)
    expect(meAfterLoginBody?.data?.role).toBe('customer')
  } finally {
    await secondContext.close()
  }
})
