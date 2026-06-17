/**
 * Video tour — records a full feature demo of Kiro UI for YouTube/docs.
 * Uses a dedicated sandbox workspace. Pauses between each scenario.
 * Run: npx tsx scripts/video-tour.ts
 */
import { chromium } from '@playwright/test';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { readdirSync, renameSync, unlinkSync, statSync } from 'fs';

const OUT = join(import.meta.dirname, '..', 'docs', 'guide');
const WORKSPACE = join(import.meta.dirname, '..', '.tour-workspace');
const BASE = 'http://localhost:3000';
const AWS_PROFILE = process.env.TOUR_AWS_PROFILE || '';

// Timing: generous pauses so viewers can read results
const SCENE_PAUSE = 4000;  // Pause after each scenario (viewer reads result)
const TRANSITION = 2000;   // Pause during transitions
const TYPE_DELAY = 1200;   // Pause after typing before pressing Enter

async function waitDone(page: any) {
  await page.locator('#send-btn').waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(TRANSITION);
}

async function setupWorkspace() {
  await rm(WORKSPACE, { recursive: true, force: true });
  await mkdir(WORKSPACE, { recursive: true });
  await writeFile(join(WORKSPACE, 'README.md'), '# Demo Project\n\nA sample Node.js project for demonstration purposes.\n\n## Features\n- TypeScript\n- Unit testing\n- Clean architecture\n');
  await mkdir(join(WORKSPACE, 'src'), { recursive: true });
  await writeFile(join(WORKSPACE, 'src/utils.ts'), 'export function capitalize(str: string): string {\n  return str.charAt(0).toUpperCase() + str.slice(1);\n}\n\nexport function slugify(text: string): string {\n  return text.toLowerCase().replace(/\\s+/g, \'-\').replace(/[^a-z0-9-]/g, \'\');\n}\n');
  await writeFile(join(WORKSPACE, 'package.json'), JSON.stringify({ name: 'demo-project', version: '1.0.0', type: 'module', scripts: { test: 'echo "3 tests passed"', build: 'echo "Build complete"' } }, null, 2));
}

async function main() {
  await setupWorkspace();
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  });
  const page = await ctx.newPage();

  await page.goto(BASE);
  await page.waitForSelector('.status.connected', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(TRANSITION);

  // Configure suggestions profile and reset workspace
  await page.evaluate(async (profile) => {
    const { token } = await (await fetch('/api/token')).json();
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ suggestionsProfile: profile, workspace: '' }) });
  }, AWS_PROFILE);

  const textarea = page.locator('textarea');

  // Set allow-all for clean demo (no permission dialogs)
  const permSelect = page.locator('.tab-config select').last();
  await permSelect.selectOption('allow-all');
  await page.waitForTimeout(500);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 1: Empty state — agent name + description
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await page.waitForTimeout(SCENE_PAUSE);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 2: Per-tab configuration — model + effort
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const modelSelect = page.locator('.tab-config select').nth(1);
  if (await modelSelect.count() > 0) {
    await modelSelect.evaluate((el: HTMLSelectElement) => { el.size = el.options.length; el.focus(); });
    await page.waitForTimeout(SCENE_PAUSE);
    // Select a Claude model to enable effort control
    const options = await modelSelect.locator('option').allTextContents();
    const claudeOpt = options.find(o => /claude.*opus/i.test(o) || /claude/i.test(o));
    if (claudeOpt) await modelSelect.selectOption({ label: claudeOpt });
    await modelSelect.evaluate((el: HTMLSelectElement) => { el.size = 1; });
    await page.waitForTimeout(2000); // Wait for effort probe
  }
  // Show effort dropdown if available
  const effortSelect = page.locator('.effort-select');
  if (await effortSelect.count() > 0) {
    await effortSelect.evaluate((el: HTMLSelectElement) => { el.size = el.options.length; el.focus(); });
    await page.waitForTimeout(SCENE_PAUSE);
    await effortSelect.evaluate((el: HTMLSelectElement) => { el.size = 1; });
  }
  await page.waitForTimeout(TRANSITION);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 3: Streaming response + tool calls + file panel
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await textarea.fill('Read src/utils.ts and add a "truncate" function that limits a string to N chars with ellipsis');
  await page.waitForTimeout(TYPE_DELAY);
  await textarea.press('Enter');
  await page.waitForTimeout(5000); // Let streaming be visible
  await waitDone(page);
  await page.waitForTimeout(SCENE_PAUSE); // Viewer reads the result

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 4: Expand tool block — show diff
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const toolBlock = page.locator('.tool-block').first();
  if (await toolBlock.count() > 0) {
    await toolBlock.locator('.tool-header').click();
    await page.waitForTimeout(SCENE_PAUSE);
    await toolBlock.locator('.tool-header').click();
    await page.waitForTimeout(TRANSITION);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 5: Shell command streaming
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await textarea.fill('Run: echo "Step 1: Compiling..." && sleep 0.3 && echo "Step 2: Testing..." && sleep 0.3 && echo "Step 3: All passed ✓"');
  await page.waitForTimeout(TYPE_DELAY);
  await textarea.press('Enter');
  await page.waitForTimeout(4000);
  await waitDone(page);
  await page.waitForTimeout(SCENE_PAUSE);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 6: Context meter + metering display
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await page.waitForTimeout(SCENE_PAUSE);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 7: Message actions + rewind timeline
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const userMsg = page.locator('.message.user').first();
  await userMsg.hover();
  await page.waitForTimeout(SCENE_PAUSE);

  const rewindBtn = userMsg.locator('.msg-actions button[title="Rewind to here"]');
  if (await rewindBtn.count() > 0) {
    await rewindBtn.click();
    await page.waitForTimeout(SCENE_PAUSE);
    await page.locator('.rewind-close').click();
    await page.waitForTimeout(TRANSITION);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 8: Multi-tab sessions
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await page.locator('.tab-add').click();
  await page.waitForTimeout(TRANSITION);
  await page.waitForSelector('.status.connected', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(SCENE_PAUSE);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 9: Slash commands autocomplete
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await textarea.fill('/');
  await page.waitForTimeout(SCENE_PAUSE);
  await textarea.fill('');
  await page.waitForTimeout(TRANSITION);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 10: Message queue (queue while agent runs)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await textarea.fill('Explain the visitor design pattern with a TypeScript example');
  await page.waitForTimeout(TYPE_DELAY);
  await textarea.press('Enter');
  await page.waitForTimeout(2000); // Wait for agent to start
  await textarea.fill('Then compare it to the strategy pattern');
  await textarea.press('Enter');
  await page.waitForTimeout(400);
  await textarea.fill('Finally show when to use each one');
  await textarea.press('Enter');
  await page.waitForTimeout(SCENE_PAUSE);
  // Clear and wait
  await page.locator('.queue-clear').click().catch(() => {});
  await waitDone(page);
  await page.waitForTimeout(TRANSITION);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 11: Goal iteration banner
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await textarea.fill('/goal --max 3 Add input validation to the truncate function');
  await page.waitForTimeout(TYPE_DELAY);
  await textarea.press('Enter');
  await page.waitForTimeout(TRANSITION); // Banner appears instantly
  await page.waitForTimeout(SCENE_PAUSE); // Viewer reads the banner
  // Cancel immediately to avoid agent error messages
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await textarea.fill('/goal clear');
  await textarea.press('Enter');
  await page.waitForTimeout(TRANSITION);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 12: Follow-up suggestions
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const suggestions = page.locator('.suggestions');
  if (await suggestions.count() > 0) {
    await page.waitForTimeout(SCENE_PAUSE);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 13: Session history + filter
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await page.locator('.tab-bar .tab').first().click();
  await page.waitForTimeout(TRANSITION);
  const sessionFilter = page.locator('.session-search');
  if (await sessionFilter.count() > 0) {
    await sessionFilter.fill('utils');
    await page.waitForTimeout(SCENE_PAUSE);
    await sessionFilter.fill('');
    await page.waitForTimeout(TRANSITION);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 14: Sidebar collapse (⌘B)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await page.keyboard.press('Meta+b');
  await page.waitForTimeout(SCENE_PAUSE);
  await page.keyboard.press('Meta+b');
  await page.waitForTimeout(TRANSITION);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 15: Light theme toggle
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await page.locator('button[title="Toggle theme"]').first().click();
  await page.waitForTimeout(SCENE_PAUSE);
  await page.locator('button[title="Toggle theme"]').first().click();
  await page.waitForTimeout(TRANSITION);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENE 16: Settings page
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await page.locator('button[title="Settings"]').first().click();
  await page.waitForTimeout(SCENE_PAUSE);
  await page.locator('.settings-close').click();
  await page.waitForTimeout(SCENE_PAUSE);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // END — final pause on main view
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await page.waitForTimeout(SCENE_PAUSE);

  // Cleanup
  await page.close();
  await ctx.close();
  await browser.close();
  await rm(WORKSPACE, { recursive: true, force: true });

  // Convert to MP4
  const videos = readdirSync(OUT).filter(f => f.endsWith('.webm'));
  if (videos.length > 0) {
    const webmPath = join(OUT, 'tour-raw.webm');
    renameSync(join(OUT, videos[0]), webmPath);
    const mp4Path = join(OUT, 'tour.mp4');
    console.log('Converting to MP4...');
    execSync(`ffmpeg -y -i "${webmPath}" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart -r 30 "${mp4Path}"`, { stdio: 'pipe' });
    unlinkSync(webmPath);
    const size = statSync(mp4Path).size;
    console.log(`✅ tour.mp4 (${(size / 1024 / 1024).toFixed(1)}MB)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
