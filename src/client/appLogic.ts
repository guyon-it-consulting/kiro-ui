/** Core state logic extracted from App.tsx for testability */

import type { TabState, Msg } from './types';

export type { TabState, Msg };

export function newTab(id: string, name: string): TabState {
  return { id, name, messages: [], thinking: null, permissions: [], isRunning: false, metadata: { contextUsagePercentage: 0 }, queue: [], stream: '', modes: null, models: null, permPolicy: 'ask' };
}

export function handleTurnEnd(tab: TabState): TabState {
  const msgs = tab.messages.map(msg =>
    msg.role === 'assistant-stream' ? { ...msg, role: 'assistant' } :
    msg.role === 'user-stream' ? { ...msg, role: 'user' } : msg
  );
  if (tab.queue.length) {
    const [, ...rest] = tab.queue;
    return { ...tab, messages: msgs, thinking: null, permissions: [], stream: '', isRunning: true, queue: rest };
  }
  return { ...tab, messages: msgs, thinking: null, permissions: [], stream: '', isRunning: false };
}

export function handleAgentChunk(tab: TabState, text: string): TabState {
  const last = tab.messages[tab.messages.length - 1];
  const msgs = last?.role === 'assistant-stream'
    ? [...tab.messages.slice(0, -1), { role: 'assistant-stream', text: last.text + text }]
    : [...tab.messages, { role: 'assistant-stream', text }];
  return { ...tab, messages: msgs, thinking: null, isRunning: true };
}

export function handleToolCall(tab: TabState, data: { toolCallId: string; title: string; kind?: string; content?: Msg['tool'] extends undefined ? never : NonNullable<Msg['tool']>['content']; status?: string; rawInput?: unknown }): TabState {
  const exists = tab.messages.some(m => m.tool?.toolCallId === data.toolCallId);
  const entry: Msg = { role: 'tool', text: '', tool: { toolCallId: data.toolCallId, title: data.title, kind: data.kind, content: data.content, status: data.status || 'pending', expanded: false, rawInput: data.rawInput } };
  const msgs = tab.messages.map(msg => msg.role === 'assistant-stream' ? { ...msg, role: 'assistant' } : msg);
  if (exists) return { ...tab, stream: '', messages: msgs.map(m => m.tool?.toolCallId === data.toolCallId ? entry : m) };
  return { ...tab, stream: '', messages: [...msgs, entry] };
}

export function handleToolCallUpdate(tab: TabState, data: { toolCallId: string; status: string; rawOutput?: unknown }): TabState {
  return { ...tab, messages: tab.messages.map(m => m.tool?.toolCallId === data.toolCallId ? { ...m, tool: { ...m.tool!, status: data.status, rawOutput: data.rawOutput ?? m.tool!.rawOutput } } : m) };
}

export function handleThinking(tab: TabState, text: string): TabState {
  if (tab.thinking) return { ...tab, thinking: { ...tab.thinking, text: tab.thinking.text + text } };
  return { ...tab, thinking: { text, startTime: Date.now(), collapsed: false } };
}

export function groupConsecutiveTools(messages: Msg[]): { type: 'tool-group' | 'single'; items: Msg[]; startIdx: number }[] {
  const groups: { type: 'tool-group' | 'single'; items: Msg[]; startIdx: number }[] = [];
  let i = 0;
  while (i < messages.length) {
    if (messages[i].role === 'tool') {
      const start = i;
      while (i < messages.length && messages[i].role === 'tool') i++;
      groups.push({ type: i - start > 1 ? 'tool-group' : 'single', items: messages.slice(start, i), startIdx: start });
    } else {
      groups.push({ type: 'single', items: [messages[i]], startIdx: i });
      i++;
    }
  }
  return groups;
}

const SUGGESTIONS_RE = /```suggestions\s*\n(\[[\s\S]*?\])\s*\n```\s*$/;

export function extractSuggestions(text: string): { clean: string; suggestions: string[] } {
  const match = text.match(SUGGESTIONS_RE);
  if (!match) return { clean: text, suggestions: [] };
  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed) && parsed.every(s => typeof s === 'string')) {
      return { clean: text.slice(0, match.index).trimEnd(), suggestions: parsed.slice(0, 5) };
    }
  } catch { /* ignore parse errors */ }
  return { clean: text, suggestions: [] };
}

export function enqueueMessage(tab: TabState, text: string): TabState | null {
  if (!tab.isRunning) return null;
  return { ...tab, queue: [...tab.queue, text] };
}

export function accumulateMetering(tab: TabState, metering?: { inputTokens?: number; outputTokens?: number; cost?: number }): TabState['metadata'] {
  const prev = tab.metadata.cumulativeUsage || { inputTokens: 0, outputTokens: 0, cost: 0 };
  const cumulative = metering ? { inputTokens: prev.inputTokens + (metering.inputTokens || 0), outputTokens: prev.outputTokens + (metering.outputTokens || 0), cost: prev.cost + (metering.cost || 0) } : prev;
  return { ...tab.metadata, meteringUsage: metering, cumulativeUsage: cumulative };
}

export function parseGoalCommand(text: string): { goalText: string; maxIterations: number } | null {
  const match = text.match(/^\/goal\s+(?:--max\s+(\d+)\s+)?(.+)/s);
  if (!match) return null;
  if (text.trim() === '/goal clear') return null;
  return { goalText: match[2].trim(), maxIterations: match[1] ? parseInt(match[1], 10) : 5 };
}

export function handleGoalTurnEnd(tab: TabState): TabState {
  if (!tab.goal || tab.goal.status !== 'active') return tab;
  const next = tab.goal.currentIteration + 1;
  if (next > tab.goal.maxIterations) {
    return { ...tab, goal: { ...tab.goal, currentIteration: tab.goal.maxIterations, status: 'incomplete' } };
  }
  return { ...tab, goal: { ...tab.goal, currentIteration: next } };
}
