import { useState } from 'react';
import type { Subagent, SubagentActivity } from './types';

interface SubagentPanelProps {
  subagents: Subagent[];
  activity?: Record<string, SubagentActivity>;
}

const STATUS_ICON: Record<string, string> = { pending: '⏳', running: '⟳', completed: '✓', failed: '✗' };

export function SubagentPanel({ subagents, activity }: SubagentPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  if (!subagents.length) return null;
  const allDone = subagents.every(s => s.status === 'completed' || s.status === 'failed');
  return (
    <div className={`subagent-panel ${allDone ? 'done' : ''}`}>
      <div className="subagent-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="subagent-title">{collapsed ? '▸' : '▾'} Pipeline ({subagents.filter(s => s.status === 'completed').length}/{subagents.length})</span>
      </div>
      {!collapsed && <div className="subagent-stages">
        {subagents.map(s => (
          <div key={s.sessionId || s.name} className={`subagent-stage ${s.status}`}>
            <span className="subagent-icon">{STATUS_ICON[s.status] || '?'}</span>
            <span className="subagent-name">{s.name}</span>
            {s.role && <span className="subagent-role">{s.role}</span>}
            {s.loopIteration && s.loopIteration > 1 && <span className="subagent-loop">×{s.loopIteration}</span>}
            {s.status === 'running' && activity?.[s.sessionId] && <span className="subagent-activity">{activity[s.sessionId].event}</span>}
          </div>
        ))}
      </div>}
    </div>
  );
}
