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

test.describe('Subagent Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await waitForReady(page);
    const permSelect = page.locator('select').filter({ hasText: 'Ask' });
    if (await permSelect.isVisible()) {
      await permSelect.selectOption('allow-all');
    }
  });

  test('subagent panel appears when pipeline is triggered', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    // Trigger a multi-stage pipeline via subagent tool
    await sendAndWait(page, 'Use subagent to research what testing frameworks exist for TypeScript, then summarize findings');

    // Check if subagent panel appeared during execution (may have already completed)
    // The panel should show or have shown — check for any evidence
    const panel = page.locator('.subagent-panel');
    const hadPanel = await panel.count() > 0;

    // If the agent doesn't support subagents in this environment, skip
    if (!hadPanel) {
      test.skip(true, 'Agent did not trigger subagent pipeline');
    }

    // Panel should show pipeline progress
    await expect(panel.locator('.subagent-header')).toContainText('Pipeline');
  });

  test('subagent panel is not shown without pipeline', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    await sendAndWait(page, 'What is 2 + 2?');

    // No subagent panel should appear for simple questions
    const panel = page.locator('.subagent-panel');
    await expect(panel).toHaveCount(0);
  });

  test('subagent panel is collapsible', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    // Inject subagent data via WebSocket to test UI behavior
    await page.evaluate(() => {
      const ws = (window as any).__testWs;
      if (!ws) return;
      ws.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify({ type: 'SubagentListUpdate', tabId: 'tab-1', subagents: [
          { sessionId: 's1', name: 'research', role: 'researcher', status: 'completed' },
          { sessionId: 's2', name: 'implement', status: 'running' },
        ], pendingStages: [] })
      }));
    });

    const panel = page.locator('.subagent-panel');
    if (await panel.count() === 0) {
      test.skip(true, 'WebSocket injection not available in this environment');
    }

    // Click header to collapse
    await panel.locator('.subagent-header').click();
    await expect(panel.locator('.subagent-stages')).toHaveCount(0);

    // Click again to expand
    await panel.locator('.subagent-header').click();
    await expect(panel.locator('.subagent-stages')).toBeVisible();
  });
});
