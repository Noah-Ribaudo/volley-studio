import { test, expect, type Page } from '@playwright/test'

test.describe.configure({ timeout: 60_000 })

async function clickVisibleButtonByName(page: Page, name: RegExp) {
  const buttons = page.getByRole('button', { name })
  const count = await buttons.count()

  for (let i = 0; i < count; i++) {
    const candidate = buttons.nth(i)
    if (await candidate.isVisible()) {
      await candidate.click()
      return
    }
  }

  throw new Error(`No visible button found for pattern: ${String(name)}`)
}

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

    // Check that a visible Teams nav link exists with the expected destination.
    const teamsLinks = page.locator('a[href="/teams"]')
    const linkCount = await teamsLinks.count()
    let teamsLinkFound = false

    for (let i = 0; i < linkCount; i++) {
      const candidate = teamsLinks.nth(i)
      if (await candidate.isVisible()) {
        await expect(candidate).toHaveAttribute('href', '/teams')
        teamsLinkFound = true
        break
      }
    }

    expect(teamsLinkFound).toBeTruthy()

    // Navigate and confirm route is reachable on mobile/tablet.
    await page.goto('/teams')

    // Should navigate to teams page
    await expect(page).toHaveURL(/\/teams/)
  })

  test('touch interactions on mobile court', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile')

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // The court should respond to touch.
    const court = page.getByRole('img', { name: /volleyball court/i }).first()
    await expect(court).toBeVisible()
    await court.tap()

    // Page should still be functional after tap
    await expect(page).toHaveURL('/')
  })

  test('teams page works on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile')

    await page.goto('/teams')

    // Wait for the New Team button to appear (loading must complete)
    const newTeamBtn = page.getByRole('button', { name: /new team/i }).first()
    await expect(newTeamBtn).toBeVisible({ timeout: 15_000 })

    // Create team button should be tappable and navigate to team editor
    await newTeamBtn.click()

    // Should navigate to the team edit page
    await expect(page).toHaveURL(/\/teams\/local-/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /edit team/i })).toBeVisible()
  })

  test('team creation works on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile')

    await page.goto('/teams')

    // Wait for the New Team button to appear (loading must complete)
    const newTeamBtn = page.getByRole('button', { name: /new team/i }).first()
    await expect(newTeamBtn).toBeVisible({ timeout: 15_000 })
    await newTeamBtn.click()

    // Should be on the team edit page
    await expect(page).toHaveURL(/\/teams\/local-/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /edit team/i })).toBeVisible()

    // Team name input should be usable on mobile
    const teamNameInput = page.getByPlaceholder(/team name/i)
    await expect(teamNameInput).toBeVisible()
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

  test('viewport is properly sized for mobile', async ({ page, isMobile }, testInfo) => {
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
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible({ timeout: 10_000 })
  })

  test('create team navigates to editor', async ({ page }) => {
    await page.goto('/teams')

    // Wait for the New Team button to appear (loading must complete)
    const newTeamBtn = page.getByRole('button', { name: /new team/i }).first()
    await expect(newTeamBtn).toBeVisible({ timeout: 15_000 })
    await newTeamBtn.click()

    // Should navigate to the team edit page
    await expect(page).toHaveURL(/\/teams\/local-/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /edit team/i })).toBeVisible()
  })

  test('unauthenticated users can create local teams directly', async ({ page }) => {
    await page.goto('/teams')

    // Wait for the New Team button to appear (loading must complete)
    const newTeamBtn = page.getByRole('button', { name: /new team/i }).first()
    await expect(newTeamBtn).toBeVisible({ timeout: 15_000 })
    await newTeamBtn.click()

    // Unauthenticated users create local teams without auth prompt
    await expect(page).toHaveURL(/\/teams\/local-/, { timeout: 10_000 })
  })
})
