import { test, expect } from '@playwright/test'

const CLIENT_ERROR_PATTERN = /hydration failed|server rendered html didn't match|didn't match the client|cannot read properties of undefined \(reading 'call'\)/i

function captureClientErrors(page: import('@playwright/test').Page) {
  const messages: string[] = []

  page.on('console', (message) => {
    const text = message.text()
    if (CLIENT_ERROR_PATTERN.test(text)) {
      messages.push(`console:${text}`)
    }
  })

  page.on('pageerror', (error) => {
    const text = error.message
    if (CLIENT_ERROR_PATTERN.test(text)) {
      messages.push(`pageerror:${text}`)
    }
  })

  return messages
}

test.describe('Whiteboard', () => {
  test('loads the main whiteboard page', async ({ page }) => {
    const clientErrors = captureClientErrors(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(250)

    // Page should have loaded without errors
    await expect(page).toHaveTitle(/Volley Studio/i)
    expect(clientErrors, clientErrors.join('\n')).toEqual([])

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

  test('court setup button toggles open and close', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const courtSetupButton = page.getByRole('button', { name: /court setup/i }).first()
    const setupDescription = page.getByText('Choose a team, assign players to lineup positions, and control court display.').first()

    await expect(courtSetupButton).toBeVisible()
    await expect(setupDescription).not.toBeVisible()

    await courtSetupButton.click()
    await expect(setupDescription).toBeVisible()

    // Close: if a dialog opened (mobile), press Escape; otherwise click button again
    const dialog = page.getByRole('dialog')
    if (await dialog.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape')
    } else {
      await courtSetupButton.click()
    }
    await expect(setupDescription).not.toBeVisible()
  })
})
