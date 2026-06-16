# Component Inventory

## Frontend Components

### React Components

| Component | File | Description |
|-----------|------|-------------|
| `App` | `src/client/App.tsx` | Main orchestrator: all views, tab management, message routing, rendering (~1600 lines) |
| `ToolBlock` | `src/client/ToolBlock.tsx` | Single tool call display: title, status, diff viewer, raw I/O toggle |
| `ToolGroup` | `src/client/ToolBlock.tsx` | Groups consecutive tool calls with collapse/expand |
| `ThinkingBlock` | `src/client/ThinkingBlock.tsx` | Reasoning display with elapsed timer and collapse toggle |
| `RewindTimeline` | `src/client/RewindTimeline.tsx` | Visual horizontal timeline for /rewind conversation branching |
| `McpPanel` | `src/client/McpPanel.tsx` | MCP server status list with colored dots and tool counts |
| `SubagentPanel` | `src/client/SubagentPanel.tsx` | Subagent session list with status badges and activity indicators |
| `SettingsPage` | `src/client/SettingsPage.tsx` | Multi-section settings: general, agent, suggestions, permissions, limits, debug |
| `PanelMessage` | `src/client/PanelMessage.tsx` | Panel-type responses (history, /commands, /tools results) |
| `MessageActions` | `src/client/MessageActions.tsx` | Copy/retry/rewind action buttons on messages |
| `ErrorBoundary` | `src/client/components.tsx` | React error boundary wrapper |

### Hooks

| Hook | File | Description |
|------|------|-------------|
| `useWebSocket` | `src/client/useWebSocket.ts` | WebSocket connection with auto-reconnect, returns {send, status} |

### Frontend Utilities

| Module | File | Key Functions |
|--------|------|---------------|
| `appLogic` | `src/client/appLogic.ts` | newTab, handleTurnEnd, handleAgentChunk, handleToolCall, handleToolCallUpdate, handleThinking, groupConsecutiveTools, extractSuggestions, enqueueMessage, accumulateMetering, parseGoalCommand, handleGoalTurnEnd |
| `wsLogic` | `src/client/wsLogic.ts` | createReconnectState, nextDelay, resetReconnect, incrementAttempt, classifyStatus |
| `apiFetch` | `src/client/apiFetch.ts` | initToken, getToken, apiFetch |
| `types` | `src/client/types.ts` | All shared TypeScript interfaces |

---

## Backend Components

### Server Modules

| Module | File | Exports |
|--------|------|---------|
| `trust` | `src/server/trust.ts` | loadTrust, saveTrust, getTrustRules, setTrustRules, matchTrust |
| `permissions` | `src/server/permissions.ts` | resolvePermission |
| `prompt` | `src/server/prompt.ts` | buildPrompt |
| `notifications` | `src/server/notifications.ts` | handleExtNotification |
| `actions` | `src/server/actions.ts` | handleAction |

### Server Inline Components (server.ts)

| Component | Responsibility |
|-----------|----------------|
| Express app | HTTP routes, static serving, CSP headers |
| Auth middleware | Bearer token validation on /api/* |
| WebSocket Server | Connection management, origin validation, token verification |
| Session Manager | Per-tab session creation/teardown, tab map per WS connection |
| ACP Bridge | ClientSideConnection + ndJsonStream, manages kiro-cli lifecycle |
| Process Watchdog | Crash detection, auto-restart (max 5/min), auth failure detection |
| Rate Limiter | Per-connection message timestamps, sliding window (60s) |
| Transport Factory | Process spawn vs TCP socket connection |
| Shutdown Handler | SIGTERM/SIGINT graceful close then force kill |

---

## Desktop Component

| Component | File | Responsibility |
|-----------|------|----------------|
| Electron Main | `electron/main.cjs` | Window lifecycle, server forking, PATH fixing, single-instance lock |

---

## Build Scripts

| Script | File | Purpose |
|--------|------|---------|
| compile-server.js | `scripts/compile-server.js` | Bundles server.ts to server.js for Electron |
| generate-icons.js | `scripts/generate-icons.js` | Generates platform-specific icons |
| screenshot-tour.ts | `scripts/screenshot-tour.ts` | Automated screenshot capture |
| video-tour.ts | `scripts/video-tour.ts` | Automated video recording |

---

## Integration Points

| External System | Direction | Method | Purpose |
|-----------------|-----------|--------|---------|
| kiro-cli acp | bidirectional | stdio (ndjson) or TCP | Core agent communication |
| Amazon Bedrock | outbound | AWS SDK HTTP | Follow-up suggestions |
| ~/.kiro-ui/settings.json | read/write | fs | UI settings persistence |
| ~/.kiro-ui/trust.json | read/write | fs | Trust rules persistence |
| OS native dialogs | outbound | osascript/zenity/PowerShell | Folder picker |
