import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('gear icon opens settings', async ({ page }) => {
    await page.locator('button[title="Settings"]').click();
    await expect(page.locator('.settings-page')).toBeVisible();
  });

  test('close returns to chat', async ({ page }) => {
    await page.locator('button[title="Settings"]').click();
    await page.locator('.settings-close').click();
    await expect(page.locator('.settings-page')).not.toBeVisible();
    await expect(page.locator('.input-area')).toBeVisible();
  });

  test('editor dropdown has 4 options', async ({ page }) => {
    await page.locator('button[title="Settings"]').click();
    const options = page.locator('.settings-page select').first().locator('option');
    await expect(options).toHaveCount(4);
  });

  test('debug checkbox exists', async ({ page }) => {
    await page.locator('button[title="Settings"]').click();
    const advancedSection = page.locator('.settings-section', { has: page.locator('h3', { hasText: 'Advanced' }) });
    await expect(advancedSection.locator('input[type="checkbox"]')).toBeVisible();
  });

  test('suggestions section is visible with all fields', async ({ page }) => {
    await page.locator('button[title="Settings"]').click();
    const section = page.locator('.settings-section', { has: page.locator('h3', { hasText: 'Suggestions' }) });
    await expect(section).toBeVisible();
    // Enabled checkbox
    await expect(section.locator('input[type="checkbox"]')).toBeVisible();
    // Region input
    await expect(section.locator('input[placeholder="us-east-1"]')).toBeVisible();
    // Profile input
    await expect(section.locator('input[placeholder="default"]')).toBeVisible();
    // Model input
    await expect(section.locator('input[placeholder="amazon.nova-lite-v1:0"]')).toBeVisible();
    // Count input
    await expect(section.locator('input[type="number"]')).toBeVisible();
  });

  test('suggestions settings persist on save', async ({ page }) => {
    await page.locator('button[title="Settings"]').click();
    const section = page.locator('.settings-section', { has: page.locator('h3', { hasText: 'Suggestions' }) });

    // Set region
    const regionInput = section.locator('input[placeholder="us-east-1"]');
    await regionInput.fill('eu-west-1');
    await regionInput.blur();

    // Set profile
    const profileInput = section.locator('input[placeholder="default"]');
    await profileInput.fill('my-profile');
    await profileInput.blur();

    // Set model
    const modelInput = section.locator('input[placeholder="amazon.nova-lite-v1:0"]');
    await modelInput.fill('amazon.nova-micro-v1:0');
    await modelInput.blur();

    // Set count
    const countInput = section.locator('input[type="number"]');
    await countInput.fill('5');
    await countInput.blur();

    // Wait for saves to complete
    await page.waitForTimeout(500);

    // Verify settings were persisted via API
    const resp = await page.evaluate(async () => {
      const t = await fetch('/api/token').then(r => r.json());
      return fetch('/api/settings', { headers: { 'Authorization': `Bearer ${t.token}` } }).then(r => r.json());
    });
    expect(resp.suggestionsRegion).toBe('eu-west-1');
    expect(resp.suggestionsProfile).toBe('my-profile');
    expect(resp.suggestionsModel).toBe('amazon.nova-micro-v1:0');
    expect(resp.suggestionsCount).toBe('5');
  });

  test('suggestions can be disabled', async ({ page }) => {
    await page.locator('button[title="Settings"]').click();
    const section = page.locator('.settings-section', { has: page.locator('h3', { hasText: 'Suggestions' }) });
    const checkbox = section.locator('input[type="checkbox"]');

    // Uncheck to disable
    if (await checkbox.isChecked()) {
      await checkbox.uncheck();
    }
    await page.waitForTimeout(300);

    const resp = await page.evaluate(async () => {
      const t = await fetch('/api/token').then(r => r.json());
      return fetch('/api/settings', { headers: { 'Authorization': `Bearer ${t.token}` } }).then(r => r.json());
    });
    expect(resp.suggestionsEnabled).toBe('false');

    // Re-enable
    await checkbox.check();
    await page.waitForTimeout(300);
    const resp2 = await page.evaluate(async () => {
      const t = await fetch('/api/token').then(r => r.json());
      return fetch('/api/settings', { headers: { 'Authorization': `Bearer ${t.token}` } }).then(r => r.json());
    });
    expect(resp2.suggestionsEnabled).toBe('true');
  });
});
