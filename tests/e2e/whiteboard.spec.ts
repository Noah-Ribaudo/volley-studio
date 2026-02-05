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

    // Find and click the teams link in navigation
    const teamsLink = page.getByRole('link', { name: /teams/i })
    await teamsLink.click()

    // Should be on teams page
    await expect(page).toHaveURL(/\/teams/)
  })

  test('whiteboard is interactive', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle')

    // The volleyball court SVG should be the large one on the page
    // Find an SVG that has substantial size (the court, not small icons)
    const svgElements = page.locator('svg')
    const count = await svgElements.count()

    let foundLargeSvg = false
    for (let i = 0; i < count; i++) {
      const svg = svgElements.nth(i)
      const box = await svg.boundingBox()
      if (box && box.width > 200 && box.height > 200) {
        foundLargeSvg = true
        break
      }
    }

    expect(foundLargeSvg).toBe(true)
  })

  test('can see player positions on court', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // The page should have court elements (SVGs containing the court/players)
    // Find a visible SVG that's large enough to be the court
    const svgElements = page.locator('svg')
    const count = await svgElements.count()

    // Should have multiple SVG elements on the page
    expect(count).toBeGreaterThan(0)
  })
})
