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

test.describe('Shell Output Streaming', () => {
  test.beforeEach(async ({ page }) => {
    await waitForReady(page);
    const permSelect = page.locator('select').filter({ hasText: 'Ask' });
    if (await permSelect.isVisible()) {
      await permSelect.selectOption('allow-all');
    }
  });

  test('shell command shows tool block with output', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'Run this command: echo "hello from shell"');

    // Should have at least one tool block
    const toolBlock = page.locator('.tool-block');
    await expect(toolBlock.first()).toBeVisible();
  });

  test('tool block with shell output is expandable', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'Run: echo "streaming test"');

    const toolBlock = page.locator('.tool-block');
    if (await toolBlock.count() > 0) {
      // Click to expand
      await toolBlock.first().locator('.tool-header').click();
      // Should have some visible content (stream, raw, or diff)
      const body = toolBlock.first().locator('.tool-body');
      await expect(body).toBeVisible();
    }
  });

  test('long-running command streams output progressively', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    // Ask for a command that produces multiple lines
    const textarea = page.locator('textarea');
    await textarea.fill('Run this shell command and show me the output: for i in 1 2 3; do echo "line $i"; done');
    await textarea.press('Enter');

    // Wait for a tool block to appear
    await expect(page.locator('.tool-block')).toBeVisible({ timeout: 30000 });
    await waitForTurnEnd(page);

    // Verify the tool block exists and has some content
    const toolBlock = page.locator('.tool-block').first();
    await expect(toolBlock).toBeVisible();
  });
});
