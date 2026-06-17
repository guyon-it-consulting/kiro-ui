import { useState, useRef, useEffect, useCallback, useMemo, useReducer } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ErrorBoundary } from './components';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';
import 'highlight.js/styles/github-dark.min.css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('markdown', markdown);

import { useWebSocket } from './useWebSocket';
import { apiFetch } from './apiFetch';
import { tabReducer, newTab } from './tabReducer';
import type { TabsState } from './tabReducer';
import { useMessageHandler } from './useMessageHandler';
import { AppContext } from './AppContext';
import type { AppContextValue } from './AppContext';
import { ToolBlock, ToolGroup } from './ToolBlock';
import { ThinkingBlock } from './ThinkingBlock';
import { MessageActions } from './MessageActions';
import { RewindTimeline } from './RewindTimeline';
import { McpPanel } from './McpPanel';
import { SubagentPanel } from './SubagentPanel';
import { SettingsPage } from './SettingsPage';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { PanelMessage } from './PanelMessage';
import type { TabState, McpServer, McpTool, SlashCommand, SessionEntry, Toast, ProtocolLog, PendingImage, PendingFile, EditorType, CommandOption } from './types';
import { EDITOR_SCHEMES } from './types';

marked.setOptions({ breaks: true });

// Module-level stream accumulator for suggestions (outside React state)
export function App() {
  const [tabsState, dispatch] = useReducer(tabReducer, {
    tabs: [newTab('tab-1', 'New Chat')],
    activeTabId: 'tab-1',
    tabCounter: 1,
  } as TabsState);
  const { tabs, activeTabId, tabCounter } = tabsState;
  const [commands, setCommands] = useState<SlashCommand[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [allTools, setAllTools] = useState<McpTool[]>([]);
  const [oauthPending, setOauthPending] = useState<Record<string, string>>({});
  const oauthPendingRef = useRef<Record<string, string>>({});
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [input, setInput] = useState('');
  const [cmdFilter, setCmdFilter] = useState<CommandOption[] | null>(null);
  const [cmdIdx, setCmdIdx] = useState(0);
  const [cmdHint, setCmdHint] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  const [editor, setEditor] = useState<EditorType>('vscode');
  useEffect(() => { apiFetch('/api/settings').then(r => r.json()).then(d => {
    if (d.editor) setEditor(d.editor);
    if (d.permPolicy) updateTab('tab-1', t => ({ ...t, permPolicy: d.permPolicy }));
    if (d.debugEnabled === 'true') setDebugEnabled(true);
  }); }, []);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [kiroSettings, setKiroSettings] = useState<Record<string, unknown> | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [protocolLogs, setProtocolLogs] = useState<ProtocolLog[]>([]);

  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendRef = useRef<(data: Record<string, unknown>) => void>(() => {});

  const updateTab = useCallback((tabId: string, fn: (t: TabState) => TabState) => {
    dispatch({ type: 'UPDATE_TAB', tabId, fn });
  }, []);

  const tab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const modes = tab.modes;
  const models = tab.models;
  const permPolicy = tab.permPolicy;

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); }, [theme]);
  useEffect(() => { apiFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ editor }) }); }, [editor]);
  useEffect(() => { apiFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permPolicy }) }); }, [permPolicy]);
  useEffect(() => { apiFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ debugEnabled: String(debugEnabled) }) }); }, [debugEnabled]);


  const toastId = useRef(0);
  const addToast = useCallback((text: string, type: Toast['type'] = 'info') => {
    const id = ++toastId.current;
    setToasts(t => [...t.slice(-4), { id, text, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  }, []);

  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  const modesRef = useRef(modes);
  modesRef.current = modes;

  function loadSessions() { sendRef.current({ action: 'list_sessions', tabId: activeTabIdRef.current, cwd: tab.cwd }); }

  const handleMessage = useMessageHandler({
    updateTab, dispatch, addToast, sendRef,
    setCommands, setMcpServers, setAllTools, setOauthPending, oauthPendingRef,
    setSessions, setCmdFilter, setCmdIdx, setCmdHint,
    setKiroSettings, setProtocolLogs,
    activeTabIdRef, modesRef, loadSessions,
  });

  const { send, status } = useWebSocket(handleMessage);
  sendRef.current = send;
  oauthPendingRef.current = oauthPending;

  // Auto-scroll
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tab.messages, tab.thinking]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const onScroll = () => { setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200); };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  useEffect(() => { if (!tab.isRunning) textareaRef.current?.focus(); }, [tab.isRunning]);

  useEffect(() => {
    document.querySelectorAll('.message.assistant pre code:not(.hljs)').forEach(el => { hljs.highlightElement(el as HTMLElement); });
    document.querySelectorAll('.message.assistant pre:not([data-copy])').forEach(pre => {
      pre.setAttribute('data-copy', '1');
      const btn = document.createElement('button');
      btn.className = 'code-copy'; btn.textContent = 'Copy';
      btn.onclick = () => { navigator.clipboard.writeText(pre.textContent || ''); btn.textContent = '✓'; setTimeout(() => btn.textContent = 'Copy', 1500); };
      (pre as HTMLElement).style.position = 'relative';
      pre.appendChild(btn);
    });
  }, [tab.messages]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'n') { e.preventDefault(); newChat(); }
        else if (e.key === 'l') { e.preventDefault(); updateTab(activeTabId, t => ({ ...t, messages: [], thinking: null })); }
        else if (e.key === 'b') { e.preventDefault(); setSidebarOpen(s => !s); }
        else if (e.key === 't') { e.preventDefault(); addTab(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTabId]);

  useEffect(() => { if (modes) loadSessions(); }, [activeTabId]);

  function loadSession(id: string, title?: string) {
    // If this session is already open in a tab, just focus it
    const existing = tabs.find(t => t.sessionId === id);
    if (existing) { dispatch({ type: 'SET_ACTIVE_TAB', tabId: existing.id }); return; }
    // Open in a new tab
    const tabId = `tab-${tabCounter + 1}`;
    const t = { ...newTab(tabId, title || 'Loading...'), isConnecting: true, cwd: tab.cwd };
    dispatch({ type: 'ADD_TAB', tab: t });
    send({ action: 'load_session', tabId, sessionId: id });
  }


  function handleSendText(text: string) {
    if (!text || tab.isRunning) return;
    updateTab(activeTabId, t => ({ ...t, messages: [...t.messages, { role: 'user', text }], isRunning: true, stream: '', activeFiles: undefined, suggestions: undefined }));
    send({ action: 'prompt', tabId: activeTabId, text });
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setCmdFilter(null); setCmdHint(null);
    if (text.startsWith('/')) {
      const panelCommands: Record<string, string> = { '/mcp': 'mcp', '/mcp list': 'mcp', '/tools': 'tools', '/context': 'context', '/context show': 'context', '/help': 'help' };
      const panelType = panelCommands[text];
      if (panelType) { updateTab(activeTabId, t => ({ ...t, messages: [...t.messages, { role: 'user', text }, { role: 'panel', text: '', panelType }] })); setInput(''); return; }
      if (tab.isRunning) { updateTab(activeTabId, t => ({ ...t, queue: [...t.queue, text] })); setInput(''); return; }
    } else {
      if (tab.isRunning) { updateTab(activeTabId, t => ({ ...t, queue: [...t.queue, text] })); setInput(''); return; }
    }
    updateTab(activeTabId, t => {
      let goal = t.goal;
      if (text === '/goal clear') goal = null;
      else if (text.startsWith('/goal ')) {
        const match = text.match(/^\/goal\s+(?:--max\s+(\d+)\s+)?(.+)/s);
        if (match) goal = { text: match[2].trim(), maxIterations: match[1] ? parseInt(match[1], 10) : 5, currentIteration: 1, status: 'active' };
      }
      return { ...t, messages: [...t.messages, { role: 'user', text }], isRunning: true, stream: '', activeFiles: undefined, suggestions: undefined, goal };
    });
    send({ action: 'prompt', tabId: activeTabId, text, images: pendingImages.length ? pendingImages : undefined, files: pendingFiles.length ? pendingFiles : undefined });
    setInput(''); setPendingImages([]); setPendingFiles([]);
  }

  function retryMessage(idx: number) {
    const msg = tab.messages[idx];
    if (msg.role !== 'user') return;
    updateTab(activeTabId, t => ({ ...t, messages: [...t.messages.slice(0, idx), { role: 'user', text: msg.text }], isRunning: true, stream: '', lastStopReason: undefined }));
    send({ action: 'prompt', tabId: activeTabId, text: msg.text });
  }

  const [showRewind, setShowRewind] = useState(false);

  function handleRewind(turnIndex: number) {
    const turnNum = tab.messages.slice(0, turnIndex + 1).filter(m => m.role === 'user').length;
    setShowRewind(false);
    // Keep messages up to (but not including) the next user message after turnIndex
    const nextUserIdx = tab.messages.findIndex((m, i) => i > turnIndex && m.role === 'user');
    const sliceEnd = nextUserIdx === -1 ? tab.messages.length : nextUserIdx;
    updateTab(activeTabId, t => ({ ...t, messages: t.messages.slice(0, sliceEnd), thinking: null, isRunning: true, stream: '' }));
    send({ action: 'prompt', tabId: activeTabId, text: `/rewind ${turnNum}` });
  }

  function exportMarkdown() {
    const lines: string[] = [`# ${tab.name}\n`];
    for (const m of tab.messages) {
      if (m.role === 'user') lines.push(`## User\n\n${m.text}\n`);
      else if (m.role === 'assistant') lines.push(`## Assistant\n\n${m.text}\n`);
      else if (m.role === 'tool' && m.tool) lines.push(`> **${m.tool.title}** — ${m.tool.status}\n`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab.name.replace(/[^a-zA-Z0-9-_ ]/g, '')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const cmdDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleInput(val: string) {
    setInput(val);
    if (val.startsWith('/')) {
      if (!val.includes(' ')) {
        const f = val.slice(1).toLowerCase();
        const matches = commands.filter(c => c.name.slice(1).startsWith(f));
        setCmdFilter(matches.length ? matches.map(c => ({ name: c.name, description: c.description || '', value: '' })) : null);
        setCmdIdx(0); setCmdHint(null);
      } else {
        const parts = val.split(' ');
        const command = parts[0].slice(1);
        const partial = parts.slice(1).join(' ');
        clearTimeout(cmdDebounceRef.current);
        cmdDebounceRef.current = setTimeout(() => { sendRef.current({ action: 'command_options', tabId: activeTabId, command, input: partial }); }, 150);
      }
    } else { setCmdFilter(null); setCmdHint(null); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (cmdFilter) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setCmdIdx(i => Math.min(i + 1, cmdFilter.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setCmdIdx(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const item = cmdFilter[cmdIdx];
        if (item.value) { const parts = input.split(' '); setInput(parts[0] + ' ' + item.value + ' '); }
        else { setInput(item.name + ' '); }
        setCmdFilter(null); setCmdHint(null);
      }
      else if (e.key === 'Escape') { setCmdFilter(null); setCmdHint(null); }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape' && tab.isRunning) send({ action: 'cancel', tabId: activeTabId });
  }

  function respondPermission(requestId: string, optionId: string, title: string) {
    send({ action: 'permission_response', tabId: activeTabId, requestId, optionId, title });
    updateTab(activeTabId, t => ({ ...t, permissions: t.permissions.filter(x => x.requestId !== requestId) }));
  }

  function newChat() {
    addTab();
  }

  function addTab() {
    const id = `tab-${tabCounter + 1}`;
    dispatch({ type: 'ADD_TAB', tab: { ...newTab(id, 'New Chat'), isConnecting: true, cwd: tab.cwd } });
    send({ action: 'new_tab', tabId: id, cwd: tab.cwd });
  }

  function closeTab(id: string) {
    if (tabs.length <= 1) return;
    send({ action: 'close_tab', tabId: id });
    dispatch({ type: 'CLOSE_TAB', tabId: id });
  }

  function scrollToBottom() { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }

  const statusText = modes ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected';
  const statusClass = modes ? 'status connected' : 'status';
  const hasMessages = tab.messages.length > 0 || tab.thinking;
  const isLoading = (status === 'connecting' && !modes) || tab.isConnecting;

  const ctx: AppContextValue = useMemo(() => ({
    tabs, activeTabId, tab, dispatch, updateTab, send,
    modes, models, permPolicy, editor,
    mcpServers, allTools, oauthPending, commands, sessions,
    addToast, addTab, closeTab, loadSession,
  }), [tabs, activeTabId, tab, dispatch, updateTab, send, modes, models, permPolicy, editor, mcpServers, allTools, oauthPending, commands, sessions, addToast, addTab, closeTab, loadSession]);

  return <AppContext.Provider value={ctx}><ErrorBoundary><>
    {toasts.length > 0 && <div className="toast-container">
      {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.text}<button className="toast-close" onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>✕</button></div>)}
    </div>}
    <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
    <div className="main">
      <header>
        <h1><span style={{color: 'var(--accent)'}}>Kiro</span></h1>
        <div className="selectors">
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle theme">
            {theme === 'dark' ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
          </button>
          <button className="theme-toggle" onClick={() => setShowSettings(s => !s)} title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>
          <div className="header-divider" />
          <span className={statusClass}>{statusText}</span>
        </div>
      </header>

      <TabBar />

      <div className="tab-config">
        {modes && <select value={modes.currentModeId} onChange={e => { send({ action: 'set_mode', tabId: activeTabId, modeId: e.target.value }); updateTab(activeTabId, t => ({ ...t, modes: { ...t.modes!, currentModeId: e.target.value } })); }}>
          {modes.availableModes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>}
        {models && <select value={models.currentModelId} onChange={e => { send({ action: 'set_model', tabId: activeTabId, modelId: e.target.value }); updateTab(activeTabId, t => ({ ...t, models: { ...t.models!, currentModelId: e.target.value }, effortSupported: undefined })); send({ action: 'command_options', tabId: activeTabId, command: 'effort', input: '' }); }}>
          {models.availableModels.map(m => <option key={m.modelId} value={m.modelId}>{m.name}</option>)}
        </select>}
        {tab.effortSupported && <select className="effort-select" value={tab.effort || 'default'} onChange={e => { const v = e.target.value; updateTab(activeTabId, t => ({ ...t, effort: v === 'default' ? undefined : v })); if (v !== 'default') send({ action: 'prompt', tabId: activeTabId, text: `/effort ${v}` }); }}>
          <option value="default">⚡ Effort</option>
          <option value="low">⚡ Low</option>
          <option value="medium">⚡⚡ Medium</option>
          <option value="high">⚡⚡⚡ High</option>
          <option value="xhigh">🔥 X-High</option>
          <option value="max">🔥🔥 Max</option>
        </select>}
        <select value={permPolicy} onChange={e => { updateTab(activeTabId, t => ({ ...t, permPolicy: e.target.value })); send({ action: 'set_permission_policy', tabId: activeTabId, policy: e.target.value }); }}>
          <option value="ask">⛨ Ask</option>
          <option value="approve-reads">◑ Auto-reads</option>
          <option value="allow-all">◉ Allow all</option>
        </select>
        {tab.messages.length > 0 && <button className="export-btn" onClick={exportMarkdown} title="Export as Markdown"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>}
        {tab.sessionId && <button className="session-id-btn" onClick={() => { navigator.clipboard.writeText(tab.sessionId!); addToast('Session ID copied — use: kiro-cli chat --resume-id ' + tab.sessionId, 'info'); }} title={`Session: ${tab.sessionId}\nClick to copy for: kiro-cli chat --resume-id`}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg><span>{tab.sessionId.slice(0, 8)}</span></button>}
      </div>

      {showSettings ? <SettingsPage editor={editor} setEditor={setEditor} onClose={() => setShowSettings(false)} send={send} kiroSettings={kiroSettings} debugEnabled={debugEnabled} setDebugEnabled={setDebugEnabled} /> : <>
      <div className="messages" ref={messagesContainerRef}>
        {(mcpServers.length > 0 || (tab.activeFiles && tab.activeFiles.length > 0)) && <div className="side-panels">
          {mcpServers.length > 0 && modes && <McpPanel servers={mcpServers} tools={allTools} oauthPending={oauthPending} />}
          {tab.activeFiles && tab.activeFiles.length > 0 && <div className="files-panel">
            <div className="files-title">Files</div>
            {tab.activeFiles.slice(-8).map((f, i) => {
              const fullPath = f.path.startsWith('/') ? f.path : (tab.cwd || '') + '/' + f.path;
              return (
                <a key={i} className="files-item" href={`${EDITOR_SCHEMES[editor]}${fullPath}${f.line ? ':' + f.line : ''}`} title={fullPath}>
                  <span className="files-icon">{f.kind === 'edit' ? '✏️' : f.kind === 'read' ? '📖' : '📄'}</span>
                  <span className="files-path">{f.path.split('/').pop()}{f.line ? ':' + f.line : ''}</span>
                </a>
              );
            })}
          </div>}
        </div>}
        {isLoading && <div className="loading-skeleton"><div className="skel-line" /><div className="skel-line short" /><div className="skel-line" /></div>}

        {!hasMessages && !isLoading && (
          <div className="empty-state">
            <div className="logo"><svg viewBox="0 0 24 24" fill="none"><path d="M7.5 16.5c-1.8 4-0.3 5.2 2.5 3.3 0.8 2.6 3.7 1.6 4.8 0 2.5-4.5 1.5-9.1 1.3-10 -1.8-6.4-10.7-6.4-12.2 0-0.4 1.1-0.4 2.4-0.6 3.7-0.1 0.7-0.2 1.1-0.4 1.8-0.2 0.4-0.4 0.8-0.7 1.4-0.5 0.9-0.3 2.8 2.3 1.8l0.2-0.1z" fill="var(--accent)" stroke="var(--accent)" strokeWidth="0.5"/><ellipse cx="12.5" cy="9.5" rx="0.9" ry="1.3" fill="var(--bg)"/><ellipse cx="15.5" cy="9.5" rx="0.9" ry="1.3" fill="var(--bg)"/></svg></div>
            {modes && <p className="empty-agent-name">{modes.availableModes.find(m => m.id === modes.currentModeId)?.name || modes.currentModeId}</p>}
            {modes && <p className="empty-agent-desc">{modes.availableModes.find(m => m.id === modes.currentModeId)?.description || 'What can I help you with?'}</p>}
            {!modes && <p>What can I help you with?</p>}
          </div>
        )}

        {(() => {
          const elements: React.ReactNode[] = [];
          let i = 0;
          while (i < tab.messages.length) {
            const m = tab.messages[i];
            if (m.role === 'tool') {
              const groupStart = i;
              while (i < tab.messages.length && tab.messages[i].role === 'tool') i++;
              const tools = tab.messages.slice(groupStart, i);
              if (tools.length > 1) {
                elements.push(<ToolGroup key={groupStart} tools={tools} startIdx={groupStart} tabId={activeTabId} updateTab={updateTab} editor={editor} />);
              } else {
                const t = tools[0];
                elements.push(<ToolBlock key={groupStart} tool={t.tool || { toolCallId: String(groupStart), title: 'tool', status: 'complete', expanded: false }} onToggle={() => updateTab(activeTabId, tb => ({ ...tb, messages: tb.messages.map((msg, j) => j === groupStart && msg.tool ? { ...msg, tool: { ...msg.tool, expanded: !msg.tool.expanded } } : msg) }))} editor={editor} />);
              }
            } else if (m.role === 'panel') {
              elements.push(<PanelMessage key={i} type={m.panelType!} metadata={tab.metadata} modes={modes} commands={commands} mcpServers={mcpServers} allTools={allTools} />);
              i++;
            } else {
              elements.push(
                <div key={i} className={`message ${m.role.replace('-stream', '')}`}>
                  {(m.role === 'user' || m.role === 'user-stream' || m.role === 'system') ? m.text :
                    <MemoMarkdown text={m.text} />}
                  {!tab.isRunning && m.role !== 'system' && <MessageActions msg={m} idx={i} onRetry={retryMessage} onRewind={() => setShowRewind(true)} isLastUser={m.role === 'user' && !tab.messages.slice(i + 1).some(x => x.role === 'user')} canRetry={tab.lastStopReason !== undefined && tab.lastStopReason !== 'end_turn'} />}
                </div>
              );
              i++;
            }
          }
          return elements;
        })()}

        {tab.thinking && <ThinkingBlock thinking={tab.thinking} onToggle={() => updateTab(activeTabId, t => ({ ...t, thinking: t.thinking ? { ...t.thinking, collapsed: !t.thinking.collapsed } : null }))} />}

        {tab.plan && tab.plan.length > 0 && (
          <div className="plan-block">
            <div className="plan-header">Plan</div>
            {tab.plan.map((entry, i) => (
              <div key={i} className={`plan-entry plan-${entry.status}`}>
                <span className="plan-icon">{entry.status === 'completed' ? '✓' : entry.status === 'in_progress' ? '▶' : '○'}</span>
                <span className="plan-content">{entry.content}</span>
                {entry.priority === 'high' && <span className="plan-priority">!</span>}
              </div>
            ))}
          </div>
        )}

        {tab.isRunning && !tab.thinking && (
          <div className="waiting-indicator">
            <span className="waiting-ghost" style={{ '--ghost-color': `var(--ghost-${tabs.indexOf(tab) % 6})` } as React.CSSProperties}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M7.5 16.5c-1.8 4-0.3 5.2 2.5 3.3 0.8 2.6 3.7 1.6 4.8 0 2.5-4.5 1.5-9.1 1.3-10 -1.8-6.4-10.7-6.4-12.2 0-0.4 1.1-0.4 2.4-0.6 3.7-0.1 0.7-0.2 1.1-0.4 1.8-0.2 0.4-0.4 0.8-0.7 1.4-0.5 0.9-0.3 2.8 2.3 1.8l0.2-0.1z" fill="currentColor" stroke="var(--ghost-color)" strokeWidth="1.5"/><ellipse cx="12.5" cy="9.5" rx="0.9" ry="1.3" fill="var(--surface)"/><ellipse cx="15.5" cy="9.5" rx="0.9" ry="1.3" fill="var(--surface)"/></svg>
            </span>
            <span className="waiting-dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
        )}

        {tab.permissions.map(p => (
          <div key={p.requestId} className="permission">
            <div className="perm-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:6}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>{p.title || 'Permission required'}</div>
            <div className="perm-buttons">
              {p.options?.map(o => (
                <button key={o.optionId} className={o.kind?.includes('allow') ? 'allow' : o.kind?.includes('reject') ? 'reject' : ''} onClick={() => respondPermission(p.requestId, o.optionId, p.title || '')}>{o.name}</button>
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        {showScrollBtn && <button className="scroll-bottom-btn" onClick={scrollToBottom}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>}
      </div>

      {showRewind && <RewindTimeline messages={tab.messages} onRewind={handleRewind} onClose={() => setShowRewind(false)} />}

      {debugEnabled && protocolLogs.length > 0 && <div className="debug-panel">
        <div className="debug-header"><span>Protocol Log</span><button onClick={() => setProtocolLogs([])}>Clear</button></div>
        <div className="debug-logs">
          {protocolLogs.slice(-50).map((l, i) => <div key={i} className={`debug-line debug-${l.dir}`}><span className="debug-dir">{l.dir === 'out' ? '→' : '←'}</span><span className="debug-msg">{l.msg}</span></div>)}
        </div>
      </div>}
      <div className="input-area">
        {tab.subagents && tab.subagents.length > 0 && <SubagentPanel subagents={tab.subagents} activity={tab.subagentActivity} />}
        {tab.suggestions && tab.suggestions.length > 0 && !tab.isRunning && <div className="suggestions">
          {tab.suggestions.map((s, i) => (
            <button key={i} className="suggestion-btn" onClick={() => handleSendText(s)}>{s}</button>
          ))}
        </div>}
        {tab.goal && <div className={`goal-banner ${tab.goal.status}`}>
          <span className="goal-icon">{tab.goal.status === 'complete' ? '✓' : tab.goal.status === 'incomplete' ? '⚠' : '⟳'}</span>
          <span className="goal-label">{tab.goal.status === 'complete' ? 'Goal complete' : tab.goal.status === 'incomplete' ? `Goal incomplete (${tab.goal.currentIteration}/${tab.goal.maxIterations})` : `Iteration ${tab.goal.currentIteration}/${tab.goal.maxIterations}`}</span>
          <span className="goal-text">{tab.goal.text.slice(0, 50)}{tab.goal.text.length > 50 ? '…' : ''}</span>
          {tab.goal.status === 'active' && <button className="goal-cancel" onClick={() => { updateTab(activeTabId, t => ({ ...t, goal: null })); send({ action: 'prompt', tabId: activeTabId, text: '/goal clear' }); }}>Cancel</button>}
          {tab.goal.status !== 'active' && <button className="goal-cancel" onClick={() => updateTab(activeTabId, t => ({ ...t, goal: null }))}>Dismiss</button>}
        </div>}
        {tab.queue.length > 0 && <div className="queue-list">
          {tab.queue.map((q, i) => (
            <div key={i} className="queue-item">
              <span className="queue-num">{i + 1}</span>
              <button className="queue-move" disabled={i === 0} onClick={() => updateTab(activeTabId, t => { const q = [...t.queue]; [q[i-1], q[i]] = [q[i], q[i-1]]; return { ...t, queue: q }; })} title="Move up">↑</button>
              <button className="queue-move" disabled={i === tab.queue.length - 1} onClick={() => updateTab(activeTabId, t => { const q = [...t.queue]; [q[i], q[i+1]] = [q[i+1], q[i]]; return { ...t, queue: q }; })} title="Move down">↓</button>
              <input className="queue-edit" value={q} onChange={e => updateTab(activeTabId, t => ({ ...t, queue: t.queue.map((x, j) => j === i ? e.target.value : x) }))} />
              {i < tab.queue.length - 1 && <button className="queue-merge" onClick={() => updateTab(activeTabId, t => ({ ...t, queue: t.queue.filter((_, j) => j !== i + 1).map((x, j) => j === i ? x + '\n\n' + t.queue[i + 1] : x) }))} title="Merge with next">⊕</button>}
              <button className="queue-remove" onClick={() => updateTab(activeTabId, t => ({ ...t, queue: t.queue.filter((_, j) => j !== i) }))} title="Remove"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
          ))}
          <div className="queue-actions">
            <span className="queue-count">{tab.queue.length} queued</span>
            <button className="queue-clear" onClick={() => updateTab(activeTabId, t => ({ ...t, queue: [] }))}>Clear all</button>
            <button className="queue-send-now" onClick={() => send({ action: 'cancel', tabId: activeTabId })}>Send Now ⚡</button>
          </div>
        </div>}
        {tab.metadata.contextUsagePercentage > 0 && <div className="context-meter">
          <svg className="context-pie" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--surface-2)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" strokeDasharray={`${tab.metadata.contextUsagePercentage} ${100 - tab.metadata.contextUsagePercentage}`} strokeDashoffset="25" strokeLinecap="round" stroke={tab.metadata.contextUsagePercentage >= 90 ? 'var(--red)' : tab.metadata.contextUsagePercentage >= 70 ? 'var(--yellow)' : 'var(--accent)'} />
          </svg>
          <span className="context-meter-label">{Math.round(tab.metadata.contextUsagePercentage)}%</span>
          {tab.metadata.contextUsagePercentage >= 50 && <button className="compact-btn" onClick={() => send({ action: 'prompt', tabId: activeTabId, text: '/compact' })} title="Compact context">⊘</button>}
          {tab.metadata.cumulativeUsage && (tab.metadata.cumulativeUsage.inputTokens > 0 || tab.metadata.cumulativeUsage.outputTokens > 0) && <span className="metering-display" title={`In: ${tab.metadata.cumulativeUsage.inputTokens.toLocaleString()} · Out: ${tab.metadata.cumulativeUsage.outputTokens.toLocaleString()}${tab.metadata.cumulativeUsage.cost ? ` · $${tab.metadata.cumulativeUsage.cost.toFixed(4)}` : ''}`}>{((tab.metadata.cumulativeUsage.inputTokens + tab.metadata.cumulativeUsage.outputTokens) / 1000).toFixed(1)}k{tab.metadata.cumulativeUsage.cost ? ` · $${tab.metadata.cumulativeUsage.cost.toFixed(3)}` : ''}</span>}
        </div>}
        <div className="input-wrapper">
          {cmdFilter && <div className="cmd-popup">
            {cmdFilter.map((c, i) => (
              <div key={c.name || c.value || i} className={`cmd-item ${i === cmdIdx ? 'active' : ''}`} onClick={() => {
                if (c.value) { const parts = input.split(' '); setInput(parts[0] + ' ' + c.value + ' '); }
                else { setInput(c.name + ' '); }
                setCmdFilter(null); setCmdHint(null);
              }}>
                <span className="cmd-name">{c.name}</span>
                <span className="cmd-desc">{c.description}</span>
              </div>
            ))}
          </div>}
          {cmdHint && !cmdFilter && <div className="cmd-hint">{cmdHint}</div>}
          {(pendingImages.length > 0 || pendingFiles.length > 0) && <div className="image-preview">
            {pendingImages.map((img, i) => <div key={`img-${i}`} className="image-thumb"><img src={`data:${img.mimeType};base64,${img.data}`} alt={img.name} /><button onClick={() => setPendingImages(p => p.filter((_, j) => j !== i))}>✕</button></div>)}
            {pendingFiles.map((f, i) => <div key={`file-${i}`} className="file-chip"><span className="file-chip-name">{f.name}</span><button onClick={() => setPendingFiles(p => p.filter((_, j) => j !== i))}>✕</button></div>)}
          </div>}
          <textarea ref={textareaRef} value={input} onChange={e => handleInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Message Kiro... (/ for commands, ⌘T new tab, ⌘B sidebar)" rows={1} style={{ '--tab-color': `var(--ghost-${tabs.indexOf(tab) % 6})` } as React.CSSProperties} onPaste={e => { const items = e.clipboardData.items; for (const item of items) { if (item.type.startsWith('image/')) { const file = item.getAsFile(); if (file) { const reader = new FileReader(); reader.onload = () => { const b64 = (reader.result as string).split(',')[1]; setPendingImages(p => [...p, { data: b64, mimeType: file.type, name: file.name }]); }; reader.readAsDataURL(file); } } } }} />
          <div className="input-buttons">
            <label className="img-upload-btn" title="Attach image or file"><input type="file" accept="image/*,.txt,.md,.json,.ts,.tsx,.js,.jsx,.py,.rs,.go,.yaml,.yml,.toml,.csv,.xml,.html,.css,.sh,.sql,.log,.env,.cfg" multiple hidden onChange={e => { const files = e.target.files; if (!files) return; for (const file of files) { if (file.type.startsWith('image/')) { const reader = new FileReader(); reader.onload = () => { const b64 = (reader.result as string).split(',')[1]; setPendingImages(p => [...p, { data: b64, mimeType: file.type, name: file.name }]); }; reader.readAsDataURL(file); } else { const reader = new FileReader(); reader.onload = () => { setPendingFiles(p => [...p, { name: file.name, content: reader.result as string }]); }; reader.readAsText(file); } } e.target.value = ''; }} /><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></label>

            {tab.isRunning ? <button id="cancel-btn" onClick={() => send({ action: 'cancel', tabId: activeTabId })}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg></button>
              : <button id="send-btn" disabled={(!input.trim() && !pendingImages.length && !pendingFiles.length) || !modes} onClick={handleSend}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>}
          </div>
        </div>
      </div>
    </>}
    </div>
  </></ErrorBoundary></AppContext.Provider>;
}

const MemoMarkdown = ({ text }: { text: string }) => {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(text) as string), [text]);
  return <div className="content" dangerouslySetInnerHTML={{ __html: html }} />;
};
