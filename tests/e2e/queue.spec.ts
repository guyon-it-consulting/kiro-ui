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

test.describe('Enhanced Message Queue', () => {
  test.beforeEach(async ({ page }) => {
    await waitForReady(page);
    const permSelect = page.locator('select').filter({ hasText: 'Ask' });
    if (await permSelect.isVisible()) {
      await permSelect.selectOption('allow-all');
    }
  });

  test('messages queue while agent is running', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    // Send first message to start agent
    const textarea = page.locator('textarea');
    await textarea.fill('Say hello');
    await textarea.press('Enter');

    // Queue a message while running
    await textarea.fill('Queued message');
    await textarea.press('Enter');

    // Queue should show the message
    await expect(page.locator('.queue-list')).toBeVisible();
    await expect(page.locator('.queue-item')).toHaveCount(1);
    await expect(page.locator('.queue-edit').first()).toHaveValue('Queued message');
    await waitForTurnEnd(page);
  });

  test('edit queued message', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    const textarea = page.locator('textarea');
    await textarea.fill('Start task');
    await textarea.press('Enter');

    await textarea.fill('Original text');
    await textarea.press('Enter');

    // Edit the queued message
    const editInput = page.locator('.queue-edit').first();
    await editInput.fill('Edited text');
    await expect(editInput).toHaveValue('Edited text');
    await waitForTurnEnd(page);
  });

  test('delete queued message', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    const textarea = page.locator('textarea');
    await textarea.fill('Start task');
    await textarea.press('Enter');

    await textarea.fill('To be deleted');
    await textarea.press('Enter');
    await expect(page.locator('.queue-item')).toHaveCount(1);

    // Delete it
    await page.locator('.queue-remove').click();
    await expect(page.locator('.queue-item')).toHaveCount(0);
    await waitForTurnEnd(page);
  });

  test('reorder queued messages with arrows', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    const textarea = page.locator('textarea');
    await textarea.fill('Write a detailed paragraph about the history of the internet from 1960 to 2020');
    await textarea.press('Enter');
    await page.waitForTimeout(500);

    // Queue two messages
    await textarea.fill('First queued');
    await textarea.press('Enter');
    await textarea.fill('Second queued');
    await textarea.press('Enter');

    await expect(page.locator('.queue-item')).toHaveCount(2);
    await expect(page.locator('.queue-edit').nth(0)).toHaveValue('First queued');
    await expect(page.locator('.queue-edit').nth(1)).toHaveValue('Second queued');

    // Move second item up
    await page.locator('.queue-item').nth(1).locator('.queue-move[title="Move up"]').click();
    await expect(page.locator('.queue-edit').nth(0)).toHaveValue('Second queued');
    await expect(page.locator('.queue-edit').nth(1)).toHaveValue('First queued');
    await waitForTurnEnd(page);
  });

  test('merge two queued messages', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    const textarea = page.locator('textarea');
    await textarea.fill('Write a detailed paragraph about the history of the internet from 1960 to 2020');
    await textarea.press('Enter');
    await page.waitForTimeout(500);

    await textarea.fill('Part one');
    await textarea.press('Enter');
    await textarea.fill('Part two');
    await textarea.press('Enter');

    await expect(page.locator('.queue-item')).toHaveCount(2);

    // Merge first with second
    await page.locator('.queue-merge').first().click();
    await expect(page.locator('.queue-item')).toHaveCount(1);
    // Input shows the merged content (newlines may be collapsed in single-line input)
    const val = await page.locator('.queue-edit').first().inputValue();
    expect(val).toContain('Part one');
    expect(val).toContain('Part two');
    await waitForTurnEnd(page);
  });

  test('clear all queued messages', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    const textarea = page.locator('textarea');
    await textarea.fill('Start task');
    await textarea.press('Enter');

    await textarea.fill('Msg 1');
    await textarea.press('Enter');
    await textarea.fill('Msg 2');
    await textarea.press('Enter');

    await expect(page.locator('.queue-item')).toHaveCount(2);
    await page.locator('.queue-clear').click();
    await expect(page.locator('.queue-item')).toHaveCount(0);
    await waitForTurnEnd(page);
  });

  test('send now cancels current and sends queued', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    const textarea = page.locator('textarea');
    await textarea.fill('Write a long detailed essay about computing');
    await textarea.press('Enter');
    await page.waitForTimeout(500);

    await textarea.fill('Say just hello');
    await textarea.press('Enter');
    await expect(page.locator('.queue-item')).toHaveCount(1);

    // Click Send Now
    await page.locator('.queue-send-now').click();

    // Should eventually complete with the queued message sent
    await waitForTurnEnd(page);

    // The queued message should have been sent
    const userMessages = page.locator('.message.user');
    const lastUserText = await userMessages.last().textContent();
    expect(lastUserText).toContain('Say just hello');
  });

  test('queued messages sent one by one', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    const textarea = page.locator('textarea');
    await textarea.fill('Say the number 1');
    await textarea.press('Enter');

    await textarea.fill('Say the number 2');
    await textarea.press('Enter');
    await textarea.fill('Say the number 3');
    await textarea.press('Enter');

    // Wait for all to complete (first turn + 2 queued)
    await waitForTurnEnd(page);
    // After first turn ends, next queued is sent automatically
    await waitForTurnEnd(page);
    await waitForTurnEnd(page);

    // Should have 3 user messages
    const userMessages = page.locator('.message.user');
    await expect(userMessages).toHaveCount(3);
  });

  test('queue count shows correct number', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    const textarea = page.locator('textarea');
    await textarea.fill('Start');
    await textarea.press('Enter');

    await textarea.fill('A');
    await textarea.press('Enter');
    await textarea.fill('B');
    await textarea.press('Enter');

    await expect(page.locator('.queue-count')).toContainText('2 queued');
    await waitForTurnEnd(page);
  });
});
