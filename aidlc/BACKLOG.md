# Backlog

## High Priority

### Queue Steering (steer vs queue mode)
Kiro CLI 2.7 introduces two queue modes: "steer" (message injected at next tool boundary, mid-turn) vs "queue" (buffered until turn ends). Currently our UI always buffers. Add a toggle or `Ctrl+S` equivalent to switch between modes. Requires ACP support for mid-turn injection.

### Session Config Options (ACP native)
Replace custom `/effort` slash command with proper `session/set_config_option` API. ACP provides `SessionConfigOptionCategory` (mode, model, thought_level) with typed selectors. More robust, auto-discovers available options.

## Medium Priority

### Terminal embedding
ACP `ToolCallContent::Terminal` allows embedding live terminal output in tool calls. Full lifecycle: `terminal/create` → `terminal/output` → `terminal/wait_for_exit` → `terminal/release`. Currently we only show `streamOutput` text.

### Transcript export alignment
Kiro CLI 2.6 adds `/transcript save` with markdown/plaintext/JSON formats. Our existing "export to markdown" button could be enhanced to support all three formats and match the CLI's output structure.

### Persistent model & effort preferences
Kiro CLI 2.6 makes `/model` and `/effort` choices persist automatically. Ensure our per-tab config syncs with and reflects these persistent preferences from the agent.

### Scheduled prompts
Send prompts on a schedule (cron-like). Use cases: daily code review, periodic checks, recurring tasks. UI: a scheduler panel where you define prompt + interval + workspace.

### Full-text session search (blocked)
Content search across sessions not possible via ACP — `_kiro.dev/session/list` only returns titles. Currently implemented as client-side title filter. Blocked until Kiro CLI adds a search extension.

## Low Priority

### Agent Output Side Channels
Display `$AGENT_DISPLAY_OUT` content in a dedicated panel or inline with tool output. (Kiro CLI v2.3)

### Keyboard shortcuts help overlay
Show a modal with all available shortcuts (⌘N, ⌘B, ⌘T, ⌘L, Escape, etc.) when pressing `?` or from a help button.

### Multi-agent / Cowork
Multiple agents collaborating on the same project. Assign tasks, share context. Depends on ACP subagent support maturity.

### Display & accessibility settings sync
Kiro CLI 2.5 adds `/settings display` (animations, ASCII art, icons). Consider mirroring these preferences in the UI for consistency.

---

## Completed

- ✅ Always-on message queue — Queuing is always active when agent is running (removed toggle)
- ✅ Agent Plan visualization — Live task list with pending/in_progress/completed steps
- ✅ File follow-along panel — Floating panel tracks files being edited in real-time
- ✅ Thinking display — Real-time reasoning with elapsed timer
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
- ✅ Voice input — Removed (not needed, OS-level dictation suffices)
- ✅ Metering / usage display — Cumulative tokens + cost inline next to context pie, detailed in /context panel
- ✅ Enriched /rewind preview — Turn summaries show tool count, files touched, commands run
- ✅ /goal command — Goal banner with iteration progress, cancel, completion status
- ✅ Session transfer / handoff — Session ID button with copy, shows `kiro-cli chat --resume-id` command
