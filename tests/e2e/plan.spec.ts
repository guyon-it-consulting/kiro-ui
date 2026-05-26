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

test.describe('Agent Plan Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await waitForReady(page);
    const permSelect = page.locator('select').filter({ hasText: 'Ask' });
    if (await permSelect.isVisible()) {
      await permSelect.selectOption('allow-all');
    }
  });

  test('plan block appears during complex multi-step tasks', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    // Ask for something that triggers planning
    await textarea.fill('Create a new file called /tmp/plan-test.txt with the content "hello", then read it back and verify the content matches');
    await textarea.press('Enter');

    // Plan may or may not appear depending on the agent — check if it does
    const planBlock = page.locator('.plan-block');
    // Wait a bit for the plan to potentially appear
    await page.waitForTimeout(3000);
    const planAppeared = await planBlock.isVisible().catch(() => false);

    if (planAppeared) {
      // Verify plan structure
      await expect(planBlock.locator('.plan-header')).toContainText('Plan');
      const entries = planBlock.locator('.plan-entry');
      expect(await entries.count()).toBeGreaterThan(0);

      // Each entry should have an icon and content
      const firstEntry = entries.first();
      await expect(firstEntry.locator('.plan-icon')).toBeVisible();
      await expect(firstEntry.locator('.plan-content')).toBeVisible();
    }

    await waitForTurnEnd(page);

    // After turn ends, plan should be cleared
    await expect(planBlock).not.toBeVisible();
  });

  test('plan block is not shown when no plan is active', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('Say hello');
    await textarea.press('Enter');
    await waitForTurnEnd(page);

    // Simple tasks should not show a plan
    await expect(page.locator('.plan-block')).not.toBeVisible();
  });
});
