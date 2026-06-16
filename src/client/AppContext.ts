/** App-wide context — eliminates prop drilling for shared state and actions */

import { createContext, useContext } from 'react';
import type { TabState, McpServer, McpTool, SlashCommand, SessionEntry, Toast, EditorType, CommandOption, ModesState, ModelsState } from './types';
import type { TabAction } from './tabReducer';

export interface AppContextValue {
  // Tab state
  tabs: TabState[];
  activeTabId: string;
  tab: TabState;
  dispatch: (action: TabAction) => void;
  updateTab: (tabId: string, fn: (t: TabState) => TabState) => void;

  // Communication
  send: (data: Record<string, unknown>) => void;

  // Derived tab state
  modes: ModesState | null;
  models: ModelsState | null;
  permPolicy: string;

  // Global state
  editor: EditorType;
  mcpServers: McpServer[];
  allTools: McpTool[];
  oauthPending: Record<string, string>;
  commands: SlashCommand[];
  sessions: SessionEntry[];

  // Actions
  addToast: (text: string, type: Toast['type']) => void;
  addTab: () => void;
  closeTab: (id: string) => void;
  loadSession: (id: string, title?: string) => void;
}

export const AppContext = createContext<AppContextValue>(null!);

export function useAppContext() {
  return useContext(AppContext);
}
