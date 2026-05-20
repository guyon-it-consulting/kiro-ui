import { test, expect } from '@playwright/test';

test.describe('Tabs', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('initial state has one tab', async ({ page }) => {
    await expect(page.locator('.tab-bar .tab')).toHaveCount(1);
    await expect(page.locator('.tab-bar .tab').first()).toHaveClass(/active/);
  });

  test('clicking + creates new tab', async ({ page }) => {
    await page.locator('.tab-add').click();
    await expect(page.locator('.tab-bar .tab')).toHaveCount(2);
  });

  test('clicking tab switches active', async ({ page }) => {
    await page.locator('.tab-add').click();
    const first = page.locator('.tab-bar .tab').first();
    await first.click();
    await expect(first).toHaveClass(/active/);
  });

  test('double-click enables rename', async ({ page }) => {
    await page.locator('.tab-name').first().dblclick();
    await expect(page.locator('.tab-rename')).toBeVisible();
  });

  test('close button on hover (with 2+ tabs)', async ({ page }) => {
    await page.locator('.tab-add').click();
    const tab = page.locator('.tab-bar .tab').first();
    await tab.hover();
    await expect(tab.locator('.tab-close')).toBeVisible();
  });
});
