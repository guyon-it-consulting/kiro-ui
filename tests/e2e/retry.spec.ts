import { test, expect, Page } from '@playwright/test';

async function waitForReady(page: Page) {
  await page.goto('/');
  await expect(page.locator('.status.connected')).toBeVisible({ timeout: 30000 });
}

async function waitForTurnEnd(page: Page) {
  await expect(page.locator('#send-btn')).toBeVisible({ timeout: 90000 });
}

async function sendAndWait(page: Page, text: string) {
  const textarea = page.locator('textarea');
  await textarea.fill(text);
  await textarea.press('Enter');
  await waitForTurnEnd(page);
}

function isConnected(page: Page) {
  return page.locator('.status.connected').isVisible();
}

test.describe('Retry Feature', () => {
  test.beforeEach(async ({ page }) => {
    await waitForReady(page);
    const permSelect = page.locator('select').filter({ hasText: 'Ask' });
    if (await permSelect.isVisible()) {
      await permSelect.selectOption('allow-all');
    }
  });

  test('retry button NOT shown after successful turn', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'Say hello');

    const userMsg = page.locator('.message.user').first();
    await userMsg.hover();
    await expect(userMsg.locator('.msg-actions button[title="Retry"]')).not.toBeVisible();
  });

  test('retry button shown after cancelled turn', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('Write a very long essay about the history of computing in extreme detail');
    await textarea.press('Enter');
    await expect(page.locator('#cancel-btn')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.locator('#cancel-btn').click();
    await waitForTurnEnd(page);

    // After cancellation, retry should be available
    const userMsg = page.locator('.message.user').last();
    await userMsg.hover();
    await expect(userMsg.locator('.msg-actions button[title="Retry"]')).toBeVisible();
  });

  test('clicking retry after cancel resends the message', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('Say just the word hello');
    await textarea.press('Enter');
    await expect(page.locator('#cancel-btn')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.locator('#cancel-btn').click();
    await waitForTurnEnd(page);

    // Retry
    const userMsg = page.locator('.message.user').last();
    await userMsg.hover();
    await userMsg.locator('.msg-actions button[title="Retry"]').click();

    // Should be running again
    await expect(page.locator('#cancel-btn')).toBeVisible();
    await waitForTurnEnd(page);

    // After successful retry, retry button should be gone
    const lastUser = page.locator('.message.user').last();
    await lastUser.hover();
    await expect(lastUser.locator('.msg-actions button[title="Retry"]')).not.toBeVisible();
  });

  test('copy button always available on all messages', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'Hello');

    // User message has copy
    const userMsg = page.locator('.message.user').first();
    await userMsg.hover();
    await expect(userMsg.locator('.msg-actions button[title="Copy"]')).toBeVisible();

    // Assistant message has copy
    const assistantMsg = page.locator('.message.assistant').first();
    await assistantMsg.hover();
    await expect(assistantMsg.locator('.msg-actions button[title="Copy"]')).toBeVisible();
  });
});
