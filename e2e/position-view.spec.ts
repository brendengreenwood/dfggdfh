import { test, expect } from '@playwright/test'

test.describe('Position View (Merchandising)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/merchandising')
  })

  test('renders position view with dark theme', async ({ page }) => {
    await expect(page.getByTestId('position-view')).toBeVisible()
    // Check dark background
    const body = page.locator('body')
    await expect(body).toHaveCSS('background-color', 'rgb(8, 10, 6)')
  })

  test('shows position cards with data', async ({ page }) => {
    const cards = page.getByTestId('position-card')
    await expect(cards.first()).toBeVisible()
    // Marcus Webb (default merchant) should have 4 positions
    expect(await cards.count()).toBeGreaterThanOrEqual(2)
  })

  test('shows position summary', async ({ page }) => {
    const summary = page.getByTestId('position-summary')
    await expect(summary).toBeVisible()
    // Should show "Total Net Position" label
    await expect(summary).toContainText('Total Net Position')
  })

  test('shows alert feed', async ({ page }) => {
    const feed = page.getByTestId('alert-feed')
    await expect(feed).toBeVisible()
    const items = page.getByTestId('alert-item')
    expect(await items.count()).toBeGreaterThanOrEqual(1)
  })

  test('shows ML recommendation on position card', async ({ page }) => {
    const recs = page.getByTestId('ml-recommendation')
    // At least one position should have an ML recommendation
    expect(await recs.count()).toBeGreaterThanOrEqual(1)
    await expect(recs.first()).toContainText('ML Basis Recommendation')
  })

  test('coverage bar shows percentage', async ({ page }) => {
    const pct = page.getByTestId('coverage-pct').first()
    await expect(pct).toBeVisible()
    // Should show a percentage value
    await expect(pct).toHaveText(/\d+%/)
  })

  test('crop filter works', async ({ page }) => {
    // Click "Corn" filter
    await page.getByRole('button', { name: 'Corn' }).click()
    // All visible position cards should show Corn crop tag
    const cropTags = page.getByTestId('crop-tag')
    const count = await cropTags.count()
    for (let i = 0; i < count; i++) {
      await expect(cropTags.nth(i)).toContainText('Corn')
    }
  })

  test('shows user name and region', async ({ page }) => {
    await expect(page.getByText('Marcus Webb')).toBeVisible()
    await expect(page.getByText('Iowa Central')).toBeVisible()
  })
})
