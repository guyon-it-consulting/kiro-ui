import express from 'express';
import { WebSocketServer } from 'ws';
import { ChildProcess } from 'child_process';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { randomBytes } from 'crypto';
import { loadTrust } from './src/server/trust.js';
import { createRoutes } from './src/server/routes.js';
import { createSuggestionsRoutes } from './src/server/suggestions.js';
import { setupWebSocket } from './src/server/ws-handler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRUST_FILE = join(homedir(), '.kiro-ui', 'trust.json');
const SETTINGS_FILE = join(homedir(), '.kiro-ui', 'settings.json');

// --- Settings ---
let uiSettings: Record<string, string> = {};
async function loadSettings() { try { uiSettings = JSON.parse(await readFile(SETTINGS_FILE, 'utf8')); } catch { uiSettings = {}; } }
async function saveSettings() { await mkdir(dirname(SETTINGS_FILE), { recursive: true }); await writeFile(SETTINGS_FILE, JSON.stringify(uiSettings, null, 2)); }
function getSettings() { return uiSettings; }
function setSettings(s: Record<string, string>) { uiSettings = s; }
function getWorkspace() { return uiSettings.workspace || join(homedir(), '.kiro-ui', 'workspace'); }
function getMaxTabs() { return Number(uiSettings.maxTabs) || 10; }
function getMaxMsgsPerMin() { return Number(uiSettings.maxMsgsPerMin) || 30; }
function getMaxChildMemMb() { return Number(uiSettings.maxChildMemMb) || 512; }

// --- Auth ---
const AUTH_TOKEN = process.env.KIRO_UI_TOKEN || randomBytes(32).toString('hex');
const activeProcs = new Set<ChildProcess>();

// --- Express ---
const app = express();
const server = createServer(app);

app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:* ws://localhost:*");
  next();
});
app.use(express.static(join(__dirname, 'dist', 'client')));
app.get('/', (_req, res) => { readFile(join(__dirname, 'dist', 'client', 'index.html'), 'utf8').then(html => res.send(html)).catch(() => res.status(500).send('Server error')); });

// --- Routes ---
app.use('/api', createRoutes({ authToken: AUTH_TOKEN, trustFile: TRUST_FILE, getSettings, setSettings, saveSettings }));
app.use('/api/suggestions', createSuggestionsRoutes(getSettings, AUTH_TOKEN));

// --- WebSocket ---
const wss = new WebSocketServer({
  server,
  verifyClient: (info: { origin: string; req: { url?: string } }) => {
    const origin = info.origin || '';
    const originOk = origin === '' || /^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
    if (!originOk) return false;
    const url = new URL(info.req.url || '/', 'http://localhost');
    return url.searchParams.get('token') === AUTH_TOKEN;
  }
});
setupWebSocket(wss, { getSettings, getWorkspace, getMaxTabs, getMaxMsgsPerMin, getMaxChildMemMb, trustFile: TRUST_FILE, activeProcs });

// --- Start ---
const PORT = process.env.KIRO_UI_PORT || process.env.PORT || 3000;
await loadTrust(TRUST_FILE);
await loadSettings();
await mkdir(getWorkspace(), { recursive: true });
server.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`Kiro UI running at http://127.0.0.1:${PORT}`);
  if (process.send) process.send({ type: 'ready', port: PORT });
});

// --- Shutdown ---
function shutdown() {
  console.log('Shutting down...');
  wss.clients.forEach(ws => ws.close());
  for (const proc of activeProcs) { if (proc.exitCode === null) proc.kill('SIGTERM'); }
  setTimeout(() => { for (const proc of activeProcs) { if (proc.exitCode === null) proc.kill('SIGKILL'); } server.close(); process.exit(0); }, 3000);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
