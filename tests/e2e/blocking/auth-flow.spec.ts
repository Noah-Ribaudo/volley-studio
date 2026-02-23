import { expect, test } from '@playwright/test'
import { resetClientState } from './helpers'

test.describe('Blocking auth flows', () => {
  test.beforeEach(async ({ page }) => {
    await resetClientState(page)
  })

  test('signed-out entry points route to sign-in and back to app', async ({ page }) => {
    await page.goto('/settings')

    await expect(page.getByText(/account/i).first()).toBeVisible()
    await page.getByRole('link', { name: /^sign in$/i }).first().click()

    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 })
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
    await expect(page.getByLabel(/^email$/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()

    await page.getByRole('link', { name: /continue without signing in/i }).click()
    await expect(page).toHaveURL('/', { timeout: 15_000 })
  })

  test('dev admin can sign in and sign out from settings', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByRole('button', { name: /sign in as admin/i }).click()

    await expect(page).toHaveURL(/\/teams/, { timeout: 20_000 })

    await page.goto('/settings')
    const signOutButton = page.getByRole('button', { name: /^sign out$/i })
    await expect(signOutButton).toBeVisible({ timeout: 15_000 })
    await signOutButton.click()

    await expect(page.getByRole('link', { name: /^sign in$/i }).first()).toBeVisible({ timeout: 15_000 })
  })
})
