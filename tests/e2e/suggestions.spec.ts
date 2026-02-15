import { test, expect } from '@playwright/test'

test.describe('Suggestion Box', () => {
  test('shows the suggestion box on settings page', async ({ page }) => {
    await page.goto('/settings')

    // Wait for the suggestion box to appear (it's at the bottom of settings)
    await expect(page.getByText(/got an idea/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/I built this for coaches like you/i)).toBeVisible()
    await expect(page.getByPlaceholder(/I wish this app could/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send it/i })).toBeVisible()
  })

  test('submit button is disabled when textarea is empty', async ({ page }) => {
    await page.goto('/settings')

    const submitButton = page.getByRole('button', { name: /send it/i })
    await expect(submitButton).toBeDisabled({ timeout: 15_000 })
  })

  test('submit button enables when text is entered', async ({ page }) => {
    await page.goto('/settings')

    const textarea = page.getByPlaceholder(/I wish this app could/i)
    const submitButton = page.getByRole('button', { name: /send it/i })

    await expect(textarea).toBeVisible({ timeout: 15_000 })
    await textarea.fill('Add a drill builder')
    await expect(submitButton).toBeEnabled()
  })

  test('hides character count under 500 chars, shows it at 500+', async ({ page }) => {
    await page.goto('/settings')

    const textarea = page.getByPlaceholder(/I wish this app could/i)
    await expect(textarea).toBeVisible({ timeout: 15_000 })

    // Short text — counter should be hidden
    await textarea.fill('Hello')
    await expect(page.getByText(/\/1000/)).not.toBeVisible()

    // At 500 chars — counter should appear
    await textarea.fill('a'.repeat(500))
    await expect(page.getByText('500/1000')).toBeVisible()
  })

  test('enforces character limit at 1000', async ({ page }) => {
    await page.goto('/settings')

    const textarea = page.getByPlaceholder(/I wish this app could/i)
    await expect(textarea).toBeVisible({ timeout: 15_000 })

    // Fill with exactly 1000 characters
    const maxText = 'a'.repeat(1000)
    await textarea.fill(maxText)
    await expect(page.getByText('1000/1000')).toBeVisible()

    // Typing more should not increase count beyond 1000
    await textarea.press('b')
    await expect(page.getByText('1000/1000')).toBeVisible()
  })

  test('submitting shows success toast and clears textarea', async ({ page }) => {
    // Intercept the Convex action call to avoid creating a real Linear issue
    // Set up route before navigation to ensure it's ready
    await page.route('**/api/**', async (route) => {
      const request = route.request()
      const postData = request.postData()
      if (postData && postData.includes('submitSuggestion')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', value: { success: true } }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/settings')

    const textarea = page.getByPlaceholder(/I wish this app could/i)
    const submitButton = page.getByRole('button', { name: /send it/i })

    await expect(textarea).toBeVisible({ timeout: 15_000 })
    await textarea.fill('Test suggestion for e2e')
    await submitButton.click()

    // Button should show sending state
    await expect(page.getByRole('button', { name: /sending/i })).toBeVisible()
  })

  test('suggestion box also appears on settings page canonical URL', async ({ page }) => {
    await page.goto('/settings')

    await expect(page.getByText(/got an idea/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByPlaceholder(/I wish this app could/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send it/i })).toBeVisible()
  })
})
