# Kiro UI v1.1 — Feature Guide

A complete visual walkthrough of every feature.

![Tour](tour.gif)

---

## 1. Empty State — Agent Description

New session shows the active agent's name and description. The sidebar displays workspace path and session history.

![Empty state](01-empty-state.png)

---

## 2. Per-Tab Configuration

Each tab has independent settings: agent, model, permission policy. Changes only affect the active tab.

![Tab config](02-tab-config.png)

---

## 3. Effort Control

Reasoning effort dropdown (low → max). Only appears when the current model supports it. Probed dynamically via `/effort`.

![Effort control](03-effort-control.png)

---

## 4. Real-Time Streaming

Responses stream with full markdown rendering. Cancel button (■) stops generation. Ghost mascot floats while working.

![Streaming](04-streaming.png)

---

## 5. Tool Calls & File Follow-Along

Tool blocks show agent actions with status. The **Files panel** (top-right) tracks which files are being read/edited in real-time.

![Tool calls](05-tool-calls.png)

---

## 6. Tool Block Expanded — Diffs

Click to expand. File edits show side-by-side diffs. Clickable file paths open in your editor. Raw I/O for debugging.

![Tool expanded](06-tool-expanded.png)

---

## 7. Real-Time Shell Streaming

Shell commands stream output line-by-line as they execute. Green terminal text inside the tool block.

![Shell streaming](07-shell-streaming.png)

---

## 8. Context Usage Meter

Pie chart shows context window consumption. At 50%+, compact button (⊘) appears to run `/compact`.

![Context meter](08-context-meter.png)

---

## 9. Message Actions

Hover any message: **Copy** on all, **Rewind** on user messages, **Retry** on failure only.

![Message actions](09-message-actions.png)

---

## 10. Rewind — Conversation Branching

Timeline picker shows all turns (newest-first, turn 1 excluded). Click to branch via `/rewind N`. Keeps messages up to that turn.

![Rewind timeline](10-rewind-timeline.png)

---

## 11. Multi-Tab Sessions

Each tab = one session. Independent agent, model, permissions. Tab names auto-sync from session titles. ⌘T to add.

![Multi-tab](11-multi-tab.png)

---

## 12. Slash Commands

Type `/` for autocomplete. Dynamic subcommand options fetched from agent. Includes `/rewind`, `/effort`, `/compact`, `/mcp`.

![Slash commands](12-slash-commands.png)

---

## 13. Message Queue — Stacking

Enable queue (layers icon). Type messages while agent is working — they stack up with edit/delete controls.

![Queue messages](13-queue-messages.png)

---

## 14. Message Queue — Reorder & Merge

Reorder with ↑↓ arrows. Merge adjacent messages with ⊕. Clear all or Send Now to interrupt current turn.

![Queue reorder](14-queue-reorder.png)

---

## 15. Chat Export

Download button (↓) exports the conversation as a formatted `.md` file named after the session.

![Export](15-export.png)

---

## 16. Voice Input

Microphone button for speech-to-text (Web Speech API). Toggle mode: click to start, click to stop. Requires HTTPS or Electron.

![Voice input](16-voice-input.png)

---

## 17. Keyboard Shortcuts

⌘N new chat, ⌘T new tab, ⌘B toggle sidebar, ⌘L clear, Escape cancel.

![Sidebar collapsed](17-sidebar-collapsed.png)

---

## 18. Session History

Workspace-scoped. Open sessions marked with purple dot (●). Title filter for search. Click to open in new tab.

![Session history](18-session-history.png)

---

## 19. Light Theme

Sun/moon toggle. Persists across sessions and reloads.

![Light theme](19-light-theme.png)

---

## 20. Settings

Editor integration (VS Code, Cursor, IntelliJ), protocol debug panel, workspace config, agent settings.

![Settings](20-settings.png)

---

## Additional Features

| Feature | Description |
|---------|-------------|
| Agent Plan | Live task list (○ pending, ▶ in-progress, ✓ completed) during multi-step tasks |
| MCP Server Panel | Status dots, tool lists, OAuth authentication flow with persistent banner |
| Permission Prompts | Interactive allow/deny buttons in "Ask" mode |
| Retry on Failure | Retry button on last message when turn fails (cancelled/error/max_tokens) |
| Protocol Debug | Raw JSON-RPC traffic + extension notification logging |
| Crash Auto-Reconnect | Detects dead agent, auto-restarts within 1 second |
| TCP Transport | Connect to remote `kiro-cli acp` over TCP (for Docker/remote) |
| Electron Desktop | Native macOS/Windows/Linux app with voice support |
