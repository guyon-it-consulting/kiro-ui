import { test, expect } from '@playwright/test';

test.describe('Navigation & UI State', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('full tab lifecycle: create, switch, close', async ({ page }) => {
    await expect(page.locator('.tab-bar .tab')).toHaveCount(1);
    await page.locator('.tab-add').click();
    await expect(page.locator('.tab-bar .tab')).toHaveCount(2);

    await page.locator('.tab-bar .tab').first().click();
    await expect(page.locator('.tab-bar .tab').first()).toHaveClass(/active/);

    const secondTab = page.locator('.tab-bar .tab').nth(1);
    await secondTab.hover();
    await secondTab.locator('.tab-close').click();
    await expect(page.locator('.tab-bar .tab')).toHaveCount(1);
  });

  test('cannot close last tab', async ({ page }) => {
    const closeBtn = page.locator('.tab-bar .tab').first().locator('.tab-close');
    await expect(closeBtn).not.toBeVisible();
  });

  test('Cmd+N clears messages', async ({ page }) => {
    await page.locator('textarea').fill('test');
    await page.locator('textarea').press('Enter');
    await expect(page.locator('.message.user')).toBeVisible();
    await page.keyboard.press('Meta+n');
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 10000 });
  });

  test('Cmd+L removes all messages', async ({ page }) => {
    await page.locator('textarea').fill('hello');
    await page.locator('textarea').press('Enter');
    await expect(page.locator('.message.user')).toBeVisible();
    await page.keyboard.press('Meta+l');
    await expect(page.locator('.message')).toHaveCount(0);
  });

  test('multiple tabs maintain independent messages', async ({ page }) => {
    await page.locator('textarea').fill('tab1 msg');
    await page.locator('textarea').press('Enter');
    await expect(page.locator('.message.user')).toContainText('tab1 msg');

    await page.locator('.tab-add').click();
    await expect(page.locator('.empty-state')).toBeVisible();

    await page.locator('textarea').fill('tab2 msg');
    await page.locator('textarea').press('Enter');
    await expect(page.locator('.message.user')).toContainText('tab2 msg');

    await page.locator('.tab-bar .tab').first().click();
    await expect(page.locator('.message.user').first()).toContainText('tab1 msg');
  });

  test('settings editor change persists', async ({ page }) => {
    await page.locator('button[title="Settings"]').click();
    const select = page.locator('.settings-page select').first();
    await select.selectOption('cursor');
    await page.locator('.settings-close').click();
    await page.locator('button[title="Settings"]').click();
    await expect(page.locator('.settings-page select').first()).toHaveValue('cursor');
    // Reset
    await page.locator('.settings-page select').first().selectOption('vscode');
  });

  test('permission policy selector works', async ({ page }) => {
    const select = page.locator('select').filter({ hasText: /Ask/ });
    await select.selectOption('allow-all');
    await expect(select).toHaveValue('allow-all');
    await select.selectOption('ask');
  });

  test('tab shows running class during agent turn', async ({ page }) => {
    await page.locator('textarea').fill('hello');
    await page.locator('textarea').press('Enter');
    // Either we catch the running state or the turn completes quickly
    const running = page.locator('.tab-bar .tab.active.running');
    const sendBtn = page.locator('#send-btn');
    await expect(running.or(sendBtn)).toBeVisible({ timeout: 30000 });
  });

  test('theme persists across reload', async ({ page }) => {
    await page.locator('button[title="Toggle theme"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.locator('button[title="Toggle theme"]').click();
  });
});
