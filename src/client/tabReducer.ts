/** Tab state reducer — single source of truth for tabs, activeTabId, tabCounter */

import type { TabState } from './types';

export { newTab } from './appLogic';

export interface TabsState {
  tabs: TabState[];
  activeTabId: string;
  tabCounter: number;
}

export type TabAction =
  | { type: 'ADD_TAB'; tab: TabState }
  | { type: 'CLOSE_TAB'; tabId: string }
  | { type: 'SET_ACTIVE_TAB'; tabId: string }
  | { type: 'UPDATE_TAB'; tabId: string; fn: (t: TabState) => TabState }
  | { type: 'UPDATE_TABS'; fn: (tabs: TabState[]) => TabState[] }
  | { type: 'SET_COUNTER'; value: number };

export function tabReducer(state: TabsState, action: TabAction): TabsState {
  switch (action.type) {
    case 'ADD_TAB':
      return {
        ...state,
        tabs: [...state.tabs, action.tab],
        activeTabId: action.tab.id,
        tabCounter: state.tabCounter + 1,
      };
    case 'CLOSE_TAB': {
      if (state.tabs.length <= 1) return state;
      const filtered = state.tabs.filter(t => t.id !== action.tabId);
      const activeTabId = state.activeTabId === action.tabId
        ? filtered[0].id
        : state.activeTabId;
      return { ...state, tabs: filtered, activeTabId };
    }
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabId: action.tabId };
    case 'UPDATE_TAB':
      return { ...state, tabs: state.tabs.map(t => t.id === action.tabId ? action.fn(t) : t) };
    case 'UPDATE_TABS':
      return { ...state, tabs: action.fn(state.tabs) };
    case 'SET_COUNTER':
      return { ...state, tabCounter: action.value };
    default:
      return state;
  }
}
