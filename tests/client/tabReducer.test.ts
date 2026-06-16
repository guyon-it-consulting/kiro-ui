import { describe, it, expect } from 'vitest';
import { tabReducer, newTab } from '../../src/client/tabReducer';
import type { TabsState } from '../../src/client/tabReducer';

function makeState(overrides?: Partial<TabsState>): TabsState {
  return { tabs: [newTab('tab-1', 'Chat 1')], activeTabId: 'tab-1', tabCounter: 1, ...overrides };
}

describe('tabReducer', () => {
  it('ADD_TAB adds a tab, sets it active, increments counter', () => {
    const state = makeState();
    const tab2 = newTab('tab-2', 'Chat 2');
    const next = tabReducer(state, { type: 'ADD_TAB', tab: tab2 });
    expect(next.tabs).toHaveLength(2);
    expect(next.activeTabId).toBe('tab-2');
    expect(next.tabCounter).toBe(2);
  });

  it('CLOSE_TAB removes the tab and reassigns active if needed', () => {
    const state = makeState({ tabs: [newTab('tab-1', 'A'), newTab('tab-2', 'B')], activeTabId: 'tab-2', tabCounter: 2 });
    const next = tabReducer(state, { type: 'CLOSE_TAB', tabId: 'tab-2' });
    expect(next.tabs).toHaveLength(1);
    expect(next.activeTabId).toBe('tab-1');
  });

  it('CLOSE_TAB does nothing if only one tab remains', () => {
    const state = makeState();
    const next = tabReducer(state, { type: 'CLOSE_TAB', tabId: 'tab-1' });
    expect(next.tabs).toHaveLength(1);
  });

  it('SET_ACTIVE_TAB changes active tab', () => {
    const state = makeState({ tabs: [newTab('tab-1', 'A'), newTab('tab-2', 'B')], tabCounter: 2 });
    const next = tabReducer(state, { type: 'SET_ACTIVE_TAB', tabId: 'tab-2' });
    expect(next.activeTabId).toBe('tab-2');
  });

  it('UPDATE_TAB applies function to matching tab', () => {
    const state = makeState();
    const next = tabReducer(state, { type: 'UPDATE_TAB', tabId: 'tab-1', fn: t => ({ ...t, name: 'Renamed' }) });
    expect(next.tabs[0].name).toBe('Renamed');
  });

  it('UPDATE_TABS applies function to all tabs', () => {
    const state = makeState({ tabs: [newTab('tab-1', 'A'), newTab('tab-2', 'B')], tabCounter: 2 });
    const next = tabReducer(state, { type: 'UPDATE_TABS', fn: ts => ts.map(t => ({ ...t, name: 'X' })) });
    expect(next.tabs.every(t => t.name === 'X')).toBe(true);
  });

  it('SET_COUNTER updates the counter', () => {
    const state = makeState();
    const next = tabReducer(state, { type: 'SET_COUNTER', value: 5 });
    expect(next.tabCounter).toBe(5);
  });
});
