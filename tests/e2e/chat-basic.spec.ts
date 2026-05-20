import { test, expect } from '@playwright/test';

test.describe('Chat Basic', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('page loads with messages area', async ({ page }) => {
    await expect(page.locator('.messages')).toBeVisible();
  });

  test('typing and sending shows user message', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('Hello Kiro');
    await textarea.press('Enter');
    await expect(page.locator('.message.user')).toContainText('Hello Kiro');
  });

  test('cancel button visible while running', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('Do something');
    await textarea.press('Enter');
    await expect(page.locator('#cancel-btn')).toBeVisible();
  });

  test('send button disabled when input empty', async ({ page }) => {
    await expect(page.locator('#send-btn')).toBeDisabled();
  });
});
