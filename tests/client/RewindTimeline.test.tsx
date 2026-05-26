import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RewindTimeline } from '../../src/client/RewindTimeline';
import type { Msg } from '../../src/client/types';

function makeMessages(...userTexts: string[]): Msg[] {
  const msgs: Msg[] = [];
  for (const text of userTexts) {
    msgs.push({ role: 'user', text });
    msgs.push({ role: 'assistant', text: `Response to: ${text}` });
  }
  return msgs;
}

describe('RewindTimeline', () => {
  it('returns null with 0 messages', () => {
    const { container } = render(<RewindTimeline messages={[]} onRewind={() => {}} onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null with 1 user message (turn 1 excluded)', () => {
    const msgs = makeMessages('First');
    const { container } = render(<RewindTimeline messages={msgs} onRewind={() => {}} onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null with 2 user messages (only turn 2 available, need at least 1)', () => {
    const msgs = makeMessages('First', 'Second');
    const { container } = render(<RewindTimeline messages={msgs} onRewind={() => {}} onClose={() => {}} />);
    // Turn 1 excluded, turn 2 is the only one → should show 1 rewindable turn
    expect(screen.getByText('Turn 2')).toBeInTheDocument();
  });

  it('shows turns 2 and 3 for a 3-turn conversation (turn 1 excluded)', () => {
    const msgs = makeMessages('First', 'Second', 'Third');
    render(<RewindTimeline messages={msgs} onRewind={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Turn 3')).toBeInTheDocument();
    expect(screen.getByText('Turn 2')).toBeInTheDocument();
    expect(screen.queryByText('Turn 1')).not.toBeInTheDocument();
  });

  it('shows turns newest-first', () => {
    const msgs = makeMessages('First', 'Second', 'Third');
    render(<RewindTimeline messages={msgs} onRewind={() => {}} onClose={() => {}} />);
    const turns = screen.getAllByText(/Turn \d/);
    expect(turns[0].textContent).toBe('Turn 3');
    expect(turns[1].textContent).toBe('Turn 2');
  });

  it('calls onRewind with the correct message index when clicking a turn', () => {
    const onRewind = vi.fn();
    const msgs = makeMessages('First', 'Second', 'Third');
    render(<RewindTimeline messages={msgs} onRewind={onRewind} onClose={() => {}} />);
    // Click Turn 2 (second item in newest-first list)
    fireEvent.click(screen.getByText('Turn 2').closest('.rewind-turn')!);
    // Turn 2 is the second user message, at index 2 in the messages array (user, assistant, user)
    expect(onRewind).toHaveBeenCalledWith(2);
  });

  it('calls onRewind with correct index for Turn 3', () => {
    const onRewind = vi.fn();
    const msgs = makeMessages('First', 'Second', 'Third');
    render(<RewindTimeline messages={msgs} onRewind={onRewind} onClose={() => {}} />);
    fireEvent.click(screen.getByText('Turn 3').closest('.rewind-turn')!);
    // Turn 3 is the third user message, at index 4 (user, asst, user, asst, user)
    expect(onRewind).toHaveBeenCalledWith(4);
  });

  it('calls onClose when clicking backdrop', () => {
    const onClose = vi.fn();
    const msgs = makeMessages('First', 'Second');
    render(<RewindTimeline messages={msgs} onRewind={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByText('Rewind to turn').closest('.rewind-overlay')!);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking X button', () => {
    const onClose = vi.fn();
    const msgs = makeMessages('First', 'Second');
    render(<RewindTimeline messages={msgs} onRewind={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when clicking inside the timeline panel', () => {
    const onClose = vi.fn();
    const msgs = makeMessages('First', 'Second');
    render(<RewindTimeline messages={msgs} onRewind={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByText('Turn 2'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('truncates long message text at 80 chars', () => {
    const longText = 'A'.repeat(100);
    const msgs = makeMessages('Short', longText);
    render(<RewindTimeline messages={msgs} onRewind={() => {}} onClose={() => {}} />);
    expect(screen.getByText('A'.repeat(80) + '…')).toBeInTheDocument();
  });

  it('handles messages with tool calls between user messages', () => {
    const msgs: Msg[] = [
      { role: 'user', text: 'First' },
      { role: 'assistant', text: 'Response 1' },
      { role: 'tool', text: '', tool: { toolCallId: '1', title: 'read', status: 'complete', expanded: false } },
      { role: 'user', text: 'Second' },
      { role: 'assistant', text: 'Response 2' },
      { role: 'user', text: 'Third' },
    ];
    const onRewind = vi.fn();
    render(<RewindTimeline messages={msgs} onRewind={onRewind} onClose={() => {}} />);
    // Should show Turn 2 and Turn 3 (turn 1 excluded)
    expect(screen.getByText('Turn 2')).toBeInTheDocument();
    expect(screen.getByText('Turn 3')).toBeInTheDocument();
    // Click Turn 2 — it's at index 3 in the messages array
    fireEvent.click(screen.getByText('Turn 2').closest('.rewind-turn')!);
    expect(onRewind).toHaveBeenCalledWith(3);
  });

  // Edge case: 5 turns, verify all indices are correct
  it('correctly maps turn numbers to message indices for 5 turns', () => {
    const onRewind = vi.fn();
    const msgs = makeMessages('T1', 'T2', 'T3', 'T4', 'T5');
    render(<RewindTimeline messages={msgs} onRewind={onRewind} onClose={() => {}} />);
    // Should show turns 2,3,4,5 (newest-first: 5,4,3,2)
    const turns = screen.getAllByText(/Turn \d/);
    expect(turns.map(t => t.textContent)).toEqual(['Turn 5', 'Turn 4', 'Turn 3', 'Turn 2']);

    fireEvent.click(screen.getByText('Turn 5').closest('.rewind-turn')!);
    expect(onRewind).toHaveBeenCalledWith(8); // index of 5th user msg

    fireEvent.click(screen.getByText('Turn 2').closest('.rewind-turn')!);
    expect(onRewind).toHaveBeenCalledWith(2); // index of 2nd user msg
  });
});
