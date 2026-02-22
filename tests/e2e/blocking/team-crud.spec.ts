import { expect, test } from '@playwright/test'
import { addRosterPlayer, createLocalTeam, resetClientState } from './helpers'

test.describe('Blocking local team CRUD flows', () => {
  test.beforeEach(async ({ page }) => {
    await resetClientState(page)
  })

  test('team, lineup, and player CRUD works end-to-end', async ({ page }) => {
    await createLocalTeam(page)

    await page.getByPlaceholder('Team name').fill('E2E Local Team')
    await page.getByRole('button', { name: /^save$/i }).first().click()
    await expect(page.locator('input[value="E2E Local Team"]')).toBeVisible()

    await addRosterPlayer(page, 'Alex', '7')
    const playerNameInputs = page.getByPlaceholder('Player name')
    await expect(playerNameInputs).toHaveCount(2)

    await playerNameInputs.nth(1).fill('Alex Prime')
    await page.getByRole('button', { name: /^save$/i }).nth(1).click()
    await expect(page.locator('input[value="Alex Prime"]')).toBeVisible()

    await page.getByRole('button', { name: /create new lineup/i }).click()
    await page.getByLabel(/lineup name/i).fill('Serve Receive')
    await page.getByRole('button', { name: /^create$/i }).click()

    const lineupSelect = page.getByRole('combobox').first()
    await lineupSelect.click()
    await expect(page.getByRole('option', { name: /serve receive/i })).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: /lineup actions/i }).click()
    await page.getByRole('menuitem', { name: /^duplicate$/i }).click()
    await page.getByLabel(/lineup name/i).fill('Serve Receive Copy')
    await page.getByRole('button', { name: /^duplicate$/i }).click()

    await lineupSelect.click()
    await page.getByRole('option', { name: /serve receive copy/i }).click()

    await page.getByRole('button', { name: /lineup actions/i }).click()
    const setActive = page.getByRole('menuitem', { name: /set as active/i })
    if (await setActive.isVisible()) {
      await setActive.click()
    } else {
      await page.keyboard.press('Escape')
    }

    await page.getByRole('button', { name: /lineup actions/i }).click()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('menuitem', { name: /^delete$/i }).click()

    await page.getByRole('button', { name: /^remove$/i }).click()
    await expect(page.getByText(/no players yet/i)).toBeVisible()

    await page.getByRole('button', { name: /^show$/i }).click()
    await page.getByRole('button', { name: /^delete team$/i }).click()
    await page.getByRole('button', { name: /yes, delete/i }).click()

    await expect(page).toHaveURL('/teams', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /^teams$/i })).toBeVisible()
  })
})
