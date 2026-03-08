import { test, expect } from '@playwright/test'

test.describe('Visual regression — screenshots', () => {
  test('Position View — desktop 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/merchandising')
    await page.waitForSelector('[data-testid="position-view"]')
    // Wait for fonts to load
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('position-view-1440.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('Position View — laptop 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/merchandising')
    await page.waitForSelector('[data-testid="position-view"]')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('position-view-1024.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('Dispatch Queue — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/sales')
    // Switch to Tyler Briggs
    const trigger = page.locator('[role="combobox"]')
    await trigger.click()
    await page.getByRole('option', { name: /Tyler Briggs/ }).click()
    await page.waitForURL('/sales')
    await page.waitForSelector('[data-testid="dispatch-queue"]')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('dispatch-queue-1440.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('Inbound Screen — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/sales/inbound/c1000000-0000-0000-0000-000000000003')
    await page.waitForSelector('[data-testid="inbound-screen"]')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('inbound-screen-1440.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('Inbound Screen — mobile 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/sales/inbound/c1000000-0000-0000-0000-000000000003')
    await page.waitForSelector('[data-testid="inbound-screen"]')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('inbound-screen-375.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('Strategy stub — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/merchandising')
    // Switch to Hybrid to see Strategy nav
    const trigger = page.locator('[role="combobox"]')
    await trigger.click()
    await page.getByRole('option', { name: /Dana Kowalski/ }).click()
    await page.waitForURL('/merchandising')
    await page.getByRole('link', { name: /Strategy/ }).click()
    await page.waitForSelector('[data-testid="strategy-view"]')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('strategy-stub-1440.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('Signal chat — desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/merchandising')
    // Switch to Hybrid to see Signal nav
    const trigger = page.locator('[role="combobox"]')
    await trigger.click()
    await page.getByRole('option', { name: /Dana Kowalski/ }).click()
    await page.waitForURL('/merchandising')
    await page.getByRole('link', { name: /Signal/ }).click()
    await page.waitForSelector('[data-testid="signal-chat"]')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('signal-chat-1440.png', {
      maxDiffPixelRatio: 0.05,
    })
  })
})
