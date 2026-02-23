import { expect, type Page } from '@playwright/test'

const PERSISTED_KEYS = [
  'volley-local-teams',
  'volley-team-state',
  'volley-navigation',
  'volley-whiteboard-data',
  'volley-display-prefs',
  'volley-ui-prefs',
  'volley-learning',
  'volleyball-theme',
  'volleyball-hints',
  'volleyball-interaction-mode',
  'gametime-storage',
  'sidebar_state',
] as const

export async function resetClientState(page: Page) {
  await page.context().clearCookies()
  await page.addInitScript((keys: readonly string[]) => {
    for (const key of keys) {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    }
  }, PERSISTED_KEYS)
}

export async function createLocalTeam(page: Page) {
  await page.goto('/teams')
  await page.getByRole('button', { name: /^new team$/i }).first().click()
  await expect(page).toHaveURL(/\/teams\/local-/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: /edit team/i })).toBeVisible()
}

export async function addRosterPlayer(page: Page, name: string, number: string) {
  await page.getByPlaceholder('Player name').first().fill(name)
  await page.getByPlaceholder('#').first().fill(number)
  await page.getByRole('button', { name: /^add$/i }).click()
}
