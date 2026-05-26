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

test.describe('Session History', () => {
  test.beforeEach(async ({ page }) => {
    await waitForReady(page);
    const permSelect = page.locator('select').filter({ hasText: 'Ask' });
    if (await permSelect.isVisible()) {
      await permSelect.selectOption('allow-all');
    }
  });

  test('history sidebar shows sessions after conversation', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'Hello for history test');

    // History should have at least one entry
    await expect(page.locator('.session-item').first()).toBeVisible({ timeout: 10000 });
  });

  test('sessions without titles are not shown', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    // No session should display "New Chat" as title
    const newChatItems = page.locator('.session-title', { hasText: 'New Chat' });
    await expect(newChatItems).toHaveCount(0);
  });

  test('clicking a session loads it', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'Session load test message');

    // Start a new chat
    await page.keyboard.press('Meta+n');
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 10000 });

    // Click the first session in history
    const firstSession = page.locator('.session-item').first();
    await expect(firstSession).toBeVisible({ timeout: 10000 });
    await firstSession.click();

    // Should show messages from the loaded session
    await waitForTurnEnd(page);
    await expect(page.locator('.message')).not.toHaveCount(0);
  });

  test('new chat clears messages and shows empty state', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'Before new chat');
    await expect(page.locator('.message.user')).toBeVisible();

    // Click New button in sidebar
    await page.locator('.sidebar h2 button', { hasText: 'New' }).click();
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 10000 });
  });

  test('new chat does not crash the agent', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'Before new chat');

    await page.locator('.sidebar h2 button', { hasText: 'New' }).click();
    // New tab opens — wait for it to be ready
    await expect(page.locator('.status.connected')).toBeVisible({ timeout: 15000 });

    // Should be able to send a new message
    await sendAndWait(page, 'After new chat');
    await expect(page.locator('.message.user').last()).toContainText('After new chat');
  });

  test('loading session after new chat works without crash', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'Create a session first');

    // Load a session from history (opens in new tab)
    await expect(page.locator('.session-item').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.session-item').first().click();

    // Should be connected in the new tab
    await expect(page.locator('.status.connected')).toBeVisible({ timeout: 15000 });
  });
});
