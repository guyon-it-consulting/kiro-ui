# Product Overview

Kiro UI is a browser-based (and Electron desktop) chat interface for Kiro CLI, connected via the Agent Client Protocol (ACP) over stdin/stdout.

## Purpose

Provide a web/desktop UI alternative to the terminal for interacting with Kiro's agentic capabilities — similar to claude.ai but backed by Kiro CLI.

## Target Users

- Developers who prefer a visual interface over terminal for AI-assisted coding
- Teams wanting a shared, accessible interface to Kiro

## Key Features

- Real-time streaming chat with markdown rendering and syntax highlighting
- Multi-tab sessions (tab = session, 1:1 mapping, auto-sync names)
- Per-tab configuration: agent, model, permissions, effort level
- Tool call visualization with collapsible diffs and real-time shell streaming
- Permission prompts with configurable auto-approve policies and trust persistence
- Thinking display with elapsed timer
- Agent Plan visualization (pending/in_progress/completed task list)
- Slash command autocomplete with dynamic subcommand options
- Conversation branching via /rewind with timeline picker
- Workspace-scoped session history with title filter
- Cancel current turn (session/cancel)
- Dark/light theme with persistence
- Keyboard shortcuts (⌘N new, ⌘L clear, ⌘B sidebar, ⌘T new tab)
- Message actions: copy, retry (on failure only), rewind
- Enhanced message queue: reorder, merge, edit, delete, send now
- Follow-up suggestions: AI-generated next actions via Amazon Bedrock after each turn
- Goal iterations: /goal command with iteration banner and progress tracking
- Metering display: Cumulative token usage and cost tracking per session
- MCP server panel with live status and OAuth flow
- File follow-along panel (tracks files being edited in real-time)
- Image & file attachments (paste, upload)
- Context usage meter with compact button (at 50%+)
- Effort control dropdown (probes model support dynamically)
- Chat export to markdown
- Agent description in empty state
- Settings page (editor, workspace, trust rules, limits, suggestions config, agent settings, debug)
- Protocol debug panel (raw JSON-RPC traffic with ext notification logging)
- Crash auto-reconnect with auto-restart
- Cross-platform: macOS, Windows, Linux (web + Electron)

## Design Principles

- **Minimal footprint** — Single-page app, no external state management, no database
- **Protocol-first** — All features driven by ACP capabilities; UI adapts to what the agent supports
- **Streaming-native** — Every interaction streams in real-time; no request/response blocking
- **Dark by default** — Developer-focused dark theme with optional light mode
- **ACP-only** — All Kiro interactions go through the ACP protocol, never direct file access

## Security

- Auth token generated per server startup (required for WebSocket + API)
- Server binds to 127.0.0.1 only
- WebSocket origin validation (localhost only)
- DOMPurify sanitization on all rendered markdown
- Rate limiting and resource limits (configurable)
- CSP headers on all responses
