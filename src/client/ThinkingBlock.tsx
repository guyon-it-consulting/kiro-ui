import { useState, useEffect } from 'react';
import type { ThinkingState } from './types';

export function ThinkingBlock({ thinking, onToggle }: { thinking: ThinkingState; onToggle: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.round((Date.now() - thinking.startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [thinking.startTime]);
  return (
    <div className={`thinking-block ${thinking.collapsed ? 'collapsed' : ''}`}>
      <div className="header" onClick={onToggle}><span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{display:'inline',verticalAlign:'middle',marginRight:4}}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>Thinking</span><span className="timer">{elapsed}s</span></div>
      <div className="body">{thinking.text}</div>
    </div>
  );
}
