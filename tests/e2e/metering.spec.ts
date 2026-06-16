import { test, expect, Page } from '@playwright/test';

async function waitForReady(page: Page) {
  await page.goto('/');
  await expect(page.locator('.status.connected')).toBeVisible({ timeout: 30000 });
}

async function waitForTurnEnd(page: Page) {
  await expect(page.locator('#send-btn')).toBeVisible({ timeout: 90000 });
}

function isConnected(page: Page) {
  return page.locator('.status.connected').isVisible();
}

test.describe('Metering Display', () => {
  test.beforeEach(async ({ page }) => {
    await waitForReady(page);
  });

  test('context meter appears after agent responds', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('Say hello');
    await textarea.press('Enter');
    await waitForTurnEnd(page);

    // Context meter should appear (contextUsagePercentage > 0)
    await expect(page.locator('.context-meter')).toBeVisible();
    await expect(page.locator('.context-meter-label')).toContainText('%');
  });

  test('metering display shows tokens when available', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('Say hello');
    await textarea.press('Enter');
    await waitForTurnEnd(page);

    // If metering data is provided by the agent, the display should appear
    const meteringEl = page.locator('.metering-display');
    if (await meteringEl.isVisible()) {
      const text = await meteringEl.textContent();
      expect(text).toMatch(/[\d.]+k/); // e.g. "12.3k" tokens
    }
  });

  test('/context panel shows metering info', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('Say hello');
    await textarea.press('Enter');
    await waitForTurnEnd(page);

    // Open context panel - dismiss autocomplete popup first
    await textarea.click();
    await textarea.fill('/context');
    await page.waitForTimeout(300);
    await textarea.press('Escape'); // dismiss autocomplete
    await textarea.press('Enter');

    // Panel renders inline in messages
    await expect(page.locator('.panel-card').last()).toBeVisible({ timeout: 10000 });
    const panelText = await page.locator('.panel-card').last().textContent();
    expect(panelText).toContain('Context Window');

    // If metering is available, token info should be in the panel
    if (panelText?.includes('Tokens')) {
      expect(panelText).toMatch(/\d+.*\/.*\d+/);
    }
  });

  test('metering accumulates across turns', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');

    await textarea.fill('Say the word apple');
    await textarea.press('Enter');
    await waitForTurnEnd(page);

    const firstMetering = page.locator('.metering-display');
    const firstText = await firstMetering.isVisible() ? await firstMetering.textContent() : null;

    await textarea.fill('Say the word banana');
    await textarea.press('Enter');
    await waitForTurnEnd(page);

    if (firstText && await firstMetering.isVisible()) {
      const secondText = await firstMetering.textContent();
      // Second value should be >= first (cumulative)
      const firstNum = parseFloat(firstText!.replace(/[^\d.]/g, ''));
      const secondNum = parseFloat(secondText!.replace(/[^\d.]/g, ''));
      expect(secondNum).toBeGreaterThanOrEqual(firstNum);
    }
  });
});
