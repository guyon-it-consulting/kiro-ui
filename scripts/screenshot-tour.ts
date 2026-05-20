import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

const OUT = join(import.meta.dirname, '..', 'docs', 'guide');
const BASE = 'http://localhost:3000';
const PAUSE = 2000; // 2s between scenarios

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

  // 01 - Initial load
  await page.screenshot({ path: join(OUT, '01-initial-load.png') });
  await page.waitForTimeout(PAUSE);

  // 02 - Agent selection dropdown (open it)
  const agentSelect = page.locator('select').first();
  await agentSelect.evaluate((el: HTMLSelectElement) => { el.size = el.options.length; el.focus(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, '02-agent-selection.png') });
  await agentSelect.evaluate((el: HTMLSelectElement) => { el.size = 1; });
  await page.waitForTimeout(PAUSE);

  // 03 - Model selection dropdown (open it)
  const modelSelect = page.locator('select').nth(1);
  await modelSelect.evaluate((el: HTMLSelectElement) => { el.size = el.options.length; el.focus(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, '03-model-selection.png') });
  await modelSelect.evaluate((el: HTMLSelectElement) => { el.size = 1; });
  await page.waitForTimeout(PAUSE);

  // 04 - Permission mode: Ask (open dropdown)
  const permSelect = page.locator('select').nth(2);
  await permSelect.selectOption({ index: 0 });
  await permSelect.evaluate((el: HTMLSelectElement) => { el.size = el.options.length; el.focus(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, '04-permission-modes.png') });
  await permSelect.evaluate((el: HTMLSelectElement) => { el.size = 1; });
  await page.waitForTimeout(PAUSE);

  // Set to allow-all for the rest of the tour
  await permSelect.selectOption({ index: 2 });
  await page.waitForTimeout(500);

  // 05 - Type a message
  const textarea = page.locator('textarea');
  await textarea.fill('Hello! Explain what Kiro UI is in 2 sentences.');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, '05-typing-message.png') });
  await page.waitForTimeout(PAUSE);

  // 06 - Send and capture streaming
  await textarea.press('Enter');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(OUT, '06-agent-streaming.png') });

  // Wait for turn end
  await page.locator('#send-btn').waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, '07-agent-response.png') });
  await page.waitForTimeout(PAUSE);

  // 08 - Tool call: read a file
  await textarea.fill('Read the file package.json and tell me the project name and version');
  await textarea.press('Enter');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: join(OUT, '08-tool-call-pending.png') });

  await page.locator('#send-btn').waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(500);

  // 09 - Expand tool block
  const toolBlock = page.locator('.tool-block').first();
  if (await toolBlock.count() > 0) {
    await toolBlock.locator('.tool-header').click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: join(OUT, '09-tool-call-expanded.png') });
  await page.waitForTimeout(PAUSE);

  // 10 - Multi-tab
  await page.locator('.tab-bar button').filter({ hasText: '+' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, '10-multi-tab.png') });
  await page.waitForTimeout(PAUSE);

  // 11 - Slash commands
  await textarea.fill('/');
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, '11-slash-commands.png') });
  await textarea.fill('');
  await page.waitForTimeout(PAUSE);

  // 12 - Light theme
  await page.locator('button[title="Toggle theme"], button:has-text("Toggle theme")').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, '12-light-theme.png') });
  await page.waitForTimeout(PAUSE);

  // Switch back to dark
  await page.locator('button[title="Toggle theme"], button:has-text("Toggle theme")').first().click();
  await page.waitForTimeout(PAUSE);

  // 13 - Settings page
  await page.locator('button[title="Settings"], button:has-text("Settings")').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, '13-settings-page.png') });
  await page.waitForTimeout(PAUSE);

  // Back to chat
  await page.locator('button:has-text("Back"), button:has-text("←")').first().click().catch(() => page.keyboard.press('Escape'));
  await page.waitForTimeout(PAUSE);

  // 14 - Context meter
  const meter = page.locator('.context-meter');
  if (await meter.count() > 0) {
    await page.screenshot({ path: join(OUT, '14-context-meter.png') });
    await page.waitForTimeout(PAUSE);
  }

  // 15 - MCP panel
  const mcpPanel = page.locator('.mcp-panel, [class*="mcp"]').first();
  if (await mcpPanel.count() > 0) {
    await mcpPanel.click().catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, '15-mcp-panel.png') });
    await page.waitForTimeout(PAUSE);
  }

  // Close context to save video
  await page.close();
  await ctx.close();
  await browser.close();

  // Rename video file
  const { readdirSync, renameSync, unlinkSync } = await import('fs');
  const videos = readdirSync(OUT).filter(f => f.endsWith('.webm'));
  const webmPath = join(OUT, 'tour.webm');
  if (videos.length > 0) {
    renameSync(join(OUT, videos[0]), webmPath);
  }

  // Convert webm to optimized animated GIF
  const gifPath = join(OUT, 'tour.gif');
  const palettePath = join(OUT, '_palette.png');
  console.log('Converting video to optimized GIF...');
  execSync(`ffmpeg -y -i "${webmPath}" -vf "fps=10,scale=720:-1:flags=lanczos,palettegen=stats_mode=diff" "${palettePath}"`, { stdio: 'pipe' });
  execSync(`ffmpeg -y -i "${webmPath}" -i "${palettePath}" -lavfi "fps=10,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "${gifPath}"`, { stdio: 'pipe' });
  unlinkSync(palettePath);
  unlinkSync(webmPath);

  // Generate markdown guide
  const files = readdirSync(OUT).filter(f => f.endsWith('.png')).sort();

  const descriptions: Record<string, string> = {
    '01-initial-load.png': 'The app loads with a connected status, ready to chat. The sidebar shows conversation history.',
    '02-agent-selection.png': 'Select from available agents. Each agent has different capabilities and specializations.',
    '03-model-selection.png': 'Choose the AI model — Claude Sonnet, Opus, Haiku, DeepSeek, and more.',
    '04-permission-modes.png': 'Three permission modes: **Ask** (safest), **Auto-reads** (reads auto-approved), **Allow all** (fastest).',
    '05-typing-message.png': 'Type your message. Use Shift+Enter for new lines, Enter to send.',
    '06-agent-streaming.png': 'The agent streams its response in real-time. A cancel button appears to stop generation.',
    '07-agent-response.png': 'Completed response with full markdown rendering — code blocks, lists, and formatting.',
    '08-tool-call-pending.png': 'When the agent uses tools, tool call blocks appear with a pending status.',
    '09-tool-call-expanded.png': 'Click a tool block to expand it and see the full input/output, including file diffs.',
    '10-multi-tab.png': 'Each tab runs an independent agent session with its own context. Click + to add tabs.',
    '11-slash-commands.png': 'Type / to see available commands with autocomplete.',
    '12-light-theme.png': 'Toggle between dark and light themes. Preference is persisted.',
    '13-settings-page.png': 'Configure editor, workspace, permission policies, resource limits, and agent settings.',
    '14-context-meter.png': 'The context meter shows how much of the agent\'s context window is consumed.',
    '15-mcp-panel.png': 'The MCP panel shows connected servers and their available tools.',
  };

  let md = '# Kiro UI — Feature Guide\n\nA visual walkthrough of Kiro UI\'s features.\n\n';
  md += '![Tour](tour.gif)\n\n---\n\n';

  for (const file of files) {
    const title = file.replace(/^\d+-/, '').replace('.png', '').replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
    md += `## ${title}\n\n`;
    md += `${descriptions[file] || ''}\n\n`;
    md += `![${title}](${file})\n\n---\n\n`;
  }

  const { writeFileSync } = await import('fs');
  writeFileSync(join(OUT, 'GUIDE.md'), md);

  const gifSize = (readdirSync(OUT).includes('tour.gif'))
    ? (await import('fs')).statSync(join(OUT, 'tour.gif')).size
    : 0;
  console.log(`✅ Generated ${files.length} screenshots, tour.gif (${(gifSize / 1024 / 1024).toFixed(1)}MB), and GUIDE.md`);
}

main().catch(e => { console.error(e); process.exit(1); });
