# Project Structure

```
kiro-ui/
├── .kiro/steering/          # Steering files (product, tech, structure, acp-protocol)
├── aidlc/                   # Planning & reference docs (backlog, security plan, etc.)
├── src/client/
│   ├── index.html           # Vite entry HTML
│   ├── main.tsx             # React root mount
│   ├── App.tsx              # Main app component (all UI logic)
│   ├── apiFetch.ts          # Authenticated fetch wrapper (injects auth token)
│   ├── useWebSocket.ts      # WebSocket hook with reconnection + token auth
│   ├── SettingsPage.tsx     # Settings page (general, agent, suggestions, permissions, limits, debug)
│   ├── ToolBlock.tsx        # Tool call visualization component
│   ├── ThinkingBlock.tsx    # Thinking/reasoning display
│   ├── RewindTimeline.tsx   # Visual timeline picker for /rewind
│   ├── McpPanel.tsx         # MCP server status panel
│   ├── MessageActions.tsx   # Copy/retry actions on messages
│   ├── PanelMessage.tsx     # Panel-type command results
│   ├── components.tsx       # ErrorBoundary
│   ├── appLogic.ts          # Extracted app logic helpers
│   ├── wsLogic.ts           # WebSocket message routing helpers
│   ├── types.ts             # Shared TypeScript types
│   └── styles.css           # Global styles with CSS variables
├── src/server/
│   ├── trust.ts             # Trust rules persistence (load/save/match)
│   ├── permissions.ts       # Permission resolution logic (policy + trust)
│   ├── prompt.ts            # Prompt builder (text + images + files)
│   └── notifications.ts    # Kiro extension notification handler
├── electron/
│   └── main.cjs             # Electron main process (window, server lifecycle)
├── tests/                   # Vitest unit tests (client + server)
├── dist/client/             # Vite build output (served by Express)
├── server.ts                # Express + WebSocket + ACP SDK + auth
├── vite.config.ts           # Vite config with API proxy
├── tsconfig.json
└── package.json
```

## Architecture

```
Browser (React + Vite) ←→ WebSocket (token auth) ←→ server.ts ←→ @agentclientprotocol/sdk ←→ kiro-cli acp
```

- `npm run dev` — Runs Vite dev server (port 5173) + Express (port 3000) concurrently. Vite proxies /api to Express. WebSocket connects directly to :3000.
- `npm start` — Builds frontend then starts Express serving from dist/client at 127.0.0.1:3000.
- Each WebSocket connection spawns its own `kiro-cli acp` process via the SDK.
- WebSocket auto-reconnects with exponential backoff (1s → 30s max).
- Auth token generated at startup, injected into HTML and required for all connections.

## Conventions

- Server: TypeScript (`server.ts`), minimal types, `any` for Kiro extensions
- Frontend: React + TypeScript, components extracted when >200 lines
- Styles: CSS variables for theming (`[data-theme="dark"]` / `[data-theme="light"]`), no CSS-in-JS
- State: React useState/useRef (no external state library)
- Theme: dark by default, persisted in localStorage
- Settings: persisted in `~/.kiro-ui/settings.json` (editor, workspace, permPolicy, limits, debug, queue, suggestions)
- Trust: persisted in `~/.kiro-ui/trust.json`
- All Kiro interactions go through ACP protocol, never direct file access
