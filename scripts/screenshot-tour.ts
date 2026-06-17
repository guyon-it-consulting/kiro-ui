/**
 * Screenshot tour — captures all major features of Kiro UI.
 * Uses a dedicated sandbox workspace with safe demo content.
 * Run: npx tsx scripts/screenshot-tour.ts
 */
import { chromium } from '@playwright/test';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

const OUT = join(import.meta.dirname, '..', 'docs', 'guide');
const WORKSPACE = join(import.meta.dirname, '..', '.tour-workspace');
const BASE = 'http://localhost:3000';
const AWS_PROFILE = process.env.TOUR_AWS_PROFILE || '';
const PAUSE = 2000;
const SHORT = 800;

async function shot(page: any, name: string) {
  await page.screenshot({ path: join(OUT, name) });
  await page.waitForTimeout(SHORT);
}

async function waitDone(page: any) {
  await page.locator('#send-btn').waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(SHORT);
}

async function setupWorkspace() {
  await rm(WORKSPACE, { recursive: true, force: true });
  await mkdir(WORKSPACE, { recursive: true });
  await writeFile(join(WORKSPACE, 'README.md'), '# Demo Project\n\nA sample project for the Kiro UI tour.\n');
  await writeFile(join(WORKSPACE, 'index.ts'), 'export function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n');
  await writeFile(join(WORKSPACE, 'package.json'), JSON.stringify({ name: 'demo-project', version: '1.0.0', type: 'module' }, null, 2));
}

async function main() {
  await setupWorkspace();
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

  // Configure suggestions profile and reset workspace
  await page.evaluate(async (profile) => {
    const { token } = await (await fetch('/api/token')).json();
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ suggestionsProfile: profile, workspace: '' }) });
  }, AWS_PROFILE);
  await page.waitForTimeout(SHORT);

  const textarea = page.locator('textarea');

  // Set workspace to sandbox
  await page.locator('.sidebar-workspace').click();
  await page.waitForTimeout(500);
  // If native picker appears, dismiss and use prompt fallback
  try {
    await page.evaluate((ws: string) => {
      const input = document.querySelector('.sidebar-workspace');
      if (input) window.postMessage({ type: 'set-workspace', path: ws }, '*');
    }, WORKSPACE);
  } catch { /* fallback below */ }
  await page.waitForTimeout(SHORT);

  // Set allow-all permissions for clean demo
  const permSelect = page.locator('.tab-config select').last();
  await permSelect.selectOption('allow-all');
  await page.waitForTimeout(SHORT);

  // 01 - Empty state with agent name + description
  await shot(page, '01-empty-state.png');

  // 02 - Per-tab config bar (agent, model, effort, permissions)
  await shot(page, '02-tab-config.png');

  // 03 - Effort dropdown (select Claude model first to enable it)
  const modelSelect = page.locator('.tab-config select').nth(1);
  if (await modelSelect.count() > 0) {
    const options = await modelSelect.locator('option').allTextContents();
    const claudeOpt = options.find(o => /claude.*opus/i.test(o) || /claude/i.test(o));
    if (claudeOpt) {
      await modelSelect.selectOption({ label: claudeOpt });
      await page.waitForTimeout(2000); // Wait for effort probe
    }
  }
  const effortSelect = page.locator('.effort-select');
  if (await effortSelect.count() > 0) {
    await effortSelect.evaluate((el: HTMLSelectElement) => { el.size = el.options.length; el.focus(); });
    await page.waitForTimeout(SHORT);
    await shot(page, '03-effort-control.png');
    await effortSelect.evaluate((el: HTMLSelectElement) => { el.size = 1; });
  }

  // 04 - Streaming response with tool calls
  await textarea.fill('Read the file index.ts and add a farewell function that returns "Goodbye, {name}!"');
  await textarea.press('Enter');
  await page.waitForTimeout(3500);
  await shot(page, '04-streaming.png');
  await waitDone(page);

  // 05 - Tool calls + file follow-along panel
  await shot(page, '05-tool-calls.png');

  // 06 - Expand tool block (shows diff)
  const toolBlock = page.locator('.tool-block').first();
  if (await toolBlock.count() > 0) {
    await toolBlock.locator('.tool-header').click();
    await page.waitForTimeout(SHORT);
    await shot(page, '06-tool-expanded.png');
    await toolBlock.locator('.tool-header').click();
  }

  // 07 - Shell streaming
  await textarea.fill('Run: echo "Building project..." && echo "Running tests..." && echo "All 3 tests passed ✓"');
  await textarea.press('Enter');
  await page.waitForTimeout(3000);
  await shot(page, '07-shell-streaming.png');
  await waitDone(page);

  // 08 - Context meter + metering display
  await shot(page, '08-context-meter.png');

  // 09 - Message actions on hover (copy, rewind)
  const userMsg = page.locator('.message.user').first();
  await userMsg.hover();
  await page.waitForTimeout(500);
  await shot(page, '09-message-actions.png');

  // 10 - Rewind timeline
  const rewindBtn = userMsg.locator('.msg-actions button[title="Rewind to here"]');
  if (await rewindBtn.count() > 0) {
    await rewindBtn.click();
    await page.waitForTimeout(SHORT);
    await shot(page, '10-rewind-timeline.png');
    await page.locator('.rewind-close').click();
    await page.waitForTimeout(SHORT);
  }

  // 11 - Multi-tab (open second tab)
  await page.locator('.tab-add').click();
  await page.waitForTimeout(1500);
  await shot(page, '11-multi-tab.png');

  // 12 - Slash commands autocomplete
  await textarea.fill('/');
  await page.waitForTimeout(600);
  await shot(page, '12-slash-commands.png');
  await textarea.fill('');

  // 13 - Message queue (queue while agent is busy)
  await textarea.fill('Explain how TypeScript generics work in 3 paragraphs');
  await textarea.press('Enter');
  await page.waitForTimeout(1500);
  await textarea.fill('Then show an example with React components');
  await textarea.press('Enter');
  await page.waitForTimeout(300);
  await textarea.fill('Finally list best practices');
  await textarea.press('Enter');
  await page.waitForTimeout(SHORT);
  await shot(page, '13-queue-messages.png');
  await page.locator('.queue-clear').click().catch(() => {});
  await waitDone(page);

  // 14 - Goal iteration banner (screenshot immediately — banner appears on send)
  await textarea.fill('/goal --max 3 Refactor greet function to support multiple languages');
  await textarea.press('Enter');
  await page.waitForTimeout(SHORT); // Banner appears instantly on send
  await shot(page, '14-goal-banner.png');
  // Cancel immediately to avoid waiting for agent response
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await textarea.fill('/goal clear');
  await textarea.press('Enter');
  await page.waitForTimeout(1500);

  // 15 - Session history in sidebar (go back to first tab which has history)
  await page.locator('.tab-bar .tab').first().click();
  await page.waitForTimeout(PAUSE);
  await shot(page, '15-session-history.png');

  // 16 - Sidebar collapsed (⌘B)
  await page.keyboard.press('Meta+b');
  await page.waitForTimeout(PAUSE);
  await shot(page, '16-sidebar-collapsed.png');
  await page.keyboard.press('Meta+b');
  await page.waitForTimeout(SHORT);

  // 17 - Light theme
  await page.locator('button[title="Toggle theme"]').first().click();
  await page.waitForTimeout(SHORT);
  await shot(page, '17-light-theme.png');
  await page.locator('button[title="Toggle theme"]').first().click();
  await page.waitForTimeout(SHORT);

  // 18 - Settings page
  await page.locator('button[title="Settings"]').first().click();
  await page.waitForTimeout(SHORT);
  await shot(page, '18-settings.png');
  await page.locator('.settings-close').click();
  await page.waitForTimeout(SHORT);

  // 19 - Follow-up suggestions
  await page.locator('.tab-bar .tab').first().click();
  await page.waitForTimeout(PAUSE);
  await page.locator('textarea').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  // Send a prompt that will trigger suggestions after completion
  await page.locator('textarea').fill('What design patterns work well with utility modules?');
  await page.locator('textarea').press('Enter');
  await waitDone(page);
  // Wait for suggestions to arrive from Bedrock
  await page.locator('.suggestion-btn').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  if (await page.locator('.suggestion-btn').count() > 0) {
    await shot(page, '19-suggestions.png');
  }

  // 20 - Export button visible
  await shot(page, '20-export.png');
  // Cleanup
  await page.close();
  await ctx.close();
  await browser.close();
  await rm(WORKSPACE, { recursive: true, force: true });

  // Convert video to GIF
  const { readdirSync, renameSync, unlinkSync, statSync } = await import('fs');
  const videos = readdirSync(OUT).filter(f => f.endsWith('.webm'));
  if (videos.length > 0) {
    const webmPath = join(OUT, 'tour.webm');
    renameSync(join(OUT, videos[0]), webmPath);
    const gifPath = join(OUT, 'tour.gif');
    const palettePath = join(OUT, '_palette.png');
    execSync(`ffmpeg -y -i "${webmPath}" -vf "fps=10,scale=720:-1:flags=lanczos,palettegen=stats_mode=diff" "${palettePath}"`, { stdio: 'pipe' });
    execSync(`ffmpeg -y -i "${webmPath}" -i "${palettePath}" -lavfi "fps=10,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "${gifPath}"`, { stdio: 'pipe' });
    unlinkSync(palettePath);
    unlinkSync(webmPath);
    const gifSize = statSync(gifPath).size;
    console.log(`✅ tour.gif (${(gifSize / 1024 / 1024).toFixed(1)}MB)`);
  }

  const files = readdirSync(OUT).filter(f => f.endsWith('.png')).sort();
  console.log(`✅ Generated ${files.length} screenshots in docs/guide/`);
}

main().catch(e => { console.error(e); process.exit(1); });
