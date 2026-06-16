import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { readdirSync, renameSync, unlinkSync, statSync } from 'fs';

const OUT = join(import.meta.dirname, '..', 'docs', 'guide');
const BASE = 'http://localhost:3000';
const SCENE = 3500;
const SHORT = 1500;

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
  await page.waitForTimeout(SCENE);

  const textarea = page.locator('textarea');

  // --- Scene 1: Empty state with agent description ---
  await page.waitForTimeout(SCENE);

  // --- Scene 2: Show per-tab config (agent, model, perms) ---
  const agentSelect = page.locator('.tab-config select').first();
  await agentSelect.evaluate((el: HTMLSelectElement) => { el.size = el.options.length; el.focus(); });
  await page.waitForTimeout(SCENE);
  await agentSelect.evaluate((el: HTMLSelectElement) => { el.size = 1; });
  await page.waitForTimeout(SHORT);

  const modelSelect = page.locator('.tab-config select').nth(1);
  await modelSelect.evaluate((el: HTMLSelectElement) => { el.size = el.options.length; el.focus(); });
  await page.waitForTimeout(SCENE);
  await modelSelect.evaluate((el: HTMLSelectElement) => { el.size = 1; });
  await page.waitForTimeout(SHORT);

  // Set allow-all
  await page.locator('.tab-config select').nth(2).selectOption('allow-all');
  await page.waitForTimeout(SHORT);

  // --- Scene 3: Type and send — streaming + tool calls + file panel ---
  await textarea.fill('Create a file /tmp/kiro-demo.txt with "Hello from Kiro UI", then read it back');
  await page.waitForTimeout(SHORT);
  await textarea.press('Enter');
  await page.waitForTimeout(5000);
  // Show streaming + tool blocks + file follow-along
  await page.locator('#send-btn').waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(SCENE);

  // --- Scene 4: Expand tool block ---
  const toolBlock = page.locator('.tool-block').first();
  if (await toolBlock.count() > 0) {
    await toolBlock.locator('.tool-header').click();
    await page.waitForTimeout(SCENE);
    await toolBlock.locator('.tool-header').click();
  }
  await page.waitForTimeout(SHORT);

  // --- Scene 5: Shell command streaming ---
  await textarea.fill('Run: for i in 1 2 3 4 5; do echo "Processing step $i..."; sleep 0.5; done');
  await textarea.press('Enter');
  await page.waitForTimeout(4000);
  await page.locator('#send-btn').waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(SCENE);

  // --- Scene 6: Context meter visible ---
  await page.waitForTimeout(SHORT);

  // --- Scene 7: Second turn for rewind demo ---
  await textarea.fill('What is the capital of France?');
  await textarea.press('Enter');
  await page.locator('#send-btn').waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(SCENE);

  // --- Scene 8: Message actions on hover ---
  const userMsg = page.locator('.message.user').first();
  await userMsg.hover();
  await page.waitForTimeout(SCENE);

  // --- Scene 9: Rewind timeline ---
  const rewindBtn = userMsg.locator('.msg-actions button[title="Rewind to here"]');
  if (await rewindBtn.count() > 0) {
    await rewindBtn.click();
    await page.waitForTimeout(SCENE);
    await page.locator('.rewind-close').click();
  }
  await page.waitForTimeout(SHORT);

  // --- Scene 10: Multi-tab ---
  await page.locator('.tab-add').click();
  await page.waitForTimeout(SCENE);

  // --- Scene 11: Slash commands ---
  await textarea.fill('/');
  await page.waitForTimeout(SCENE);
  await textarea.fill('');
  await page.waitForTimeout(SHORT);

  // --- Scene 12: Message queue ---
  await page.waitForTimeout(SHORT);
  await textarea.fill('First task');
  await textarea.press('Enter');
  await page.waitForTimeout(300);
  await textarea.fill('Second task');
  await textarea.press('Enter');
  await textarea.fill('Third task');
  await textarea.press('Enter');
  await page.waitForTimeout(SCENE);
  // Clear queue
  await page.locator('.queue-clear').click().catch(() => {});
  await page.locator('#send-btn').waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(SHORT);

  // --- Scene 13: Export button ---
  const exportBtn = page.locator('.export-btn');
  if (await exportBtn.count() > 0) await exportBtn.hover();
  await page.waitForTimeout(SCENE);

  // --- Scene 14: Voice input button ---
  const micBtn = page.locator('.mic-btn');
  if (await micBtn.count() > 0) await micBtn.hover();
  await page.waitForTimeout(SCENE);

  // --- Scene 15: Keyboard shortcut ⌘B (collapse sidebar) ---
  await page.keyboard.press('Meta+b');
  await page.waitForTimeout(SCENE);
  await page.keyboard.press('Meta+b');
  await page.waitForTimeout(SHORT);

  // --- Scene 16: Session history + filter ---
  const sessionFilter = page.locator('.session-search');
  if (await sessionFilter.count() > 0) {
    await sessionFilter.fill('demo');
    await page.waitForTimeout(SCENE);
    await sessionFilter.fill('');
  }
  await page.waitForTimeout(SHORT);

  // --- Scene 17: Light theme ---
  await page.locator('button[title="Toggle theme"]').first().click();
  await page.waitForTimeout(SCENE);
  await page.locator('button[title="Toggle theme"]').first().click();
  await page.waitForTimeout(SHORT);

  // --- Scene 18: Settings ---
  await page.locator('button[title="Settings"]').first().click();
  await page.waitForTimeout(SCENE);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(SCENE);

  // Close
  await page.close();
  await ctx.close();
  await browser.close();

  // Convert to MP4
  const videos = readdirSync(OUT).filter(f => f.endsWith('.webm'));
  const webmPath = join(OUT, 'tour-raw.webm');
  if (videos.length > 0) renameSync(join(OUT, videos[0]), webmPath);

  const mp4Path = join(OUT, 'tour.mp4');
  console.log('Converting to YouTube MP4...');
  execSync(`ffmpeg -y -i "${webmPath}" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart -r 30 "${mp4Path}"`, { stdio: 'pipe' });
  unlinkSync(webmPath);

  const size = statSync(mp4Path).size;
  console.log(`✅ Generated tour.mp4 (${(size / 1024 / 1024).toFixed(1)}MB) — ready for YouTube upload`);
}

main().catch(e => { console.error(e); process.exit(1); });
