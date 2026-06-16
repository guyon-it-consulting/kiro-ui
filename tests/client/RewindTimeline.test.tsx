import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RewindTimeline, getTurnSummary } from '../../src/client/RewindTimeline';
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

describe('getTurnSummary', () => {
  it('counts tool calls between user messages', () => {
    const msgs: Msg[] = [
      { role: 'user', text: 'Do something' },
      { role: 'tool', text: '', tool: { toolCallId: '1', title: 'Read file', status: 'done', expanded: false } },
      { role: 'tool', text: '', tool: { toolCallId: '2', title: 'Write file', status: 'done', expanded: false } },
      { role: 'tool', text: '', tool: { toolCallId: '3', title: 'Search', status: 'done', expanded: false } },
      { role: 'user', text: 'Next' },
    ];
    const summary = getTurnSummary(msgs, 0, 4);
    expect(summary.tools).toBe(3);
  });

  it('extracts unique file basenames from tool content paths', () => {
    const msgs: Msg[] = [
      { role: 'user', text: 'Edit files' },
      { role: 'tool', text: '', tool: { toolCallId: '1', title: 'Write', status: 'done', expanded: false, content: [{ type: 'diff', path: '/src/App.tsx' }] } },
      { role: 'tool', text: '', tool: { toolCallId: '2', title: 'Write', status: 'done', expanded: false, content: [{ type: 'diff', path: '/src/styles.css' }] } },
      { role: 'tool', text: '', tool: { toolCallId: '3', title: 'Write', status: 'done', expanded: false, content: [{ type: 'diff', path: '/src/App.tsx' }] } },
      { role: 'user', text: 'Next' },
    ];
    const summary = getTurnSummary(msgs, 0, 4);
    expect(summary.files).toEqual(['App.tsx', 'styles.css']);
  });

  it('detects shell commands by kind', () => {
    const msgs: Msg[] = [
      { role: 'user', text: 'Run tests' },
      { role: 'tool', text: '', tool: { toolCallId: '1', title: 'npm test', kind: 'shell', status: 'done', expanded: false } },
      { role: 'tool', text: '', tool: { toolCallId: '2', title: 'Read file', status: 'done', expanded: false } },
      { role: 'user', text: 'Next' },
    ];
    const summary = getTurnSummary(msgs, 0, 3);
    expect(summary.commands).toBe(1);
  });

  it('detects commands by title prefix', () => {
    const msgs: Msg[] = [
      { role: 'user', text: 'Build' },
      { role: 'tool', text: '', tool: { toolCallId: '1', title: 'bash npm run build', status: 'done', expanded: false } },
      { role: 'tool', text: '', tool: { toolCallId: '2', title: 'Execute git status', status: 'done', expanded: false } },
      { role: 'user', text: 'Next' },
    ];
    const summary = getTurnSummary(msgs, 0, 3);
    expect(summary.commands).toBe(2);
  });

  it('returns zeros for turn with no tools', () => {
    const msgs: Msg[] = [
      { role: 'user', text: 'Hello' },
      { role: 'assistant', text: 'Hi there' },
      { role: 'user', text: 'Next' },
    ];
    const summary = getTurnSummary(msgs, 0, 2);
    expect(summary.tools).toBe(0);
    expect(summary.files).toEqual([]);
    expect(summary.commands).toBe(0);
  });

  it('handles last turn (no next user message)', () => {
    const msgs: Msg[] = [
      { role: 'user', text: 'Last turn' },
      { role: 'tool', text: '', tool: { toolCallId: '1', title: 'Read', status: 'done', expanded: false, content: [{ type: 'text', path: '/foo/bar.ts' }] } },
      { role: 'assistant', text: 'Done' },
    ];
    const summary = getTurnSummary(msgs, 0, undefined);
    expect(summary.tools).toBe(1);
    expect(summary.files).toEqual(['bar.ts']);
  });

  it('extracts file from title path pattern', () => {
    const msgs: Msg[] = [
      { role: 'user', text: 'Read' },
      { role: 'tool', text: '', tool: { toolCallId: '1', title: 'Read /src/utils.ts', status: 'done', expanded: false } },
    ];
    const summary = getTurnSummary(msgs, 0, undefined);
    expect(summary.files).toContain('utils.ts');
  });
});

describe('RewindTimeline enriched rendering', () => {
  it('shows tool count in summary for turn with tools', () => {
    const msgs: Msg[] = [
      { role: 'user', text: 'First' },
      { role: 'assistant', text: 'ok' },
      { role: 'user', text: 'Second' },
      { role: 'tool', text: '', tool: { toolCallId: '1', title: 'Read', status: 'done', expanded: false } },
      { role: 'tool', text: '', tool: { toolCallId: '2', title: 'Write', status: 'done', expanded: false } },
      { role: 'assistant', text: 'Done' },
    ];
    render(<RewindTimeline messages={msgs} onRewind={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/2 tools/)).toBeInTheDocument();
  });

  it('shows files in summary', () => {
    const msgs: Msg[] = [
      { role: 'user', text: 'First' },
      { role: 'assistant', text: 'ok' },
      { role: 'user', text: 'Second' },
      { role: 'tool', text: '', tool: { toolCallId: '1', title: 'Write', status: 'done', expanded: false, content: [{ type: 'diff', path: '/src/App.tsx' }] } },
      { role: 'assistant', text: 'Done' },
    ];
    render(<RewindTimeline messages={msgs} onRewind={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/App\.tsx/)).toBeInTheDocument();
  });

  it('shows commands count in summary', () => {
    const msgs: Msg[] = [
      { role: 'user', text: 'First' },
      { role: 'assistant', text: 'ok' },
      { role: 'user', text: 'Build' },
      { role: 'tool', text: '', tool: { toolCallId: '1', title: 'npm test', kind: 'shell', status: 'done', expanded: false } },
      { role: 'assistant', text: 'Done' },
    ];
    render(<RewindTimeline messages={msgs} onRewind={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/1 command/)).toBeInTheDocument();
  });

  it('does not show summary for turn with no tools', () => {
    const msgs: Msg[] = [
      { role: 'user', text: 'First' },
      { role: 'assistant', text: 'ok' },
      { role: 'user', text: 'Second' },
      { role: 'assistant', text: 'ok again' },
    ];
    render(<RewindTimeline messages={msgs} onRewind={() => {}} onClose={() => {}} />);
    expect(screen.queryByText(/tools?/)).not.toBeInTheDocument();
  });

  it('shows +N more when more than 3 files', () => {
    const msgs: Msg[] = [
      { role: 'user', text: 'First' },
      { role: 'assistant', text: 'ok' },
      { role: 'user', text: 'Second' },
      { role: 'tool', text: '', tool: { toolCallId: '1', title: 'W', status: 'done', expanded: false, content: [{ type: 'diff', path: '/a.ts' }] } },
      { role: 'tool', text: '', tool: { toolCallId: '2', title: 'W', status: 'done', expanded: false, content: [{ type: 'diff', path: '/b.ts' }] } },
      { role: 'tool', text: '', tool: { toolCallId: '3', title: 'W', status: 'done', expanded: false, content: [{ type: 'diff', path: '/c.ts' }] } },
      { role: 'tool', text: '', tool: { toolCallId: '4', title: 'W', status: 'done', expanded: false, content: [{ type: 'diff', path: '/d.ts' }] } },
      { role: 'tool', text: '', tool: { toolCallId: '5', title: 'W', status: 'done', expanded: false, content: [{ type: 'diff', path: '/e.ts' }] } },
      { role: 'assistant', text: 'Done' },
    ];
    render(<RewindTimeline messages={msgs} onRewind={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/\+2/)).toBeInTheDocument();
  });
});
