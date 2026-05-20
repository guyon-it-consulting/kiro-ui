import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('gear icon opens settings', async ({ page }) => {
    await page.locator('button[title="Settings"]').click();
    await expect(page.locator('.settings-page')).toBeVisible();
  });

  test('close returns to chat', async ({ page }) => {
    await page.locator('button[title="Settings"]').click();
    await page.locator('.settings-close').click();
    await expect(page.locator('.settings-page')).not.toBeVisible();
    await expect(page.locator('.input-area')).toBeVisible();
  });

  test('editor dropdown has 4 options', async ({ page }) => {
    await page.locator('button[title="Settings"]').click();
    const options = page.locator('.settings-page select').first().locator('option');
    await expect(options).toHaveCount(4);
  });

  test('debug checkbox exists', async ({ page }) => {
    await page.locator('button[title="Settings"]').click();
    await expect(page.locator('.settings-page input[type="checkbox"]')).toBeVisible();
  });
});
