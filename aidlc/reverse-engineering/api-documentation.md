# API Documentation

## Overview

Kiro UI exposes two communication interfaces:
1. **HTTP REST API** — Settings, trust rules, suggestions (authenticated via Bearer token)
2. **WebSocket Protocol** — Real-time bidirectional communication for chat sessions

All endpoints require authentication via the startup-generated token, except `GET /api/token`.

---

## HTTP REST API

Base URL: `http://127.0.0.1:3000/api`

### Authentication

All requests (except /api/token) require: `Authorization: Bearer <token>`

### GET /api/token
Bootstrap the auth token (public endpoint).

**Response**: `{ "token": "<64-char hex string>" }`

### GET /api/trust
Get all persistent trust rules.

**Response**: `{ "<tool_title>": "allow_always" | "reject_always", ... }`

### PUT /api/trust
Replace all trust rules.

**Request Body**: `{ "<tool_title>": "allow_always" | "reject_always", ... }`

**Response**: Updated rules object

### GET /api/settings
Get all UI settings.

**Response**: Object with keys: editor, workspace, transport, tcpHost, tcpPort, acpCommand, permPolicy, maxTabs, maxMsgsPerMin, maxChildMemMb, debugEnabled, suggestionsEnabled, suggestionsRegion, suggestionsProfile, suggestionsModel, suggestionsCount

### PUT /api/settings
Merge settings (partial update).

**Request/Response**: Settings object

### POST /api/suggestions
Generate follow-up suggestions using Amazon Bedrock.

**Request**: `{ "lastAssistant": "<text, min 80 chars>" }`

**Response**: `{ "suggestions": ["s1", "s2", "s3"] }`

### POST /api/suggestions/test
Test Bedrock connectivity.

**Response**: `{ "ok": true, "model": "..." }` or `{ "ok": false, "error": "..." }`

### GET /api/suggestions/models
List available Bedrock models.

**Response**: `{ "models": [{ "id": "...", "name": "...", "group": "..." }] }`

### POST /api/pick-folder
Open native folder picker dialog.

**Request**: `{ "startPath": "/optional/path" }`

**Response**: `{ "path": "/selected" }` or `{ "path": null }`

---

## WebSocket Protocol

Connect to: `ws://127.0.0.1:3000?token=<auth_token>`

### Client to Server Messages

All messages are JSON with `action` and `tabId` fields.

| Action | Key Fields | Description |
|--------|-----------|-------------|
| `prompt` | text, images?, files? | Send message to agent |
| `cancel` | tabId | Cancel current turn |
| `new_tab` | tabId, cwd? | Create new tab/session |
| `close_tab` | tabId | Close tab, teardown process |
| `new_chat` | tabId, cwd? | Reset tab to fresh session |
| `load_session` | tabId, sessionId | Load saved session |
| `list_sessions` | cwd? | Request session history |
| `set_mode` | modeId | Change agent mode |
| `set_model` | modelId | Change LLM model |
| `set_permission_policy` | policy | Set ask/allow-all/approve-reads |
| `permission_response` | requestId, optionId, title | Respond to permission request |
| `command_options` | command, input | Request slash command autocomplete |
| `kiro_settings_list` | — | Fetch Kiro CLI settings |
| `kiro_settings_set` | key, value | Update Kiro CLI setting |
| `kiro_session_list` | — | List kiro-cli sessions |
| `set_debug` | enabled | Toggle protocol debug logging |
| `set_config_option` | configId, value | Set session config (e.g., effort) |

### Server to Client Messages

All messages are JSON with `type` and usually `tabId`.

| Type | Key Fields | Description |
|------|-----------|-------------|
| `ready` | sessionId, modes, models | Session initialized |
| `AgentMessageChunk` | text | Streaming text chunk |
| `Thinking` | text | Reasoning text chunk |
| `ToolCall` | toolCallId, title, kind, content, status | Tool invocation started |
| `ToolCallUpdate` | toolCallId, status, rawOutput | Tool status change |
| `ToolCallChunk` | toolCallId, title, kind, content | Streaming tool content |
| `TurnEnd` | stopReason | Agent turn completed |
| `Plan` | entries[] | Task list update |
| `UserMessageChunk` | text | Echoed user message |
| `PermissionRequest` | requestId, title, options[] | Permission needed |
| `Metadata` | contextUsagePercentage, turnDurationMs, meteringUsage | Session metrics |
| `CommandsAvailable` | commands[], mcpServers[], tools[] | Available commands |
| `CommandOptions` | command, options[], hint, panel | Autocomplete results |
| `SessionList` | sessions[] | Session history |
| `CompactionStatus` | status, summary | Context compaction progress |
| `ClearStatus` | — | Conversation cleared |
| `AgentSwitched` | agentName, welcomeMessage, model | Agent mode changed |
| `AgentNotFound` | requestedAgent, fallbackAgent | Agent not found |
| `McpServerInitialized` | serverName | MCP server online |
| `McpServerInitFailure` | serverName, error | MCP server failed |
| `McpOauthRequest` | serverName, oauthUrl | OAuth flow needed |
| `RateLimitError` | message | Rate limit hit |
| `SubagentListUpdate` | subagents[], pendingStages[] | Subagent status |
| `SessionActivity` | sessionId, event | Subagent activity |
| `GoalStatus` | currentIteration, maxIterations, status | Goal progress |
| `RetryWarning` | attempt, maxAttempts, delaySecs | Retry warning |
| `AgentCrash` | code | Agent process died |
| `AuthError` | message | kiro-cli auth failure |
| `ProtocolLog` | dir, msg | Debug protocol message |
| `error` | message | Generic error |

---

## ACP Extension Methods (client to kiro-cli)

| Method | Params | Response |
|--------|--------|----------|
| `_kiro.dev/commands/options` | {sessionId, command, input} | {options[], hint?, panel?} |
| `_kiro.dev/commands/execute` | {sessionId, command} | {success, message, data?} |
| `_kiro.dev/session/terminate` | {sessionId} | best-effort |
| `_kiro.dev/session/list` | {cwd} | {sessions[]} |
| `_kiro.dev/settings/list` | {} | settings object |
| `_kiro.dev/settings/set` | {key, value} | void |
