import { describe, it, expect } from 'vitest';
import { newTab, handleTurnEnd, handleAgentChunk, handleToolCall, handleToolCallUpdate, handleThinking, groupConsecutiveTools } from '../../src/client/appLogic.js';

describe('newTab', () => {
  it('creates tab with defaults', () => {
    const tab = newTab('t1', 'Tab 1');
    expect(tab.id).toBe('t1');
    expect(tab.name).toBe('Tab 1');
    expect(tab.messages).toEqual([]);
    expect(tab.isRunning).toBe(false);
    expect(tab.metadata.contextUsagePercentage).toBe(0);
  });
});

describe('handleTurnEnd', () => {
  it('finalizes stream roles', () => {
    const tab = newTab('t1', 'T');
    tab.messages = [{ role: 'assistant-stream', text: 'hi' }];
    const result = handleTurnEnd(tab);
    expect(result.messages[0].role).toBe('assistant');
    expect(result.isRunning).toBe(false);
  });

  it('finalizes user-stream to user', () => {
    const tab = newTab('t1', 'T');
    tab.messages = [{ role: 'user-stream', text: 'hello' }];
    const result = handleTurnEnd(tab);
    expect(result.messages[0].role).toBe('user');
  });

  it('sends next queued message and stays running', () => {
    const tab = newTab('t1', 'T');
    tab.queue = ['msg1', 'msg2'];
    const result = handleTurnEnd(tab);
    expect(result.queue).toEqual(['msg2']);
    expect(result.isRunning).toBe(true);
  });

  it('clears thinking and permissions', () => {
    const tab = newTab('t1', 'T');
    tab.thinking = { text: 'x', startTime: 0, collapsed: false };
    tab.permissions = [{ id: 'p1' }];
    const result = handleTurnEnd(tab);
    expect(result.thinking).toBeNull();
    expect(result.permissions).toEqual([]);
  });

  it('sets isRunning false when queue is empty', () => {
    const tab = newTab('t1', 'T');
    tab.queue = [];
    const result = handleTurnEnd(tab);
    expect(result.isRunning).toBe(false);
  });
});

describe('handleAgentChunk', () => {
  it('creates new assistant-stream message', () => {
    const tab = newTab('t1', 'T');
    const result = handleAgentChunk(tab, 'Hello');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toEqual({ role: 'assistant-stream', text: 'Hello' });
  });

  it('appends to existing assistant-stream', () => {
    const tab = newTab('t1', 'T');
    tab.messages = [{ role: 'assistant-stream', text: 'Hel' }];
    const result = handleAgentChunk(tab, 'lo');
    expect(result.messages[0].text).toBe('Hello');
  });

  it('creates new stream when last message is not assistant-stream', () => {
    const tab = newTab('t1', 'T');
    tab.messages = [{ role: 'user', text: 'hi' }];
    const result = handleAgentChunk(tab, 'Response');
    expect(result.messages).toHaveLength(2);
    expect(result.messages[1].role).toBe('assistant-stream');
  });

  it('clears thinking', () => {
    const tab = newTab('t1', 'T');
    tab.thinking = { text: 'x', startTime: 0, collapsed: false };
    const result = handleAgentChunk(tab, 'hi');
    expect(result.thinking).toBeNull();
  });
});

describe('handleToolCall', () => {
  it('adds new tool message', () => {
    const tab = newTab('t1', 'T');
    const result = handleToolCall(tab, { toolCallId: 'tc1', title: 'Read file', status: 'pending' });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].tool?.toolCallId).toBe('tc1');
  });

  it('updates existing tool by toolCallId', () => {
    const tab = newTab('t1', 'T');
    tab.messages = [{ role: 'tool', text: '', tool: { toolCallId: 'tc1', title: 'Read', status: 'pending', expanded: false } }];
    const result = handleToolCall(tab, { toolCallId: 'tc1', title: 'Read file', status: 'completed' });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].tool?.status).toBe('completed');
  });

  it('resets stream when tool call arrives', () => {
    const tab = newTab('t1', 'T');
    tab.stream = 'partial text';
    const result = handleToolCall(tab, { toolCallId: 'tc1', title: 'Read', status: 'pending' });
    expect(result.stream).toBe('');
  });

  it('finalizes assistant-stream to assistant on tool call', () => {
    const tab = newTab('t1', 'T');
    tab.stream = 'some text';
    tab.messages = [{ role: 'assistant-stream', text: 'some text' }];
    const result = handleToolCall(tab, { toolCallId: 'tc1', title: 'Read', status: 'pending' });
    expect(result.messages[0].role).toBe('assistant');
    expect(result.messages[0].text).toBe('some text');
    expect(result.messages[1].tool?.toolCallId).toBe('tc1');
  });

  it('prevents message duplication across tool calls', () => {
    let tab = newTab('t1', 'T');
    // Simulate: agent sends text, then tool call, then more text
    tab = handleAgentChunk(tab, 'First segment. ');
    expect(tab.messages[0].text).toBe('First segment. ');

    tab = handleToolCall(tab, { toolCallId: 'tc1', title: 'Search', status: 'pending' });
    expect(tab.stream).toBe('');
    expect(tab.messages[0].role).toBe('assistant');

    tab = handleAgentChunk(tab, 'Second segment.');
    expect(tab.messages).toHaveLength(3);
    expect(tab.messages[0].text).toBe('First segment. ');
    expect(tab.messages[2].text).toBe('Second segment.');
    // The second segment should NOT contain the first segment
    expect(tab.messages[2].text).not.toContain('First segment');
  });
});

describe('handleToolCallUpdate', () => {
  it('updates status of matching tool', () => {
    const tab = newTab('t1', 'T');
    tab.messages = [{ role: 'tool', text: '', tool: { toolCallId: 'tc1', title: 'X', status: 'pending', expanded: false } }];
    const result = handleToolCallUpdate(tab, { toolCallId: 'tc1', status: 'completed' });
    expect(result.messages[0].tool?.status).toBe('completed');
  });

  it('preserves rawOutput if not provided', () => {
    const tab = newTab('t1', 'T');
    tab.messages = [{ role: 'tool', text: '', tool: { toolCallId: 'tc1', title: 'X', status: 'pending', expanded: false, rawOutput: 'old' } }];
    const result = handleToolCallUpdate(tab, { toolCallId: 'tc1', status: 'completed' });
    expect(result.messages[0].tool?.rawOutput).toBe('old');
  });
});

describe('handleThinking', () => {
  it('creates new thinking state', () => {
    const tab = newTab('t1', 'T');
    const result = handleThinking(tab, 'Analyzing...');
    expect(result.thinking?.text).toBe('Analyzing...');
    expect(result.thinking?.collapsed).toBe(false);
  });

  it('appends to existing thinking', () => {
    const tab = newTab('t1', 'T');
    tab.thinking = { text: 'Step 1. ', startTime: 123, collapsed: false };
    const result = handleThinking(tab, 'Step 2.');
    expect(result.thinking?.text).toBe('Step 1. Step 2.');
    expect(result.thinking?.startTime).toBe(123);
  });
});

describe('groupConsecutiveTools', () => {
  it('groups consecutive tool messages', () => {
    const msgs = [
      { role: 'user', text: 'hi' },
      { role: 'tool', text: '', tool: { toolCallId: '1', title: 'A', status: 'done', expanded: false } },
      { role: 'tool', text: '', tool: { toolCallId: '2', title: 'B', status: 'done', expanded: false } },
      { role: 'assistant', text: 'done' },
    ];
    const groups = groupConsecutiveTools(msgs as any);
    expect(groups).toHaveLength(3);
    expect(groups[0].type).toBe('single');
    expect(groups[1].type).toBe('tool-group');
    expect(groups[1].items).toHaveLength(2);
    expect(groups[2].type).toBe('single');
  });

  it('single tool is not grouped', () => {
    const msgs = [{ role: 'tool', text: '', tool: { toolCallId: '1', title: 'A', status: 'done', expanded: false } }];
    const groups = groupConsecutiveTools(msgs as any);
    expect(groups[0].type).toBe('single');
  });

  it('empty messages returns empty', () => {
    expect(groupConsecutiveTools([])).toEqual([]);
  });
});
