import { useState } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import type { ToolEntry, Msg, TabState, EditorType } from './types';
import { EDITOR_SCHEMES } from './types';

function fileLink(path: string, editor: EditorType) {
  const scheme = EDITOR_SCHEMES[editor] ?? EDITOR_SCHEMES.vscode;
  if (scheme) return <a className="file-link" href={`${scheme}${path}`} title={`Open in ${editor}`} onClick={e => e.stopPropagation()}>{path}</a>;
  return <span>{path}</span>;
}

export function ToolBlock({ tool, onToggle, editor }: { tool: ToolEntry; onToggle: () => void; editor: EditorType }) {
  const hasContent = !!(tool.content && tool.content.length > 0);
  const hasRaw = !!(tool.rawInput || tool.rawOutput);
  const hasStream = !!tool.streamOutput;
  const expandable = hasContent || hasRaw || hasStream;
  const titleWithLink = () => {
    const t = tool.title || tool.kind || 'tool';
    const match = t.match(/^(.+?)(\s)(\/\S+|[^\s/]+\/\S+)$/);
    if (match) return <>{match[1]}{match[2]}{fileLink(match[3], editor)}</>;
    return <>{t}</>;
  };
  return (
    <div className={`tool-block ${tool.expanded ? 'expanded' : ''}`}>
      <div className="tool-header" onClick={expandable ? onToggle : undefined}>
        {expandable && <span className={`arrow ${tool.expanded ? 'open' : ''}`}>▶</span>}
        <span className="tool-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>{titleWithLink()}</span>
        <span className={`tool-status ${tool.status}`}>{tool.status}</span>
      </div>
      {expandable && <div className="tool-body">
        {hasStream && <pre className="tool-stream">{tool.streamOutput}</pre>}
        {hasContent && tool.content!.map((c, i) => c.type === 'diff' ? (
          <div key={i} className="diff">
            <div className="diff-path">{fileLink(c.path || '', editor)}</div>
            <ReactDiffViewer oldValue={c.oldText || ''} newValue={c.newText || ''} splitView={true} useDarkTheme={document.documentElement.getAttribute('data-theme') === 'dark'} hideLineNumbers={false} compareMethod={DiffMethod.WORDS} styles={{ contentText: { fontSize: '12px', lineHeight: '1.5', fontFamily: "'JetBrains Mono', 'SF Mono', monospace" } }} />
          </div>
        ) : <pre key={i}>{JSON.stringify(c, null, 2)}</pre>)}
        {hasRaw && <div className="tool-raw">
          {!!tool.rawInput && <details><summary>Input</summary><pre>{String(typeof tool.rawInput === 'string' ? tool.rawInput : JSON.stringify(tool.rawInput, null, 2))}</pre></details>}
          {!!tool.rawOutput && <details><summary>Output</summary><pre>{String(typeof tool.rawOutput === 'string' ? tool.rawOutput : JSON.stringify(tool.rawOutput, null, 2))}</pre></details>}
        </div>}
      </div>}
    </div>
  );
}

export function ToolGroup({ tools, startIdx, tabId, updateTab, editor }: {
  tools: Msg[];
  startIdx: number;
  tabId: string;
  updateTab: (id: string, fn: (t: TabState) => TabState) => void;
  editor: EditorType;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const completed = tools.filter(t => t.tool?.status === 'completed').length;
  const total = tools.length;
  const allDone = completed === total;
  return (
    <div className={`tool-group ${collapsed ? 'collapsed' : ''}`}>
      <div className="tool-group-header" onClick={() => setCollapsed(!collapsed)}>
        <span className={`arrow ${collapsed ? '' : 'open'}`}>▶</span>
        <span className="tool-group-title">{total} tool call{total > 1 ? 's' : ''}</span>
        <span className={`tool-status ${allDone ? 'completed' : 'pending'}`}>{completed}/{total}</span>
      </div>
      {!collapsed && <div className="tool-group-body">
        {tools.map((t, j) => {
          const idx = startIdx + j;
          return <ToolBlock key={idx} tool={t.tool || { toolCallId: String(idx), title: 'tool', status: 'complete', expanded: false }} onToggle={() => updateTab(tabId, tb => ({ ...tb, messages: tb.messages.map((msg, k) => k === idx && msg.tool ? { ...msg, tool: { ...msg.tool, expanded: !msg.tool.expanded } } : msg) }))} editor={editor} />;
        })}
      </div>}
    </div>
  );
}
