# Requirements — Kiro UI

## Intent Summary

| Field | Value |
|-------|-------|
| **Type** | Product (brownfield — working system with active feature backlog) |
| **Scope** | Full product requirements baseline + planned enhancements |
| **Complexity** | Medium–High (cross-platform desktop/web app, real-time protocol bridge, multi-session) |
| **Classification** | Developer tool — AI chat interface |
| **Affected Repos** | `guyon-it-consulting/kiro-ui` (single repo) |

---

## Functional Requirements — Implemented

### Core Chat

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-1 | The system SHALL stream agent responses in real-time as markdown with syntax highlighting (10 languages) | E2E: agent response renders incrementally with highlighted code blocks |
| FR-2 | The system SHALL render markdown using marked.js with DOMPurify XSS sanitization | Unit test: malicious HTML stripped; rendered output is safe |
| FR-3 | The system SHALL allow users to send text prompts via an input area with Enter to send and Shift+Enter for newline | E2E: message sent on Enter, newline on Shift+Enter |
| FR-4 | The system SHALL support image attachments (paste, upload) with preview before sending | E2E: pasted image appears as preview, sent in prompt |
| FR-5 | The system SHALL support file attachments with content sent as ACP resource entries | E2E: attached file content included in prompt |
| FR-6 | The system SHALL cancel the current agent turn when the user presses Escape or clicks Cancel | E2E: cancel sent, turn ends with stopReason "cancelled" |
| FR-7 | The system SHALL display agent thinking/reasoning in a collapsible block with elapsed timer | Unit test: ThinkingBlock renders text + timer; collapses on click |
| FR-8 | The system SHALL display an agent plan (task list) with pending/in_progress/completed entries when received | Unit test: Plan entries render with correct status indicators |

### Tool Call Visualization

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-9 | The system SHALL display tool calls as collapsible blocks showing title, status, and kind | Unit test: ToolBlock renders with title + status badge |
| FR-10 | The system SHALL show side-by-side diffs for file modification tool calls | Unit test: diff viewer renders oldText vs newText |
| FR-11 | The system SHALL group consecutive tool calls into a collapsible group with count | Unit test: groupConsecutiveTools produces groups for adjacent tool messages |
| FR-12 | The system SHALL stream shell command output line-by-line within tool blocks (tool_call_chunk) | E2E: shell output appears incrementally |
| FR-13 | The system SHALL display raw tool input/output on toggle | Unit test: rawInput/rawOutput shown when expanded |
| FR-14 | The system SHALL show clickable file paths that open in the configured editor | E2E: file paths link to configured editor scheme |

### Multi-Tab Sessions

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-15 | The system SHALL support multiple tabs, each mapping 1:1 to an independent kiro-cli acp process | E2E: two tabs have different sessionIds |
| FR-16 | The system SHALL create new tabs via ⌘T or UI button, up to a configurable maximum (default 10) | E2E: new tab created; error shown at max |
| FR-17 | The system SHALL allow closing tabs, which terminates the associated agent process | E2E: close tab, process exits |
| FR-18 | The system SHALL auto-sync tab names with session titles | E2E: tab name updates after prompt |
| FR-19 | The system SHALL support per-tab configuration: agent mode, model, permission policy, effort level | E2E: changing mode on tab-1 doesn't affect tab-2 |

### Permission Management

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-20 | The system SHALL display permission prompts when the agent requests tool approval | E2E: permission dialog appears with options |
| FR-21 | The system SHALL support permission policies per tab: ask, allow-all, approve-reads | Unit test: resolvePermission returns correct outcome for each policy |
| FR-22 | The system SHALL persist "always allow" / "always reject" decisions to trust.json | Unit test: trust rules saved and loaded correctly |
| FR-23 | The system SHALL resolve permissions by checking trust rules first, then policy, then prompting user | Unit test: trust > policy > ask priority order |

### Slash Commands & Autocomplete

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-24 | The system SHALL show slash command autocomplete when input starts with `/` | E2E: typing `/` shows command list |
| FR-25 | The system SHALL fetch dynamic subcommand options via `_kiro.dev/commands/options` | E2E: `/agent` shows available agents |
| FR-26 | The system SHALL send slash commands as regular prompts to the agent | E2E: `/help` sent and processed |

### Conversation Branching (/rewind)

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-27 | The system SHALL display a visual timeline picker when `/rewind` is invoked | E2E: timeline appears with turn markers |
| FR-28 | The system SHALL show enriched turn summaries: tool count, files touched, commands run | Unit test: turn metadata computed correctly |
| FR-29 | The system SHALL fork the conversation at the selected turn point | E2E: rewind to turn N creates new branch |
| FR-30 | The system SHALL show fork indicators (⑂) for sessions with a parent session | E2E: forked session shows icon |

### Message Queue

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-31 | The system SHALL queue messages sent while the agent is running (always-on) | Unit test: enqueueMessage adds to queue when isRunning |
| FR-32 | The system SHALL auto-send queued messages sequentially after each turn ends | Unit test: handleTurnEnd dequeues next message |
| FR-33 | The system SHALL allow reordering (↑↓), merging, editing, deleting, and clearing queued messages | E2E: queue manipulation actions work |
| FR-34 | The system SHALL provide a "Send Now" button to flush the queue immediately | E2E: Send Now sends queue contents |

### Follow-up Suggestions

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-35 | The system SHALL generate up to N follow-up suggestions via Amazon Bedrock after each turn (configurable count, default 3) | E2E: suggestions appear after turn end |
| FR-36 | The system SHALL display suggestions as clickable chips that send the text as the next prompt | Unit test: clicking suggestion triggers prompt |
| FR-37 | The system SHALL strip the suggestions JSON block from displayed assistant messages | Unit test: extractSuggestions removes block from text |
| FR-38 | The system SHALL allow configuring suggestions: enable/disable, region, profile, model, count | E2E: settings page controls suggestions behavior |

### Goal Iterations

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-39 | The system SHALL parse `/goal <text>` and `/goal --max N <text>` to create a goal state with iteration tracking | Unit test: parseGoalCommand extracts text and maxIterations |
| FR-40 | The system SHALL display a goal banner showing iteration progress (e.g., "2/5"), goal text, and cancel button | E2E: banner visible during active goal |
| FR-41 | The system SHALL increment goal iteration on each turn end (or from `_kiro.dev/goal/status` notification) | Unit test: handleGoalTurnEnd increments correctly |
| FR-42 | The system SHALL show completion/incomplete state when goal resolves or exhausts iterations | Unit test: status transitions to complete/incomplete |
| FR-43 | `/goal clear` SHALL reset goal state and remove the banner | E2E: banner disappears |

### Subagent Visualization

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-44 | The system SHALL display a subagent panel when `SubagentListUpdate` arrives with non-empty subagents | Unit test: panel renders with stage names and statuses |
| FR-45 | The system SHALL show status icons per stage: ⏳ pending, ⟳ running, ✓ completed, ✗ failed | Unit test: correct icon per status |
| FR-46 | The system SHALL display last `SessionActivity` event under each running stage | Unit test: activity text shown |
| FR-47 | The system SHALL auto-collapse the panel when all stages complete | Unit test: collapsed when all done |
| FR-48 | The system SHALL visually distinguish failed stages (red/warning styling) | E2E: visual verification |

### MCP Server Management

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-49 | The system SHALL display MCP server status with live dots (online/offline/error) | E2E: dot colors reflect status |
| FR-50 | The system SHALL show expandable tool lists per MCP server | E2E: tools listed under server |
| FR-51 | The system SHALL handle OAuth flow for MCP servers (display auth URL, auto-retry after auth) | E2E: OAuth banner shown, server re-inits after auth |
| FR-52 | The system SHALL display MCP governance-disabled state | Unit test: governance message shown |

### Session History

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-53 | The system SHALL display workspace-scoped session history in the sidebar | E2E: sessions listed for current workspace |
| FR-54 | The system SHALL support client-side title filtering of sessions | E2E: filter narrows list |
| FR-55 | The system SHALL allow loading a previous session into the current tab | E2E: load session restores conversation |

### Metering & Context

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-56 | The system SHALL display cumulative token usage (input + output) and cost per session | E2E: metering values shown |
| FR-57 | The system SHALL show a context usage meter (pie chart) with compact mode at 50%+ | Unit test: context meter renders at thresholds |
| FR-58 | The system SHALL display compaction status when context compression occurs | E2E: compaction banner shown |

### Settings & Configuration

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-59 | The system SHALL provide a settings page with sections: general, agent, suggestions, permissions, limits, debug | E2E: all sections accessible |
| FR-60 | The system SHALL persist UI settings to `~/.kiro-ui/settings.json` | Unit test: settings saved and loaded |
| FR-61 | The system SHALL support editor integration (VS Code, Cursor, IntelliJ IDEA, none) for file path links | E2E: editor scheme changes link behavior |
| FR-62 | The system SHALL support configurable workspace directory with native folder picker | E2E: folder picker opens and selection persists |
| FR-63 | The system SHALL expose Kiro CLI agent settings via `_kiro.dev/settings/list` and `/set` | E2E: kiro settings shown and updatable |
| FR-64 | The system SHALL support effort level control via dropdown that probes model support dynamically | E2E: effort dropdown reflects available levels |

### Theme & UI

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-65 | The system SHALL support dark (default) and light themes with persistence in localStorage | E2E: theme toggles and persists |
| FR-66 | The system SHALL provide keyboard shortcuts: ⌘N (new chat), ⌘T (new tab), ⌘B (sidebar), ⌘L (clear) | E2E: shortcuts trigger actions |
| FR-67 | The system SHALL display message actions: copy, retry (on failure), rewind | E2E: actions shown contextually |
| FR-68 | The system SHALL export conversations as markdown via download button | E2E: export produces .md file |
| FR-69 | The system SHALL show a protocol debug panel with raw JSON-RPC traffic when enabled | E2E: debug panel shows in/out messages |
| FR-70 | The system SHALL display agent description in the empty state on new session or agent switch | E2E: welcome message shown |
| FR-71 | The system SHALL display file follow-along panel tracking files the agent is editing | E2E: panel updates with file paths |

### Transport & Connectivity

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-72 | The system SHALL support process transport (spawn kiro-cli acp as child process via stdio) | E2E: default transport works |
| FR-73 | The system SHALL support TCP transport (connect to remote kiro-cli over TCP socket) | Config test: TCP connection established |
| FR-74 | The system SHALL auto-reconnect WebSocket with exponential backoff (1s → 30s max) | Unit test: reconnect delays increase correctly |
| FR-75 | The system SHALL detect agent crashes and auto-restart within 1s (max 5 restarts per minute) | E2E: crash recovery works |
| FR-76 | The system SHALL detect kiro-cli auth failures and display an auth error without restart loop | E2E: auth error shown, no restart |

### Desktop (Electron)

| ID | Requirement | Verification |
|----|-------------|--------------|
| FR-77 | The system SHALL package as native desktop app for macOS (DMG, universal), Linux (AppImage, deb), Windows (NSIS, portable) | Build script produces artifacts |
| FR-78 | The system SHALL enforce single-instance lock (second launch focuses existing window) | Manual: second launch doesn't open new window |
| FR-79 | The system SHALL fix PATH when launched from Finder/GUI (macOS/Linux) | Manual: kiro-cli found after GUI launch |
| FR-80 | The system SHALL persist and restore window bounds across sessions | Manual: window position remembered |
| FR-81 | The system SHALL open external links in the default browser | Manual: links open externally |

---

## Functional Requirements — Planned (Backlog)

### High Priority

| ID | Requirement | Verification | Notes |
|----|-------------|--------------|-------|
| FR-82 | The system SHALL support queue steering mode: "steer" (inject mid-turn at tool boundary) vs "queue" (buffer until turn ends) | E2E: steer message interrupts active turn | Requires ACP support for mid-turn injection |
| FR-83 | The system SHALL use ACP `session/set_config_option` for agent/model/effort configuration instead of custom slash commands | E2E: config options auto-discovered and applied | Replace custom /effort implementation |

### Medium Priority

| ID | Requirement | Verification | Notes |
|----|-------------|--------------|-------|
| FR-84 | The system SHALL embed live terminal output for `ToolCallContent::Terminal` tool calls (create, output, wait_for_exit, release lifecycle) | E2E: terminal output streams within tool block | Currently only shows streamOutput text |
| FR-85 | The system SHALL support transcript export in markdown, plaintext, and JSON formats (aligned with kiro-cli `/transcript save`) | E2E: export in each format produces correct output | Currently only markdown |
| FR-86 | The system SHALL sync per-tab model/effort preferences with kiro-cli's persistent preferences | E2E: preference changes reflected bidirectionally | Kiro CLI 2.6 persists these |
| FR-87 | The system SHALL support scheduled prompts (cron-like) with a scheduler panel: prompt + interval + workspace | E2E: scheduled prompt fires at configured time | New feature |
| FR-88 | The system SHALL support full-text session search when ACP provides a search extension | N/A (blocked) | Blocked: `_kiro.dev/session/list` only returns titles |

### Low Priority

| ID | Requirement | Verification | Notes |
|----|-------------|--------------|-------|
| FR-89 | The system SHALL display `$AGENT_DISPLAY_OUT` content in a dedicated panel or inline with tool output | E2E: side channel content rendered | Agent Output Side Channels |
| FR-90 | The system SHALL show a keyboard shortcuts help overlay when pressing `?` or from a help button | E2E: overlay appears with all shortcuts | New feature |
| FR-91 | The system SHALL support multi-agent collaboration (assign tasks, share context) when ACP subagent support matures | N/A (blocked) | Depends on ACP maturity |
| FR-92 | The system SHALL mirror kiro-cli display/accessibility settings (animations, ASCII art, icons) in the UI | E2E: settings reflected in UI behavior | Kiro CLI 2.5 `/settings display` |

---

## Non-Functional Requirements

| ID | Requirement | Metric | Verification |
|----|-------------|--------|--------------|
| NFR-1 | The system SHALL bind to 127.0.0.1 only — no external network exposure | Network bind address = 127.0.0.1 | E2E: connection from non-localhost rejected |
| NFR-2 | The system SHALL require a per-startup auth token for all WebSocket and API connections | Unauthorized requests return 401 | E2E: request without token fails |
| NFR-3 | The system SHALL validate WebSocket origin (localhost/127.0.0.1 only) | Non-localhost origin rejected | E2E: foreign origin WS rejected |
| NFR-4 | The system SHALL set CSP headers: `script-src 'self'; style-src 'self' 'unsafe-inline'` | CSP header present on all responses | E2E: header verification |
| NFR-5 | The system SHALL sanitize all rendered markdown with DOMPurify (no raw HTML execution) | XSS payloads neutralized | Unit test: script tags stripped |
| NFR-6 | The system SHALL rate-limit WebSocket messages (configurable, default 30/min) | Messages beyond limit rejected with error | E2E: rate limit triggered |
| NFR-7 | The system SHALL limit concurrent tabs (configurable, default 10) | Tab creation beyond limit rejected | E2E: max tabs error |
| NFR-8 | The system SHALL limit child process memory (configurable, default 512 MB via --max-old-space-size) | OOM kills contained to child | Config verification |
| NFR-9 | The system SHALL validate path inputs with whitelist regex | Path traversal attempts rejected | E2E: security test |
| NFR-10 | The system SHALL render streaming chunks with no perceptible delay (< 16ms per chunk to DOM) | Visual smoothness at 60fps | Manual: no visible lag during streaming |
| NFR-11 | The system SHALL reconnect WebSocket within 1s of disconnection (first attempt) | Reconnect delay ≤ 1000ms on first failure | Unit test: initial delay = 1000ms |
| NFR-12 | The system SHALL restart crashed agent processes within 1s (max 5 per minute before giving up) | Recovery time ≤ 1s; circuit breaker at 5 | E2E: resilience test |
| NFR-13 | The system SHALL achieve ≥ 80% unit test coverage | Coverage report ≥ 80% | CI: coverage gate (currently 84%) |
| NFR-14 | The system SHALL pass TypeScript strict mode with zero errors | `tsc --noEmit` exits 0 | CI: typecheck step |
| NFR-15 | The system SHALL pass ESLint with zero errors | `eslint` exits 0 | CI: lint step |
| NFR-16 | The system SHALL support Node.js 22+ as the minimum runtime | engines.node ≥ 22.0.0 in package.json | Package.json check |
| NFR-17 | The system SHALL support cross-platform distribution: macOS, Linux, Windows (Electron) and web (any browser) | Build scripts produce platform artifacts | Build verification |
| NFR-18 | The system SHALL gracefully shut down on SIGTERM/SIGINT: close WebSocket connections, terminate child processes, force-kill after 3s | Clean shutdown without orphan processes | Manual: no zombies after stop |
| NFR-19 | The Electron app SHALL enforce sandbox security: nodeIntegration false, contextIsolation true, sandbox true | BrowserWindow webPreferences verified | Code inspection |
| NFR-20 | The system SHALL have no external database dependency — all state persisted to JSON files or held in memory | No DB connection in codebase | Code inspection |

---

## Assumptions

| # | Assumption |
|---|-----------|
| A-1 | `kiro-cli` is installed, authenticated, and available in PATH on the host machine |
| A-2 | The user has network access to AWS for follow-up suggestions (optional feature) |
| A-3 | The ACP SDK maintains backward compatibility within the ^0.22.x range |
| A-4 | The system is single-user (one person per server instance); no multi-tenancy needed |
| A-5 | Browser support targets modern evergreen browsers (Chrome, Firefox, Safari, Edge latest) |
| A-6 | TCP transport users handle their own network security (e.g., SSH tunnel, VPN) |

---

## Out of Scope

| # | Item | Rationale |
|---|------|-----------|
| OS-1 | Multi-user authentication / user accounts | Single-user localhost design |
| OS-2 | Cloud hosting / SaaS deployment | Self-hosted only by design |
| OS-3 | Mobile responsive layout | Desktop/laptop developer tool |
| OS-4 | Direct file system access from the UI | Protocol-first: all through ACP |
| OS-5 | Custom LLM backend integration | Locked to kiro-cli's backend |
| OS-6 | Plugin/extension system | Not in scope; extensibility via MCP servers |
| OS-7 | Conversation persistence beyond kiro-cli sessions | Session state owned by kiro-cli, not UI |
