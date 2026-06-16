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

test.describe('Loaded session retains context', () => {
  test.beforeEach(async ({ page }) => {
    await waitForReady(page);
    const permSelect = page.locator('select').filter({ hasText: 'Ask' });
    if (await permSelect.isVisible()) {
      await permSelect.selectOption('allow-all');
    }
  });

  test('question after loading a session has access to past context', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    // Step 1: Create a conversation with a memorable fact
    await sendAndWait(page, 'Remember this secret code: PINEAPPLE42. Just acknowledge it.');

    // Step 2: Wait for history to update, then start a new chat
    await page.waitForTimeout(2000);
    await page.keyboard.press('Meta+n');
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 10000 });

    // Step 3: Load the previous session from history
    const sessionItem = page.locator('.session-item').first();
    await expect(sessionItem).toBeVisible({ timeout: 10000 });
    await sessionItem.click();

    // Step 4: Wait for the loaded session to be ready
    await waitForTurnEnd(page);
    await expect(page.locator('.message')).not.toHaveCount(0);

    // Step 5: Ask about the previous context
    await sendAndWait(page, 'What was the secret code I told you earlier?');

    // Step 6: Verify the response references the context from the loaded session
    const lastAssistant = page.locator('.message.assistant').last();
    await expect(lastAssistant).toContainText('PINEAPPLE42', { timeout: 30000 });
  });
});
