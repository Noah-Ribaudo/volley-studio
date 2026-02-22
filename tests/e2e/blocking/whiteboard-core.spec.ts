import { expect, test } from '@playwright/test'
import { createLocalTeam, resetClientState } from './helpers'

test.describe('Blocking whiteboard core flows', () => {
  test.beforeEach(async ({ page }) => {
    await resetClientState(page)
  })

  test('desktop sidebar defaults to collapsed and can be expanded', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.locator('[data-slot="sidebar"][data-state="collapsed"]')
    await expect(sidebar).toBeVisible()

    await page.locator('[data-sidebar="trigger"]').click()
    await expect(page.locator('[data-slot="sidebar"][data-state="expanded"]')).toBeVisible()
  })

  test('whiteboard controls are interactive for a local team', async ({ page }) => {
    await createLocalTeam(page)
    await page.getByRole('button', { name: /open whiteboard/i }).click()

    await expect(page).toHaveURL('/', { timeout: 15_000 })
    await expect(page.locator('[data-court-svg]')).toBeVisible({ timeout: 10_000 })

    const courtSetupDescription = page.getByText(
      'Choose team, lineup, and opponent visibility for the whiteboard.'
    )
    await expect(courtSetupDescription).not.toBeVisible()
    await page.getByRole('button', { name: /^court setup$/i }).first().click()
    await expect(courtSetupDescription).toBeVisible()
    await page.getByRole('button', { name: /^court setup$/i }).first().click()
    await expect(courtSetupDescription).not.toBeVisible()

    await page.getByRole('button', { name: /^play$/i }).click()
    await expect(page.getByRole('button', { name: /^reset$/i })).toBeVisible()
    await page.getByRole('button', { name: /^reset$/i }).click()
    await expect(page.getByRole('button', { name: /^play$/i })).toBeVisible()

    const attackPhaseButton = page.getByRole('button', { name: /^attack$/i }).first()
    await attackPhaseButton.click()
    await expect(attackPhaseButton).toHaveAttribute('aria-pressed', 'true')

    const rotationButton = page.getByRole('button', { name: /rotation/i }).first()
    await rotationButton.click()
    await page.getByRole('menuitem', { name: /rotation 3/i }).click()
    await expect(page.getByRole('button', { name: /rotation 3/i })).toBeVisible()
  })
})
