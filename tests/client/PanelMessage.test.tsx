import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PanelMessage } from '../../src/client/PanelMessage';

const baseModes = { currentModeId: 'kiro_default', availableModes: [{ id: 'kiro_default', name: 'Default Agent' }] };
const baseMetadata = { contextUsagePercentage: 42, turnDurationMs: 3500 };
const baseCommands = [{ name: '/help', description: 'Show help' }, { name: '/mcp', description: 'MCP info' }];
const baseServers = [{ name: 'browsermcp', status: 'running', toolCount: 5 }];
const baseTools = [
  { name: 'read', description: 'Read', source: 'built-in' },
  { name: 'click', description: 'Click', source: 'mcp:browsermcp' },
];

describe('PanelMessage', () => {
  it('renders context panel with usage bar', () => {
    render(<PanelMessage type="context" metadata={baseMetadata} modes={baseModes} commands={[]} mcpServers={[]} allTools={[]} />);
    expect(screen.getByText('Context Window')).toBeTruthy();
    expect(screen.getByText('42% used')).toBeTruthy();
    expect(screen.getByText('Default Agent')).toBeTruthy();
    expect(screen.getByText('3.5s')).toBeTruthy();
  });

  it('renders mcp panel with servers', () => {
    render(<PanelMessage type="mcp" metadata={baseMetadata} modes={baseModes} commands={[]} mcpServers={baseServers} allTools={baseTools} />);
    expect(screen.getByText('MCP Servers (1)')).toBeTruthy();
    expect(screen.getByText('browsermcp')).toBeTruthy();
    expect(screen.getByText('click')).toBeTruthy();
  });

  it('renders mcp panel empty state', () => {
    render(<PanelMessage type="mcp" metadata={baseMetadata} modes={baseModes} commands={[]} mcpServers={[]} allTools={[]} />);
    expect(screen.getByText('No servers configured')).toBeTruthy();
  });

  it('renders tools panel grouped', () => {
    render(<PanelMessage type="tools" metadata={baseMetadata} modes={baseModes} commands={[]} mcpServers={[]} allTools={baseTools} />);
    expect(screen.getByText('Available Tools (2)')).toBeTruthy();
    expect(screen.getByText('Built-in (1)')).toBeTruthy();
    expect(screen.getByText('MCP (1)')).toBeTruthy();
  });

  it('renders help panel with commands', () => {
    render(<PanelMessage type="help" metadata={baseMetadata} modes={baseModes} commands={baseCommands} mcpServers={[]} allTools={[]} />);
    expect(screen.getByText('Available Commands')).toBeTruthy();
    expect(screen.getByText('/help')).toBeTruthy();
    expect(screen.getByText('Show help')).toBeTruthy();
  });

  it('renders hooks panel', () => {
    render(<PanelMessage type="hooks" metadata={baseMetadata} modes={baseModes} commands={[]} mcpServers={[]} allTools={[]} />);
    expect(screen.getByText('Hooks')).toBeTruthy();
    expect(screen.getByText('No hooks configured')).toBeTruthy();
  });

  it('renders stats panel', () => {
    render(<PanelMessage type="stats" metadata={baseMetadata} modes={baseModes} commands={[]} mcpServers={[]} allTools={[]} />);
    expect(screen.getByText('Session Stats')).toBeTruthy();
    expect(screen.getByText('42%')).toBeTruthy();
  });

  it('renders usage panel', () => {
    render(<PanelMessage type="usage" metadata={baseMetadata} modes={baseModes} commands={[]} mcpServers={[]} allTools={[]} />);
    expect(screen.getByText('Usage')).toBeTruthy();
  });

  it('renders fallback for unknown type', () => {
    render(<PanelMessage type="unknown" metadata={baseMetadata} modes={baseModes} commands={[]} mcpServers={[]} allTools={[]} />);
    expect(screen.getByText('No data available')).toBeTruthy();
  });
});
