import { test, expect } from '@playwright/test'

test.describe('Privacy Policy', () => {
  test('loads the privacy page', async ({ page }) => {
    await page.goto('/privacy')
    await page.waitForLoadState('networkidle')

    // Should see the privacy policy heading
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible()
  })

  test('contains key privacy information', async ({ page }) => {
    await page.goto('/privacy')
    await page.waitForLoadState('networkidle')

    // Should explain what data is stored
    await expect(page.getByText(/what we store/i)).toBeVisible()
    await expect(page.getByText(/email and name/i)).toBeVisible()
    await expect(page.getByText(/team\/settings data/i)).toBeVisible()

    // Should explain what we don't do
    await expect(page.getByText(/what we don't do/i)).toBeVisible()
    await expect(page.getByText(/sell your data/i)).toBeVisible()

    // Should mention Google sign-in
    await expect(page.getByText(/google sign-in/i)).toBeVisible()

    // Should mention no account required
    await expect(page.getByText(/no account required/i)).toBeVisible()
  })

  test('has back button that works', async ({ page }) => {
    await page.goto('/privacy')

    // Click back link
    const backLink = page.getByRole('link', { name: /back/i })
    await expect(backLink).toBeVisible()
    await backLink.click()

    // The back control on this page routes to home.
    await expect(page).toHaveURL('/', { timeout: 10_000 })
  })
})
