import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageActions } from '../../src/client/components';

// Mock clipboard
Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

describe('MessageActions', () => {
  it('renders copy button', () => {
    render(<MessageActions msg={{ role: 'assistant', text: 'hello' }} idx={0} onRetry={() => {}} />);
    expect(screen.getByTitle('Copy')).toBeInTheDocument();
  });

  it('renders retry button for user messages', () => {
    render(<MessageActions msg={{ role: 'user', text: 'hi' }} idx={0} onRetry={() => {}} />);
    expect(screen.getByTitle('Retry')).toBeInTheDocument();
  });

  it('does not render retry button for assistant messages', () => {
    render(<MessageActions msg={{ role: 'assistant', text: 'hi' }} idx={0} onRetry={() => {}} />);
    expect(screen.queryByTitle('Retry')).not.toBeInTheDocument();
  });

  it('copy button calls clipboard.writeText', () => {
    render(<MessageActions msg={{ role: 'assistant', text: 'copy me' }} idx={0} onRetry={() => {}} />);
    fireEvent.click(screen.getByTitle('Copy'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('copy me');
  });

  it('retry button calls onRetry with index', () => {
    const onRetry = vi.fn();
    render(<MessageActions msg={{ role: 'user', text: 'retry me' }} idx={3} onRetry={onRetry} />);
    fireEvent.click(screen.getByTitle('Retry'));
    expect(onRetry).toHaveBeenCalledWith(3);
  });
});
