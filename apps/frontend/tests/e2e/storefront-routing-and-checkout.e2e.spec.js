import { expect, test } from '@playwright/test'

test('guest is redirected to login when opening protected account route', async ({ page }) => {
  await page.goto('/account', { waitUntil: 'domcontentloaded' })

  await expect(page).toHaveURL(/\/login\?redirect=\/account/)
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})

test('register form blocks submit when confirm password mismatches', async ({ page }) => {
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`
  const email = `e2e.invalid.${uniqueSuffix}@example.com`

  await page.goto('/register', { waitUntil: 'domcontentloaded' })

  await page.locator('#email').fill(email)
  await page.locator('#password').fill('password123')
  await page.locator('#confirmPassword').fill('password456')
  await page.getByRole('button', { name: 'Sign up' }).click()

  await expect(page).toHaveURL(/\/register/)
  await expect(page.getByText('Passwords do not match.')).toBeVisible()
})

test('checkout shows empty-cart state when no valid checkout lines exist', async ({ page }) => {
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' })

  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByRole('heading', { name: 'Cart is empty.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open cart' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Continue shopping' })).toBeVisible()
})
