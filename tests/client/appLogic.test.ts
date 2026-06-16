import { describe, it, expect } from 'vitest';
import { newTab, handleTurnEnd, handleAgentChunk, handleToolCall, handleToolCallUpdate, handleThinking, groupConsecutiveTools, extractSuggestions, enqueueMessage, accumulateMetering, parseGoalCommand, handleGoalTurnEnd } from '../../src/client/appLogic.js';

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

describe('extractSuggestions', () => {
  it('extracts valid suggestions from end of text', () => {
    const text = 'Here is my response.\n\n```suggestions\n["Option A", "Option B", "Option C"]\n```';
    const result = extractSuggestions(text);
    expect(result.clean).toBe('Here is my response.');
    expect(result.suggestions).toEqual(['Option A', 'Option B', 'Option C']);
  });

  it('returns empty array when no suggestions block', () => {
    const text = 'Just a normal response without suggestions.';
    const result = extractSuggestions(text);
    expect(result.clean).toBe(text);
    expect(result.suggestions).toEqual([]);
  });

  it('returns empty array for malformed JSON', () => {
    const text = 'Response\n\n```suggestions\nnot valid json\n```';
    const result = extractSuggestions(text);
    expect(result.clean).toBe(text);
    expect(result.suggestions).toEqual([]);
  });

  it('limits to 5 suggestions', () => {
    const text = 'Response\n\n```suggestions\n["1","2","3","4","5","6","7"]\n```';
    const result = extractSuggestions(text);
    expect(result.suggestions).toHaveLength(5);
  });

  it('ignores suggestions block not at end of text', () => {
    const text = '```suggestions\n["A"]\n```\n\nMore text after.';
    const result = extractSuggestions(text);
    expect(result.clean).toBe(text);
    expect(result.suggestions).toEqual([]);
  });

  it('handles trailing whitespace after block', () => {
    const text = 'Response\n\n```suggestions\n["A", "B"]\n```\n';
    const result = extractSuggestions(text);
    expect(result.clean).toBe('Response');
    expect(result.suggestions).toEqual(['A', 'B']);
  });

  it('rejects non-string arrays', () => {
    const text = 'Response\n\n```suggestions\n[1, 2, 3]\n```';
    const result = extractSuggestions(text);
    expect(result.clean).toBe(text);
    expect(result.suggestions).toEqual([]);
  });
});

describe('enqueueMessage', () => {
  it('queues message when tab is running', () => {
    const tab = newTab('t1', 'T');
    tab.isRunning = true;
    const result = enqueueMessage(tab, 'queued text');
    expect(result).not.toBeNull();
    expect(result!.queue).toEqual(['queued text']);
  });

  it('returns null when tab is not running', () => {
    const tab = newTab('t1', 'T');
    tab.isRunning = false;
    const result = enqueueMessage(tab, 'text');
    expect(result).toBeNull();
  });

  it('appends to existing queue', () => {
    const tab = newTab('t1', 'T');
    tab.isRunning = true;
    tab.queue = ['first'];
    const result = enqueueMessage(tab, 'second');
    expect(result!.queue).toEqual(['first', 'second']);
  });
});

describe('accumulateMetering', () => {
  it('initializes cumulative from first metering event', () => {
    const tab = newTab('t1', 'T');
    const result = accumulateMetering(tab, { inputTokens: 100, outputTokens: 50, cost: 0.001 });
    expect(result.cumulativeUsage).toEqual({ inputTokens: 100, outputTokens: 50, cost: 0.001 });
    expect(result.meteringUsage).toEqual({ inputTokens: 100, outputTokens: 50, cost: 0.001 });
  });

  it('accumulates across multiple turns', () => {
    const tab = newTab('t1', 'T');
    tab.metadata.cumulativeUsage = { inputTokens: 100, outputTokens: 50, cost: 0.001 };
    const result = accumulateMetering(tab, { inputTokens: 200, outputTokens: 80, cost: 0.002 });
    expect(result.cumulativeUsage).toEqual({ inputTokens: 300, outputTokens: 130, cost: 0.003 });
  });

  it('preserves cumulative when metering is undefined', () => {
    const tab = newTab('t1', 'T');
    tab.metadata.cumulativeUsage = { inputTokens: 500, outputTokens: 200, cost: 0.01 };
    const result = accumulateMetering(tab, undefined);
    expect(result.cumulativeUsage).toEqual({ inputTokens: 500, outputTokens: 200, cost: 0.01 });
    expect(result.meteringUsage).toBeUndefined();
  });

  it('handles partial metering data (missing fields)', () => {
    const tab = newTab('t1', 'T');
    const result = accumulateMetering(tab, { inputTokens: 50 });
    expect(result.cumulativeUsage).toEqual({ inputTokens: 50, outputTokens: 0, cost: 0 });
  });
});

describe('parseGoalCommand', () => {
  it('parses basic goal command', () => {
    const result = parseGoalCommand('/goal refactor auth to use JWT');
    expect(result).toEqual({ goalText: 'refactor auth to use JWT', maxIterations: 5 });
  });

  it('parses goal with --max flag', () => {
    const result = parseGoalCommand('/goal --max 10 migrate to Vitest');
    expect(result).toEqual({ goalText: 'migrate to Vitest', maxIterations: 10 });
  });

  it('returns null for /goal clear', () => {
    expect(parseGoalCommand('/goal clear')).toBeNull();
  });

  it('returns null for bare /goal', () => {
    expect(parseGoalCommand('/goal')).toBeNull();
  });

  it('returns null for non-goal command', () => {
    expect(parseGoalCommand('/help')).toBeNull();
  });
});

describe('handleGoalTurnEnd', () => {
  it('advances iteration when goal is active', () => {
    const tab = newTab('t1', 'T');
    tab.goal = { text: 'test', maxIterations: 5, currentIteration: 2, status: 'active' };
    const result = handleGoalTurnEnd(tab);
    expect(result.goal!.currentIteration).toBe(3);
    expect(result.goal!.status).toBe('active');
  });

  it('marks incomplete when reaching max iterations', () => {
    const tab = newTab('t1', 'T');
    tab.goal = { text: 'test', maxIterations: 5, currentIteration: 5, status: 'active' };
    const result = handleGoalTurnEnd(tab);
    expect(result.goal!.status).toBe('incomplete');
    expect(result.goal!.currentIteration).toBe(5);
  });

  it('does nothing when no goal', () => {
    const tab = newTab('t1', 'T');
    const result = handleGoalTurnEnd(tab);
    expect(result.goal).toBeUndefined();
  });

  it('does nothing when goal is already complete', () => {
    const tab = newTab('t1', 'T');
    tab.goal = { text: 'test', maxIterations: 5, currentIteration: 3, status: 'complete' };
    const result = handleGoalTurnEnd(tab);
    expect(result.goal!.currentIteration).toBe(3);
    expect(result.goal!.status).toBe('complete');
  });
});
