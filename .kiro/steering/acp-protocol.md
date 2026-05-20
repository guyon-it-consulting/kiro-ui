# ACP Protocol Implementation Notes

## Message Framing

- Newline-delimited JSON (NOT Content-Length headers)
- Each message is one JSON object per line

## Kiro-Specific Quirks

- `session/prompt` uses field `prompt` (NOT `content`): `{sessionId, prompt: [{type: "text", text}]}`
- Notifications come via `session/update` with `params.update.sessionUpdate` field
- Turn end is signaled by the RESPONSE to `session/prompt` (with `stopReason`), not a separate notification
- `session/new` returns `modes` (agents) and `models` in the response
- Slash commands (e.g., `/mcp`, `/agent`) work when sent as regular prompts — Kiro intercepts them

## Permission Handling

- `session/request_permission` is a JSON-RPC REQUEST (has `id`)
- Must respond with: `{jsonrpc: "2.0", id: <request_id>, result: {outcome: {outcome: "selected", optionId: "<option>"}}}`
- Options: allow_once, allow_always, reject_once
- If cancelled: `{outcome: {outcome: "cancelled"}}`

## Session Update Types

- `agent_message_chunk` — streaming text content (`content.text`)
- `agent_thought_chunk` — thinking/reasoning content
- `tool_call` — tool invocation (has toolCallId, title, kind, content with diffs, status)
- `tool_call_update` — status change for a tool call
- `tool_call_chunk` — tool call streaming (from `_kiro.dev/session/update`)
- `user_message_chunk` — echoed user message content

## Cancel

- `session/cancel` is a NOTIFICATION (no id): `{jsonrpc: "2.0", method: "session/cancel", params: {sessionId}}`
- Agent should respond to the pending `session/prompt` with `stopReason: "cancelled"`

## Kiro Extension Notification Payloads

- `_kiro.dev/commands/available` — `{commands: [...], mcpServers: [...], tools: [...]}`
- `_kiro.dev/metadata` — `{contextUsagePercentage, turnDurationMs, meteringUsage?}`
- `_kiro.dev/compaction/status` — `{status: {type: "started"|"completed"|"error", error?}, summary?}`
- `_kiro.dev/agent/switched` — `{agentName, previousAgentName?, welcomeMessage?, model?}`
- `_kiro.dev/error/rate_limit` — `{message}`
- `_kiro.dev/mcp/server_initialized` — `{serverName}`
- `_kiro.dev/mcp/server_init_failure` — `{serverName, error}`
- `_kiro.dev/mcp/oauth_request` — `{serverName, oauthUrl}`
- `_kiro.dev/mcp/governance_disabled` — `{apiFailure: boolean}`
- `_kiro.dev/subagent/list_update` — `{subagents: [...], pendingStages?: [...]}`
- `_kiro.dev/session/activity` — `{sessionId, event}` (tool calls from subagents)
- `_kiro.dev/session/inbox_notification` — message from orchestrated session
- `_kiro.dev/session/update` — `{update: {sessionUpdate: "tool_call_chunk"|"retry_warning", ...}}`
- `_kiro.dev/clear/status` — (no payload, acknowledgement)
- `_kiro.dev/agent/not_found` — `{requestedAgent, fallbackAgent}`
- `_kiro.dev/agent/config_error` — `{path, error}`

## Kiro Extension Request Methods (client → agent)

- `_kiro.dev/commands/options` — `{sessionId, command, partial?}` → `{options: [...], hint?}`
- `_kiro.dev/commands/execute` — `{sessionId, command}` → `{success, message, data?}`
- `_kiro.dev/session/terminate` — `{sessionId}` → (best-effort, no response expected)
- `_kiro.dev/session/list` — `{cwd}` → `{sessions: [{sessionId, title, updatedAt}]}`
- `_kiro.dev/settings/list` — `{}` → settings object
- `_kiro.dev/settings/set` — `{key, value}` → (void)
