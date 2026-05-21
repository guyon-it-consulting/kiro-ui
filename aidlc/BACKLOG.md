# Backlog

## High Priority

### `/rewind` — Conversation branching
Jump back to any earlier prompt and continue from that point in a new session. Show a visual timeline or turn picker to select the rewind point. (Kiro CLI v2.4)

### `/effort` — Model reasoning effort control
Five levels: low, medium, high, xhigh, max. Add a dropdown or slider in the header bar next to model selection. (Kiro CLI v2.4)

### Enhanced message queue
Improve the current prompt queueing with:
- Visual queue showing each pending message above the input
- Edit/delete individual queued messages before they're sent
- "Send Now" button to interrupt current generation and send immediately
- Combine multiple queued messages into a single prompt when sent

### Full-text history search
Add search across all past sessions (title + message content). Currently the sidebar only shows a flat list.

## Medium Priority

### Real-time shell output streaming
Tool calls that run shell commands should stream output line-by-line in the tool block instead of showing only the final result. (Kiro CLI v2.1 — partially supported via `tool_call_chunk`)

### Headless mode / API key auth
Support `KIRO_API_KEY` as an alternative to interactive login. Useful for Docker deployments and CI environments where browser-based auth isn't possible. (Kiro CLI v2.0)

### OAuth MCP server flow
When an MCP server requires OAuth, surface the full auth flow in the UI with a clickable link and status feedback. (Already partially handled via `McpOauthRequest` — needs polish)

### Chat export (markdown / JSON)
Export a conversation as markdown or JSON for sharing or archiving. Add a download button in the message actions area.

## Low Priority

### Agent Output Side Channels
Display `$AGENT_DISPLAY_OUT` content in a dedicated panel or inline with tool output for richer progress visualization. (Kiro CLI v2.3)

### Keyboard shortcuts help overlay
Show a modal with all available shortcuts (⌘N, ⌘B, ⌘T, ⌘L, Escape, etc.) when pressing `?` or from a help button.
