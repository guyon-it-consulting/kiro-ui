# Kiro UI

A browser-based chat interface for [Kiro CLI](https://kiro.dev/cli/), connected via the Agent Client Protocol (ACP).

![Dark theme](https://img.shields.io/badge/theme-dark%20%2F%20light-9046ff) ![Tests](https://img.shields.io/badge/tests-140%20passing-34d399) ![Coverage](https://img.shields.io/badge/coverage-84%25-34d399)

## Why Kiro UI?

Kiro CLI is powerful — but the terminal isn't for everyone. Kiro UI gives developers and teams a visual, real-time interface to Kiro's agentic capabilities without sacrificing any of the power.

**The problem:** AI coding assistants are either locked inside IDEs or limited to basic chat UIs that can't show diffs, tool calls, or multi-session workflows.

**The solution:** A lightweight, self-hosted chat interface that streams Kiro's full capabilities — tool calls with diffs, MCP server management, multi-tab sessions, permission controls — all in your browser or as a desktop app.

### Who is this for?

- **Developers** who prefer a visual interface over terminal for AI-assisted coding
- **Teams** wanting a shared, accessible interface to Kiro without IDE lock-in
- **Power users** who need to see tool calls, diffs, and protocol-level details in real time

### What makes it different?

- **Protocol-first** — Every feature is driven by ACP; the UI adapts to what the agent supports
- **Self-hosted & private** — Runs on localhost, no data leaves your machine
- **Multi-session** — Each tab is an independent agent process with its own context
- **Cross-platform** — Web, macOS, Windows, Linux (Electron), Docker, or remote via TCP

---

## Features

- **Real-time streaming** — Markdown rendering, syntax highlighting (10 languages), side-by-side diffs
- **Multi-tab sessions** — Independent kiro-cli processes per tab with ghost mascots
- **Tool call visualization** — Collapsible blocks with grouping, raw I/O, clickable file paths
- **MCP server panel** — Live status dots, expandable tool lists with descriptions
- **Permission management** — Auto-approve policies, persistent trust rules
- **Slash commands** — Autocomplete with dynamic subcommand options
- **Image & file attachments** — Paste, upload, preview before sending
- **Context usage meter** — Pie chart showing context window consumption
- **Settings page** — Editor integration, workspace directory, trust rules, Kiro agent settings
- **Protocol debug panel** — Raw JSON-RPC traffic inspection
- **Crash auto-reconnect** — Detects dead agent, auto-restarts within 1s
- **Prompt queueing** — Type while the agent is working

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 (Vite proxies WebSocket to Express on port 3000).

### Production

```bash
npm start
```

Builds frontend and starts Express at http://localhost:3000.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Vite HMR + Express, concurrent) |
| `npm run build` | Production build |
| `npm start` | Build + run |
| `npm test` | Unit tests |
| `npm run test:coverage` | Tests with coverage report |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict check |
| `npm run ci` | Full pipeline: lint → typecheck → coverage → build |

## Architecture

```
Browser (React 19 + Vite) ←→ WebSocket ←→ server.ts ←→ ACP SDK ←→ kiro-cli acp
```

- Each browser tab/WebSocket connection spawns its own `kiro-cli acp` process
- Communication uses newline-delimited JSON (ACP protocol) over stdio
- Kiro-specific extensions (`_kiro.dev/*`) handled for MCP, agents, compaction, etc.

## Configuration

Settings are stored in `~/.kiro-ui/`:

| File | Purpose |
|------|---------|
| `settings.json` | Editor preference, workspace directory |
| `trust.json` | Persistent tool permission rules |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘N | New chat |
| ⌘T | New tab |
| ⌘B | Toggle sidebar |
| ⌘L | Clear messages |
| Escape | Cancel running turn |
| Enter | Send message |
| Shift+Enter | New line |

## Distribution

### Desktop App (Electron)

Package as a native desktop application for macOS, Linux, or Windows:

```bash
npm run electron:dev              # Dev mode (build + launch Electron)
npm run electron:build            # Package for current platform
npm run electron:build:mac        # macOS → DMG + ZIP (universal)
npm run electron:build:linux      # Linux → AppImage + deb
npm run electron:build:win        # Windows → NSIS installer + portable
```

Built artifacts are output to `release/`.

**Before distributing:**
1. Replace `build/icon.svg` with a 1024×1024 PNG icon
2. Update `build.publish` in `package.json` with your GitHub owner/repo for auto-updates
3. Set up code signing certificates for macOS notarization and Windows signing

### TCP Transport (Remote Agent)

Connect to a remote `kiro-cli acp` process over TCP instead of spawning locally. Useful for:
- Running the agent on a remote server via socat tunnel
- Sharing a single agent across multiple UI instances
- Environments where kiro-cli can't be installed locally

```bash
# On the remote machine:
socat TCP-LISTEN:9000,reuseaddr,fork EXEC:"kiro-cli acp"

# In Kiro UI Settings → ACP Transport → TCP → localhost:9000
```

Configure in Settings or directly in `~/.kiro-ui/settings.json`:
```json
{
  "transport": "tcp",
  "tcpHost": "remote-host",
  "tcpPort": "9000"
}
```

### Docker

```bash
docker build -t kiro-ui .
docker run -p 3000:3000 kiro-ui
```

Pair with TCP transport to connect to a remote agent without installing kiro-cli in the container.

## Requirements

- Node.js 22+
- [Kiro CLI](https://kiro.dev/cli/) installed and authenticated (`kiro-cli` in PATH)

## Tech Stack

- **Backend**: Express 4, ws, @agentclientprotocol/sdk, TypeScript
- **Frontend**: React 19, Vite 6, marked.js, highlight.js, react-diff-viewer-continued
- **Testing**: Vitest, React Testing Library, Playwright
- **Quality**: TypeScript strict mode, ESLint, CSP headers

## License

Apache 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
