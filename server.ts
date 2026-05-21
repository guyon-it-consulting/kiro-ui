import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { spawn, ChildProcess } from 'child_process';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { randomBytes } from 'crypto';
import { Writable, Readable } from 'stream';
import * as net from 'net';
import * as acp from '@agentclientprotocol/sdk';
import { loadTrust, saveTrust, getTrustRules, setTrustRules } from './src/server/trust.js';
import { resolvePermission, type PermPolicy } from './src/server/permissions.js';
import { buildPrompt } from './src/server/prompt.js';
import { handleExtNotification } from './src/server/notifications.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRUST_FILE = join(homedir(), '.kiro-ui', 'trust.json');
const SETTINGS_FILE = join(homedir(), '.kiro-ui', 'settings.json');

let uiSettings: Record<string, string> = {};
async function loadSettings() {
  try { uiSettings = JSON.parse(await readFile(SETTINGS_FILE, 'utf8')); } catch { uiSettings = {}; }
}
async function saveSettings() {
  await mkdir(dirname(SETTINGS_FILE), { recursive: true });
  await writeFile(SETTINGS_FILE, JSON.stringify(uiSettings, null, 2));
}
function getWorkspace() { return uiSettings.workspace || join(homedir(), '.kiro-ui', 'workspace'); }
function getMaxTabs() { return Number(uiSettings.maxTabs) || 10; }
function getMaxMsgsPerMin() { return Number(uiSettings.maxMsgsPerMin) || 30; }
function getMaxChildMemMb() { return Number(uiSettings.maxChildMemMb) || 512; }

const AUTH_TOKEN = process.env.KIRO_UI_TOKEN || randomBytes(32).toString('hex');
const activeProcs = new Set<ChildProcess>();

const app = express();
const server = createServer(app);
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

app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:* ws://localhost:*");
  next();
});
app.use(express.static(join(__dirname, 'dist', 'client')));

// Serve index.html for SPA routing
app.get('/', (_req, res) => {
  const indexPath = join(__dirname, 'dist', 'client', 'index.html');
  readFile(indexPath, 'utf8').then(html => res.send(html)).catch(() => res.status(500).send('Server error'));
});

// Auth middleware for API routes
app.use('/api', (req, res, next) => {
  // Token endpoint is public (bootstraps auth for the frontend)
  if (req.path === '/token') return next();
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (token !== AUTH_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

app.get('/api/token', (_req, res) => res.json({ token: AUTH_TOKEN }));

app.get('/api/trust', (_req, res) => res.json(getTrustRules()));
app.put('/api/trust', async (req, res) => { setTrustRules(req.body || {}); await saveTrust(TRUST_FILE); res.json(getTrustRules()); });
app.get('/api/settings', (_req, res) => res.json(uiSettings));
app.put('/api/settings', async (req, res) => { uiSettings = { ...uiSettings, ...req.body }; await saveSettings(); res.json(uiSettings); });
app.post('/api/pick-folder', async (req, res) => {
  const startPath = req.body?.startPath || homedir();
  if (!/^[a-zA-Z0-9 _\-./~:\\]+$/.test(startPath)) return res.json({ path: null });
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const exec = promisify(execFile);
    let folder: string | null = null;

    if (process.platform === 'darwin') {
      const script = `set f to POSIX path of (choose folder with prompt "Select workspace folder" default location POSIX file "${startPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")
return f`;
      const { stdout } = await exec('osascript', ['-e', script]);
      folder = stdout.trim().replace(/\/$/, '');
    } else if (process.platform === 'win32') {
      const ps = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.SelectedPath = '${startPath.replace(/'/g, "''")}'; if($f.ShowDialog() -eq 'OK'){$f.SelectedPath}`;
      const { stdout } = await exec('powershell', ['-NoProfile', '-Command', ps]);
      folder = stdout.trim() || null;
    } else {
      const { stdout } = await exec('zenity', ['--file-selection', '--directory', `--filename=${startPath}/`]);
      folder = stdout.trim() || null;
    }
    res.json({ path: folder });
  } catch { res.json({ path: null }); }
});

function emit(ws: WebSocket, data: any) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

interface Session {
  proc: ChildProcess | null;
  socket: net.Socket | null;
  conn: acp.ClientSideConnection;
  sessionId: string;
  modes: any;
  models: any;
  permResolvers: Map<string, (r: acp.RequestPermissionResponse) => void>;
  permPolicy: PermPolicy;
  dead?: boolean;
  authError?: boolean;
  setDebug: (v: boolean) => void;
}

function teardown(s: Session) {
  for (const [, r] of s.permResolvers) r({ outcome: { outcome: 'cancelled' } });
  s.permResolvers.clear();
  s.conn.extMethod('_kiro.dev/session/terminate', { sessionId: s.sessionId }).catch(() => {});
  setTimeout(() => {
    if (s.proc && s.proc.exitCode === null) {
      s.proc.kill('SIGTERM');
      setTimeout(() => { if (s.proc && s.proc.exitCode === null) s.proc.kill('SIGKILL'); }, 3000);
    }
    if (s.socket) s.socket.destroy();
  }, 200);
}

function getTransportConfig(): { type: 'process'; command: string } | { type: 'tcp'; host: string; port: number } {
  const t = uiSettings.transport || 'process';
  if (t === 'tcp') return { type: 'tcp', host: uiSettings.tcpHost || 'localhost', port: parseInt(uiSettings.tcpPort || '9000', 10) };
  return { type: 'process', command: uiSettings.acpCommand || 'kiro-cli acp' };
}

function connectTcp(host: string, port: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port }, () => resolve(socket));
    socket.once('error', reject);
  });
}

async function createSession(ws: WebSocket, loadSessionId?: string, tabId?: string, cwd?: string): Promise<Session> {
  const transport = getTransportConfig();
  const t = tabId;
  let proc: ChildProcess | null = null;
  let socket: net.Socket | null = null;
  let inputStream: Writable;
  let outputStream: Readable;
  let authError = false;

  if (transport.type === 'tcp') {
    socket = await connectTcp(transport.host, transport.port);
    inputStream = socket;
    outputStream = socket;
  } else {
    const parts = transport.command.split(' ');
    proc = spawn(parts[0], parts.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_OPTIONS: `--max-old-space-size=${getMaxChildMemMb()}` },
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      if (/not authenticated|not logged in|login required|unauthorized|auth.*fail/i.test(text)) {
        authError = true;
        emit(ws, { type: 'AuthError', tabId: t, message: 'Kiro CLI not authenticated. Run `kiro-cli login` in your terminal.' });
      }
    });
    proc.on('exit', () => activeProcs.delete(proc!));
    activeProcs.add(proc);
    inputStream = proc.stdin!;
    outputStream = proc.stdout!;
  }

  let debugEnabled = false;
  const setDebug = (v: boolean) => { debugEnabled = v; };
  outputStream.on('data', (chunk: Buffer) => {
    if (!debugEnabled) return;
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) emit(ws, { type: 'ProtocolLog', tabId: t, dir: 'in', msg: line });
  });
  const origWrite = inputStream.write.bind(inputStream);
  inputStream.write = function(chunk: any, ...args: any[]) {
    if (debugEnabled) {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) emit(ws, { type: 'ProtocolLog', tabId: t, dir: 'out', msg: line });
    }
    return origWrite(chunk, ...args);
  } as any;

  const stream = acp.ndJsonStream(
    Writable.toWeb(inputStream),
    Readable.toWeb(outputStream) as ReadableStream<Uint8Array>
  );

  const permResolvers = new Map<string, (r: acp.RequestPermissionResponse) => void>();
  let permPolicy: PermPolicy = 'ask';

  const client: acp.Client = {
    async requestPermission(params) {
      const title = (params.toolCall as any).title || '';
      const kind = (params.toolCall as any).kind;
      const resolved = resolvePermission(title, kind, params.options as any, permPolicy);
      if (resolved) return resolved as any;

      return new Promise((resolve) => {
        const id = params.toolCall.toolCallId;
        emit(ws, { type: 'PermissionRequest', tabId: t, requestId: id, title, options: params.options });
        permResolvers.set(id, resolve);
      });
    },

    async sessionUpdate(params) {
      const u = params.update as any;
      switch (u.sessionUpdate) {
        case 'agent_message_chunk':
          emit(ws, u.content?.type === 'thinking'
            ? { type: 'Thinking', tabId: t, text: u.content.text || '' }
            : { type: 'AgentMessageChunk', tabId: t, text: u.content?.text || '' });
          break;
        case 'agent_thought_chunk':
          emit(ws, { type: 'Thinking', tabId: t, text: u.content?.text || u.text || '' });
          break;
        case 'tool_call':
          emit(ws, { type: 'ToolCall', tabId: t, toolCallId: u.toolCallId, title: u.title, kind: u.kind, content: u.content, status: u.status, rawInput: u.rawInput });
          break;
        case 'tool_call_update':
          emit(ws, { type: 'ToolCallUpdate', tabId: t, toolCallId: u.toolCallId, title: u.title, status: u.status, rawOutput: u.rawOutput });
          break;
        case 'tool_call_chunk':
          emit(ws, { type: 'ToolCallChunk', tabId: t, toolCallId: u.toolCallId, title: u.title, kind: u.kind });
          break;
        case 'user_message_chunk':
          emit(ws, { type: 'UserMessageChunk', tabId: t, text: u.content?.text || '' });
          break;
      }
    },

    async extNotification(method, params) {
      handleExtNotification(method, params, (data) => emit(ws, data), t!);
    }
  };

  const conn = new acp.ClientSideConnection((_agent) => client, stream);

  await conn.initialize({
    protocolVersion: acp.PROTOCOL_VERSION,
    clientCapabilities: { fs: { readTextFile: true, writeTextFile: true }, terminal: true },
    clientInfo: { name: 'kiro-ui', version: '1.0.0' }
  });

  const result = loadSessionId
    ? await conn.loadSession({ sessionId: loadSessionId, cwd: cwd || getWorkspace(), mcpServers: [] } as any) as any
    : await conn.newSession({ cwd: cwd || getWorkspace(), mcpServers: [] }) as any;

  return {
    proc, socket, conn,
    sessionId: loadSessionId || result.sessionId,
    modes: result.modes, models: result.models,
    permResolvers, setDebug,
    get dead() {
      if (proc) return proc.exitCode !== null;
      if (socket) return socket.destroyed;
      return true;
    },
    get authError() { return authError; },
    get permPolicy() { return permPolicy; },
    set permPolicy(v) { permPolicy = v; }
  };
}

wss.on('connection', async (ws) => {
  const tabs = new Map<string, Session>();
  const msgTimestamps: number[] = [];

  async function getOrCreateTab(tabId: string): Promise<Session> {
    let s = tabs.get(tabId);
    if (!s || s.dead) {
      s = await createSession(ws, undefined, tabId);
      tabs.set(tabId, s);
      watchProc(s, tabId);
      emit(ws, { type: 'ready', tabId, modes: s.modes, models: s.models });
    }
    return s;
  }

  function watchProc(s: Session, tabId: string) {
    let restarts = 0;
    let windowStart = Date.now();
    const MAX_RESTARTS = 5;
    const WINDOW_MS = 60000;

    const onDisconnect = (code?: number | null) => {
      if (!tabs.has(tabId) || tabs.get(tabId) !== s) return;
      emit(ws, { type: 'AgentCrash', tabId, code });

      if (s.authError) return; // Don't restart on auth failure

      const now = Date.now();
      if (now - windowStart > WINDOW_MS) { restarts = 0; windowStart = now; }
      if (++restarts > MAX_RESTARTS) {
        emit(ws, { type: 'error', tabId, message: 'Agent crashed too many times. Please restart manually.' });
        return;
      }

      setTimeout(async () => {
        if (ws.readyState !== WebSocket.OPEN) return;
        try {
          const ns = await createSession(ws, undefined, tabId);
          tabs.set(tabId, ns);
          watchProc(ns, tabId);
          emit(ws, { type: 'ready', tabId, modes: ns.modes, models: ns.models });
        } catch (e: any) {
          emit(ws, { type: 'error', tabId, message: 'Failed to restart agent: ' + e.message });
        }
      }, 1000);
    };
    if (s.proc) s.proc.on('exit', onDisconnect);
    if (s.socket) s.socket.on('close', () => onDisconnect(null));
  }

  // Create initial tab
  const initTabId = 'tab-1';
  try {
    const s = await createSession(ws, undefined, initTabId);
    tabs.set(initTabId, s);
    watchProc(s, initTabId);
    emit(ws, { type: 'ready', tabId: initTabId, modes: s.modes, models: s.models });
  } catch (e: any) {
    emit(ws, { type: 'error', tabId: initTabId, message: 'Failed to initialize: ' + e.message });
    return;
  }

  ws.on('message', async (data) => {
    // Rate limiting
    const now = Date.now();
    msgTimestamps.push(now);
    while (msgTimestamps.length && msgTimestamps[0] < now - 60000) msgTimestamps.shift();
    if (msgTimestamps.length > getMaxMsgsPerMin()) {
      emit(ws, { type: 'error', tabId: 'tab-1', message: 'Rate limit exceeded. Please slow down.' });
      return;
    }
    const msg = JSON.parse(data.toString());
    const tabId = msg.tabId || initTabId;
    try {
      switch (msg.action) {
        case 'new_tab': {
          if (tabs.size >= getMaxTabs()) { emit(ws, { type: 'error', tabId: msg.tabId, message: `Max tabs (${getMaxTabs()}) reached` }); break; }
          const s = await createSession(ws, undefined, msg.tabId);
          tabs.set(msg.tabId, s);
          watchProc(s, msg.tabId);
          emit(ws, { type: 'ready', tabId: msg.tabId, modes: s.modes, models: s.models });
          break;
        }
        case 'close_tab': {
          const s = tabs.get(tabId);
          if (s) { teardown(s); tabs.delete(tabId); }
          break;
        }
        case 'prompt': {
          const s = await getOrCreateTab(tabId);
          const prompt = buildPrompt({ text: msg.text, images: msg.images, files: msg.files });
          const result = await s.conn.prompt({ sessionId: s.sessionId, prompt });
          emit(ws, { type: 'TurnEnd', tabId, stopReason: result.stopReason });
          break;
        }
        case 'cancel': {
          const s = tabs.get(tabId);
          if (s) {
            for (const [, r] of s.permResolvers) r({ outcome: { outcome: 'cancelled' } });
            s.permResolvers.clear();
            await s.conn.cancel({ sessionId: s.sessionId });
          }
          break;
        }
        case 'set_mode': {
          const s = tabs.get(tabId);
          if (s) await s.conn.setSessionMode({ sessionId: s.sessionId, modeId: msg.modeId });
          break;
        }
        case 'set_model': {
          const s = tabs.get(tabId);
          if (s) await (s.conn as any).unstable_setSessionModel({ sessionId: s.sessionId, modelId: msg.modelId });
          break;
        }
        case 'set_permission_policy': {
          const s = tabs.get(tabId);
          if (s) s.permPolicy = msg.policy;
          break;
        }
        case 'permission_response': {
          const s = tabs.get(tabId);
          if (s) {
            const resolver = s.permResolvers.get(msg.requestId);
            if (resolver) {
              resolver({ outcome: { outcome: 'selected', optionId: msg.optionId } });
              s.permResolvers.delete(msg.requestId);
              if (msg.optionId === 'allow_always' && msg.title) { const rules = getTrustRules(); rules[msg.title] = 'allow_always'; setTrustRules(rules); saveTrust(TRUST_FILE); }
              else if (msg.optionId === 'reject_always' && msg.title) { const rules = getTrustRules(); rules[msg.title] = 'reject_always'; setTrustRules(rules); saveTrust(TRUST_FILE); }
            }
          }
          break;
        }
        case 'new_chat': {
          const s = tabs.get(tabId);
          if (s) teardown(s);
          const ns = await createSession(ws, undefined, tabId, msg.cwd);
          tabs.set(tabId, ns);
          watchProc(ns, tabId);
          emit(ws, { type: 'ready', tabId, modes: ns.modes, models: ns.models });
          break;
        }
        case 'load_session': {
          const s = tabs.get(tabId);
          if (s) teardown(s);
          try {
            const ns = await createSession(ws, msg.sessionId, tabId);
            tabs.set(tabId, ns);
          } catch (e: any) {
            try { const ns = await createSession(ws, undefined, tabId); tabs.set(tabId, ns); } catch { return; }
            emit(ws, { type: 'error', tabId, message: 'Failed to load session: ' + e.message });
          }
          emit(ws, { type: 'ready', tabId, modes: tabs.get(tabId)!.modes, models: tabs.get(tabId)!.models });
          break;
        }
        case 'list_sessions': {
          const s = tabs.get(tabId) || tabs.values().next().value;
          if (s && !s.dead) {
            try {
              const res = await s.conn.extMethod('_kiro.dev/session/list', { cwd: getWorkspace() });
              emit(ws, { type: 'SessionList', sessions: ((res as any).sessions || []).map((x: any) => ({ value: x.sessionId, label: x.title, updatedAt: x.updatedAt })) });
            } catch { emit(ws, { type: 'SessionList', sessions: [] }); }
          }
          break;
        }
        case 'command_options': {
          const s = tabs.get(tabId);
          if (s && !s.dead) {
            try {
              const res = await s.conn.extMethod('_kiro.dev/commands/options', { sessionId: s.sessionId, command: msg.command, input: msg.input || '' });
              emit(ws, { type: 'CommandOptions', tabId, command: msg.command, options: (res as any).options || [], hint: (res as any).hint || null, panel: (res as any).panel || null });
            } catch {
              emit(ws, { type: 'CommandOptions', tabId, command: msg.command, options: [], hint: null, panel: null });
            }
          }
          break;
        }
        case 'kiro_session_list': {
          const s = tabs.get(tabId) || tabs.values().next().value;
          if (s && !s.dead) {
            try {
              const res = await s.conn.extMethod('_kiro.dev/session/list', { cwd: getWorkspace() });
              emit(ws, { type: 'KiroSessionList', tabId, sessions: (res as any).sessions || [] });
            } catch { emit(ws, { type: 'KiroSessionList', tabId, sessions: [] }); }
          }
          break;
        }
        case 'kiro_settings_list': {
          const s = tabs.get(tabId) || tabs.values().next().value;
          if (s && !s.dead) {
            try {
              const res = await s.conn.extMethod('_kiro.dev/settings/list', {});
              emit(ws, { type: 'KiroSettingsList', tabId, settings: res });
            } catch { emit(ws, { type: 'KiroSettingsList', tabId, settings: {} }); }
          }
          break;
        }
        case 'kiro_settings_set': {
          const s = tabs.get(tabId) || tabs.values().next().value;
          if (s && !s.dead) {
            try {
              await s.conn.extMethod('_kiro.dev/settings/set', { key: msg.key, value: msg.value });
              emit(ws, { type: 'KiroSettingsUpdated', tabId, key: msg.key, value: msg.value });
            } catch (e: any) { emit(ws, { type: 'error', tabId, message: e.message }); }
          }
          break;
        }
        case 'set_debug': {
          for (const s of tabs.values()) s.setDebug(!!msg.enabled);
          break;
        }
        case 'session_delete': {
          const s = tabs.get(tabId) || tabs.values().next().value;
          if (s && !s.dead) {
            try {
              await (s.conn as any).unstable_deleteSession({ sessionId: msg.sessionId });
              emit(ws, { type: 'SessionDeleted', tabId, sessionId: msg.sessionId });
            } catch (e: any) { emit(ws, { type: 'error', tabId, message: e.message }); }
          }
          break;
        }
        case 'set_config_option': {
          const s = tabs.get(tabId);
          if (s && !s.dead) {
            try {
              await (s.conn as any).setSessionConfigOption?.({ sessionId: s.sessionId, configId: msg.configId, value: msg.value });
            } catch (e: any) { emit(ws, { type: 'error', tabId, message: e.message }); }
          }
          break;
        }
      }
    } catch (e: any) {
      console.error(`Error in action=${msg.action} tabId=${tabId}:`, e.message);
      if (msg.action === 'prompt') emit(ws, { type: 'TurnEnd', tabId, stopReason: 'error' });
      emit(ws, { type: 'error', tabId, message: e.message });
    }
  });

  ws.on('close', () => { for (const s of tabs.values()) teardown(s); });
});

const PORT = process.env.KIRO_UI_PORT || process.env.PORT || 3000;
await loadTrust(TRUST_FILE);
await loadSettings();
await mkdir(getWorkspace(), { recursive: true });
server.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`Kiro UI running at http://127.0.0.1:${PORT}`);
  if (process.send) process.send({ type: 'ready', port: PORT });
});

function shutdown() {
  console.log('Shutting down...');
  wss.clients.forEach(ws => ws.close());
  for (const proc of activeProcs) {
    if (proc.exitCode === null) proc.kill('SIGTERM');
  }
  setTimeout(() => {
    for (const proc of activeProcs) {
      if (proc.exitCode === null) proc.kill('SIGKILL');
    }
    server.close();
    process.exit(0);
  }, 3000);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
