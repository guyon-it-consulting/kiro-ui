import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

const OUT = join(import.meta.dirname, '..', 'docs', 'guide');
const BASE = 'http://localhost:3000';
const PAUSE = 2500;
const SHORT = 1000;

async function shot(page: any, name: string) {
  await page.screenshot({ path: join(OUT, name) });
  await page.waitForTimeout(PAUSE);
}

async function waitDone(page: any) {
  await page.locator('#send-btn').waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(SHORT);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
  });
  const page = await ctx.newPage();

  await page.goto(BASE);
  await page.waitForSelector('.status.connected', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(PAUSE);

  const textarea = page.locator('textarea');

  // 01 - Empty state: agent name + description
  await shot(page, '01-empty-state.png');

  // 02 - Per-tab config bar
  await shot(page, '02-tab-config.png');

  // 03 - Effort dropdown (if available)
  const effortSelect = page.locator('.effort-select');
  if (await effortSelect.count() > 0) {
    await effortSelect.evaluate((el: HTMLSelectElement) => { el.size = el.options.length; el.focus(); });
    await page.waitForTimeout(SHORT);
    await shot(page, '03-effort-control.png');
    await effortSelect.evaluate((el: HTMLSelectElement) => { el.size = 1; });
  } else {
    await shot(page, '03-effort-control.png');
  }

  // Set allow-all for demos
  await page.locator('.tab-config select').nth(2).selectOption('allow-all');
  await page.waitForTimeout(SHORT);

  // 04 - Type and send
  await textarea.fill('Create a file /tmp/kiro-tour.txt with "Hello from Kiro UI v1.1"');
  await page.waitForTimeout(SHORT);
  await textarea.press('Enter');
  await page.waitForTimeout(3500);
  await shot(page, '04-streaming.png');
  await waitDone(page);

  // 05 - Tool calls + file follow-along
  await shot(page, '05-tool-calls.png');

  // 06 - Expand tool block
  const toolBlock = page.locator('.tool-block').first();
  if (await toolBlock.count() > 0) {
    await toolBlock.locator('.tool-header').click();
    await page.waitForTimeout(SHORT);
    await shot(page, '06-tool-expanded.png');
    await toolBlock.locator('.tool-header').click();
  }

  // 07 - Shell streaming
  await textarea.fill('Run: echo "Step 1: Building..." && echo "Step 2: Testing..." && echo "Step 3: Done!"');
  await textarea.press('Enter');
  await page.waitForTimeout(3000);
  await shot(page, '07-shell-streaming.png');
  await waitDone(page);

  // 08 - Third turn for rewind
  await textarea.fill('What is 2 + 2?');
  await textarea.press('Enter');
  await waitDone(page);

  // 09 - Context meter
  await shot(page, '08-context-meter.png');

  // 10 - Message actions on hover
  const userMsg = page.locator('.message.user').first();
  await userMsg.hover();
  await page.waitForTimeout(500);
  await shot(page, '09-message-actions.png');

  // 11 - Rewind timeline
  const rewindBtn = userMsg.locator('.msg-actions button[title="Rewind to here"]');
  if (await rewindBtn.count() > 0) {
    await rewindBtn.click();
    await page.waitForTimeout(SHORT);
    await shot(page, '10-rewind-timeline.png');
    await page.locator('.rewind-close').click();
    await page.waitForTimeout(SHORT);
  }

  // 12 - Multi-tab
  await page.locator('.tab-add').click();
  await page.waitForTimeout(1500);
  await shot(page, '11-multi-tab.png');

  // 13 - Slash commands
  await textarea.fill('/');
  await page.waitForTimeout(600);
  await shot(page, '12-slash-commands.png');
  await textarea.fill('');
  await page.waitForTimeout(SHORT);

  // 14 - Message queue (full showcase)
  // Send a long prompt so agent is busy, then queue messages
  await textarea.fill('Write a detailed explanation of how WebSockets work in 5 paragraphs');
  await textarea.press('Enter');
  await page.waitForTimeout(1500); // Wait for agent to start running
  // Now queue messages while agent is busy
  await textarea.fill('Then write unit tests');
  await textarea.press('Enter');
  await page.waitForTimeout(300);
  await textarea.fill('Finally update the README');
  await textarea.press('Enter');
  await page.waitForTimeout(300);
  await textarea.fill('And deploy to production');
  await textarea.press('Enter');
  await page.waitForTimeout(SHORT);
  await shot(page, '13-queue-messages.png');

  // Show reorder (move last up)
  const moveUp = page.locator('.queue-item').last().locator('.queue-move[title="Move up"]');
  if (await moveUp.count() > 0) await moveUp.click();
  await page.waitForTimeout(SHORT);
  await shot(page, '14-queue-reorder.png');

  // Clear queue, wait for turn to end
  await page.locator('.queue-clear').click().catch(() => {});
  await waitDone(page);
  await page.waitForTimeout(SHORT);

  // 15 - Go back to first tab for export/voice screenshots
  await page.locator('.tab-bar .tab').first().click();
  await page.waitForTimeout(SHORT);

  // 16 - Export button (visible in tab config when messages exist)
  await shot(page, '15-export.png');

  // 17 - Voice input (mic button)
  await shot(page, '16-voice-input.png');

  // 18 - Sidebar toggle (⌘B)
  await page.keyboard.press('Meta+b');
  await page.waitForTimeout(SHORT);
  await shot(page, '17-sidebar-collapsed.png');
  await page.keyboard.press('Meta+b');
  await page.waitForTimeout(SHORT);

  // 19 - Session history
  await shot(page, '18-session-history.png');

  // 20 - Light theme
  await page.locator('button[title="Toggle theme"]').first().click();
  await page.waitForTimeout(SHORT);
  await shot(page, '19-light-theme.png');
  await page.locator('button[title="Toggle theme"]').first().click();
  await page.waitForTimeout(SHORT);

  // 20 - Settings
  await page.locator('button[title="Settings"]').first().click();
  await page.waitForTimeout(SHORT);
  await shot(page, '20-settings.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(SHORT);

  // Close
  await page.close();
  await ctx.close();
  await browser.close();

  // Convert video to GIF
  const { readdirSync, renameSync, unlinkSync, statSync } = await import('fs');
  const videos = readdirSync(OUT).filter(f => f.endsWith('.webm'));
  const webmPath = join(OUT, 'tour.webm');
  if (videos.length > 0) renameSync(join(OUT, videos[0]), webmPath);

  const gifPath = join(OUT, 'tour.gif');
  const palettePath = join(OUT, '_palette.png');
  console.log('Converting video to optimized GIF...');
  execSync(`ffmpeg -y -i "${webmPath}" -vf "fps=10,scale=720:-1:flags=lanczos,palettegen=stats_mode=diff" "${palettePath}"`, { stdio: 'pipe' });
  execSync(`ffmpeg -y -i "${webmPath}" -i "${palettePath}" -lavfi "fps=10,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "${gifPath}"`, { stdio: 'pipe' });
  unlinkSync(palettePath);
  unlinkSync(webmPath);

  const files = readdirSync(OUT).filter(f => f.endsWith('.png')).sort();
  const gifSize = statSync(gifPath).size;
  console.log(`✅ Generated ${files.length} screenshots, tour.gif (${(gifSize / 1024 / 1024).toFixed(1)}MB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
