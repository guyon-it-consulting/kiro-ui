/** Extracted WebSocket message handler — processes all incoming server messages */

import { useCallback, useRef } from 'react';
import { apiFetch } from './apiFetch';
import type { TabState, Msg, ModesState, ModelsState, McpServer, McpTool, SlashCommand, Toast, ProtocolLog, CommandOption, PlanEntry, TabMetadata, GoalState, SessionEntry } from './types';
import type { TabAction } from './tabReducer';

// Module-level stream accumulator for suggestions (outside React state)
const streamAccumulator: Record<string, string[]> = {};

export interface MessageHandlerDeps {
  updateTab: (tabId: string, fn: (t: TabState) => TabState) => void;
  dispatch: (action: TabAction) => void;
  addToast: (text: string, type: Toast['type']) => void;
  sendRef: React.MutableRefObject<(data: Record<string, unknown>) => void>;
  setCommands: (v: SlashCommand[]) => void;
  setMcpServers: React.Dispatch<React.SetStateAction<McpServer[]>>;
  setAllTools: (v: McpTool[]) => void;
  setOauthPending: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  oauthPendingRef: React.MutableRefObject<Record<string, string>>;
  setSessions: (v: SessionEntry[]) => void;
  setCmdFilter: (v: CommandOption[] | null) => void;
  setCmdIdx: (v: number) => void;
  setCmdHint: (v: string | null) => void;
  setKiroSettings: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
  setProtocolLogs: React.Dispatch<React.SetStateAction<ProtocolLog[]>>;
  activeTabIdRef: React.MutableRefObject<string>;
  modesRef: React.MutableRefObject<ModesState | null>;
  loadSessions: () => void;
}

export function useMessageHandler(deps: MessageHandlerDeps) {
  const {
    updateTab, dispatch, addToast, sendRef,
    setCommands, setMcpServers, setAllTools, setOauthPending, oauthPendingRef,
    setSessions, setCmdFilter, setCmdIdx, setCmdHint,
    setKiroSettings, setProtocolLogs,
    activeTabIdRef, modesRef, loadSessions,
  } = deps;

  const seenMcpInits = useRef(new Set<string>());

  return useCallback((data: Record<string, unknown>) => {
    const tid = (data.tabId as string) || 'tab-1';
    switch (data.type) {
      case 'ready':
        updateTab(tid, t => {
          if (t.modes && t.modes.currentModeId && (data.modes as ModesState)?.currentModeId !== t.modes.currentModeId) {
            setTimeout(() => sendRef.current({ action: 'set_mode', tabId: tid, modeId: t.modes!.currentModeId }), 100);
          }
          if (t.models && t.models.currentModelId && (data.models as ModelsState)?.currentModelId !== t.models.currentModelId) {
            setTimeout(() => sendRef.current({ action: 'set_model', tabId: tid, modelId: t.models!.currentModelId }), 100);
          }
          if (t.permPolicy !== 'ask') {
            setTimeout(() => sendRef.current({ action: 'set_permission_policy', tabId: tid, policy: t.permPolicy }), 100);
          }
          const newModes = t.modes?.currentModeId ? { ...(data.modes as ModesState), currentModeId: t.modes.currentModeId } : data.modes as ModesState;
          const newModels = t.models?.currentModelId ? { ...(data.modes as ModesState), currentModelId: t.models.currentModelId } as any : data.models as ModelsState;
          return { ...t, isRunning: false, stream: '', sessionId: data.sessionId as string, modes: newModes, models: newModels, messages: t.messages.map(msg =>
            msg.role === 'assistant-stream' ? { ...msg, role: 'assistant' } :
            msg.role === 'user-stream' ? { ...msg, role: 'user' } : msg
          )};
        });
        setTimeout(() => { loadSessions(); sendRef.current({ action: 'command_options', tabId: tid, command: 'effort', input: '' }); }, 500);
        if (streamAccumulator[tid]?.length) {
          const ctx = streamAccumulator[tid].join('');
          delete streamAccumulator[tid];
          if (ctx.length >= 40) {
            apiFetch('/api/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lastAssistant: ctx.slice(0, 2000) }) })
              .then(r => r.json())
              .then((d: any) => { if (d.suggestions?.length) updateTab(tid, tb => ({ ...tb, suggestions: d.suggestions })); })
              .catch(() => {});
          }
        }
        break;
      case 'UserMessageChunk':
        updateTab(tid, t => {
          const last = t.messages[t.messages.length - 1];
          const msgs = last?.role === 'user-stream'
            ? [...t.messages.slice(0, -1), { role: 'user-stream', text: last.text + (data.text as string) }]
            : [...t.messages, { role: 'user-stream', text: data.text as string }];
          return { ...t, messages: msgs };
        });
        break;
      case 'AgentMessageChunk':
        if (!streamAccumulator[tid]) streamAccumulator[tid] = [];
        streamAccumulator[tid].push(data.text as string);
        updateTab(tid, t => {
          const stream = t.stream + (data.text as string);
          let msgs = t.messages.map(msg => msg.role === 'user-stream' ? { ...msg, role: 'user' } : msg);
          const last = msgs[msgs.length - 1];
          msgs = last?.role === 'assistant-stream'
            ? [...msgs.slice(0, -1), { role: 'assistant-stream', text: stream }]
            : [...msgs, { role: 'assistant-stream', text: stream }];
          return { ...t, stream, messages: msgs, thinking: t.thinking ? { ...t.thinking, collapsed: true } : null };
        });
        break;
      case 'Thinking':
        updateTab(tid, t => ({ ...t, thinking: t.thinking ? { ...t.thinking, text: t.thinking.text + (data.text as string) } : { text: data.text as string, startTime: Date.now(), collapsed: false } }));
        break;
      case 'ToolCall':
        updateTab(tid, t => {
          const exists = t.messages.some(m => m.tool?.toolCallId === data.toolCallId);
          const entry: Msg = { role: 'tool', text: '', tool: { toolCallId: data.toolCallId as string, title: data.title as string, kind: data.kind as string | undefined, content: data.content as Msg['tool'] extends undefined ? never : NonNullable<Msg['tool']>['content'], status: (data.status as string) || 'pending', expanded: false, rawInput: data.rawInput } };
          const msgs = t.messages.map(msg => msg.role === 'assistant-stream' ? { ...msg, role: 'assistant' } : msg);
          const locs = data.locations as { path: string; line?: number }[] | undefined;
          const newFiles = locs?.length ? [...(t.activeFiles || []).filter(f => !locs.some(l => l.path === f.path)), ...locs.map(l => ({ ...l, kind: data.kind as string }))] : t.activeFiles;
          if (exists) return { ...t, stream: '', activeFiles: newFiles, messages: msgs.map(m => m.tool?.toolCallId === data.toolCallId ? entry : m) };
          return { ...t, stream: '', activeFiles: newFiles, messages: [...msgs, entry] };
        });
        break;
      case 'ToolCallUpdate':
        updateTab(tid, t => ({ ...t, messages: t.messages.map(m => m.tool?.toolCallId === data.toolCallId ? { ...m, tool: { ...m.tool!, status: data.status as string, rawOutput: data.rawOutput ?? m.tool!.rawOutput } } : m) }));
        break;
      case 'ToolCallChunk':
        updateTab(tid, t => {
          const existing = t.messages.find(m => m.tool?.toolCallId === data.toolCallId);
          if (existing) {
            const chunk = data.content as { text?: string } | undefined;
            if (chunk?.text) {
              return { ...t, messages: t.messages.map(m => m.tool?.toolCallId === data.toolCallId ? { ...m, tool: { ...m.tool!, streamOutput: (m.tool!.streamOutput || '') + chunk.text } } : m) };
            }
            return t;
          }
          const msgs = t.messages.map(msg => msg.role === 'assistant-stream' ? { ...msg, role: 'assistant' } : msg);
          return { ...t, stream: '', messages: [...msgs, { role: 'tool', text: '', tool: { toolCallId: data.toolCallId as string, title: data.title as string, kind: data.kind as string | undefined, status: 'pending', expanded: true } }] };
        });
        break;
      case 'PermissionRequest':
        updateTab(tid, t => ({ ...t, permissions: [...t.permissions, data as any] }));
        break;
      case 'TurnEnd': {
        updateTab(tid, t => {
          const msgs = t.messages.map(msg =>
            msg.role === 'assistant-stream' ? { ...msg, role: 'assistant' } :
            msg.role === 'user-stream' ? { ...msg, role: 'user' } : msg
          );
          let goal = t.goal;
          if (goal && goal.status === 'active') {
            const next = goal.currentIteration + 1;
            goal = next > goal.maxIterations ? { ...goal, currentIteration: goal.maxIterations, status: 'incomplete' as const } : { ...goal, currentIteration: next };
          }
          if (t.queue.length) {
            const [next, ...rest] = t.queue;
            sendRef.current({ action: 'prompt', tabId: tid, text: next });
            return { ...t, thinking: null, permissions: [], plan: undefined, messages: [...msgs, { role: 'user', text: next }], stream: '', queue: rest, lastStopReason: data.stopReason as string, suggestions: undefined, goal };
          }
          if (!streamAccumulator[tid]?.length) {
            const recent = msgs.filter(m => m.role === 'user' || m.role === 'assistant').slice(-6);
            streamAccumulator[tid] = [recent.map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.text.slice(0, 500)}`).join('\n')];
          }
          if (goal && goal.status === 'active') goal = { ...goal, status: 'complete' };
          return { ...t, thinking: null, permissions: [], plan: undefined, messages: msgs, stream: '', isRunning: false, lastStopReason: data.stopReason as string, suggestions: undefined, goal };
        });
        const suggestionsContext = (streamAccumulator[tid] || []).join('');
        delete streamAccumulator[tid];
        if (suggestionsContext.length >= 40) {
          apiFetch('/api/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lastAssistant: suggestionsContext.slice(0, 2000) }) })
            .then(r => r.json())
            .then((d: any) => { if (d.suggestions?.length) updateTab(tid, tb => ({ ...tb, suggestions: d.suggestions })); if (d.error) addToast(`Suggestions: ${d.error}`, 'warning'); })
            .catch((e) => addToast(`Suggestions: ${e.message}`, 'warning'));
        }
        loadSessions();
        if (document.hidden) {
          Notification.requestPermission().then(p => { if (p === 'granted') new Notification('Kiro', { body: 'Task completed', icon: '/favicon.ico' }); });
        }
        break;
      }
      case 'CommandsAvailable':
        setCommands(data.commands as SlashCommand[]); setMcpServers((data.mcpServers as McpServer[]) || []); setAllTools((data.tools as McpTool[]) || []);
        break;
      case 'Metadata':
        updateTab(tid, t => {
          const metering = data.meteringUsage as TabMetadata['meteringUsage'];
          const prev = t.metadata.cumulativeUsage || { inputTokens: 0, outputTokens: 0, cost: 0 };
          const cumulative = metering ? { inputTokens: prev.inputTokens + (metering.inputTokens || 0), outputTokens: prev.outputTokens + (metering.outputTokens || 0), cost: prev.cost + (metering.cost || 0) } : prev;
          return { ...t, metadata: { contextUsagePercentage: data.contextUsagePercentage as number, turnDurationMs: data.turnDurationMs as number | undefined, meteringUsage: metering, cumulativeUsage: cumulative } };
        });
        break;
      case 'Plan':
        updateTab(tid, t => ({ ...t, plan: data.entries as PlanEntry[] }));
        break;
      case 'GoalStatus':
        updateTab(tid, t => {
          if (!t.goal) return t;
          return { ...t, goal: { ...t.goal, currentIteration: (data.currentIteration as number) || t.goal.currentIteration, maxIterations: (data.maxIterations as number) || t.goal.maxIterations, status: (data.status as GoalState['status']) || t.goal.status } };
        });
        break;
      case 'SessionList': {
        const sessionList = (data.sessions as { value: string; label: string; description?: string }[]).map(s => ({ id: s.value, title: s.label, description: s.description }));
        setSessions(sessionList);
        dispatch({ type: 'UPDATE_TABS', fn: ts => ts.map(t => {
          if (!t.sessionId) return t;
          const match = sessionList.find(s => s.id === t.sessionId);
          if (match?.title && match.title !== t.name && !match.title.includes('title not available')) return { ...t, name: match.title };
          return t;
        }) });
        break;
      }
      case 'CommandOptions':
        if (data.command === 'effort') {
          updateTab(tid, t => ({ ...t, effortSupported: !!((data.options as any[])?.length) }));
        } else if (data.panel) {
          const panel = data.panel as Record<string, string>;
          updateTab(tid, t => ({ ...t, messages: [...t.messages, { role: 'assistant', text: panel.content || panel.text || JSON.stringify(panel) }] }));
          setCmdFilter(null); setCmdHint(null);
        } else {
          const options = data.options as { label?: string; value: string; description?: string }[] | undefined;
          if (options?.length) { setCmdFilter(options.map(o => ({ name: o.label || o.value, description: o.description || '', value: o.value }))); setCmdIdx(0); }
          else { setCmdFilter(null); }
          setCmdHint((data.hint as string) || null);
        }
        break;
      case 'error':
        updateTab(tid, t => ({ ...t, isRunning: false, messages: [...t.messages, { role: 'system', text: data.message as string }] }));
        addToast(data.message as string, 'error');
        break;
      case 'McpServerInitialized':
        if (!seenMcpInits.current.has(data.serverName as string)) {
          seenMcpInits.current.add(data.serverName as string);
          addToast(`MCP server "${data.serverName}" connected`, 'info');
        }
        setMcpServers(servers => servers.map(s => s.name === data.serverName ? { ...s, status: 'running' } : s));
        setOauthPending(p => { const { [data.serverName as string]: _, ...rest } = p; return rest; });
        break;
      case 'McpServerInitFailure': {
        const serverName = data.serverName as string;
        const error = data.error as string || '';
        const oauthUrl = data.oauthUrl as string || '';
        const urlMatch = oauthUrl || error.match(/https:\/\/\S+/)?.[0] || '';
        if (urlMatch && /oauth|auth|login|authorize/i.test(urlMatch + error)) {
          setOauthPending(p => ({ ...p, [serverName]: urlMatch }));
          setMcpServers(servers => {
            const exists = servers.some(s => s.name === serverName);
            if (exists) return servers.map(s => s.name === serverName ? { ...s, status: 'auth_required' } : s);
            return [...servers, { name: serverName, status: 'auth_required' }];
          });
        } else if (oauthPendingRef.current[serverName]) {
          addToast(`MCP "${serverName}" auth complete — retrying connection...`, 'info');
          setOauthPending(p => { const { [serverName]: _, ...rest } = p; return rest; });
          setMcpServers(servers => servers.map(s => s.name === serverName ? { ...s, status: 'retrying' } : s));
          setTimeout(() => sendRef.current({ action: 'prompt', tabId: activeTabIdRef.current, text: '/mcp reconnect' }), 1000);
        } else {
          addToast(`MCP server "${serverName}" failed: ${error}`, 'error');
          setMcpServers(servers => servers.map(s => s.name === serverName ? { ...s, status: 'failed' } : s));
        }
        break;
      }
      case 'McpOauthRequest':
        if (typeof data.oauthUrl === 'string' && /^https:\/\//.test(data.oauthUrl)) {
          const name = data.serverName as string;
          setOauthPending(p => ({ ...p, [name]: data.oauthUrl as string }));
          setMcpServers(servers => {
            const exists = servers.some(s => s.name === name);
            if (exists) return servers.map(s => s.name === name ? { ...s, status: 'auth_required' } : s);
            return [...servers, { name, status: 'auth_required' }];
          });
        }
        break;
      case 'McpGovernanceDisabled':
        addToast(data.apiFailure ? 'MCP disabled: failed to retrieve settings' : 'MCP has been disabled by your administrator', 'warning');
        break;
      case 'CompactionStatus': {
        const st = data.status as { type: string; error?: string } | undefined;
        if (st?.type === 'started') addToast('Context compaction started...', 'info');
        else if (st?.type === 'completed') addToast('Context compaction completed', 'info');
        else if (st?.type === 'error') addToast(`Compaction error: ${st.error}`, 'error');
        break;
      }
      case 'ClearStatus':
        updateTab(tid, t => ({ ...t, messages: [], thinking: null }));
        break;
      case 'AgentSwitched':
        if (modesRef.current && data.agentName) updateTab(tid, t => ({ ...t, modes: t.modes ? { ...t.modes, currentModeId: data.agentName as string } : t.modes }));
        if (data.welcomeMessage) updateTab(tid, t => ({ ...t, messages: [...t.messages, { role: 'assistant', text: data.welcomeMessage as string }] }));
        addToast(`Switched to ${data.agentName}`, 'info');
        break;
      case 'AgentNotFound':
        addToast(`Agent "${data.requestedAgent}" not found, using "${data.fallbackAgent}"`, 'warning');
        break;
      case 'AgentConfigError':
        addToast(`Agent config error: ${data.error}`, 'error');
        break;
      case 'RateLimitError':
        addToast((data.message as string) || 'Rate limit exceeded. Please wait.', 'error');
        break;
      case 'SessionListUpdate':
        if (data.sessions) {
          const sessionList = (data.sessions as { sessionId: string; title?: string; name?: string }[]).map(s => ({ id: s.sessionId, title: s.title || s.name || '', description: '' }));
          setSessions(sessionList);
          dispatch({ type: 'UPDATE_TABS', fn: ts => ts.map(t => {
            if (!t.sessionId) return t;
            const match = sessionList.find(s => s.id === t.sessionId);
            if (match?.title && match.title !== t.name && !match.title.includes('title not available')) return { ...t, name: match.title };
            return t;
          }) });
        }
        break;
      case 'InboxNotification':
        addToast(`Message from subagent: ${(data.message as string) || 'New notification'}`, 'info');
        break;
      case 'SubagentListUpdate':
        updateTab(tid, t => {
          const subagents = ((data.subagents as any[]) || []).map((s: any) => ({ sessionId: s.sessionId, name: s.name, role: s.role, status: s.status || 'pending', dependsOn: s.dependsOn, loopIteration: s.loopIteration }));
          const pending = ((data.pendingStages as any[]) || []).map((s: any) => ({ sessionId: s.name || s.sessionId || '', name: s.name, role: s.role, status: 'pending' as const }));
          return { ...t, subagents: [...subagents, ...pending] };
        });
        break;
      case 'SessionActivity':
        updateTab(tid, t => {
          const activity = { ...(t.subagentActivity || {}), [data.sessionId as string]: { event: (data.event as any)?.title || (data.event as string) || '', timestamp: Date.now() } };
          return { ...t, subagentActivity: activity };
        });
        break;
      case 'RetryWarning':
        addToast(`Retrying (${data.attempt}/${data.maxAttempts}) in ${data.delaySecs}s...`, 'warning');
        break;
      case 'KiroSettingsList':
        setKiroSettings((data.settings as Record<string, unknown>) || {});
        break;
      case 'KiroSettingsUpdated':
        setKiroSettings(s => s ? { ...s, [data.key as string]: data.value } : s);
        break;
      case 'AgentCrash':
        updateTab(tid, t => ({ ...t, isRunning: false }));
        addToast('Agent process crashed — restarting...', 'warning');
        break;
      case 'AuthError':
        updateTab(tid, t => ({ ...t, isRunning: false }));
        addToast(data.message as string || 'Kiro CLI not authenticated. Run `kiro-cli login` in your terminal.', 'error');
        break;
      case 'ProtocolLog':
        setProtocolLogs(l => [...l.slice(-200), { dir: data.dir as string, msg: data.msg as string, ts: Date.now() }]);
        break;
    }
  }, [updateTab, addToast, dispatch, sendRef, setCommands, setMcpServers, setAllTools, setOauthPending, oauthPendingRef, setSessions, setCmdFilter, setCmdIdx, setCmdHint, setKiroSettings, setProtocolLogs, activeTabIdRef, modesRef, loadSessions]);
}
