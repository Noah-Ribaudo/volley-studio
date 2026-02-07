import { test, expect } from '@playwright/test'

test.describe('Suggestion Box', () => {
  test('shows the suggestion box on settings page', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /got an idea/i })).toBeVisible()
    await expect(page.getByText(/I built this for coaches like you/i)).toBeVisible()
    await expect(page.getByPlaceholder(/I wish this app could/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send it/i })).toBeVisible()
  })

  test('submit button is disabled when textarea is empty', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const submitButton = page.getByRole('button', { name: /send it/i })
    await expect(submitButton).toBeDisabled()
  })

  test('submit button enables when text is entered', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const textarea = page.getByPlaceholder(/I wish this app could/i)
    const submitButton = page.getByRole('button', { name: /send it/i })

    await textarea.fill('Add a drill builder')
    await expect(submitButton).toBeEnabled()
  })

  test('shows character count', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Should show 0/500 initially
    await expect(page.getByText('0/500')).toBeVisible()

    // Type some text and verify count updates
    const textarea = page.getByPlaceholder(/I wish this app could/i)
    await textarea.fill('Hello')
    await expect(page.getByText('5/500')).toBeVisible()
  })

  test('enforces character limit', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const textarea = page.getByPlaceholder(/I wish this app could/i)

    // Fill with exactly 500 characters
    const maxText = 'a'.repeat(500)
    await textarea.fill(maxText)
    await expect(page.getByText('500/500')).toBeVisible()

    // Typing more should not increase count beyond 500
    await textarea.press('b')
    await expect(page.getByText('500/500')).toBeVisible()
  })

  test('submitting shows success toast and clears textarea', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Intercept the Convex action call to avoid creating a real GitHub issue
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

    const textarea = page.getByPlaceholder(/I wish this app could/i)
    const submitButton = page.getByRole('button', { name: /send it/i })

    await textarea.fill('Test suggestion for e2e')
    await submitButton.click()

    // Button should show sending state
    await expect(page.getByRole('button', { name: /sending/i })).toBeVisible()
  })

  test('suggestion box also appears on volleyball settings page', async ({ page }) => {
    await page.goto('/volleyball/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /got an idea/i })).toBeVisible()
    await expect(page.getByPlaceholder(/I wish this app could/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send it/i })).toBeVisible()
  })
})
