# Technology Stack

## Runtime

- Node.js 20+ with tsx (TypeScript execution without build step)
- ESM modules (`"type": "module"`)

## Backend

- TypeScript (`server.ts`) — single file, minimal types, `any` for Kiro extensions
- Express 4.x — HTTP server + static file serving from `dist/client/`
- ws — WebSocket server for real-time browser ↔ agent communication
- @agentclientprotocol/sdk — Official ACP TypeScript SDK
  - `ClientSideConnection` for managing the ACP connection
  - `ndJsonStream` for stdio transport
  - `Client` interface: `requestPermission`, `sessionUpdate`, `extNotification`
- Child process spawning `kiro-cli acp` per WebSocket connection (one per tab)

## Frontend

- React 19 + TypeScript (Vite build)
- marked.js + DOMPurify — Markdown rendering with XSS sanitization
- highlight.js (core + 10 languages) — Syntax highlighting for code blocks
- react-diff-viewer-continued — Side-by-side diff display
- CSS variables for theming (dark/light), no CSS-in-JS
- WebSocket for real-time streaming from backend

## Security

- Auth token (crypto.randomBytes) generated per startup, required for all API/WS connections
- Server binds to 127.0.0.1 only
- WebSocket origin validation (localhost/127.0.0.1 only)
- CSP headers (script-src 'self' 'unsafe-inline')
- Rate limiting (configurable max messages/min, max tabs)
- Child process memory limits (configurable)
- Path validation on user inputs (whitelist regex)

## Build & Dev

- Vite 6 — Frontend bundler with React plugin and dev proxy
- `npm run dev` — Concurrent Vite dev server (5173) + Express (3000), Vite proxies /api to Express
- `npm run build` — Vite production build to `dist/client/`
- `npm start` — Build + run Express serving static files
- Electron — Desktop app via electron-builder (macOS, Windows, Linux)

## Protocol

- ACP (Agent Client Protocol) via official SDK
- Kiro extensions handled via `extNotification` (`_kiro.dev/*` methods)
- Permission handling uses Promise-based resolvers (SDK calls `requestPermission`, we resolve when user clicks)

## Kiro Extension Methods

All handled:
- `_kiro.dev/commands/available` — Slash commands, MCP servers, tools list
- `_kiro.dev/metadata` — Context usage percentage, turn duration
- `_kiro.dev/commands/options` — Dynamic option lists for slash commands
- `_kiro.dev/session/terminate` — Graceful session close
- `_kiro.dev/session/list` — List sessions with metadata
- `_kiro.dev/settings/list` — Fetch configurable settings
- `_kiro.dev/settings/set` — Update a setting
- `_kiro.dev/mcp/server_initialized` — MCP server online
- `_kiro.dev/mcp/server_init_failure` — MCP server failure
- `_kiro.dev/mcp/oauth_request` — OAuth URL for MCP auth
- `_kiro.dev/mcp/governance_disabled` — MCP admin-disabled
- `_kiro.dev/compaction/status` — Context compaction progress
- `_kiro.dev/clear/status` — Conversation clear acknowledgement
- `_kiro.dev/agent/switched` — Agent change (name, model, welcome)
- `_kiro.dev/agent/not_found` — Agent not found with fallback
- `_kiro.dev/agent/config_error` — Agent config parse error
- `_kiro.dev/error/rate_limit` — Rate limit notification
- `_kiro.dev/subagent/list_update` — Subagent session tracking
- `_kiro.dev/session/activity` — Multi-session activity events
- `_kiro.dev/session/list_update` — Dynamic session list changes
- `_kiro.dev/session/inbox_notification` — Messages from orchestrated sessions
- `_kiro.dev/session/update` — Extended updates (tool_call_chunk, retry_warning)
