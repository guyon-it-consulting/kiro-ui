# Architecture Review

**Date**: 2026-06-16
**Scope**: Full system (frontend + backend + desktop shell)
**Verdict**: Architecturally sound at the system level; structurally degraded at the component level. The protocol-first design and security posture are strong. The main risk is the concentration of all logic in two monolithic files (App.tsx, server.ts) which impairs maintainability, testability, and onboarding.

---

## Summary of Findings

| Area | Grade | Summary |
|------|-------|---------|
| System boundaries | ✓ Good | Clear 3-tier separation (Browser ↔ Server ↔ Agent) |
| Protocol design | ✓ Good | ACP-first, clean message types, extensible |
| Security | ✓ Good | Defence-in-depth (token, origin, CSP, sanitization, sandboxing) |
| Component boundaries | ✗ Poor | Two god-files hold all logic; extracted modules partially unused |
| State management | ✗ Poor | 30+ useState in one component; no structured reducer |
| Coupling (frontend) | ⚠ Moderate | Single switch handles all message types; no dispatch abstraction |
| Coupling (backend) | ⚠ Moderate | server.ts does HTTP + WS + ACP + suggestions inline |
| Testability | ⚠ Moderate | 84% coverage despite architecture, not because of it |
| Resilience | ✓ Good | Auto-reconnect, crash recovery, circuit breaker, graceful shutdown |
| Deployability | ✓ Good | CI pipeline, cross-platform builds, single-command start |

---

## Findings

### F-1: App.tsx God Component (Critical)

**What**: `App.tsx` is 894 lines containing:
- 30+ `useState` hooks
- 10+ `useRef` hooks
- The complete WebSocket message handler (30+ message types in a single switch)
- All rendering (sidebar, tabs, messages, panels, settings toggle, input area)
- All user interactions (send, cancel, tab management, session loading, export)
- Side effects (suggestions fetching, notifications, session listing)
- Inline SVG icons

**Impact**: Any change to any feature requires editing this one file. Merge conflicts are inevitable with concurrent work. Testing requires rendering the entire app. New developers cannot reason about a single feature in isolation.

**Root cause**: Features were added incrementally without extraction. The convention "extract at 200 lines" was not enforced for the orchestrator.

---

### F-2: server.ts Monolith (High)

**What**: `server.ts` is 619 lines containing:
- Express app setup + middleware
- HTTP API routes (7 endpoints including suggestions with Bedrock logic)
- WebSocket server with connection management
- ACP session lifecycle (createSession, teardown, watchProc)
- Rate limiting, transport factory, settings/trust management
- Inline suggestions API (prompt construction, response parsing)

**Impact**: Backend changes are risky — all concerns are interleaved. The existing `src/server/actions.ts` is a dead module (duplicates logic from server.ts but is never imported).

---

### F-3: Dead Code / Duplication (Medium)

**What**:
- `src/server/actions.ts` exports `handleAction` but server.ts reimplements the same logic inline and never imports it
- `src/client/appLogic.ts` exports `newTab` but App.tsx redefines an identical function locally
- `appLogic.ts` exports `handleTurnEnd`, `handleAgentChunk`, `handleToolCall`, etc. but App.tsx inlines the same logic in the switch statement

**Impact**: Maintenance hazard — bugs fixed in one location won't be fixed in the other. Tests cover the extracted module but the app uses the inline copy.

---

### F-4: Unstructured State Management (High)

**What**: All application state lives in 30+ independent `useState` calls in a single function component. State transitions are scattered across a ~300-line `handleMessage` callback.

**Impact**: No single place to understand state shape. No way to serialize/restore state. Race conditions possible between interleaved updates. Cannot implement undo/redo or state persistence without refactoring.

**Compared to**: A `useReducer` with typed actions would make state transitions explicit, serializable, and testable without rendering.

---

### F-5: Tight Frontend-Transport Coupling (Medium)

**What**: The frontend directly knows about all 30+ WebSocket message types and their shapes. There's no abstraction layer between "transport delivers a message" and "UI state changes."

**Impact**: Adding a new message type requires editing the monolithic switch in App.tsx. Cannot swap transport (e.g., for testing, or for an HTTP SSE fallback) without touching UI code.

---

### F-6: CSS Monolith (Low)

**What**: `styles.css` is 671 lines of global styles with no namespacing beyond class names. All component styles live in one file.

**Impact**: Style conflicts as the app grows. No co-location of styles with components. CSS specificity wars are inevitable.

---

### F-7: No Per-Feature Error Boundaries (Low)

**What**: A single `ErrorBoundary` wraps the entire app. If any component throws during render, the whole UI crashes.

**Impact**: A bug in the MCP panel or subagent visualization crashes the entire chat experience.

---

## What's Working Well

1. **Protocol-first design** — All agent interaction goes through ACP. The UI never accesses the filesystem directly. This creates a clean boundary that enables TCP transport, remote agents, and future multi-client scenarios.

2. **Security posture** — Defence-in-depth with token auth, origin validation, CSP, DOMPurify, rate limiting, memory limits, and Electron sandbox. This is well above average for a developer tool.

3. **Resilience** — WebSocket reconnect with backoff, crash auto-recovery with circuit breaker, graceful shutdown with force-kill fallback. These are production-grade patterns.

4. **Test coverage** — 84% coverage with both unit (Vitest) and E2E (Playwright) is strong for a project of this size. The extracted modules (trust, permissions, appLogic) have excellent test coverage.

5. **Build/deploy** — Single `npm start`, CI pipeline, cross-platform Electron builds. The developer experience for running and deploying is smooth.

---

## Refactoring Stories

### RS-1: Extract App.tsx into Feature Modules (Critical, ~3 days)

**Goal**: Reduce App.tsx from 894 to ~200 lines (orchestrator only).

**Approach**:
1. Extract `useTabState` hook — encapsulates all tab-related useState/useRef + updateTab into a single hook returning `{tabs, activeTab, addTab, closeTab, updateTab}`
2. Extract `useMessageHandler` hook — the entire handleMessage switch becomes a hook that receives `updateTab` and `send`, returns nothing (pure side-effect consumer)
3. Extract `ChatView` component — the messages list, thinking block, plan, tool groups, empty state
4. Extract `InputArea` component — textarea, attachments, queue UI, suggestions chips
5. Extract `TabBar` component — tab strip + config selectors
6. Extract `Sidebar` component — sessions list, filter, workspace selector

**Traces**: Improves testability of all features (US-1 through US-55)

---

### RS-2: Introduce useReducer for Tab State (High, ~1 day)

**Goal**: Replace 30+ useState calls with a single reducer + typed action discriminated union.

**Approach**:
1. Define `TabAction` union type (MessageChunk, ToolCall, TurnEnd, PermissionRequest, etc.)
2. Move all state transitions from handleMessage into a pure `tabReducer(state, action)`
3. The reducer becomes the single source of truth for all state transitions — trivially testable without rendering

**Traces**: Enables undo/redo, state persistence, time-travel debugging. Fixes duplication with appLogic.ts.

---

### RS-3: Modularize server.ts (High, ~2 days)

**Goal**: Reduce server.ts from 619 to ~150 lines (composition root only).

**Approach**:
1. Extract `src/server/routes.ts` — all Express routes (trust, settings, suggestions, pick-folder)
2. Extract `src/server/suggestions.ts` — Bedrock suggestions logic (generate, test, list models)
3. Extract `src/server/session-manager.ts` — createSession, teardown, watchProc, transport factory
4. Extract `src/server/ws-handler.ts` — WebSocket connection handler + message dispatch
5. Delete `src/server/actions.ts` (dead code) — its logic lives in ws-handler
6. server.ts becomes: import modules → compose → listen

**Traces**: Enables independent testing of each concern; unblocks parallel development on suggestions vs sessions vs routes.

---

### RS-4: Delete Dead Code (Medium, ~30 min)

**Goal**: Remove duplication between App.tsx and appLogic.ts.

**Approach**:
1. Remove the inline `newTab` function in App.tsx; import from appLogic.ts
2. Refactor handleMessage to use `handleAgentChunk`, `handleToolCall`, `handleToolCallUpdate`, `handleTurnEnd` from appLogic.ts (or fold them into the reducer from RS-2)
3. Delete `src/server/actions.ts` (never imported)

**Traces**: Eliminates the "fix in one place, bug persists in another" hazard.

---

### RS-5: Message Handler Dispatch Map (Medium, ~1 day)

**Goal**: Replace the 300-line switch statement with a typed dispatch map.

**Approach**:
```typescript
// messageHandlers.ts
const handlers: Record<string, (data: any, ctx: HandlerContext) => void> = {
  ready: handleReady,
  AgentMessageChunk: handleAgentChunk,
  ToolCall: handleToolCall,
  // ...
};

// In hook:
const handler = handlers[data.type];
if (handler) handler(data, ctx);
```

**Traces**: Each handler is independently testable. Adding a new message type = adding one function + one map entry. No monolith editing.

---

### RS-6: Co-locate Component Styles (Low, ~1 day)

**Goal**: Split styles.css into per-component CSS modules or co-located files.

**Approach**: Either CSS Modules (scoped) or a `ComponentName.css` convention imported by each component. Keep CSS variables and reset in a global `base.css`.

**Traces**: Eliminates global style conflicts; enables tree-shaking of unused styles.

---

### RS-7: Per-Feature Error Boundaries (Low, ~2 hours)

**Goal**: Wrap MCP panel, subagent panel, settings page, and tool blocks in their own error boundaries.

**Approach**: Reuse existing `ErrorBoundary` component with a fallback prop per section.

**Traces**: A crash in one panel doesn't destroy the entire app (SS-5, NFR robustness).

---

## Prioritized Roadmap

| Priority | Story | Effort | Dependencies |
|----------|-------|--------|--------------|
| 1 | RS-2: useReducer for state | 1 day | None |
| 2 | RS-4: Delete dead code | 30 min | RS-2 (use reducer instead of inline) |
| 3 | RS-1: Extract App.tsx | 3 days | RS-2 (state hook is the foundation) |
| 4 | RS-3: Modularize server.ts | 2 days | None (parallel with frontend) |
| 5 | RS-5: Dispatch map | 1 day | RS-1 + RS-2 (part of extraction) |
| 6 | RS-7: Error boundaries | 2 hours | RS-1 (wrap extracted components) |
| 7 | RS-6: CSS co-location | 1 day | RS-1 (components exist to co-locate with) |

**Total estimated effort**: ~8 days of focused refactoring work.

**Risk if deferred**: Every new feature (FR-82 through FR-92) will add more lines to the god-files, making this refactoring progressively harder and more dangerous. Recommend executing RS-2 + RS-4 immediately (1.5 days) as they deliver the highest value with the lowest risk.
