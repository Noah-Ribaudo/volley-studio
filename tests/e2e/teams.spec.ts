import { test, expect } from '@playwright/test'

test.describe('Teams Page', () => {
  test('loads the teams page', async ({ page }) => {
    await page.goto('/teams')

    // Should see the page header
    await expect(page.getByRole('heading', { name: /teams/i })).toBeVisible()

    // Should see create and import options
    await expect(page.getByText(/create new team/i)).toBeVisible()
    await expect(page.getByText(/import team/i)).toBeVisible()
  })

  test('shows search bar', async ({ page }) => {
    await page.goto('/teams')

    // Should have a search input
    const searchInput = page.getByPlaceholder(/search/i)
    await expect(searchInput).toBeVisible()
  })

  test('create team button opens dialog', async ({ page }) => {
    await page.goto('/teams')

    // Click the new team button
    const newTeamButton = page.getByRole('button', { name: /new team/i })
    await newTeamButton.click()

    // Should see dialog content (either auth prompt or create form)
    await expect(page.getByRole('dialog')).toBeVisible()
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

    // Should see the "never mind" escape option
    await expect(page.getByRole('button', { name: /whiteboard/i })).toBeVisible()

    // Should see privacy policy link
    await expect(page.getByText(/privacy policy/i)).toBeVisible()
  })

  test('import team button opens dialog', async ({ page }) => {
    await page.goto('/teams')

    // Click the import button
    const importButton = page.getByRole('button', { name: /import/i })
    await importButton.click()

    // Should see dialog
    await expect(page.getByRole('dialog')).toBeVisible()
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

    // Click the "never mind" button
    const dismissButton = page.getByRole('button', { name: /whiteboard/i })
    await dismissButton.click()

    // Dialog should be closed
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('back button returns to home', async ({ page }) => {
    await page.goto('/teams')

    // Click back button
    const backButton = page.getByRole('button', { name: /back/i })
    await backButton.click()

    // Should be back on main page
    await expect(page).toHaveURL('/')
  })
})
