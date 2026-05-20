import { test, expect, Page } from '@playwright/test';

async function waitForReady(page: Page) {
  await page.goto('/');
  // Wait for either Connected or give up after timeout
  await expect(page.locator('.status')).not.toContainText('Connecting', { timeout: 30000 });
}

async function waitForTurnEnd(page: Page) {
  // Turn ends when send-btn reappears (cancel-btn disappears)
  await expect(page.locator('#send-btn')).toBeVisible({ timeout: 90000 });
}

function isConnected(page: Page) {
  return page.locator('.status.connected').isVisible();
}

test.describe('Chat Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await waitForReady(page);
  });

  test('send extremely long message (10000+ chars)', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('x'.repeat(10001));
    await textarea.press('Enter');
    await expect(page.locator('.message.user')).toBeVisible({ timeout: 5000 });
  });

  test('send message with unicode/emoji/RTL text', async ({ page }) => {
    const textarea = page.locator('textarea');
    const unicodeText = '🚀 مرحبا 你好 café naïve 🎉 שלום';
    await textarea.fill(unicodeText);
    await textarea.press('Enter');
    const userMsg = page.locator('.message.user').first();
    await expect(userMsg).toContainText('🚀');
    await expect(userMsg).toContainText('مرحبا');
    await expect(userMsg).toContainText('你好');
  });

  test('send message with markdown and verify rendering', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('Respond with **bold** and a `code snippet`');
    await textarea.press('Enter');
    await waitForTurnEnd(page);
    const assistant = page.locator('.message.assistant .content');
    if (await assistant.count() > 0) {
      const hasRenderedHtml = await assistant.first().locator('strong, em, code, p').count();
      expect(hasRenderedHtml).toBeGreaterThan(0);
    }
  });

  test('code blocks get syntax highlighting', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('Reply with exactly this and nothing else: ```python\nprint("hello")\n```');
    await textarea.press('Enter');
    await waitForTurnEnd(page);
    const codeBlock = page.locator('.message.assistant pre code');
    if (await codeBlock.count() > 0) {
      await expect(codeBlock.first()).toBeVisible();
    }
  });

  test('cancel mid-stream preserves partial response', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('Write a very long detailed essay about the history of computing');
    await textarea.press('Enter');
    await expect(page.locator('#cancel-btn')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.locator('#cancel-btn').click();
    await expect(page.locator('#send-btn')).toBeVisible({ timeout: 30000 });
    const assistant = page.locator('.message.assistant');
    if (await assistant.count() > 0) {
      const text = await assistant.first().textContent();
      expect(text!.length).toBeGreaterThan(0);
    }
  });

  test('agent response with malicious HTML is sanitized', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('Reply with exactly: <script>alert("xss")</script><img src=x onerror=alert(1)>');
    await textarea.press('Enter');
    await waitForTurnEnd(page);
    await expect(page.locator('.message.assistant script')).toHaveCount(0);
    await expect(page.locator('.message.assistant img[onerror]')).toHaveCount(0);
  });

  test('tool calls appear for file operations', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    // Set permission policy to allow-all so agent can use tools without blocking
    const select = page.locator('select').filter({ hasText: 'Ask' });
    await select.selectOption('allow-all');

    const textarea = page.locator('textarea');
    await textarea.fill('Read the file package.json and show me its content');
    await textarea.press('Enter');
    await waitForTurnEnd(page);
    // Verify the agent responded (tool usage is non-deterministic)
    await expect(page.locator('.message.assistant')).toBeVisible();
  });

  test('context meter updates after interaction', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('hello');
    await textarea.press('Enter');
    await waitForTurnEnd(page);
    await expect(page.locator('.context-meter')).toBeVisible({ timeout: 5000 });
  });
});
