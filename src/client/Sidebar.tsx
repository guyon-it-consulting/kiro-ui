import { useState } from 'react';
import { useAppContext } from './AppContext';
import { apiFetch } from './apiFetch';

export function Sidebar({ open, onClose, onOpen }: { open: boolean; onClose: () => void; onOpen: () => void }) {
  const { tabs, activeTabId, tab, sessions, updateTab, send, loadSession, addTab } = useAppContext();
  const [filter, setFilter] = useState('');

  return <>
    {!open && <button className="sidebar-open-btn" onClick={onOpen}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg></button>}
    <aside className={`sidebar ${open ? '' : 'collapsed'}`}>
      <h2>
        <button className="sidebar-toggle" onClick={onClose}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        Sessions
        <button onClick={() => addTab()}>+ New</button>
      </h2>
      <div className="sidebar-workspace" onClick={async () => {
        let dir: string | null = null;
        try { const res = await apiFetch('/api/pick-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startPath: tab.cwd || '' }) }); if (res.ok) { const d = await res.json(); if (d.path) dir = d.path; } } catch { /* fall through */ }
        if (!dir) dir = prompt('Workspace directory:', tab.cwd || '');
        if (dir !== null) { updateTab(activeTabId, t => ({ ...t, cwd: dir || undefined, isConnecting: true, messages: [] })); send({ action: 'new_chat', tabId: activeTabId, cwd: dir || undefined }); }
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        <span>{tab.cwd || '~/.kiro-ui/workspace'}</span>
      </div>
      <div className="sessions">
        <input className="session-search" placeholder="Filter sessions..." value={filter} onChange={e => setFilter(e.target.value)} />
        {sessions.filter(s => s.title && (!filter || s.title.toLowerCase().includes(filter.toLowerCase()))).slice(0, 50).map(s => {
          const isOpen = tabs.some(t => t.sessionId === s.id);
          return (
            <div key={s.id} className={`session-item ${isOpen ? 'open' : ''}`} onClick={() => loadSession(s.id, s.title)}>
              {isOpen && <span className="session-dot" />}
              <span className="session-title">{s.title}</span>
            </div>
          );
        })}
      </div>
    </aside>
  </>;
}
