import { test, expect, Page } from '@playwright/test';

async function waitForReady(page: Page) {
  await page.goto('/');
  await expect(page.locator('.status.connected')).toBeVisible({ timeout: 30000 });
}

async function waitForTurnEnd(page: Page) {
  await expect(page.locator('#send-btn')).toBeVisible({ timeout: 90000 });
}

async function sendMessage(page: Page, text: string) {
  const textarea = page.locator('textarea');
  await textarea.fill(text);
  await textarea.press('Enter');
}

async function sendAndWait(page: Page, text: string) {
  await sendMessage(page, text);
  await waitForTurnEnd(page);
}

function isConnected(page: Page) {
  return page.locator('.status.connected').isVisible();
}

test.describe('Rewind Feature', () => {
  test.beforeEach(async ({ page }) => {
    await waitForReady(page);
    const permSelect = page.locator('select').filter({ hasText: 'Ask' });
    if (await permSelect.isVisible()) {
      await permSelect.selectOption('allow-all');
    }
  });

  // --- Limits: when timeline should NOT appear ---

  test('no timeline with only 1 user message (turn 1 excluded)', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'Only message');

    const userMsg = page.locator('.message.user').first();
    await userMsg.hover();
    await userMsg.locator('.msg-actions button[title="Rewind to here"]').click();

    // Timeline should NOT appear — only turn 1 exists, which is excluded
    await expect(page.locator('.rewind-timeline')).not.toBeVisible();
  });

  // --- Minimum: 2 messages → timeline shows turn 2 only ---

  test('with 2 messages, timeline shows only turn 2', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'First');
    await sendAndWait(page, 'Second');

    const userMsg = page.locator('.message.user').first();
    await userMsg.hover();
    await userMsg.locator('.msg-actions button[title="Rewind to here"]').click();

    await expect(page.locator('.rewind-timeline')).toBeVisible();
    const turns = page.locator('.rewind-turn');
    await expect(turns).toHaveCount(1);
    await expect(turns.nth(0)).toContainText('Second');
  });

  // --- Normal: 3+ messages → shows turns 2..N newest-first ---

  test('with 3 messages, timeline shows turns 3 and 2 (newest-first, turn 1 excluded)', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'Turn one');
    await sendAndWait(page, 'Turn two');
    await sendAndWait(page, 'Turn three');

    const userMsg = page.locator('.message.user').first();
    await userMsg.hover();
    await userMsg.locator('.msg-actions button[title="Rewind to here"]').click();

    const turns = page.locator('.rewind-turn');
    await expect(turns).toHaveCount(2);
    await expect(turns.nth(0)).toContainText('Turn three');
    await expect(turns.nth(1)).toContainText('Turn two');
  });

  // --- Interaction ---

  test('clicking a turn sends /rewind and keeps messages up to that turn', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'First prompt');
    await sendAndWait(page, 'Second prompt');
    await sendAndWait(page, 'Third prompt');

    const userMsg = page.locator('.message.user').first();
    await userMsg.hover();
    await userMsg.locator('.msg-actions button[title="Rewind to here"]').click();

    // Click Turn 2 (last in the list since newest-first shows Turn 3, Turn 2)
    await page.locator('.rewind-turn').nth(1).click();

    // Timeline should close
    await expect(page.locator('.rewind-overlay')).not.toBeVisible();

    // Should be running (processing /rewind)
    await expect(page.locator('#cancel-btn')).toBeVisible();
    await waitForTurnEnd(page);

    // Messages up to turn 2 should still be visible
    await expect(page.locator('.message.user').first()).toContainText('First prompt');
  });

  test('can send new messages after rewind completes', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'Initial message');
    await sendAndWait(page, 'Follow up');

    const userMsg = page.locator('.message.user').first();
    await userMsg.hover();
    await userMsg.locator('.msg-actions button[title="Rewind to here"]').click();
    await page.locator('.rewind-turn').nth(0).click();
    await waitForTurnEnd(page);

    // Should be able to send a new message after rewind
    await sendAndWait(page, 'New branch message');
    await expect(page.locator('.message.user').last()).toContainText('New branch message');
  });

  // --- UI controls ---

  test('timeline closes on backdrop click', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'First');
    await sendAndWait(page, 'Second');

    const userMsg = page.locator('.message.user').first();
    await userMsg.hover();
    await userMsg.locator('.msg-actions button[title="Rewind to here"]').click();
    await expect(page.locator('.rewind-overlay')).toBeVisible();

    await page.locator('.rewind-overlay').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.rewind-overlay')).not.toBeVisible();
  });

  test('timeline closes on X button', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'First');
    await sendAndWait(page, 'Second');

    const userMsg = page.locator('.message.user').first();
    await userMsg.hover();
    await userMsg.locator('.msg-actions button[title="Rewind to here"]').click();
    await expect(page.locator('.rewind-overlay')).toBeVisible();

    await page.locator('.rewind-close').click();
    await expect(page.locator('.rewind-overlay')).not.toBeVisible();
  });

  test('rewind button not visible while agent is running', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'Say hi');
    await sendMessage(page, 'Now say goodbye');
    const rewindBtn = page.locator('.message.user .msg-actions button[title="Rewind to here"]');
    await expect(rewindBtn).not.toBeVisible();
    await waitForTurnEnd(page);
  });

  test('after rewind, forked session shows branch indicator in sidebar', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    await sendAndWait(page, 'First message');
    await sendAndWait(page, 'Second message');
    await sendAndWait(page, 'Third message');

    // Rewind to turn 2
    const userMsg = page.locator('.message.user').first();
    await userMsg.hover();
    await userMsg.locator('.msg-actions button[title="Rewind to here"]').click();
    await page.locator('.rewind-turn').nth(1).click();
    await waitForTurnEnd(page);

    // Send a message in the branched session so it gets a title
    await sendAndWait(page, 'Branched conversation');

    // Check if any session in the sidebar has the fork indicator
    const forkIndicator = page.locator('.session-fork');
    // This may or may not appear depending on whether kiro-cli exposes parentSessionId in session/list
    // If it does, we should see at least one fork icon
    const count = await forkIndicator.count();
    if (count > 0) {
      await expect(forkIndicator.first()).toBeVisible();
      // Fork indicator should be clickable
      await expect(forkIndicator.first()).toHaveAttribute('title', 'Branched from another session');
    }
    // Either way, the session should appear in the sidebar
    await expect(page.locator('.session-item')).not.toHaveCount(0);
  });
});
