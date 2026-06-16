# Architecture

## System Context

```
┌──────────────────────────────────────────────────────────────────┐
│                        Developer Machine                          │
│                                                                   │
│  ┌─────────────┐     WebSocket      ┌─────────────────────────┐  │
│  │  Browser /  │◄───────────────────►│     Express Server      │  │
│  │  Electron   │     (ws, JSON)      │     (server.ts)         │  │
│  │             │                     │                         │  │
│  │  React 19   │  HTTP /api/*        │  ┌───────────────────┐  │  │
│  │  SPA        │◄───────────────────►│  │ ACP SDK           │  │  │
│  └─────────────┘                     │  │ ClientSideConn    │  │  │
│                                      │  └────────┬──────────┘  │  │
│                                      │           │ stdio/TCP    │  │
│                                      │  ┌────────▼──────────┐  │  │
│                                      │  │  kiro-cli acp     │  │  │
│                                      │  │  (child process)  │  │  │
│                                      │  └────────┬──────────┘  │  │
│                                      └───────────┼─────────────┘  │
│                                                  │                │
│                                      ┌───────────▼─────────────┐  │
│                                      │  Kiro Backend (AWS)     │  │
│                                      │  (LLM inference)        │  │
│                                      └─────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Amazon Bedrock (follow-up suggestions only)                │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────┐                                            │
│  │  ~/.kiro-ui/     │  Persistent state (settings.json,         │
│  │                  │  trust.json)                               │
│  └──────────────────┘                                            │
└──────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Tier 1: Frontend (Browser/Electron)

| Component | File(s) | Responsibility |
|-----------|---------|----------------|
| App | `src/client/App.tsx` | Main React component — all UI logic, state management, message routing |
| WebSocket Hook | `src/client/useWebSocket.ts` | Connection lifecycle, auto-reconnect with exponential backoff |
| API Fetch | `src/client/apiFetch.ts` | Authenticated HTTP wrapper (injects Bearer token) |
| ToolBlock | `src/client/ToolBlock.tsx` | Tool call visualization with diffs, shell streaming |
| ThinkingBlock | `src/client/ThinkingBlock.tsx` | Reasoning display with elapsed timer |
| RewindTimeline | `src/client/RewindTimeline.tsx` | Visual timeline picker for conversation branching |
| McpPanel | `src/client/McpPanel.tsx` | MCP server status panel with live dots |
| SubagentPanel | `src/client/SubagentPanel.tsx` | Subagent session tracking visualization |
| SettingsPage | `src/client/SettingsPage.tsx` | Multi-section settings UI |
| PanelMessage | `src/client/PanelMessage.tsx` | Panel-type command result display |
| App Logic | `src/client/appLogic.ts` | Pure state transition functions (testable) |
| WS Logic | `src/client/wsLogic.ts` | WebSocket reconnection utilities |

### Tier 2: Backend (Express + WebSocket)

| Component | File(s) | Responsibility |
|-----------|---------|----------------|
| HTTP Server | `server.ts` | Express app, static file serving, CSP headers |
| WebSocket Server | `server.ts` | Per-connection session management, message routing |
| ACP Bridge | `server.ts` | `ClientSideConnection` + `ndJsonStream` to kiro-cli |
| Trust Module | `src/server/trust.ts` | Load/save/match trust rules (JSON file persistence) |
| Permissions | `src/server/permissions.ts` | Policy-based permission resolution |
| Prompt Builder | `src/server/prompt.ts` | Constructs ACP prompt array from text/images/files |
| Notifications | `src/server/notifications.ts` | Maps `_kiro.dev/*` extension notifications to WS messages |
| Actions | `src/server/actions.ts` | Extracted action handlers (prompt, cancel, set_mode, etc.) |

### Tier 3: Desktop Shell (Electron)

| Component | File(s) | Responsibility |
|-----------|---------|----------------|
| Main Process | `electron/main.cjs` | Window lifecycle, server forking, PATH fix, single-instance lock |

## Communication Patterns

### WebSocket Protocol (Browser ↔ Server)

**Client → Server** (JSON actions):
- `prompt`, `cancel`, `new_tab`, `close_tab`, `new_chat`, `load_session`
- `set_mode`, `set_model`, `set_permission_policy`, `permission_response`
- `list_sessions`, `command_options`, `kiro_settings_list`, `kiro_settings_set`
- `set_debug`, `set_config_option`, `kiro_session_list`

**Server → Client** (JSON events):
- `ready`, `AgentMessageChunk`, `Thinking`, `ToolCall`, `ToolCallUpdate`, `ToolCallChunk`
- `TurnEnd`, `Plan`, `PermissionRequest`, `Metadata`, `CommandsAvailable`
- `CommandOptions`, `SessionList`, `CompactionStatus`, `AgentSwitched`
- `McpServerInitialized`, `McpServerInitFailure`, `McpOauthRequest`
- `AgentCrash`, `error`, `ProtocolLog`, `SubagentListUpdate`, `SessionActivity`
- `GoalStatus`, `RetryWarning`, `InboxNotification`, `AuthError`

### ACP Protocol (Server ↔ kiro-cli)

- **Transport**: Newline-delimited JSON over stdio (default) or TCP socket
- **SDK**: `@agentclientprotocol/sdk` — `ClientSideConnection`, `ndJsonStream`
- **Methods**: `session/new`, `session/prompt`, `session/cancel`, `session/loadSession`
- **Callbacks**: `requestPermission`, `sessionUpdate`, `extNotification`
- **Extensions**: `_kiro.dev/*` namespace (25+ methods)

### HTTP API (Browser → Server)

- `GET /api/token` — Bootstrap auth token
- `GET/PUT /api/trust` — Trust rules CRUD
- `GET/PUT /api/settings` — UI settings CRUD
- `POST /api/suggestions` — Follow-up suggestions via Bedrock
- `POST /api/suggestions/test` — Test Bedrock connectivity
- `GET /api/suggestions/models` — List available Bedrock models
- `POST /api/pick-folder` — Native folder picker (OS-specific)

## Data Flow: Prompt → Response

```
1. User types message, presses Enter
2. Browser sends WS: {action: "prompt", tabId, text, images?, files?}
3. Server builds ACP prompt array (text + images + file resources)
4. Server calls conn.prompt({sessionId, prompt})
5. ACP SDK writes JSON-RPC to kiro-cli stdin
6. kiro-cli streams updates via stdout:
   - sessionUpdate(agent_message_chunk) → WS AgentMessageChunk
   - sessionUpdate(tool_call) → WS ToolCall
   - sessionUpdate(tool_call_update) → WS ToolCallUpdate
   - requestPermission → WS PermissionRequest → wait for user → respond
   - extNotification → mapped via notifications.ts → WS event
7. conn.prompt() resolves with {stopReason}
8. Server sends WS: {type: "TurnEnd", tabId, stopReason}
```

## Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Network | Server binds to `127.0.0.1` only |
| Auth | Random 32-byte token per startup; required for all WS + API |
| WebSocket Origin | Validates origin is localhost/127.0.0.1 |
| CSP | `script-src 'self'; style-src 'self' 'unsafe-inline'` |
| XSS | DOMPurify sanitization on all rendered markdown |
| Rate Limiting | Configurable max messages/minute (default 30) |
| Resource Limits | Max tabs (10), max child memory (512 MB) |
| Input Validation | Path whitelist regex on user inputs |
| Child Process | Memory-limited via `--max-old-space-size` |
| Electron | `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` |

## Deployment Topology

| Mode | Description |
|------|-------------|
| **Dev** | Vite (5173) + Express (3000), Vite proxies /api |
| **Production (Web)** | Express serves static build at 127.0.0.1:3000 |
| **Electron** | Electron forks server.ts (port 13713), loads BrowserWindow |
| **TCP Remote** | UI connects to remote kiro-cli over TCP (via socat or similar) |
| **Docker** | (Mentioned in README but no Dockerfile in repo) |

## Resilience

- WebSocket auto-reconnect: exponential backoff (1s → 30s max)
- Agent crash detection: proc exit → auto-restart within 1s (max 5 restarts/min)
- Auth error detection: stderr scanning → stop restart loop, notify user
- Graceful shutdown: SIGTERM → close WS → kill children → SIGKILL after 3s
