import { test, expect } from '@playwright/test'

test.describe('Privacy Policy', () => {
  test('loads the privacy page', async ({ page }) => {
    await page.goto('/privacy')

    // Should see the privacy policy heading
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible()
  })

  test('contains key privacy information', async ({ page }) => {
    await page.goto('/privacy')

    // Should explain what data is stored
    await expect(page.getByText(/what we store/i)).toBeVisible()
    await expect(page.getByText(/email and name/i)).toBeVisible()
    await expect(page.getByText(/team data/i)).toBeVisible()

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

    // Click back button
    const backButton = page.getByRole('button', { name: /back/i })
    await backButton.click()

    // Should navigate away from privacy page
    await expect(page).not.toHaveURL('/privacy')
  })
})
