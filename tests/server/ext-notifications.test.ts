import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleExtNotification } from '../../src/server/notifications.js';

describe('extNotification handler', () => {
  let emit: ReturnType<typeof vi.fn>;
  beforeEach(() => { emit = vi.fn(); });

  it('commands/available', () => {
    handleExtNotification('_kiro.dev/commands/available', { commands: [{ name: 'help' }], mcpServers: [{ name: 'mcp1' }], tools: [{ name: 'read' }] }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'CommandsAvailable', commands: [{ name: 'help' }] }));
  });

  it('metadata', () => {
    handleExtNotification('_kiro.dev/metadata', { contextUsagePercentage: 42 }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'Metadata', contextUsagePercentage: 42 }));
  });

  it('mcp/server_initialized', () => {
    handleExtNotification('_kiro.dev/mcp/server_initialized', { serverName: 'browsermcp' }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'McpServerInitialized', tabId: 'tab-1', serverName: 'browsermcp' });
  });

  it('mcp/server_init_failure', () => {
    handleExtNotification('_kiro.dev/mcp/server_init_failure', { serverName: 'x', error: 'timeout' }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'McpServerInitFailure', tabId: 'tab-1', serverName: 'x', error: 'timeout' });
  });

  it('agent/switched', () => {
    handleExtNotification('_kiro.dev/agent/switched', { agentName: 'coder', model: 'claude-4' }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'AgentSwitched', agentName: 'coder' }));
  });

  it('error/rate_limit', () => {
    handleExtNotification('_kiro.dev/error/rate_limit', { message: 'Too many' }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'RateLimitError', tabId: 'tab-1', message: 'Too many' });
  });

  it('compaction/status', () => {
    handleExtNotification('_kiro.dev/compaction/status', { status: { type: 'completed' }, summary: 'done' }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'CompactionStatus', tabId: 'tab-1', status: { type: 'completed' }, summary: 'done' });
  });

  it('session/update tool_call_chunk', () => {
    handleExtNotification('_kiro.dev/session/update', { update: { sessionUpdate: 'tool_call_chunk', toolCallId: 'tc-1', title: 'Read', kind: 'read' } }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'ToolCallChunk', tabId: 'tab-1', toolCallId: 'tc-1', title: 'Read', kind: 'read' });
  });

  it('session/update retry_warning', () => {
    handleExtNotification('_kiro.dev/session/update', { update: { sessionUpdate: 'retry_warning', attempt: 2, maxAttempts: 5, delaySecs: 10, message: 'Retry' } }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'RetryWarning', tabId: 'tab-1', attempt: 2, maxAttempts: 5, delaySecs: 10, message: 'Retry' });
  });

  it('mcp/oauth_request', () => {
    handleExtNotification('_kiro.dev/mcp/oauth_request', { serverName: 'mcp1', oauthUrl: 'https://auth.example.com' }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'McpOauthRequest', tabId: 'tab-1', serverName: 'mcp1', oauthUrl: 'https://auth.example.com' });
  });

  it('mcp/governance_disabled', () => {
    handleExtNotification('_kiro.dev/mcp/governance_disabled', { apiFailure: true }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'McpGovernanceDisabled', tabId: 'tab-1', apiFailure: true });
  });

  it('clear/status', () => {
    handleExtNotification('_kiro.dev/clear/status', {}, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'ClearStatus', tabId: 'tab-1' });
  });

  it('agent/not_found', () => {
    handleExtNotification('_kiro.dev/agent/not_found', { requestedAgent: 'foo', fallbackAgent: 'default' }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'AgentNotFound', tabId: 'tab-1', requestedAgent: 'foo', fallbackAgent: 'default' });
  });

  it('agent/config_error', () => {
    handleExtNotification('_kiro.dev/agent/config_error', { path: '/agents/bad.json', error: 'parse error' }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'AgentConfigError', tabId: 'tab-1', path: '/agents/bad.json', error: 'parse error' });
  });

  it('subagent/list_update', () => {
    handleExtNotification('_kiro.dev/subagent/list_update', { subagents: [{ id: 's1' }], pendingStages: [] }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'SubagentListUpdate', tabId: 'tab-1', subagents: [{ id: 's1' }], pendingStages: [] });
  });

  it('session/activity', () => {
    handleExtNotification('_kiro.dev/session/activity', { sessionId: 'sess-2', event: { type: 'tool_call' } }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'SessionActivity', tabId: 'tab-1', sessionId: 'sess-2', event: { type: 'tool_call' } });
  });

  it('session/list_update', () => {
    handleExtNotification('_kiro.dev/session/list_update', { sessions: [{ id: 's1' }] }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'SessionListUpdate', tabId: 'tab-1', sessions: [{ id: 's1' }] });
  });

  it('session/inbox_notification', () => {
    handleExtNotification('_kiro.dev/session/inbox_notification', { message: 'done', from: 'sub1' }, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'InboxNotification', tabId: 'tab-1', message: 'done', from: 'sub1' });
  });

  it('session/update with unknown type does nothing', () => {
    handleExtNotification('_kiro.dev/session/update', { update: { sessionUpdate: 'unknown_type' } }, emit, 'tab-1');
    expect(emit).not.toHaveBeenCalled();
  });

  it('unknown method does nothing', () => {
    handleExtNotification('_kiro.dev/unknown', {}, emit, 'tab-1');
    expect(emit).toHaveBeenCalledWith({ type: 'ProtocolLog', tabId: 'tab-1', dir: 'in', msg: 'ext: _kiro.dev/unknown {}' });
  });
});
