import { test, expect, devices } from '@playwright/test'

// Only run these tests on mobile devices
test.describe('Mobile Experience', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Mobile tests only run on chromium')

  test('whiteboard loads on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile')

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Page should load without errors
    await expect(page).toHaveTitle(/Volley Studio/i)

    // Court should be visible
    const svgElements = page.locator('svg')
    const count = await svgElements.count()
    expect(count).toBeGreaterThan(0)
  })

  test('mobile navigation works', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile')

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Find and tap the teams link/button
    const teamsLink = page.getByRole('link', { name: /teams/i })
    await teamsLink.tap()

    // Should navigate to teams page
    await expect(page).toHaveURL(/\/teams/)
  })

  test('touch interactions on mobile court', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile')

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // The court should respond to touch
    // Find a large SVG (the court)
    const svgElements = page.locator('svg')
    const count = await svgElements.count()

    for (let i = 0; i < count; i++) {
      const svg = svgElements.nth(i)
      const box = await svg.boundingBox()
      if (box && box.width > 200 && box.height > 200) {
        // Found the court - try tapping it
        await svg.tap()
        break
      }
    }

    // Page should still be functional after tap
    await expect(page).toHaveURL('/')
  })

  test('teams page works on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile')

    await page.goto('/teams')
    await page.waitForLoadState('networkidle')

    // Should see the teams page content
    await expect(page.getByText(/create new team/i)).toBeVisible()

    // Create team button should be tappable
    const newTeamButton = page.getByRole('button', { name: /new team/i })
    await newTeamButton.tap()

    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('dialogs are usable on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile')

    await page.goto('/teams')

    // Open create team dialog
    const newTeamButton = page.getByRole('button', { name: /new team/i })
    await newTeamButton.tap()

    // Dialog should be visible and contain expected content
    await expect(page.getByRole('dialog')).toBeVisible()

    // Should be able to dismiss with the cancel button
    const dismissButton = page.getByRole('button', { name: /whiteboard/i })
    await expect(dismissButton).toBeVisible()
    await dismissButton.tap()

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('privacy page is readable on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile')

    await page.goto('/privacy')
    await page.waitForLoadState('networkidle')

    // Should see the privacy content
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible()

    // Content should be scrollable - check that the page has reasonable content
    await expect(page.getByText(/what we store/i)).toBeVisible()
    await expect(page.getByText(/what we don't do/i)).toBeVisible()
  })

  test('viewport is properly sized for mobile', async ({ page, isMobile, browserName }, testInfo) => {
    // Only run on mobile project, not tablet
    test.skip(!isMobile || testInfo.project.name === 'tablet', 'This test only runs on mobile phones')

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Get viewport size
    const viewportSize = page.viewportSize()
    expect(viewportSize).toBeTruthy()

    // Mobile phone viewport should be narrow (under 500px)
    expect(viewportSize!.width).toBeLessThan(500)
  })
})

// Tests that should pass on ALL devices (desktop, mobile, tablet)
test.describe('Cross-device compatibility', () => {
  test('main page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Volley Studio/i)
  })

  test('teams page loads', async ({ page }) => {
    await page.goto('/teams')
    await expect(page.getByRole('heading', { name: /teams/i })).toBeVisible()
  })

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible()
  })

  test('create team dialog opens', async ({ page }) => {
    await page.goto('/teams')

    const newTeamButton = page.getByRole('button', { name: /new team/i })
    await newTeamButton.click()

    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('auth prompt appears for unauthenticated users', async ({ page }) => {
    await page.goto('/teams')

    const newTeamButton = page.getByRole('button', { name: /new team/i })
    await newTeamButton.click()

    // Should see the "I don't want your data" message
    await expect(page.getByText(/I don't want your data/i)).toBeVisible()
  })
})
