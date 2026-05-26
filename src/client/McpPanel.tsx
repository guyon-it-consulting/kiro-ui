import { useState } from 'react';
import type { McpServer, McpTool } from './types';

export function McpPanel({ servers, tools, oauthPending }: { servers: McpServer[]; tools: McpTool[]; oauthPending?: Record<string, string> }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const getTools = (name: string) => tools.filter(t => t.source === `mcp:${name}`);
  return (
    <div className="mcp-float">
      <div className="mcp-title">MCP Servers</div>
      {servers.map(s => (
        <div key={s.name}>
          <div className={`mcp-item mcp-${s.status}`} onClick={() => setExpanded(expanded === s.name ? null : s.name)}>
            <span className="mcp-dot" /><span className="mcp-name">{s.name}</span>{s.toolCount ? <span className="mcp-tools-count">{s.toolCount}</span> : null}
          </div>
          {oauthPending?.[s.name] && <a className="mcp-oauth" href={oauthPending[s.name]} target="_blank" rel="noopener noreferrer">🔑 Authenticate to connect</a>}
          {expanded === s.name && <div className="mcp-tools-list">
            {(() => { const t = getTools(s.name); return t.length > 0 ? t.map((tool, i) => <div key={i} className="mcp-tool" title={tool.description}>{tool.name}</div>) : <div className="mcp-tool mcp-tool-hint">{s.toolCount || 0} tools available</div>; })()}
          </div>}
        </div>
      ))}
    </div>
  );
}
