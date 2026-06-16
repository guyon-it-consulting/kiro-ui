/** Shared TypeScript types for the Kiro UI frontend */

// --- Core message types ---

export interface ToolEntry {
  toolCallId: string;
  title: string;
  kind?: string;
  content?: ToolContent[];
  status?: string;
  expanded?: boolean;
  rawInput?: unknown;
  rawOutput?: unknown;
  streamOutput?: string;
}

export interface ToolContent {
  type: string;
  path?: string;
  oldText?: string;
  newText?: string;
}

export interface Msg {
  role: string;
  text: string;
  panelType?: string;
  tool?: ToolEntry;
}

export interface ThinkingState {
  text: string;
  startTime: number;
  collapsed: boolean;
}

export interface TabState {
  id: string;
  name: string;
  sessionId?: string;
  cwd?: string;
  messages: Msg[];
  thinking: ThinkingState | null;
  permissions: PermissionRequest[];
  isRunning: boolean;
  metadata: TabMetadata;
  queue: string[];
  stream: string;
  lastStopReason?: string;
  modes: ModesState | null;
  models: ModelsState | null;
  permPolicy: string;
  effort?: string;
  effortSupported?: boolean;
  plan?: PlanEntry[];
  activeFiles?: { path: string; line?: number; kind?: string }[];
  suggestions?: string[];
  goal?: GoalState | null;
}

export interface GoalState {
  text: string;
  maxIterations: number;
  currentIteration: number;
  status: 'active' | 'complete' | 'incomplete';
}

export interface TabMetadata {
  contextUsagePercentage: number;
  turnDurationMs?: number;
  meteringUsage?: { inputTokens?: number; outputTokens?: number; cost?: number };
  cumulativeUsage?: { inputTokens: number; outputTokens: number; cost: number };
}

export interface PlanEntry {
  content: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
}

// --- ACP / Protocol types ---

export interface PermissionRequest {
  requestId: string;
  title?: string;
  options?: PermissionOption[];
}

export interface PermissionOption {
  optionId: string;
  name: string;
  kind?: string;
}

export interface Mode {
  id: string;
  name: string;
  description?: string;
}

export interface ModesState {
  currentModeId: string;
  availableModes: Mode[];
}

export interface Model {
  modelId: string;
  name: string;
}

export interface ModelsState {
  currentModelId: string;
  availableModels: Model[];
}

export interface McpServer {
  name: string;
  status: string;
  toolCount?: number;
}

export interface McpTool {
  name: string;
  description?: string;
  source: string;
}

export interface SlashCommand {
  name: string;
  description?: string;
}

export interface CommandOption {
  name: string;
  label?: string;
  value: string;
  description?: string;
}

export interface SessionEntry {
  id: string;
  title: string;
  description?: string;
}

export interface Toast {
  id: number;
  text: string;
  type: 'info' | 'error' | 'warning';
}

export interface ProtocolLog {
  dir: string;
  msg: string;
  ts: number;
}

// --- WebSocket message types (client → server) ---

export type WsAction =
  | { action: 'new_tab'; tabId: string }
  | { action: 'close_tab'; tabId: string }
  | { action: 'prompt'; tabId: string; text: string; images?: PendingImage[]; files?: PendingFile[] }
  | { action: 'cancel'; tabId: string }
  | { action: 'set_mode'; tabId: string; modeId: string }
  | { action: 'set_model'; tabId: string; modelId: string }
  | { action: 'set_permission_policy'; tabId: string; policy: string }
  | { action: 'permission_response'; tabId: string; requestId: string; optionId: string; title: string }
  | { action: 'new_chat'; tabId: string; cwd?: string }
  | { action: 'load_session'; tabId: string; sessionId: string }
  | { action: 'list_sessions'; tabId: string; cwd?: string }
  | { action: 'command_options'; tabId: string; command: string; input: string }
  | { action: 'kiro_settings_list' }
  | { action: 'kiro_settings_set'; key: string; value: string }
  | { action: 'set_debug'; enabled: boolean };

export interface PendingImage {
  data: string;
  mimeType: string;
  name: string;
}

export interface PendingFile {
  name: string;
  content: string;
}

// --- Editor integration ---

export type EditorType = 'vscode' | 'cursor' | 'idea' | 'none';

export const EDITOR_SCHEMES: Record<EditorType, string> = {
  vscode: 'vscode://file/',
  cursor: 'cursor://file/',
  idea: 'idea://open?file=',
  none: '',
};

// --- Transport settings ---

export type TransportType = 'process' | 'tcp';
