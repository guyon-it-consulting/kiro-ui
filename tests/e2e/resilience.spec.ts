import { test, expect, Page } from '@playwright/test';

async function waitForReady(page: Page) {
  await page.goto('/');
  await expect(page.locator('.status')).not.toContainText('Connecting', { timeout: 30000 });
}

function isConnected(page: Page) {
  return page.locator('.status.connected').isVisible();
}

test.describe('Reconnection & Resilience', () => {
  test.beforeEach(async ({ page }) => {
    await waitForReady(page);
  });

  test('shows connected state after load', async ({ page }) => {
    await expect(page.locator('.status')).toContainText('Connected', { timeout: 30000 });
  });

  test('multiple messages in sequence', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('first message');
    await textarea.press('Enter');
    await expect(page.locator('.message.user').first()).toContainText('first message');

    // Wait for turn to end before sending next
    await expect(page.locator('#send-btn')).toBeVisible({ timeout: 90000 });

    await textarea.fill('second message');
    await textarea.press('Enter');
    const messages = page.locator('.message.user');
    await expect(messages).toHaveCount(2, { timeout: 5000 });
  });

  test('new chat clears messages', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('hello');
    await textarea.press('Enter');
    await expect(page.locator('.message.user')).toBeVisible();

    // Wait for turn to complete so agent is idle
    await expect(page.locator('#send-btn')).toBeVisible({ timeout: 90000 });

    // Click new chat
    await page.keyboard.press('Meta+n');
    // Messages should be cleared (empty state visible)
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 15000 });
  });

  test('permission policy dropdown works', async ({ page }) => {
    const select = page.locator('select').filter({ hasText: 'Ask' });
    await select.selectOption('allow-all');
    await expect(select).toHaveValue('allow-all');
  });

  test('context meter appears after interaction', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('hello');
    await textarea.press('Enter');
    // Wait for turn to complete
    await expect(page.locator('#send-btn')).toBeVisible({ timeout: 90000 });
    // Context meter should show
    await expect(page.locator('.context-meter')).toBeVisible();
  });
});
