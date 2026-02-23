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

  test('create team button navigates to team editor', async ({ page }) => {
    await page.goto('/teams')

    // Click the new team button
    const newTeamButton = page.getByRole('button', { name: /new team/i })
    await newTeamButton.click()

    // Should navigate to the new team's edit page
    await expect(page).toHaveURL(/\/teams\/local-/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /edit team/i })).toBeVisible()
  })

  test('unauthenticated user can create a local team directly', async ({ page }) => {
    await page.goto('/teams')

    // Click the new team button - creates a local team and navigates
    const newTeamButton = page.getByRole('button', { name: /new team/i })
    await newTeamButton.click()

    // Should navigate to the team edit page without requiring auth
    await expect(page).toHaveURL(/\/teams\/local-/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /edit team/i })).toBeVisible()
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

  test('can navigate back from team editor to teams list', async ({ page }) => {
    await page.goto('/teams')

    // Create a local team
    const newTeamButton = page.getByRole('button', { name: /new team/i })
    await newTeamButton.click()

    // Should be on team edit page
    await expect(page).toHaveURL(/\/teams\/local-/, { timeout: 10_000 })

    // Navigate back to teams
    await page.goto('/teams')
    await expect(page.getByRole('heading', { name: /^teams$/i })).toBeVisible()
  })

  test('does not show an in-page back button', async ({ page }) => {
    await page.goto('/teams')
    await expect(page.locator('main a[href="/"]', { hasText: 'Back' })).toHaveCount(0)
  })
})
