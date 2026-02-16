import { test, expect } from '@playwright/test'

test.describe.configure({ timeout: 60_000 })

test.describe('Teams Page', () => {
  test('loads the teams page', async ({ page }) => {
    await page.goto('/teams')

    // Should see the page header
    await expect(page.getByRole('heading', { name: /teams/i })).toBeVisible()

    // Should see create and import actions
    await expect(page.getByRole('button', { name: /new team/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^import$/i })).toBeVisible()
  })

  test('hides search bar until enough teams exist', async ({ page }) => {
    await page.goto('/teams')

    // Search should not be shown in a fresh/short team list state
    await expect(page.getByPlaceholder(/search teams/i)).toHaveCount(0)
  })

  test('create team button opens dialog', async ({ page }) => {
    await page.goto('/teams')

    // Click the new team button
    const newTeamButton = page.getByRole('button', { name: /new team/i })
    await newTeamButton.click()

    // Should see dialog content (either auth prompt or create form)
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
  })

  test('unauthenticated user sees sign-in prompt when creating team', async ({ page }) => {
    await page.goto('/teams')

    // Click the new team button
    const newTeamButton = page.getByRole('button', { name: /new team/i })
    await newTeamButton.click()

    // Should see the sign-in prompt (not the create form)
    await expect(page.getByText(/quick sign-in/i)).toBeVisible()
    await expect(page.getByText(/I don't want your data/i)).toBeVisible()

    // Should see Google sign-in option
    await expect(page.getByText(/continue with google/i)).toBeVisible()

    // Should see email/password option
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()

    // Should see the local-only escape option
    await expect(page.getByRole('button', { name: /continue without an account/i })).toBeVisible()

    // Should see privacy policy link
    await expect(page.getByText(/privacy policy/i)).toBeVisible()
  })

  test('import team button opens dialog', async ({ page }) => {
    await page.goto('/teams')

    // Click the import button
    const importButton = page.getByRole('button', { name: /^import$/i }).first()
    await importButton.click()

    // Should see dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
  })

  test('unauthenticated user sees sign-in prompt when importing team', async ({ page }) => {
    await page.goto('/teams')

    // Click the import button
    const importButton = page.getByRole('button', { name: /import/i })
    await importButton.click()

    // Should see the sign-in prompt (could be "quick sign-in" or "I don't want your data")
    await expect(page.getByText(/I don't want your data/i)).toBeVisible()
  })

  test('can dismiss create team dialog', async ({ page }) => {
    await page.goto('/teams')

    // Open dialog
    const newTeamButton = page.getByRole('button', { name: /new team/i })
    await newTeamButton.click()

    // Dialog should be visible
    await expect(page.getByRole('dialog')).toBeVisible()

    // Click the local-only button
    const dismissButton = page.getByRole('button', { name: /continue without an account/i })
    await dismissButton.click()

    // Dialog should stay open and switch to local create form
    await expect(page.getByRole('heading', { name: /create new team/i })).toBeVisible()
  })

  test('does not show an in-page back button', async ({ page }) => {
    await page.goto('/teams')
    await expect(page.locator('main a[href="/"]', { hasText: 'Back' })).toHaveCount(0)
  })
})
