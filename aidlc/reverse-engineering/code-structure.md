# Code Structure

## Repository Layout

```
kiro-ui/                          # Root (single-package monorepo)
├── server.ts                     # Express + WebSocket + ACP bridge (main entry point)
├── package.json                  # Single manifest (v1.2.0, Node ≥22, ESM)
├── package-lock.json             # Lockfile
├── tsconfig.json                 # TypeScript strict, ESNext, bundler resolution
├── vite.config.ts                # Vite 6 config (React plugin, /api proxy)
├── vitest.config.ts              # Vitest config (jsdom, global)
├── playwright.config.ts          # Playwright E2E (webServer: npm start)
├── eslint.config.js              # ESLint flat config (TS + React hooks)
├── .nvmrc                        # Node 22
├── .gitignore
├── LICENSE                       # Apache 2.0
├── NOTICE
├── README.md
│
├── src/
│   ├── client/                   # Frontend SPA (React 19 + TypeScript)
│   │   ├── index.html            # Vite HTML entry
│   │   ├── main.tsx              # React root mount (4 lines)
│   │   ├── App.tsx               # Main app component (~60KB, all UI logic)
│   │   ├── types.ts              # Shared TypeScript interfaces/types
│   │   ├── appLogic.ts           # Pure state transition functions
│   │   ├── wsLogic.ts            # WebSocket reconnection utilities
│   │   ├── apiFetch.ts           # Authenticated fetch wrapper
│   │   ├── useWebSocket.ts       # WebSocket hook (connect, send, status)
│   │   ├── ToolBlock.tsx         # Tool call visualization + diffs
│   │   ├── ThinkingBlock.tsx     # Reasoning display with timer
│   │   ├── RewindTimeline.tsx    # Conversation branch timeline picker
│   │   ├── McpPanel.tsx          # MCP server status panel
│   │   ├── SubagentPanel.tsx     # Subagent session tracking
│   │   ├── SettingsPage.tsx      # Multi-section settings page
│   │   ├── PanelMessage.tsx      # Panel-type command results
│   │   ├── MessageActions.tsx    # Copy/retry/rewind actions
│   │   ├── components.tsx        # ErrorBoundary
│   │   ├── styles.css            # Global CSS (~45KB, CSS variables for theming)
│   │   └── public/               # Static assets (favicon)
│   │
│   └── server/                   # Backend modules (extracted from server.ts)
│       ├── trust.ts              # Trust rules: load/save/match (JSON persistence)
│       ├── permissions.ts        # Permission resolution (policy + trust)
│       ├── prompt.ts             # Prompt builder (text + images + files → ACP array)
│       ├── notifications.ts      # Kiro extension notification → WS event mapper
│       └── actions.ts            # Action handler dispatch (extracted for testability)
│
├── electron/
│   └── main.cjs                  # Electron main process (CJS for electron-builder)
│
├── scripts/
│   ├── compile-server.js         # Bundles server.ts → server.js for Electron
│   ├── generate-icons.js         # Icon generation for platform builds
│   ├── screenshot-tour.ts        # Automated screenshot script
│   └── video-tour.ts             # Automated video recording script
│
├── tests/
│   ├── setup.ts                  # Vitest setup (jsdom globals)
│   ├── helpers.ts                # Test utilities (mock WS, mock session)
│   ├── client/                   # Unit tests for frontend components/logic
│   │   ├── appLogic.test.ts
│   │   ├── ToolBlock.test.tsx
│   │   ├── ThinkingBlock.test.tsx
│   │   ├── McpPanel.test.tsx
│   │   ├── RewindTimeline.test.tsx
│   │   ├── SettingsPage.test.tsx
│   │   ├── PanelMessage.test.tsx
│   │   ├── SubagentPanel.test.tsx
│   │   ├── MessageActions.test.tsx
│   │   ├── Plan.test.tsx
│   │   ├── wsLogic.test.ts
│   │   ├── apiFetch.test.ts
│   │   ├── components.test.tsx
│   │   └── toast.test.ts
│   ├── server/                   # Unit tests for backend modules
│   │   ├── trust.test.ts
│   │   ├── permissions.test.ts
│   │   ├── actions.test.ts
│   │   ├── ext-notifications.test.ts
│   │   └── message-handler.test.ts
│   └── e2e/                      # Playwright integration tests
│       ├── chat-basic.spec.ts
│       ├── chat-scenarios.spec.ts
│       ├── tabs.spec.ts
│       ├── keyboard.spec.ts
│       ├── navigation.spec.ts
│       ├── history.spec.ts
│       ├── retry.spec.ts
│       ├── plan.spec.ts
│       ├── shell-streaming.spec.ts
│       ├── rewind.spec.ts
│       ├── goal.spec.ts
│       ├── metering.spec.ts
│       ├── queue.spec.ts
│       ├── settings.spec.ts
│       ├── suggestions.spec.ts
│       ├── subagent.spec.ts
│       ├── load-session-context.spec.ts
│       ├── security.spec.ts
│       ├── security-extended.spec.ts
│       ├── error-edge-cases.spec.ts
│       └── resilience.spec.ts
│
├── aidlc/                        # Planning & reference docs
│   ├── BACKLOG.md
│   ├── GOAL_ACCEPTANCE.md
│   ├── REWIND_ACCEPTANCE.md
│   ├── SUGGESTIONS_ACCEPTANCE.md
│   └── SUBAGENT_VIZ_ACCEPTANCE.md
│
├── .kiro/                        # Kiro CLI configuration
│   ├── steering/                 # Steering files (product, tech, structure, protocol)
│   ├── skills/                   # AIDLC skill definitions
│   ├── agents/                   # Agent configurations
│   ├── stages/                   # Stage definitions
│   ├── hooks/                    # Lifecycle hooks
│   ├── conventions/              # Coding conventions
│   └── tools/                    # Tool definitions
│
├── .github/workflows/ci.yml      # GitHub Actions CI pipeline
├── docs/guide/                   # Screenshot/video tour assets
└── dist/client/                  # Vite build output (gitignored)
```

## File Size Distribution

| File | Size | Role |
|------|------|------|
| `src/client/App.tsx` | 60 KB | Monolithic UI component (all views, state, handlers) |
| `src/client/styles.css` | 45 KB | Complete CSS with dark/light theming |
| `server.ts` | 27 KB | Full backend in a single file |
| `src/client/SettingsPage.tsx` | 14 KB | Settings UI (largest extracted component) |
| `src/client/appLogic.ts` | 5.4 KB | Extracted pure state logic |
| `src/client/types.ts` | 4.8 KB | Type definitions |

## Conventions

- **Module system**: ESM (`"type": "module"` in package.json)
- **Typing style**: TypeScript strict mode, but `any` used freely for ACP/Kiro extension payloads
- **State management**: React `useState`/`useRef` — no Redux, Zustand, or external state library
- **Component extraction**: Components extracted when >200 lines (App.tsx is the exception as the orchestrator)
- **Styling**: CSS variables for theming (`[data-theme="dark"]`/`[data-theme="light"]`), no CSS-in-JS
- **Naming**: camelCase for files and functions; PascalCase for React components
- **Tests**: Co-located by layer (tests/client/, tests/server/, tests/e2e/)
- **No barrel exports**: Direct imports to specific files
- **Backend modules**: Extracted only when independently testable (trust, permissions, prompt, notifications)
