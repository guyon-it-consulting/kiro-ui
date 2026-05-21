import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { readdirSync, renameSync, unlinkSync } from 'fs';

const OUT = join(import.meta.dirname, '..', 'docs', 'guide');
const BASE = 'http://localhost:3000';
const PAUSE = 2500;

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  });
  const page = await ctx.newPage();

  await page.goto(BASE);
  await page.waitForSelector('.status.connected', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(PAUSE);

  // Agent selection (open dropdown)
  const agentSelect = page.locator('select').first();
  await agentSelect.evaluate((el: HTMLSelectElement) => { el.size = el.options.length; el.focus(); });
  await page.waitForTimeout(PAUSE);
  await agentSelect.evaluate((el: HTMLSelectElement) => { el.size = 1; });
  await page.waitForTimeout(1000);

  // Model selection (open dropdown)
  const modelSelect = page.locator('select').nth(1);
  await modelSelect.evaluate((el: HTMLSelectElement) => { el.size = el.options.length; el.focus(); });
  await page.waitForTimeout(PAUSE);
  await modelSelect.evaluate((el: HTMLSelectElement) => { el.size = 1; });
  await page.waitForTimeout(1000);

  // Permission modes (open dropdown)
  const permSelect = page.locator('select').nth(2);
  await permSelect.evaluate((el: HTMLSelectElement) => { el.size = el.options.length; el.focus(); });
  await page.waitForTimeout(PAUSE);
  await permSelect.evaluate((el: HTMLSelectElement) => { el.size = 1; });
  await permSelect.selectOption({ index: 2 }); // Allow all
  await page.waitForTimeout(1000);

  // Type and send a message
  const textarea = page.locator('textarea');
  await textarea.fill('Hello! Explain what Kiro UI is in 2 sentences.');
  await page.waitForTimeout(1500);
  await textarea.press('Enter');
  await page.waitForTimeout(3000);

  // Wait for response
  await page.locator('#send-btn').waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(PAUSE);

  // Tool call demo
  await textarea.fill('Read the file package.json and tell me the project name');
  await textarea.press('Enter');
  await page.waitForTimeout(4000);

  await page.locator('#send-btn').waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Expand tool block
  const toolBlock = page.locator('.tool-block').first();
  if (await toolBlock.count() > 0) {
    await toolBlock.locator('.tool-header').click();
    await page.waitForTimeout(PAUSE);
  }

  // Multi-tab
  await page.locator('.tab-bar button').filter({ hasText: '+' }).click();
  await page.waitForTimeout(PAUSE);

  // Slash commands
  await textarea.fill('/');
  await page.waitForTimeout(PAUSE);
  await textarea.fill('');
  await page.waitForTimeout(1000);

  // Light theme
  await page.locator('button[title="Toggle theme"], button:has-text("Toggle theme")').first().click();
  await page.waitForTimeout(PAUSE);
  await page.locator('button[title="Toggle theme"], button:has-text("Toggle theme")').first().click();
  await page.waitForTimeout(PAUSE);

  // Settings
  await page.locator('button[title="Settings"], button:has-text("Settings")').first().click();
  await page.waitForTimeout(PAUSE);

  // Back
  await page.locator('button:has-text("Back"), button:has-text("←")').first().click().catch(() => page.keyboard.press('Escape'));
  await page.waitForTimeout(PAUSE);

  // Close
  await page.close();
  await ctx.close();
  await browser.close();

  // Rename video
  const videos = readdirSync(OUT).filter(f => f.endsWith('.webm'));
  const webmPath = join(OUT, 'tour-raw.webm');
  if (videos.length > 0) renameSync(join(OUT, videos[0]), webmPath);

  // Convert to YouTube-ready MP4 (1080p, H.264, AAC-compatible)
  const mp4Path = join(OUT, 'tour.mp4');
  console.log('Converting to YouTube MP4...');
  execSync(`ffmpeg -y -i "${webmPath}" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart -r 30 "${mp4Path}"`, { stdio: 'pipe' });
  unlinkSync(webmPath);

  const { statSync } = await import('fs');
  const size = statSync(mp4Path).size;
  console.log(`✅ Generated tour.mp4 (${(size / 1024 / 1024).toFixed(1)}MB) — ready for YouTube upload`);
}

main().catch(e => { console.error(e); process.exit(1); });
