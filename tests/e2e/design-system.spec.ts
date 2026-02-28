import { expect, test } from '@playwright/test'

test.describe('Design System dev page', () => {
  test('shows tabs and core layout on desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop-only layout test')

    await page.goto('/developer/design-system')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /^Design System$/i }).first()).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Principles' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Glossary' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Live Playground' })).toBeVisible()
  })

  test('search filters glossary entries', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop-only filter test')

    await page.goto('/developer/design-system')
    await page.waitForLoadState('networkidle')

    await page.getByRole('tab', { name: 'Glossary' }).click()

    const search = page.getByPlaceholder('Search principles, glossary, and playground sections')
    await search.fill('Player Token')

    await expect(page.getByText('Player Token', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Radius Scale', { exact: true }).first()).not.toBeVisible()
  })

  test('shows desktop-only message on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only fallback test')

    await page.goto('/developer/design-system')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/desktop-only/i)).toBeVisible()
    await expect(page.getByText(/open this page on a larger screen/i)).toBeVisible()
  })
})
