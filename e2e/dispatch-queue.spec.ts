import { test, expect } from '@playwright/test'

test.describe('Dispatch Queue (Sales)', () => {
  test.beforeEach(async ({ page }) => {
    // Switch to Tyler Briggs (GOM) who has leads assigned
    await page.goto('/sales')
    // Need to switch user first via the user switcher
    // The default user is Marcus Webb (Merchant)
    // Switch to Tyler Briggs via the select dropdown
    const trigger = page.locator('[role="combobox"]')
    await trigger.click()
    await page.getByRole('option', { name: /Tyler Briggs/ }).click()
    // Should auto-navigate to sales
    await page.waitForURL('/sales')
  })

  test('renders dispatch queue', async ({ page }) => {
    await expect(page.getByTestId('dispatch-queue')).toBeVisible()
    await expect(page.getByText('Dispatch Queue')).toBeVisible()
  })

  test('shows lead cards ranked by ML score', async ({ page }) => {
    const cards = page.getByTestId('lead-card')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThanOrEqual(3)
  })

  test('lead card shows farmer info and score', async ({ page }) => {
    const firstCard = page.getByTestId('lead-card').first()
    // Bob Schroeder should be #1 (ml_score 0.94)
    await expect(firstCard).toContainText('Bob Schroeder')
    await expect(firstCard).toContainText('#1')
  })

  test('clicking lead shows pre-call brief', async ({ page }) => {
    const firstCard = page.getByTestId('lead-card').first()
    await firstCard.click()
    const brief = page.getByTestId('pre-call-brief')
    await expect(brief).toBeVisible()
    await expect(brief).toContainText('Pre-Call Brief')
  })

  test('outcome capture shows action buttons', async ({ page }) => {
    const firstCard = page.getByTestId('lead-card').first()
    await firstCard.click()
    const capture = page.getByTestId('outcome-capture')
    await expect(capture).toBeVisible()
    await expect(page.getByTestId('outcome-sold')).toBeVisible()
    await expect(page.getByTestId('outcome-no_sale')).toBeVisible()
    await expect(page.getByTestId('outcome-callback')).toBeVisible()
  })

  test('filter toggle between Pending and All', async ({ page }) => {
    // Pending should be active by default
    const pendingBtn = page.getByRole('button', { name: /Pending/ })
    await expect(pendingBtn).toBeVisible()
    const allBtn = page.getByRole('button', { name: /All/ })
    await allBtn.click()
    // Should still show leads (all leads are pending in mock data)
    const cards = page.getByTestId('lead-card')
    expect(await cards.count()).toBeGreaterThanOrEqual(1)
  })
})
