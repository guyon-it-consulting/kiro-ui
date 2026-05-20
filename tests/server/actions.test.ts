import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAction, HandlerContext } from '../../src/server/actions.js';

function createCtx(overrides?: Partial<HandlerContext>): HandlerContext {
  const session = {
    conn: { prompt: vi.fn().mockResolvedValue({ stopReason: 'end_turn' }), cancel: vi.fn(), setSessionMode: vi.fn(), unstable_setSessionModel: vi.fn(), setSessionConfigOption: vi.fn() },
    sessionId: 'sess-1',
    permResolvers: new Map(),
    permPolicy: 'ask',
  };
  return {
    getSession: vi.fn(() => session),
    getOrCreateSession: vi.fn().mockResolvedValue(session),
    createSession: vi.fn().mockResolvedValue({ modes: {}, models: {} }),
    teardown: vi.fn(),
    emit: vi.fn(),
    getWorkspace: () => '/tmp',
    trustFile: '/tmp/trust.json',
    ...overrides,
  };
}

describe('handleAction', () => {
  it('prompt: builds prompt and emits TurnEnd', async () => {
    const ctx = createCtx();
    await handleAction({ action: 'prompt', text: 'hello' }, 'tab-1', ctx);
    expect(ctx.getOrCreateSession).toHaveBeenCalledWith('tab-1');
    expect(ctx.emit).toHaveBeenCalledWith({ type: 'TurnEnd', tabId: 'tab-1', stopReason: 'end_turn' });
  });

  it('cancel: resolves all permResolvers and calls conn.cancel', async () => {
    const resolver = vi.fn();
    const session = { conn: { cancel: vi.fn() }, sessionId: 's1', permResolvers: new Map([['r1', resolver]]) };
    const ctx = createCtx({ getSession: vi.fn(() => session) });
    await handleAction({ action: 'cancel' }, 'tab-1', ctx);
    expect(resolver).toHaveBeenCalledWith({ outcome: { outcome: 'cancelled' } });
    expect(session.permResolvers.size).toBe(0);
    expect(session.conn.cancel).toHaveBeenCalled();
  });

  it('set_mode: calls setSessionMode', async () => {
    const ctx = createCtx();
    await handleAction({ action: 'set_mode', modeId: 'planner' }, 'tab-1', ctx);
    const s = (ctx.getSession as any)();
    expect(s.conn.setSessionMode).toHaveBeenCalledWith({ sessionId: 'sess-1', modeId: 'planner' });
  });

  it('set_permission_policy: updates session policy', async () => {
    const session = { permPolicy: 'ask' };
    const ctx = createCtx({ getSession: vi.fn(() => session) });
    await handleAction({ action: 'set_permission_policy', policy: 'allow-all' }, 'tab-1', ctx);
    expect(session.permPolicy).toBe('allow-all');
  });

  it('new_chat: tears down old and creates new', async () => {
    const oldSession = { id: 'old' };
    const ctx = createCtx({ getSession: vi.fn(() => oldSession) });
    await handleAction({ action: 'new_chat' }, 'tab-1', ctx);
    expect(ctx.teardown).toHaveBeenCalledWith(oldSession);
    expect(ctx.createSession).toHaveBeenCalledWith('tab-1', undefined, undefined);
    expect(ctx.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'ready', tabId: 'tab-1' }));
  });

  it('set_config_option: calls setSessionConfigOption', async () => {
    const ctx = createCtx();
    await handleAction({ action: 'set_config_option', configId: 'mode', value: 'planner' }, 'tab-1', ctx);
    const s = (ctx.getSession as any)();
    expect(s.conn.setSessionConfigOption).toHaveBeenCalledWith({ sessionId: 'sess-1', configId: 'mode', value: 'planner' });
  });

  it('permission_response: resolves and persists trust', async () => {
    const resolver = vi.fn();
    const session = { permResolvers: new Map([['r1', resolver]]) };
    const ctx = createCtx({ getSession: vi.fn(() => session) });
    await handleAction({ action: 'permission_response', requestId: 'r1', optionId: 'allow_always', title: 'Read file' }, 'tab-1', ctx);
    expect(resolver).toHaveBeenCalledWith({ outcome: { outcome: 'selected', optionId: 'allow_always' } });
  });

  it('set_model: calls unstable_setSessionModel', async () => {
    const ctx = createCtx();
    await handleAction({ action: 'set_model', modelId: 'claude-4' }, 'tab-1', ctx);
    const s = (ctx.getSession as any)();
    expect(s.conn.unstable_setSessionModel).toHaveBeenCalledWith({ sessionId: 'sess-1', modelId: 'claude-4' });
  });

  it('set_debug: does nothing (handled externally)', async () => {
    const ctx = createCtx();
    await handleAction({ action: 'set_debug', enabled: true }, 'tab-1', ctx);
    expect(ctx.emit).not.toHaveBeenCalled();
  });

  it('cancel: does nothing when no session', async () => {
    const ctx = createCtx({ getSession: vi.fn(() => null) });
    await handleAction({ action: 'cancel' }, 'tab-1', ctx);
    expect(ctx.emit).not.toHaveBeenCalled();
  });
});
