# Backlog

Features to implement based on Kiro CLI capabilities and UX improvements.

## High Priority

### `/rewind` — Conversation branching (v2.4)
Jump back to any earlier prompt and continue from that point in a new session. UI should show a visual timeline or turn picker to select the rewind point.

### `/effort` — Model reasoning effort control (v2.4)
Five levels: low, medium, high, xhigh, max. Add a dropdown or slider in the header bar next to model selection.

### `KIRO_HOME` support (v2.3)
Respect the `KIRO_HOME` environment variable when spawning `kiro-cli acp`. Currently hardcoded to `~/.kiro`. Pass through from server env or make configurable in settings.

### Enhanced message queue
Improve the current prompt queueing with:
- Visual queue showing each pending message above the input
- Edit/delete individual queued messages before they're sent
- "Send Now" button to interrupt current generation and send immediately
- Combine multiple queued messages into a single prompt when sent

### Full-text history search
Add search across all past sessions (title + message content). Currently the sidebar only shows a flat list. Users need to find past conversations by keyword.

## Medium Priority

### Real-time shell output streaming (v2.1)
Tool calls that run shell commands should stream output line-by-line in the tool block instead of showing only the final result.

### Skills as slash commands (v2.1)
Skills in `.kiro/skills/` are now invokable as `/skill-name`. The slash command autocomplete should include these dynamically (already partially handled via `_kiro.dev/commands/available`).

### Headless mode / API key auth (v2.0)
Support `KIRO_API_KEY` as an alternative to interactive login. Useful for Docker deployments and CI environments where browser-based auth isn't possible.

### OAuth MCP server support (v2.3)
When an MCP server requires OAuth with a pre-registered client ID, surface the auth flow in the UI (already partially handled via `McpOauthRequest`).

### Chat export (markdown / JSON)
Export a conversation as markdown or JSON for sharing, archiving, or pasting into docs. Add a download button in the message actions area.

### Follow-up prompt suggestions
After the agent responds, show 2–3 suggested follow-up questions as clickable chips below the response. Reduces friction and helps users discover capabilities.

### Chat parameters (temperature, top-p)
Allow per-conversation overrides of model parameters. Add a collapsible "Parameters" section in the chat header or settings panel for power users.

## Low Priority

### Agent Output Side Channels (v2.3)
Display `$AGENT_DISPLAY_OUT` content in a dedicated panel or inline with tool output for richer progress visualization.

### Tool Search toggle (v2.1)
Add a setting to enable/disable Tool Search (`toolSearch.enabled`) from the UI settings page.

### Unified `/settings` command (v2.4)
The CLI now has `/settings theme`, `/settings keybindings`, `/settings terminal`. Consider mirroring these as UI panels or forwarding to the agent.

### Configurable TUI keybindings (v2.3)
Not directly relevant (we have our own shortcuts) but could expose kiro-cli keybinding config in settings for consistency.

### Keyboard shortcuts help overlay
Show a modal with all available shortcuts (⌘N, ⌘B, ⌘T, ⌘L, Escape, etc.) when pressing `?` or from a help button. Improves discoverability.

### Chat sharing (link generation)
Generate a shareable read-only link to a conversation. Useful for teams reviewing agent interactions or sharing solutions.
