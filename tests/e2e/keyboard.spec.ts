import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('Cmd+B toggles sidebar', async ({ page }) => {
    await expect(page.locator('.sidebar')).not.toHaveClass(/collapsed/);
    await page.keyboard.press('Meta+b');
    await expect(page.locator('.sidebar')).toHaveClass(/collapsed/);
    await page.keyboard.press('Meta+b');
    await expect(page.locator('.sidebar')).not.toHaveClass(/collapsed/);
  });

  test('Cmd+T opens new tab', async ({ page }) => {
    await expect(page.locator('.tab-bar .tab')).toHaveCount(1);
    await page.keyboard.press('Meta+t');
    await expect(page.locator('.tab-bar .tab')).toHaveCount(2);
  });

  test('Enter sends message', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('test message');
    await textarea.press('Enter');
    await expect(page.locator('.message.user')).toContainText('test message');
  });

  test('Shift+Enter adds newline', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('line1');
    await textarea.press('Shift+Enter');
    await textarea.type('line2');
    await expect(textarea).toHaveValue('line1\nline2');
  });
});
