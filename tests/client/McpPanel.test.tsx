import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { McpPanel } from '../../src/client/components';

const servers = [
  { name: 'browsermcp', status: 'running', toolCount: 3 },
  { name: 'dbserver', status: 'failed', toolCount: 0 },
];
const tools = [
  { name: 'browser_click', source: 'mcp:browsermcp', description: 'Click an element' },
  { name: 'browser_nav', source: 'mcp:browsermcp', description: 'Navigate to URL' },
  { name: 'browser_type', source: 'mcp:browsermcp', description: 'Type text' },
];

describe('McpPanel', () => {
  it('renders server names', () => {
    render(<McpPanel servers={servers} tools={tools} />);
    expect(screen.getByText('browsermcp')).toBeInTheDocument();
    expect(screen.getByText('dbserver')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<McpPanel servers={servers} tools={tools} />);
    expect(screen.getByText('MCP Servers')).toBeInTheDocument();
  });

  it('shows tool count badge', () => {
    render(<McpPanel servers={servers} tools={tools} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('applies status class to server items', () => {
    const { container } = render(<McpPanel servers={servers} tools={tools} />);
    expect(container.querySelector('.mcp-running')).toBeInTheDocument();
    expect(container.querySelector('.mcp-failed')).toBeInTheDocument();
  });

  it('expands tool list on click', () => {
    render(<McpPanel servers={servers} tools={tools} />);
    expect(screen.queryByText('browser_click')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('browsermcp'));
    expect(screen.getByText('browser_click')).toBeInTheDocument();
    expect(screen.getByText('browser_nav')).toBeInTheDocument();
    expect(screen.getByText('browser_type')).toBeInTheDocument();
  });

  it('collapses tool list on second click', () => {
    render(<McpPanel servers={servers} tools={tools} />);
    fireEvent.click(screen.getByText('browsermcp'));
    expect(screen.getByText('browser_click')).toBeInTheDocument();
    fireEvent.click(screen.getByText('browsermcp'));
    expect(screen.queryByText('browser_click')).not.toBeInTheDocument();
  });

  it('shows fallback when no tools match', () => {
    render(<McpPanel servers={servers} tools={tools} />);
    fireEvent.click(screen.getByText('dbserver'));
    expect(screen.getByText('0 tools available')).toBeInTheDocument();
  });

  it('tool items have title attribute with description', () => {
    render(<McpPanel servers={servers} tools={tools} />);
    fireEvent.click(screen.getByText('browsermcp'));
    expect(screen.getByText('browser_click').getAttribute('title')).toBe('Click an element');
  });
});
