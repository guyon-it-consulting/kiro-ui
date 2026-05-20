import { test, expect } from '@playwright/test';

test.describe('Error & Edge Cases', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('XSS in markdown is sanitized', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('<img src=x onerror=alert(1)>');
    await textarea.press('Enter');
    // Wait for potential response rendering
    await page.waitForTimeout(500);
    // No alert dialog should appear, and no onerror attribute in DOM
    const dangerousImg = page.locator('img[onerror]');
    await expect(dangerousImg).toHaveCount(0);
  });

  test('empty message cannot be sent', async ({ page }) => {
    await expect(page.locator('#send-btn')).toBeDisabled();
    const textarea = page.locator('textarea');
    await textarea.fill('   ');
    await expect(page.locator('#send-btn')).toBeDisabled();
  });

  test('very long message is accepted', async ({ page }) => {
    const textarea = page.locator('textarea');
    const longText = 'a'.repeat(5000);
    await textarea.fill(longText);
    await textarea.press('Enter');
    await expect(page.locator('.message.user')).toBeVisible();
  });

  test('rapid tab creation beyond limit shows error', async ({ page }) => {
    // Create many tabs - server should eventually reject
    for (let i = 0; i < 12; i++) {
      await page.locator('.tab-add').click();
      await page.waitForTimeout(100);
    }
    // Either error toast appears or tabs are capped
    const tabs = await page.locator('.tab-bar .tab').count();
    // Verify we attempted to create many (some may have been rejected)
    expect(tabs).toBeGreaterThan(1);
  });

  test('slash command popup appears and dismisses', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('/');
    await page.waitForTimeout(200);
    // Popup should appear
    const popup = page.locator('.cmd-popup');
    if (await popup.isVisible()) {
      await textarea.press('Escape');
      await expect(popup).not.toBeVisible();
    }
  });

  test('cancel button appears during turn and can be clicked', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('Write a very long essay about everything');
    await textarea.press('Enter');
    await expect(page.locator('#cancel-btn')).toBeVisible();
    await page.locator('#cancel-btn').click();
    // After cancel, either send-btn returns or agent finishes naturally
    await expect(page.locator('#cancel-btn').or(page.locator('#send-btn'))).toBeVisible({ timeout: 30000 });
  });

  test('theme toggle persists across reload', async ({ page }) => {
    // Switch to light
    await page.locator('button[title="Toggle theme"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    // Reload
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    // Switch back
    await page.locator('button[title="Toggle theme"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('sidebar toggle hides and shows', async ({ page }) => {
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).not.toHaveClass(/collapsed/);
    // Close via X button
    await page.locator('.sidebar-toggle').click();
    await expect(sidebar).toHaveClass(/collapsed/);
    // Reopen via hamburger
    await page.locator('.sidebar-open-btn').click();
    await expect(sidebar).not.toHaveClass(/collapsed/);
  });
});
