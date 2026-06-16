import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubagentPanel } from '../../src/client/SubagentPanel';
import type { Subagent, SubagentActivity } from '../../src/client/types';

describe('SubagentPanel', () => {
  const stages: Subagent[] = [
    { sessionId: 's1', name: 'research', role: 'kiro_default', status: 'completed' },
    { sessionId: 's2', name: 'implement', status: 'running' },
    { sessionId: 's3', name: 'review', status: 'pending' },
  ];

  it('renders nothing when subagents is empty', () => {
    const { container } = render(<SubagentPanel subagents={[]} />);
    expect(container.querySelector('.subagent-panel')).toBeNull();
  });

  it('renders all stages with correct status icons', () => {
    render(<SubagentPanel subagents={stages} />);
    expect(screen.getByText('✓')).toBeTruthy();
    expect(screen.getByText('⟳')).toBeTruthy();
    expect(screen.getByText('⏳')).toBeTruthy();
  });

  it('shows stage names', () => {
    render(<SubagentPanel subagents={stages} />);
    expect(screen.getByText('research')).toBeTruthy();
    expect(screen.getByText('implement')).toBeTruthy();
    expect(screen.getByText('review')).toBeTruthy();
  });

  it('shows role when provided', () => {
    render(<SubagentPanel subagents={stages} />);
    expect(screen.getByText('kiro_default')).toBeTruthy();
  });

  it('shows progress count in header', () => {
    render(<SubagentPanel subagents={stages} />);
    expect(screen.getByText(/Pipeline \(1\/3\)/)).toBeTruthy();
  });

  it('shows activity for running stages', () => {
    const activity: Record<string, SubagentActivity> = {
      s2: { event: 'reading file.ts', timestamp: Date.now() },
    };
    render(<SubagentPanel subagents={stages} activity={activity} />);
    expect(screen.getByText('reading file.ts')).toBeTruthy();
  });

  it('does not show activity for non-running stages', () => {
    const activity: Record<string, SubagentActivity> = {
      s1: { event: 'old activity', timestamp: Date.now() },
    };
    render(<SubagentPanel subagents={stages} activity={activity} />);
    expect(screen.queryByText('old activity')).toBeNull();
  });

  it('collapses on header click', () => {
    render(<SubagentPanel subagents={stages} />);
    expect(screen.getByText('research')).toBeTruthy();
    fireEvent.click(screen.getByText(/Pipeline/));
    expect(screen.queryByText('research')).toBeNull();
  });

  it('expands again on second click', () => {
    render(<SubagentPanel subagents={stages} />);
    fireEvent.click(screen.getByText(/Pipeline/));
    fireEvent.click(screen.getByText(/Pipeline/));
    expect(screen.getByText('research')).toBeTruthy();
  });

  it('shows loop iteration badge', () => {
    const looped: Subagent[] = [{ sessionId: 's1', name: 'implement', status: 'running', loopIteration: 3 }];
    render(<SubagentPanel subagents={looped} />);
    expect(screen.getByText('×3')).toBeTruthy();
  });

  it('applies done class when all stages complete', () => {
    const done: Subagent[] = [
      { sessionId: 's1', name: 'a', status: 'completed' },
      { sessionId: 's2', name: 'b', status: 'completed' },
    ];
    const { container } = render(<SubagentPanel subagents={done} />);
    expect(container.querySelector('.subagent-panel.done')).toBeTruthy();
  });

  it('applies done class when stages are mix of completed and failed', () => {
    const done: Subagent[] = [
      { sessionId: 's1', name: 'a', status: 'completed' },
      { sessionId: 's2', name: 'b', status: 'failed' },
    ];
    const { container } = render(<SubagentPanel subagents={done} />);
    expect(container.querySelector('.subagent-panel.done')).toBeTruthy();
  });

  it('shows failed icon for failed stages', () => {
    const failed: Subagent[] = [{ sessionId: 's1', name: 'broken', status: 'failed' }];
    render(<SubagentPanel subagents={failed} />);
    expect(screen.getByText('✗')).toBeTruthy();
  });
});
