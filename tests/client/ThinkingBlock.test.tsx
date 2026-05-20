import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThinkingBlock } from '../../src/client/components';

describe('ThinkingBlock', () => {
  const thinking = { text: 'Analyzing code...', startTime: Date.now() - 5000, collapsed: false };

  it('renders thinking text', () => {
    render(<ThinkingBlock thinking={thinking} onToggle={() => {}} />);
    expect(screen.getByText('Analyzing code...')).toBeInTheDocument();
  });

  it('renders "Thinking" label', () => {
    render(<ThinkingBlock thinking={thinking} onToggle={() => {}} />);
    expect(screen.getByText('Thinking')).toBeInTheDocument();
  });

  it('shows elapsed timer', () => {
    render(<ThinkingBlock thinking={thinking} onToggle={() => {}} />);
    expect(screen.getByText(/\ds/)).toBeInTheDocument();
  });

  it('calls onToggle when header clicked', () => {
    const onToggle = vi.fn();
    render(<ThinkingBlock thinking={thinking} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Thinking'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('applies collapsed class when collapsed', () => {
    const { container } = render(<ThinkingBlock thinking={{ ...thinking, collapsed: true }} onToggle={() => {}} />);
    expect(container.querySelector('.thinking-block.collapsed')).toBeInTheDocument();
  });

  it('does not apply collapsed class when expanded', () => {
    const { container } = render(<ThinkingBlock thinking={thinking} onToggle={() => {}} />);
    expect(container.querySelector('.thinking-block.collapsed')).not.toBeInTheDocument();
  });
});
