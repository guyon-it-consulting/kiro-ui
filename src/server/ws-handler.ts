import { WebSocket, WebSocketServer } from 'ws';
import { spawn, ChildProcess } from 'child_process';
import { Writable, Readable } from 'stream';
import * as net from 'net';
import * as acp from '@agentclientprotocol/sdk';
import { resolvePermission, type PermPolicy } from './permissions.js';
import { buildPrompt } from './prompt.js';
import { handleExtNotification } from './notifications.js';
import { getTrustRules, setTrustRules, saveTrust } from './trust.js';

export interface WsHandlerDeps {
  getSettings: () => Record<string, string>;
  getWorkspace: () => string;
  getMaxTabs: () => number;
  getMaxMsgsPerMin: () => number;
  getMaxChildMemMb: () => number;
  trustFile: string;
  activeProcs: Set<ChildProcess>;
}

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

function connectTcp(host: string, port: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port }, () => resolve(socket));
    socket.once('error', reject);
  });
}

export function setupWebSocket(wss: WebSocketServer, deps: WsHandlerDeps) {
  async function createSession(ws: WebSocket, loadSessionId?: string, tabId?: string, cwd?: string): Promise<Session> {
    const settings = deps.getSettings();
    const transport = settings.transport === 'tcp'
      ? { type: 'tcp' as const, host: settings.tcpHost || 'localhost', port: parseInt(settings.tcpPort || '9000', 10) }
      : { type: 'process' as const, command: settings.acpCommand || 'kiro-cli acp' };

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
        env: { ...process.env, NODE_OPTIONS: `--max-old-space-size=${deps.getMaxChildMemMb()}` },
      });
      proc.stderr?.on('data', (chunk: Buffer) => {
        if (/not authenticated|not logged in|login required|unauthorized|auth.*fail/i.test(chunk.toString())) {
          authError = true;
          emit(ws, { type: 'AuthError', tabId: t, message: 'Kiro CLI not authenticated. Run `kiro-cli login` in your terminal.' });
        }
      });
      proc.on('exit', () => deps.activeProcs.delete(proc!));
      deps.activeProcs.add(proc);
      inputStream = proc.stdin!;
      outputStream = proc.stdout!;
    }

    let debugEnabled = false;
    const setDebug = (v: boolean) => { debugEnabled = v; };
    outputStream.on('data', (chunk: Buffer) => {
      if (!debugEnabled) return;
      for (const line of chunk.toString().split('\n').filter(Boolean)) emit(ws, { type: 'ProtocolLog', tabId: t, dir: 'in', msg: line });
    });
    const origWrite = inputStream.write.bind(inputStream);
    inputStream.write = function(chunk: any, ...args: any[]) {
      if (debugEnabled) {
        for (const line of chunk.toString().split('\n').filter(Boolean)) emit(ws, { type: 'ProtocolLog', tabId: t, dir: 'out', msg: line });
      }
      return origWrite(chunk, ...args);
    } as any;

    const stream = acp.ndJsonStream(Writable.toWeb(inputStream), Readable.toWeb(outputStream) as ReadableStream<Uint8Array>);
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
            emit(ws, u.content?.type === 'thinking' ? { type: 'Thinking', tabId: t, text: u.content.text || '' } : { type: 'AgentMessageChunk', tabId: t, text: u.content?.text || '' });
            break;
          case 'agent_thought_chunk': emit(ws, { type: 'Thinking', tabId: t, text: u.content?.text || u.text || '' }); break;
          case 'tool_call': emit(ws, { type: 'ToolCall', tabId: t, toolCallId: u.toolCallId, title: u.title, kind: u.kind, content: u.content, status: u.status, rawInput: u.rawInput, locations: u.locations }); break;
          case 'tool_call_update': emit(ws, { type: 'ToolCallUpdate', tabId: t, toolCallId: u.toolCallId, title: u.title, status: u.status, rawOutput: u.rawOutput, locations: u.locations }); break;
          case 'tool_call_chunk': emit(ws, { type: 'ToolCallChunk', tabId: t, toolCallId: u.toolCallId, title: u.title, kind: u.kind, content: u.content }); break;
          case 'plan': emit(ws, { type: 'Plan', tabId: t, entries: u.entries }); break;
          case 'user_message_chunk': emit(ws, { type: 'UserMessageChunk', tabId: t, text: u.content?.text || '' }); break;
        }
      },
      async extNotification(method, params) {
        emit(ws, { type: 'ProtocolLog', tabId: t, dir: 'in', msg: `[ext] ${method}` });
        handleExtNotification(method, params, (data) => emit(ws, data), t!);
      }
    };

    const conn = new acp.ClientSideConnection((_agent) => client, stream);
    await conn.initialize({ protocolVersion: acp.PROTOCOL_VERSION, clientCapabilities: { fs: { readTextFile: true, writeTextFile: true }, terminal: true }, clientInfo: { name: 'kiro-ui', version: '1.0.0' } });

    const result = loadSessionId
      ? await conn.loadSession({ sessionId: loadSessionId, cwd: cwd || deps.getWorkspace(), mcpServers: [] } as any) as any
      : await conn.newSession({ cwd: cwd || deps.getWorkspace(), mcpServers: [] }) as any;

    return {
      proc, socket, conn, sessionId: loadSessionId || result.sessionId, modes: result.modes, models: result.models, permResolvers, setDebug,
      get dead() { if (proc) return proc.exitCode !== null; if (socket) return socket.destroyed; return true; },
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
      if (!s || s.dead) { s = await createSession(ws, undefined, tabId); tabs.set(tabId, s); watchProc(s, tabId); emit(ws, { type: 'ready', tabId, sessionId: s.sessionId, modes: s.modes, models: s.models }); }
      return s;
    }

    function watchProc(s: Session, tabId: string) {
      let restarts = 0, windowStart = Date.now();
      const onDisconnect = (code?: number | null) => {
        if (!tabs.has(tabId) || tabs.get(tabId) !== s) return;
        emit(ws, { type: 'AgentCrash', tabId, code });
        if (s.authError) return;
        const now = Date.now();
        if (now - windowStart > 60000) { restarts = 0; windowStart = now; }
        if (++restarts > 5) { emit(ws, { type: 'error', tabId, message: 'Agent crashed too many times. Please restart manually.' }); return; }
        setTimeout(async () => {
          if (ws.readyState !== WebSocket.OPEN) return;
          try { const ns = await createSession(ws, undefined, tabId); tabs.set(tabId, ns); watchProc(ns, tabId); emit(ws, { type: 'ready', tabId, sessionId: ns.sessionId, modes: ns.modes, models: ns.models }); }
          catch (e: any) { emit(ws, { type: 'error', tabId, message: 'Failed to restart agent: ' + e.message }); }
        }, 1000);
      };
      if (s.proc) s.proc.on('exit', onDisconnect);
      if (s.socket) s.socket.on('close', () => onDisconnect(null));
    }

    const initTabId = 'tab-1';
    try { const s = await createSession(ws, undefined, initTabId); tabs.set(initTabId, s); watchProc(s, initTabId); emit(ws, { type: 'ready', tabId: initTabId, sessionId: s.sessionId, modes: s.modes, models: s.models }); }
    catch (e: any) { emit(ws, { type: 'error', tabId: initTabId, message: 'Failed to initialize: ' + e.message }); return; }

    ws.on('message', async (data) => {
      const now = Date.now();
      msgTimestamps.push(now);
      while (msgTimestamps.length && msgTimestamps[0] < now - 60000) msgTimestamps.shift();
      if (msgTimestamps.length > deps.getMaxMsgsPerMin()) { emit(ws, { type: 'error', tabId: 'tab-1', message: 'Rate limit exceeded. Please slow down.' }); return; }
      const msg = JSON.parse(data.toString());
      const tabId = msg.tabId || initTabId;
      try {
        switch (msg.action) {
          case 'new_tab': {
            if (tabs.size >= deps.getMaxTabs()) { emit(ws, { type: 'error', tabId: msg.tabId, message: `Max tabs (${deps.getMaxTabs()}) reached` }); break; }
            const s = await createSession(ws, undefined, msg.tabId, msg.cwd); tabs.set(msg.tabId, s); watchProc(s, msg.tabId); emit(ws, { type: 'ready', tabId: msg.tabId, sessionId: s.sessionId, modes: s.modes, models: s.models }); break;
          }
          case 'close_tab': { const s = tabs.get(tabId); if (s) { teardown(s); tabs.delete(tabId); } break; }
          case 'prompt': { const s = await getOrCreateTab(tabId); const prompt = buildPrompt({ text: msg.text, images: msg.images, files: msg.files }); const result = await s.conn.prompt({ sessionId: s.sessionId, prompt }); emit(ws, { type: 'TurnEnd', tabId, stopReason: result.stopReason }); break; }
          case 'cancel': { const s = tabs.get(tabId); if (s) { for (const [, r] of s.permResolvers) r({ outcome: { outcome: 'cancelled' } }); s.permResolvers.clear(); await s.conn.cancel({ sessionId: s.sessionId }); } break; }
          case 'set_mode': { const s = tabs.get(tabId); if (s) await s.conn.setSessionMode({ sessionId: s.sessionId, modeId: msg.modeId }); break; }
          case 'set_model': { const s = tabs.get(tabId); if (s) await (s.conn as any).unstable_setSessionModel({ sessionId: s.sessionId, modelId: msg.modelId }); break; }
          case 'set_permission_policy': { const s = tabs.get(tabId); if (s) s.permPolicy = msg.policy; break; }
          case 'permission_response': { const s = tabs.get(tabId); if (s) { const resolver = s.permResolvers.get(msg.requestId); if (resolver) { resolver({ outcome: { outcome: 'selected', optionId: msg.optionId } }); s.permResolvers.delete(msg.requestId); if (msg.optionId === 'allow_always' && msg.title) { const rules = getTrustRules(); rules[msg.title] = 'allow_always'; setTrustRules(rules); saveTrust(deps.trustFile); } else if (msg.optionId === 'reject_always' && msg.title) { const rules = getTrustRules(); rules[msg.title] = 'reject_always'; setTrustRules(rules); saveTrust(deps.trustFile); } } } break; }
          case 'new_chat': { const s = tabs.get(tabId); if (s) { tabs.delete(tabId); teardown(s); } const ns = await createSession(ws, undefined, tabId, msg.cwd); tabs.set(tabId, ns); watchProc(ns, tabId); emit(ws, { type: 'ready', tabId, sessionId: ns.sessionId, modes: ns.modes, models: ns.models }); break; }
          case 'load_session': { const s = tabs.get(tabId); if (s) { tabs.delete(tabId); teardown(s); } try { const ns = await createSession(ws, msg.sessionId, tabId); tabs.set(tabId, ns); watchProc(ns, tabId); } catch (e: any) { try { const ns = await createSession(ws, undefined, tabId); tabs.set(tabId, ns); watchProc(ns, tabId); } catch { return; } emit(ws, { type: 'error', tabId, message: 'Failed to load session: ' + e.message }); } emit(ws, { type: 'ready', tabId, sessionId: tabs.get(tabId)!.sessionId, modes: tabs.get(tabId)!.modes, models: tabs.get(tabId)!.models }); break; }
          case 'list_sessions': { const s = tabs.get(tabId) || tabs.values().next().value; if (s && !s.dead) { try { const res = await s.conn.extMethod('_kiro.dev/session/list', { cwd: msg.cwd || deps.getWorkspace() }); emit(ws, { type: 'SessionList', sessions: ((res as any).sessions || []).map((x: any) => ({ value: x.sessionId, label: x.title || '', updatedAt: x.updatedAt, messageCount: x.messageCount })) }); } catch { emit(ws, { type: 'SessionList', sessions: [] }); } } break; }
          case 'command_options': { const s = tabs.get(tabId); if (s && !s.dead) { try { const res = await s.conn.extMethod('_kiro.dev/commands/options', { sessionId: s.sessionId, command: msg.command, input: msg.input || '' }); emit(ws, { type: 'CommandOptions', tabId, command: msg.command, options: (res as any).options || [], hint: (res as any).hint || null, panel: (res as any).panel || null }); } catch { emit(ws, { type: 'CommandOptions', tabId, command: msg.command, options: [], hint: null, panel: null }); } } break; }
          case 'kiro_session_list': { const s = tabs.get(tabId) || tabs.values().next().value; if (s && !s.dead) { try { const res = await s.conn.extMethod('_kiro.dev/session/list', { cwd: deps.getWorkspace() }); emit(ws, { type: 'KiroSessionList', tabId, sessions: (res as any).sessions || [] }); } catch { emit(ws, { type: 'KiroSessionList', tabId, sessions: [] }); } } break; }
          case 'kiro_settings_list': { const s = tabs.get(tabId) || tabs.values().next().value; if (s && !s.dead) { try { const res = await s.conn.extMethod('_kiro.dev/settings/list', {}); emit(ws, { type: 'KiroSettingsList', tabId, settings: res }); } catch { emit(ws, { type: 'KiroSettingsList', tabId, settings: {} }); } } break; }
          case 'kiro_settings_set': { const s = tabs.get(tabId) || tabs.values().next().value; if (s && !s.dead) { try { await s.conn.extMethod('_kiro.dev/settings/set', { key: msg.key, value: msg.value }); emit(ws, { type: 'KiroSettingsUpdated', tabId, key: msg.key, value: msg.value }); } catch (e: any) { emit(ws, { type: 'error', tabId, message: e.message }); } } break; }
          case 'set_debug': { for (const s of tabs.values()) s.setDebug(!!msg.enabled); break; }
          case 'set_config_option': { const s = tabs.get(tabId); if (s && !s.dead) { try { await (s.conn as any).setSessionConfigOption?.({ sessionId: s.sessionId, configId: msg.configId, value: msg.value }); } catch (e: any) { emit(ws, { type: 'error', tabId, message: e.message }); } } break; }
        }
      } catch (e: any) {
        console.error(`Error in action=${msg.action} tabId=${tabId}:`, e.message);
        if (msg.action === 'prompt') emit(ws, { type: 'TurnEnd', tabId, stopReason: 'error' });
        emit(ws, { type: 'error', tabId, message: e.message });
      }
    });

    ws.on('close', () => { for (const s of tabs.values()) teardown(s); });
  });
}
