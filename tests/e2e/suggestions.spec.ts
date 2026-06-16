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

test.describe('Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await waitForReady(page);
    const permSelect = page.locator('select').filter({ hasText: 'Ask' });
    if (await permSelect.isVisible()) {
      await permSelect.selectOption('allow-all');
    }
  });

  test('suggestions endpoint returns data', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const tokenResp = await fetch('/api/token');
      const { token } = await tokenResp.json();
      const resp = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ lastAssistant: 'AWS Lambda is a serverless compute service that runs code in response to events.', lastUser: 'What is Lambda?' })
      });
      return resp.json();
    });
    if (result.error) {
      test.skip(true, `Bedrock unavailable: ${result.error}`);
    }
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeLessThanOrEqual(5);
  });

  test('suggestions appear after agent response', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');

    // Check if suggestions API works (credentials available)
    const apiCheck = await page.evaluate(async () => {
      const t = await fetch('/api/token').then(r => r.json());
      const resp = await fetch('/api/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t.token}` }, body: JSON.stringify({ lastAssistant: 'AWS Lambda is a serverless compute service that lets you run code without provisioning or managing servers.' }) });
      return resp.json();
    });
    test.skip(!!apiCheck.error, `Suggestions API unavailable: ${apiCheck.error}`);

    // Capture console from the start
    const logs: string[] = [];
    page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));

    const textarea = page.locator('textarea');
    await textarea.fill('What is AWS Lambda? Keep your answer to 2 sentences.');
    await textarea.press('Enter');
    await waitForTurnEnd(page);

    // Wait for suggestions to load (async Bedrock call)
    await page.waitForTimeout(5000);

    const suggestions = page.locator('.suggestions .suggestion-btn');
    const count = await suggestions.count();
    expect(count).toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThanOrEqual(5);
  });

  test('clicking a suggestion sends it as prompt', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('What is Amazon S3? Keep your answer to 1 sentence.');
    await textarea.press('Enter');
    await waitForTurnEnd(page);
    await page.waitForTimeout(5000);

    const suggestions = page.locator('.suggestions .suggestion-btn');
    const count = await suggestions.count();
    test.skip(count === 0, 'No suggestions generated');

    const firstText = await suggestions.first().textContent();
    await suggestions.first().click();

    const userMessages = page.locator('.message.user');
    const lastUser = await userMessages.last().textContent();
    expect(lastUser).toBe(firstText);
    await expect(page.locator('#cancel-btn')).toBeVisible();
    await expect(page.locator('.suggestions')).not.toBeVisible();
    await waitForTurnEnd(page);
  });

  test('suggestions not shown while agent is running', async ({ page }) => {
    test.skip(!(await isConnected(page)), 'Agent not connected');
    const textarea = page.locator('textarea');
    await textarea.fill('Write a paragraph about cloud computing.');
    await textarea.press('Enter');
    await expect(page.locator('.suggestions')).not.toBeVisible();
    await waitForTurnEnd(page);
  });
});
