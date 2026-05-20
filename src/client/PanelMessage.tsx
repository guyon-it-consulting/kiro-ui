import type { TabMetadata, ModesState, SlashCommand, McpServer, McpTool } from './types';

interface PanelMessageProps {
  type: string;
  metadata: TabMetadata;
  modes: ModesState | null;
  commands: SlashCommand[];
  mcpServers: McpServer[];
  allTools: McpTool[];
}

export function PanelMessage({ type, metadata, modes, commands, mcpServers, allTools }: PanelMessageProps) {
  const pct = Math.round(metadata.contextUsagePercentage);
  const agentName = modes?.availableModes?.find(m => m.id === modes.currentModeId)?.name || modes?.currentModeId || '—';

  if (type === 'context') return (
    <div className="panel-card">
      <div className="panel-title">Context Window</div>
      <div className="context-bar-container">
        <div className="context-bar" style={{ width: `${Math.max(pct, 1)}%` }} />
        <span className="context-bar-label">{pct}% used</span>
      </div>
      <div className="panel-rows">
        <div className="panel-row"><span>Active agent</span><span>{agentName}</span></div>
        {metadata.turnDurationMs != null && <div className="panel-row"><span>Last turn</span><span>{(metadata.turnDurationMs / 1000).toFixed(1)}s</span></div>}
      </div>
      <div className="panel-tips">
        <code>/compact</code> Summarize history · <code>/clear</code> Erase history
      </div>
    </div>
  );

  if (type === 'mcp') return (
    <div className="panel-card">
      <div className="panel-title">MCP Servers ({mcpServers.length})</div>
      {!mcpServers.length ? <div className="panel-empty">No servers configured</div> :
        mcpServers.map(s => (
          <div key={s.name} className="panel-section">
            <div className="panel-section-header">{s.name} <span className={`panel-badge ${s.status}`}>{s.status}</span> <span className="panel-dim">{s.toolCount} tools</span></div>
            <div className="panel-list">{allTools.filter(t => t.source === `mcp:${s.name}`).map(t => <code key={t.name}>{t.name}</code>)}</div>
          </div>
        ))}
    </div>
  );

  if (type === 'tools') {
    const builtIn = allTools.filter(t => t.source === 'built-in');
    const mcp = allTools.filter(t => t.source?.startsWith('mcp:'));
    return (
      <div className="panel-card">
        <div className="panel-title">Available Tools ({allTools.length})</div>
        {builtIn.length > 0 && <div className="panel-section">
          <div className="panel-section-header">Built-in ({builtIn.length})</div>
          <div className="panel-list">{builtIn.map(t => <code key={t.name}>{t.name}</code>)}</div>
        </div>}
        {mcp.length > 0 && <div className="panel-section">
          <div className="panel-section-header">MCP ({mcp.length})</div>
          <div className="panel-list">{mcp.map(t => <code key={t.name}>{t.name}</code>)}</div>
        </div>}
      </div>
    );
  }

  if (type === 'help') return (
    <div className="panel-card">
      <div className="panel-title">Available Commands</div>
      <div className="panel-command-list">
        {commands.map(c => (
          <div key={c.name} className="panel-command">
            <code>{c.name}</code>
            <span>{c.description}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (type === 'hooks') return (
    <div className="panel-card">
      <div className="panel-title">Hooks</div>
      <div className="panel-empty">No hooks configured</div>
      <div className="panel-tips">Hooks run automatically on events. Configure in <code>.kiro/hooks/</code></div>
    </div>
  );

  if (type === 'stats') return (
    <div className="panel-card">
      <div className="panel-title">Session Stats</div>
      <div className="panel-rows">
        <div className="panel-row"><span>Context used</span><span>{pct}%</span></div>
        <div className="panel-row"><span>Active agent</span><span>{agentName}</span></div>
        {metadata.turnDurationMs != null && <div className="panel-row"><span>Last turn duration</span><span>{(metadata.turnDurationMs / 1000).toFixed(1)}s</span></div>}
      </div>
    </div>
  );

  if (type === 'usage') return (
    <div className="panel-card">
      <div className="panel-title">Usage</div>
      <div className="panel-rows">
        <div className="panel-row"><span>Plan</span><span>Managed by admin</span></div>
      </div>
    </div>
  );

  return <div className="panel-card"><div className="panel-title">{type}</div><div className="panel-empty">No data available</div></div>;
}
