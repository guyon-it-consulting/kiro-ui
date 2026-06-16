import React from 'react';
import { useAppContext } from './AppContext';

export function TabBar() {
  const { tabs, activeTabId, dispatch, addTab, closeTab } = useAppContext();

  return (
    <div className="tab-bar">
      {tabs.map((t, idx) => (
        <div key={t.id} className={`tab ${t.id === activeTabId ? 'active' : ''} ${t.isRunning ? 'running' : ''}`} onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tabId: t.id })}>
          <span className={`tab-ghost ${t.isRunning ? 'floating' : t.id === activeTabId ? 'active-idle' : 'sleeping'}`} style={{ '--ghost-color': `var(--ghost-${idx % 6})` } as React.CSSProperties}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M7.5 16.5c-1.8 4-0.3 5.2 2.5 3.3 0.8 2.6 3.7 1.6 4.8 0 2.5-4.5 1.5-9.1 1.3-10 -1.8-6.4-10.7-6.4-12.2 0-0.4 1.1-0.4 2.4-0.6 3.7-0.1 0.7-0.2 1.1-0.4 1.8-0.2 0.4-0.4 0.8-0.7 1.4-0.5 0.9-0.3 2.8 2.3 1.8l0.2-0.1z" fill="currentColor" stroke="var(--ghost-color)" strokeWidth="1.5"/><ellipse cx="12.5" cy="9.5" rx="0.9" ry="1.3" fill="var(--surface)"/><ellipse cx="15.5" cy="9.5" rx="0.9" ry="1.3" fill="var(--surface)"/></svg>
          </span>
          <span className="tab-name">{t.name}</span>
          {tabs.length > 1 && <button className="tab-close" onClick={e => { e.stopPropagation(); closeTab(t.id); }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>}
        </div>
      ))}
      <button className="tab-add" onClick={addTab} title="New tab (⌘T)">+</button>
    </div>
  );
}
