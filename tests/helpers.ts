import { vi } from 'vitest';

/** Mock WebSocket that captures sent messages */
export function createMockWs() {
  const sent: any[] = [];
  return {
    readyState: 1, // WebSocket.OPEN
    send: vi.fn((data: string) => sent.push(JSON.parse(data))),
    sent,
    OPEN: 1,
  };
}

/** Mock ACP connection */
export function createMockConn() {
  return {
    initialize: vi.fn().mockResolvedValue({ protocolVersion: '1.0' }),
    newSession: vi.fn().mockResolvedValue({ sessionId: 'sess-1', modes: { currentModeId: 'kiro_default', availableModes: [{ id: 'kiro_default', name: 'Default' }] }, models: { currentModelId: 'auto', availableModels: [{ modelId: 'auto', name: 'Auto' }] } }),
    loadSession: vi.fn().mockResolvedValue({ modes: { currentModeId: 'kiro_default', availableModes: [] }, models: { currentModelId: 'auto', availableModels: [] } }),
    prompt: vi.fn().mockResolvedValue({ stopReason: 'end_turn' }),
    cancel: vi.fn().mockResolvedValue(undefined),
    setSessionMode: vi.fn().mockResolvedValue({}),
    extMethod: vi.fn().mockResolvedValue({}),
  };
}

/** Mock child process */
export function createMockProc() {
  const listeners: Record<string, Function[]> = {};
  return {
    stdin: { write: vi.fn(), on: vi.fn(), end: vi.fn() },
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    kill: vi.fn(),
    exitCode: null,
    on: vi.fn((event: string, cb: Function) => { (listeners[event] ||= []).push(cb); }),
    emit: (event: string, ...args: any[]) => (listeners[event] || []).forEach(cb => cb(...args)),
  };
}

/** Sample tool call payload */
export const sampleToolCall = {
  toolCallId: 'tc-1',
  title: 'Read src/app.ts',
  kind: 'read',
  content: [{ type: 'diff', path: '/src/app.ts', oldText: 'const a = 1;', newText: 'const a = 2;' }],
  status: 'completed',
  rawInput: { path: '/src/app.ts' },
};

/** Sample commands available payload */
export const sampleCommandsAvailable = {
  commands: [{ name: 'help', description: 'Show help' }, { name: 'mcp', description: 'MCP servers' }],
  mcpServers: [{ name: 'browsermcp', status: 'running', toolCount: 12 }],
  tools: [
    { name: 'read', description: 'Read files', source: 'built-in' },
    { name: 'browser_click', description: 'Click element', source: 'mcp:browsermcp' },
  ],
};
