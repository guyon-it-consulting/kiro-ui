# Backlog

## High Priority

### Agent Plan visualization
Render the ACP `plan` session update (entries with pending/in_progress/completed status). Shows the agent's task breakdown in real-time. Already in the protocol — just needs UI rendering.

### Session Config Options (ACP native)
Replace custom `/effort` slash command with proper `session/set_config_option` API. ACP provides `SessionConfigOptionCategory` (mode, model, thought_level) with typed selectors. More robust, auto-discovers available options.

### Metering / usage display
Show token counts and cost from `_kiro.dev/metadata.meteringUsage`. We already receive this data — just need to surface it (per-turn and cumulative).

### File follow-along panel
ACP tool calls include `locations` (file paths + line numbers). Show a "files being edited" indicator that tracks what the agent is touching in real-time. Enables "follow the agent" UX.

## Medium Priority

### Terminal embedding
ACP `ToolCallContent::Terminal` allows embedding live terminal output in tool calls. Full lifecycle: `terminal/create` → `terminal/output` → `terminal/wait_for_exit` → `terminal/release`. Currently we only show `streamOutput` text.

### Scheduled prompts
Send prompts on a schedule (cron-like). Use cases: daily code review, periodic checks, recurring tasks. UI: a scheduler panel where you define prompt + interval + workspace.

### Full-text session search (blocked)
Content search across sessions not possible via ACP — `_kiro.dev/session/list` only returns titles. Currently implemented as client-side title filter. Blocked until Kiro CLI adds a search extension.

### Session transfer / handoff
Allow transferring a session between Kiro UI and the terminal (`kiro-cli chat --resume-id`). Show the session ID and a copy button for easy handoff.

## Low Priority

### Voice input
Speech-to-text for prompt input. Use Web Speech API or Whisper. Accessibility feature.

### Agent Output Side Channels
Display `$AGENT_DISPLAY_OUT` content in a dedicated panel or inline with tool output. (Kiro CLI v2.3)

### Keyboard shortcuts help overlay
Show a modal with all available shortcuts (⌘N, ⌘B, ⌘T, ⌘L, Escape, etc.) when pressing `?` or from a help button.

### Multi-agent / Cowork
Multiple agents collaborating on the same project. Assign tasks, share context. Depends on ACP subagent support maturity.

---

## Completed

- ✅ `/rewind` — Native `/rewind N`, timeline picker, fork indicators in sidebar
- ✅ `/effort` — Dropdown probes support per model via `command_options`
- ✅ Enhanced message queue — Reorder (↑↓), merge (⊕), edit, delete, clear all, Send Now
- ✅ Real-time shell streaming — `tool_call_chunk` content displayed as terminal output
- ✅ Chat export to markdown — Download button in tab config bar
- ✅ OAuth MCP server flow — Persistent auth banner, auto-retry after auth
- ✅ Session title filter — Client-side filtering in sidebar
- ✅ Tab = Session model — 1:1 mapping, auto-sync names, per-tab config
- ✅ Workspace-scoped history — Sidebar shows sessions for active tab's workspace
- ✅ Retry on failure — Only on last message when turn failed
- ✅ Agent description — Shown in empty state on new session / agent switch
- ✅ Fork indicators — Sessions with parentSessionId show ⑂ icon
