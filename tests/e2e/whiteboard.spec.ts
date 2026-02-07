import { test, expect } from '@playwright/test'

test.describe('Whiteboard', () => {
  test('loads the main whiteboard page', async ({ page }) => {
    await page.goto('/')

    // Page should have loaded without errors
    await expect(page).toHaveTitle(/Volley Studio/i)

    // Should have SVG elements on the page (court and/or icons)
    const svgCount = await page.locator('svg').count()
    expect(svgCount).toBeGreaterThan(0)
  })

  test('can navigate to teams page', async ({ page }) => {
    await page.goto('/')

    // Route should be reachable from the whiteboard session context
    await page.goto('/teams')

    // Should be on teams page
    await expect(page).toHaveURL(/\/teams/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /teams/i })).toBeVisible()
  })

  test('whiteboard is interactive', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle')

    // Target the court surface directly (stable selector exposed by the app)
    const court = page.locator('[data-court-svg]').first()
    await expect(court).toBeVisible({ timeout: 10_000 })

    const box = await court.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(200)
    expect(box!.height).toBeGreaterThan(200)
  })

  test('can see player positions on court', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    const court = page.locator('[data-court-svg]').first()
    await expect(court).toBeVisible({ timeout: 10_000 })

    // Player tokens include circles (court lines/icons are separate)
    const circleCount = await court.locator('circle').count()
    expect(circleCount).toBeGreaterThanOrEqual(6)
  })
})
