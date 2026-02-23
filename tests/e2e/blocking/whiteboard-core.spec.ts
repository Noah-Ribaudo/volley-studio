import { expect, test } from '@playwright/test'
import { createLocalTeam, resetClientState } from './helpers'

test.describe('Blocking whiteboard core flows', () => {
  test.beforeEach(async ({ page }) => {
    await resetClientState(page)
  })

  test('desktop sidebar defaults to collapsed and can be expanded', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Sidebar is hidden on mobile/tablet viewports')
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
      'Choose a team, assign players to lineup positions, and control court display.'
    )
    const courtSetupButton = page.getByRole('button', { name: /court setup/i }).first()
    await expect(courtSetupDescription).not.toBeVisible()
    await courtSetupButton.click()
    await expect(courtSetupDescription).toBeVisible()
    // Close: if a dialog opened (mobile), press Escape; otherwise click button again
    const dialog = page.getByRole('dialog')
    if (await dialog.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape')
    } else {
      await courtSetupButton.click()
    }
    await expect(courtSetupDescription).not.toBeVisible()

    await page.getByRole('button', { name: /^play/i }).first().click()
    await expect(page.getByRole('button', { name: /^reset/i }).first()).toBeVisible()
    await page.getByRole('button', { name: /^reset/i }).first().click()
    await expect(page.getByRole('button', { name: /^play/i }).first()).toBeVisible()

    // Phase button: click-and-verify with retry.
    // After the play/reset cycle, React may still be processing state updates
    // and the first click can be swallowed. Poll until the click takes effect.
    const offensePhaseButton = page.getByRole('button', { name: /offense/i }).first()
    await expect(async () => {
      await offensePhaseButton.click()
      await expect(offensePhaseButton).toHaveAttribute('aria-pressed', 'true')
    }).toPass({ timeout: 10_000 })

    // Rotation dropdown: on desktop the trigger says "Rotation 1", on mobile it says "R1"
    const rotationButton = page.getByRole('button', { name: /rotation|^R\d$/i }).first()
    await rotationButton.click()
    await page.getByRole('menuitem', { name: /rotation 3/i }).click()
    // After selecting, the trigger text updates: "Rotation 3" on desktop, "R3" on mobile
    await expect(
      page.getByRole('button', { name: /rotation 3|^R3$/i }).first()
    ).toBeVisible()
  })
})
