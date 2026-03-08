import { test, expect } from '@playwright/test'

test.describe('Persona-driven routing', () => {
  test('default user (Marcus Webb / Merchant) sees Merchandising', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL('/merchandising')
    await expect(page.getByTestId('position-view')).toBeVisible()
  })

  test('switching to Tyler Briggs (GOM) navigates to Sales', async ({ page }) => {
    await page.goto('/merchandising')
    const trigger = page.locator('[role="combobox"]')
    await trigger.click()
    await page.getByRole('option', { name: /Tyler Briggs/ }).click()
    await page.waitForURL('/sales')
    await expect(page.getByTestId('dispatch-queue')).toBeVisible()
  })

  test('switching to Dana Kowalski (Hybrid) stays on Merchandising', async ({ page }) => {
    await page.goto('/merchandising')
    const trigger = page.locator('[role="combobox"]')
    await trigger.click()
    await page.getByRole('option', { name: /Dana Kowalski/ }).click()
    await page.waitForURL('/merchandising')
    await expect(page.getByTestId('position-view')).toBeVisible()
  })

  test('Hybrid persona sees all nav items', async ({ page }) => {
    await page.goto('/merchandising')
    const trigger = page.locator('[role="combobox"]')
    await trigger.click()
    await page.getByRole('option', { name: /Dana Kowalski/ }).click()
    await page.waitForURL('/merchandising')
    // Should see Merchandising, Sales, Strategy, Signal in nav
    await expect(page.getByRole('link', { name: /Merchandising/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Sales/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Strategy/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Signal/ })).toBeVisible()
  })

  test('GOM persona only sees Sales and Signal', async ({ page }) => {
    await page.goto('/merchandising')
    const trigger = page.locator('[role="combobox"]')
    await trigger.click()
    await page.getByRole('option', { name: /Tyler Briggs/ }).click()
    await page.waitForURL('/sales')
    await expect(page.getByRole('link', { name: /Sales/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Signal/ })).toBeVisible()
    // Should NOT see Merchandising or Strategy
    await expect(page.getByRole('link', { name: /Merchandising/ })).not.toBeVisible()
    await expect(page.getByRole('link', { name: /Strategy/ })).not.toBeVisible()
  })

  test('sidebar shows persona badge', async ({ page }) => {
    await page.goto('/merchandising')
    await expect(page.getByTestId('persona-badge')).toBeVisible()
    await expect(page.getByTestId('persona-badge')).toContainText('Merchant')
  })
})
