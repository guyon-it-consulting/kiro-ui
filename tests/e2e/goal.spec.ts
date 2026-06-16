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

test.describe('Goal Command', () => {
  test.beforeEach(async ({ page }) => {
    await waitForReady(page);
    const permSelect = page.locator('select').filter({ hasText: 'Ask' });
    if (await permSelect.isVisible()) {
      await permSelect.selectOption('allow-all');
    }
  });

  test('goal banner appears when /goal is sent', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('/goal say hello and confirm it worked');
    await textarea.press('Escape');
    await textarea.press('Enter');

    // Goal banner should appear
    await expect(page.locator('.goal-banner')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.goal-label')).toContainText('Iteration');
    await expect(page.locator('.goal-text')).toContainText('say hello');
    await waitForTurnEnd(page);
  });

  test('goal banner shows cancel button while active', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('/goal say the word test');
    await textarea.press('Escape');
    await textarea.press('Enter');

    await expect(page.locator('.goal-banner')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.goal-cancel')).toBeVisible();
    await waitForTurnEnd(page);
  });

  test('goal banner disappears after completion or dismiss', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('/goal say hello');
    await textarea.press('Escape');
    await textarea.press('Enter');
    await waitForTurnEnd(page);

    // After turn ends with goal, banner should show status (complete or dismiss button)
    const banner = page.locator('.goal-banner');
    if (await banner.isVisible()) {
      const dismiss = page.locator('.goal-cancel');
      if (await dismiss.isVisible()) {
        await dismiss.click();
      }
    }
    await expect(banner).not.toBeVisible();
  });

  test('/goal clear removes the banner', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('/goal write a long essay about computing history from 1950 to 2020');
    await textarea.press('Escape');
    await textarea.press('Enter');
    await page.waitForTimeout(1000);

    await expect(page.locator('.goal-banner')).toBeVisible();

    // Send /goal clear
    await textarea.fill('/goal clear');
    await textarea.press('Escape');
    await textarea.press('Enter');
    await waitForTurnEnd(page);

    await expect(page.locator('.goal-banner')).not.toBeVisible();
  });
});
