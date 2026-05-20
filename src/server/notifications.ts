export function handleExtNotification(method: string, params: any, emit: (data: any) => void, tabId: string) {
  const p = params;
  switch (method) {
    case '_kiro.dev/commands/available':
      emit({ type: 'CommandsAvailable', tabId, commands: p.commands || [], mcpServers: (p.mcpServers || []).map((s: any) => ({ ...s })), tools: p.tools || [] });
      break;
    case '_kiro.dev/metadata':
      emit({ type: 'Metadata', tabId, ...p });
      break;
    case '_kiro.dev/mcp/server_initialized':
      emit({ type: 'McpServerInitialized', tabId, serverName: p.serverName });
      break;
    case '_kiro.dev/mcp/server_init_failure':
      emit({ type: 'McpServerInitFailure', tabId, serverName: p.serverName, error: p.error });
      break;
    case '_kiro.dev/mcp/oauth_request':
      emit({ type: 'McpOauthRequest', tabId, serverName: p.serverName, oauthUrl: p.oauthUrl });
      break;
    case '_kiro.dev/mcp/governance_disabled':
      emit({ type: 'McpGovernanceDisabled', tabId, apiFailure: p.apiFailure });
      break;
    case '_kiro.dev/compaction/status':
      emit({ type: 'CompactionStatus', tabId, status: p.status, summary: p.summary });
      break;
    case '_kiro.dev/clear/status':
      emit({ type: 'ClearStatus', tabId });
      break;
    case '_kiro.dev/agent/switched':
      emit({ type: 'AgentSwitched', tabId, agentName: p.agentName, previousAgentName: p.previousAgentName, welcomeMessage: p.welcomeMessage, model: p.model });
      break;
    case '_kiro.dev/agent/not_found':
      emit({ type: 'AgentNotFound', tabId, requestedAgent: p.requestedAgent, fallbackAgent: p.fallbackAgent });
      break;
    case '_kiro.dev/agent/config_error':
      emit({ type: 'AgentConfigError', tabId, path: p.path, error: p.error });
      break;
    case '_kiro.dev/error/rate_limit':
      emit({ type: 'RateLimitError', tabId, message: p.message });
      break;
    case '_kiro.dev/subagent/list_update':
      emit({ type: 'SubagentListUpdate', tabId, subagents: p.subagents, pendingStages: p.pendingStages });
      break;
    case '_kiro.dev/session/activity':
      emit({ type: 'SessionActivity', tabId, sessionId: p.sessionId, event: p.event });
      break;
    case '_kiro.dev/session/list_update':
      emit({ type: 'SessionListUpdate', tabId, sessions: p.sessions });
      break;
    case '_kiro.dev/session/inbox_notification':
      emit({ type: 'InboxNotification', tabId, ...p });
      break;
    case '_kiro.dev/session/update':
      if (p.update?.sessionUpdate === 'tool_call_chunk') {
        emit({ type: 'ToolCallChunk', tabId, toolCallId: p.update.toolCallId, title: p.update.title, kind: p.update.kind });
      } else if (p.update?.sessionUpdate === 'retry_warning') {
        emit({ type: 'RetryWarning', tabId, attempt: p.update.attempt, maxAttempts: p.update.maxAttempts, delaySecs: p.update.delaySecs, message: p.update.message });
      }
      break;
  }
}
