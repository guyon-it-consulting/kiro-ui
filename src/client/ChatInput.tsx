import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { SubagentPanel } from './SubagentPanel';
import type { TabState, SlashCommand, CommandOption, PendingImage, PendingFile } from './types';

export interface ChatInputProps {
  tab: TabState;
  activeTabId: string;
  tabIndex: number;
  commands: SlashCommand[];
  modes: TabState['modes'];
  isRunning: boolean;
  onSend: (text: string, images?: PendingImage[], files?: PendingFile[]) => void;
  onSendText: (text: string) => void;
  onCancel: () => void;
  onGoalCancel: () => void;
  onGoalDismiss: () => void;
  onQueueUpdate: (fn: (t: TabState) => TabState) => void;
  onCommandOptions: (command: string, input: string) => void;
  onSetCommandFilter: (options: CommandOption[] | null, hint?: string | null) => void;
  sendWs: (data: Record<string, unknown>) => void;
}

export const ChatInput = memo(function ChatInput({
  tab, activeTabId, tabIndex, commands, modes, isRunning,
  onSend, onSendText, onCancel, onGoalCancel, onGoalDismiss,
  onQueueUpdate, onCommandOptions,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [cmdFilter, setCmdFilter] = useState<CommandOption[] | null>(null);
  const [cmdIdx, setCmdIdx] = useState(0);
  const [cmdHint, setCmdHint] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cmdDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-focus textarea when tab changes or running state changes
  useEffect(() => {
    if (!isRunning) textareaRef.current?.focus();
  }, [activeTabId, isRunning]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  }, [input]);

  const handleInput = useCallback((val: string) => {
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
        cmdDebounceRef.current = setTimeout(() => {
          onCommandOptions(command, partial);
        }, 150);
      }
    } else { setCmdFilter(null); setCmdHint(null); }
  }, [commands, onCommandOptions]);

  // Allow parent to push command options (from WS response)
  const setCmdFilterExternal = useCallback((options: CommandOption[] | null | undefined, hint?: string | null) => {
    if (options !== undefined) setCmdFilter(options);
    if (hint !== undefined) setCmdHint(hint);
    if (options) setCmdIdx(0);
  }, []);

  // Expose the external setter via a ref the parent can grab
  const cmdFilterSetterRef = useRef(setCmdFilterExternal);
  cmdFilterSetterRef.current = setCmdFilterExternal;

  // Attach to window for parent access (simpler than context for this one callback)
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__chatInputSetCmdFilter = cmdFilterSetterRef.current;
    return () => { delete (window as unknown as Record<string, unknown>).__chatInputSetCmdFilter; };
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text && !pendingImages.length && !pendingFiles.length) return;
    setCmdFilter(null); setCmdHint(null);
    onSend(text, pendingImages.length ? pendingImages : undefined, pendingFiles.length ? pendingFiles : undefined);
    setInput(''); setPendingImages([]); setPendingFiles([]);
  }, [input, pendingImages, pendingFiles, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
    if (e.key === 'Escape' && isRunning) onCancel();
  }, [cmdFilter, cmdIdx, input, handleSend, isRunning, onCancel]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const b64 = (reader.result as string).split(',')[1];
            setPendingImages(p => [...p, { data: b64, mimeType: file.type, name: file.name }]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = (reader.result as string).split(',')[1];
          setPendingImages(p => [...p, { data: b64, mimeType: file.type, name: file.name }]);
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setPendingFiles(p => [...p, { name: file.name, content: reader.result as string }]);
        };
        reader.readAsText(file);
      }
    }
    e.target.value = '';
  }, []);

  return (
    <div className="input-area">
      {tab.subagents && tab.subagents.length > 0 && <SubagentPanel subagents={tab.subagents} activity={tab.subagentActivity} />}
      {tab.suggestions && tab.suggestions.length > 0 && !isRunning && <div className="suggestions">
        {tab.suggestions.map((s, i) => (
          <button key={i} className="suggestion-btn" onClick={() => onSendText(s)}>{s}</button>
        ))}
      </div>}
      {tab.goal && <div className={`goal-banner ${tab.goal.status}`}>
        <span className="goal-icon">{tab.goal.status === 'complete' ? '✓' : tab.goal.status === 'incomplete' ? '⚠' : '⟳'}</span>
        <span className="goal-label">{tab.goal.status === 'complete' ? 'Goal complete' : tab.goal.status === 'incomplete' ? `Goal incomplete (${tab.goal.currentIteration}/${tab.goal.maxIterations})` : `Iteration ${tab.goal.currentIteration}/${tab.goal.maxIterations}`}</span>
        <span className="goal-text">{tab.goal.text.slice(0, 50)}{tab.goal.text.length > 50 ? '…' : ''}</span>
        {tab.goal.status === 'active' && <button className="goal-cancel" onClick={onGoalCancel}>Cancel</button>}
        {tab.goal.status !== 'active' && <button className="goal-cancel" onClick={onGoalDismiss}>Dismiss</button>}
      </div>}
      {tab.queue.length > 0 && <div className="queue-list">
        {tab.queue.map((q, i) => (
          <div key={i} className="queue-item">
            <span className="queue-num">{i + 1}</span>
            <button className="queue-move" disabled={i === 0} onClick={() => onQueueUpdate(t => { const q2 = [...t.queue]; [q2[i-1], q2[i]] = [q2[i], q2[i-1]]; return { ...t, queue: q2 }; })} title="Move up">↑</button>
            <button className="queue-move" disabled={i === tab.queue.length - 1} onClick={() => onQueueUpdate(t => { const q2 = [...t.queue]; [q2[i], q2[i+1]] = [q2[i+1], q2[i]]; return { ...t, queue: q2 }; })} title="Move down">↓</button>
            <input className="queue-edit" value={q} onChange={e => onQueueUpdate(t => ({ ...t, queue: t.queue.map((x, j) => j === i ? e.target.value : x) }))} />
            {i < tab.queue.length - 1 && <button className="queue-merge" onClick={() => onQueueUpdate(t => ({ ...t, queue: t.queue.filter((_, j) => j !== i + 1).map((x, j) => j === i ? x + '\n\n' + t.queue[i + 1] : x) }))} title="Merge with next">⊕</button>}
            <button className="queue-remove" onClick={() => onQueueUpdate(t => ({ ...t, queue: t.queue.filter((_, j) => j !== i) }))} title="Remove"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
        ))}
        <div className="queue-actions">
          <span className="queue-count">{tab.queue.length} queued</span>
          <button className="queue-clear" onClick={() => onQueueUpdate(t => ({ ...t, queue: [] }))}>Clear all</button>
          <button className="queue-send-now" onClick={onCancel}>Send Now ⚡</button>
        </div>
      </div>}
      {tab.metadata.contextUsagePercentage > 0 && <div className="context-meter">
        <svg className="context-pie" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--surface-2)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" strokeDasharray={`${tab.metadata.contextUsagePercentage} ${100 - tab.metadata.contextUsagePercentage}`} strokeDashoffset="25" strokeLinecap="round" stroke={tab.metadata.contextUsagePercentage >= 90 ? 'var(--red)' : tab.metadata.contextUsagePercentage >= 70 ? 'var(--yellow)' : 'var(--accent)'} />
        </svg>
        <span className="context-meter-label">{Math.round(tab.metadata.contextUsagePercentage)}%</span>
        {tab.metadata.contextUsagePercentage >= 50 && <button className="compact-btn" onClick={() => onSendText('/compact')} title="Compact context">⊘</button>}
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
        <textarea ref={textareaRef} value={input} onChange={e => handleInput(e.target.value)} onKeyDown={handleKeyDown} onPaste={handlePaste} placeholder="Message Kiro... (/ for commands, ⌘T new tab, ⌘B sidebar)" rows={1} style={{ '--tab-color': `var(--ghost-${tabIndex % 6})` } as React.CSSProperties} />
        <div className="input-buttons">
          <label className="img-upload-btn" title="Attach image or file"><input type="file" accept="image/*,.txt,.md,.json,.ts,.tsx,.js,.jsx,.py,.rs,.go,.yaml,.yml,.toml,.csv,.xml,.html,.css,.sh,.sql,.log,.env,.cfg" multiple hidden onChange={handleFileUpload} /><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></label>

          {isRunning ? <button id="cancel-btn" onClick={onCancel}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg></button>
            : <button id="send-btn" disabled={(!input.trim() && !pendingImages.length && !pendingFiles.length) || !modes} onClick={handleSend}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>}
        </div>
      </div>
    </div>
  );
});
