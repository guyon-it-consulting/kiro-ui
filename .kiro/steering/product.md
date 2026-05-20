# Product Overview

Kiro UI is a browser-based (and Electron desktop) chat interface for Kiro CLI, connected via the Agent Client Protocol (ACP) over stdin/stdout.

## Purpose

Provide a web/desktop UI alternative to the terminal for interacting with Kiro's agentic capabilities — similar to claude.ai but backed by Kiro CLI.

## Target Users

- Developers who prefer a visual interface over terminal for AI-assisted coding
- Teams wanting a shared, accessible interface to Kiro

## Key Features

- Real-time streaming chat with markdown rendering and syntax highlighting
- Multi-tab sessions with independent kiro-cli processes per tab
- Agent and model selection (session/set_mode, session/set_model)
- Tool call visualization with collapsible diffs
- Permission prompts with configurable auto-approve policies and trust persistence
- Thinking display with elapsed timer
- Slash command autocomplete with dynamic subcommand options
- Conversation history from ~/.kiro/sessions/cli/
- Cancel current turn (session/cancel)
- Dark/light theme with persistence
- Keyboard shortcuts (⌘N new, ⌘L clear, ⌘B sidebar, ⌘T new tab)
- Copy code buttons and message actions (copy, retry)
- Responsive collapsible sidebar
- MCP server panel with live status
- Image & file attachments (paste, upload)
- Context usage meter (pie chart)
- Settings page (editor, workspace, trust rules, limits, agent settings, debug)
- Protocol debug panel (raw JSON-RPC traffic)
- Crash auto-reconnect with auto-restart
- Prompt queueing
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
