import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PlanEntry } from '../../src/client/types';

// Test the plan rendering inline (it's part of App, but we can test the structure)
function PlanBlock({ plan }: { plan: PlanEntry[] }) {
  if (!plan.length) return null;
  return (
    <div className="plan-block">
      <div className="plan-header">Plan</div>
      {plan.map((entry, i) => (
        <div key={i} className={`plan-entry plan-${entry.status}`}>
          <span className="plan-icon">{entry.status === 'completed' ? '✓' : entry.status === 'in_progress' ? '▶' : '○'}</span>
          <span className="plan-content">{entry.content}</span>
          {entry.priority === 'high' && <span className="plan-priority">!</span>}
        </div>
      ))}
    </div>
  );
}

describe('Agent Plan', () => {
  it('renders nothing for empty plan', () => {
    const { container } = render(<PlanBlock plan={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders plan entries with correct icons', () => {
    const plan: PlanEntry[] = [
      { content: 'Analyze code', priority: 'high', status: 'completed' },
      { content: 'Write tests', priority: 'medium', status: 'in_progress' },
      { content: 'Deploy', priority: 'low', status: 'pending' },
    ];
    render(<PlanBlock plan={plan} />);
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Analyze code')).toBeInTheDocument();
    expect(screen.getByText('Write tests')).toBeInTheDocument();
    expect(screen.getByText('Deploy')).toBeInTheDocument();
  });

  it('shows checkmark for completed entries', () => {
    const plan: PlanEntry[] = [{ content: 'Done task', priority: 'medium', status: 'completed' }];
    render(<PlanBlock plan={plan} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows play icon for in_progress entries', () => {
    const plan: PlanEntry[] = [{ content: 'Working', priority: 'medium', status: 'in_progress' }];
    render(<PlanBlock plan={plan} />);
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('shows circle for pending entries', () => {
    const plan: PlanEntry[] = [{ content: 'Waiting', priority: 'medium', status: 'pending' }];
    render(<PlanBlock plan={plan} />);
    expect(screen.getByText('○')).toBeInTheDocument();
  });

  it('shows priority indicator for high priority', () => {
    const plan: PlanEntry[] = [{ content: 'Urgent', priority: 'high', status: 'pending' }];
    render(<PlanBlock plan={plan} />);
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('does not show priority indicator for medium/low', () => {
    const plan: PlanEntry[] = [
      { content: 'Normal', priority: 'medium', status: 'pending' },
      { content: 'Low', priority: 'low', status: 'pending' },
    ];
    render(<PlanBlock plan={plan} />);
    expect(screen.queryByText('!')).not.toBeInTheDocument();
  });
});
