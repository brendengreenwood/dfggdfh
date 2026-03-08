import { test, expect } from '@playwright/test'

test.describe('Inbound Call Screen', () => {
  test('shows farmer name prominently', async ({ page }) => {
    // Bob Schroeder
    await page.goto('/sales/inbound/c1000000-0000-0000-0000-000000000003')
    const name = page.getByTestId('inbound-farmer-name')
    await expect(name).toBeVisible()
    await expect(name).toContainText('Bob Schroeder')
  })

  test('shows recommended basis', async ({ page }) => {
    await page.goto('/sales/inbound/c1000000-0000-0000-0000-000000000003')
    const basis = page.getByTestId('inbound-basis')
    await expect(basis).toBeVisible()
  })

  test('shows all three action buttons', async ({ page }) => {
    await page.goto('/sales/inbound/c1000000-0000-0000-0000-000000000003')
    await expect(page.getByTestId('inbound-sold')).toBeVisible()
    await expect(page.getByTestId('inbound-no-sale')).toBeVisible()
    await expect(page.getByTestId('inbound-callback')).toBeVisible()
  })

  test('is full-screen with high contrast', async ({ page }) => {
    await page.goto('/sales/inbound/c1000000-0000-0000-0000-000000000003')
    const screen = page.getByTestId('inbound-screen')
    await expect(screen).toBeVisible()
    // Should cover full viewport
    await expect(screen).toHaveCSS('position', 'fixed')
  })

  test('shows farmer not found for invalid ID', async ({ page }) => {
    await page.goto('/sales/inbound/invalid-id')
    await expect(page.getByText('Farmer not found')).toBeVisible()
  })

  test('back button navigates to sales', async ({ page }) => {
    await page.goto('/sales/inbound/c1000000-0000-0000-0000-000000000003')
    await page.getByText('Back').click()
    await page.waitForURL('/sales')
  })

  test('phone number is displayed', async ({ page }) => {
    await page.goto('/sales/inbound/c1000000-0000-0000-0000-000000000003')
    await expect(page.getByText('712-555-0103')).toBeVisible()
  })
})
