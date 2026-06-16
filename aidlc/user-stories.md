# User Stories

> Personas: **Dev** (Developer), **PU** (Power User), **TM** (Team Member)
> System actors: **Server**, **Agent**, **Bedrock**

---

## 1. Core Chat

### US-1: Streaming Agent Responses
**As a** Dev, **I want** to see the agent's response stream in real-time with formatted markdown and syntax-highlighted code, **so that** I can read and act on partial results without waiting for the full response.

**Traces**: FR-1, FR-2

**Acceptance Criteria**:
- **Given** I send a prompt, **When** the agent starts responding, **Then** text appears incrementally (chunk by chunk) in the message area
- **Given** the response contains a code block, **When** it renders, **Then** syntax highlighting is applied for the detected language
- **Given** the response contains malicious HTML (e.g., `<script>`), **When** it renders, **Then** DOMPurify strips the unsafe content

### US-2: Send Messages
**As a** Dev, **I want** to type messages and send them with Enter (and insert newlines with Shift+Enter), **so that** I can communicate naturally with the agent.

**Traces**: FR-3

**Acceptance Criteria**:
- **Given** I type text and press Enter, **When** the input is non-empty, **Then** the message is sent and the input clears
- **Given** I press Shift+Enter, **When** typing, **Then** a newline is inserted without sending
- **Given** the input is empty, **When** I press Enter, **Then** nothing is sent

### US-3: Image Attachments
**As a** Dev, **I want** to paste or upload images and preview them before sending, **so that** I can share screenshots or diagrams with the agent.

**Traces**: FR-4

**Acceptance Criteria**:
- **Given** I paste an image from clipboard, **When** the input area is focused, **Then** a thumbnail preview appears
- **Given** I have a pending image, **When** I send the message, **Then** the image data is included in the ACP prompt
- **Given** I have a pending image, **When** I click the remove button, **Then** the preview is removed

### US-4: File Attachments
**As a** Dev, **I want** to attach files to my messages, **so that** the agent can read their content as context.

**Traces**: FR-5

**Acceptance Criteria**:
- **Given** I select a file to attach, **When** the file is added, **Then** its name appears as a chip in the input area
- **Given** I send a message with attached files, **When** the prompt is built, **Then** file content is sent as ACP resource entries

### US-5: Cancel Turn
**As a** Dev, **I want** to cancel a running agent turn via Escape or a Cancel button, **so that** I can stop unwanted work immediately.

**Traces**: FR-6

**Acceptance Criteria**:
- **Given** the agent is running, **When** I press Escape or click Cancel, **Then** a cancel signal is sent and the turn ends with stopReason "cancelled"
- **Given** a permission prompt is pending, **When** I cancel, **Then** all pending permissions are resolved as "cancelled"

### US-6: Thinking Display
**As a** PU, **I want** to see the agent's reasoning in a collapsible block with an elapsed timer, **so that** I know the agent is working and can inspect its thought process.

**Traces**: FR-7

**Acceptance Criteria**:
- **Given** the agent emits thinking chunks, **When** displayed, **Then** a thinking block appears with accumulated text and a running timer
- **Given** the thinking block is open, **When** I click to collapse it, **Then** it collapses to a single line showing elapsed time
- **Given** the agent starts its final response, **When** text chunks arrive, **Then** the thinking block closes

### US-7: Agent Plan Display
**As a** Dev, **I want** to see the agent's task plan with status indicators (pending, in-progress, completed), **so that** I understand what steps the agent intends to take.

**Traces**: FR-8

**Acceptance Criteria**:
- **Given** the agent sends a Plan update, **When** entries are received, **Then** a task list renders with status icons per entry
- **Given** a plan entry transitions to completed, **When** updated, **Then** its icon changes to a checkmark

---

## 2. Tool Call Visualization

### US-8: Tool Call Display
**As a** Dev, **I want** to see tool calls as collapsible blocks with title, status badge, and kind, **so that** I can track what actions the agent is performing.

**Traces**: FR-9, FR-13

**Acceptance Criteria**:
- **Given** the agent invokes a tool, **When** a ToolCall message arrives, **Then** a collapsible block renders with the tool title and a status indicator (pending/running/done)
- **Given** a tool block is expanded, **When** I toggle raw view, **Then** raw input/output JSON is shown

### US-9: File Diffs in Tool Calls
**As a** Dev, **I want** to see side-by-side diffs when the agent modifies files, **so that** I can review changes before they're applied.

**Traces**: FR-10

**Acceptance Criteria**:
- **Given** a tool call contains oldText and newText, **When** rendered, **Then** a side-by-side diff viewer displays the changes
- **Given** a tool call has no diff content, **When** rendered, **Then** no diff viewer is shown

### US-10: Tool Call Grouping
**As a** Dev, **I want** consecutive tool calls grouped into a collapsible section with a count, **so that** lengthy sequences don't overwhelm the conversation.

**Traces**: FR-11

**Acceptance Criteria**:
- **Given** 3+ consecutive tool calls, **When** displayed, **Then** they are grouped with a header showing "N tools" and can be expanded/collapsed
- **Given** a single tool call not adjacent to others, **When** displayed, **Then** it renders individually

### US-11: Shell Streaming in Tools
**As a** Dev, **I want** to see shell command output stream line-by-line within tool blocks, **so that** I can follow command execution in real-time.

**Traces**: FR-12

**Acceptance Criteria**:
- **Given** a tool call of kind "shell", **When** tool_call_chunk messages arrive, **Then** output lines append incrementally inside the tool block

### US-12: Clickable File Paths
**As a** Dev, **I want** file paths in tool calls to be clickable and open in my configured editor, **so that** I can jump to the relevant file instantly.

**Traces**: FR-14

**Acceptance Criteria**:
- **Given** a tool call contains a file path, **When** I click it, **Then** it opens in my configured editor (VS Code, Cursor, or IntelliJ)
- **Given** editor is set to "none", **When** a file path renders, **Then** it is displayed as plain text (not clickable)

---

## 3. Multi-Tab Sessions

### US-13: Tab Management
**As a** Dev, **I want** to open multiple chat tabs, each with its own independent agent session, **so that** I can work on multiple tasks in parallel.

**Traces**: FR-15, FR-16, FR-17

**Acceptance Criteria**:
- **Given** I press ⌘T or click "New Tab", **When** tabs < max, **Then** a new tab opens with its own kiro-cli process and session ID
- **Given** I close a tab, **When** confirmed, **Then** the tab is removed and its agent process is terminated
- **Given** I have max tabs open, **When** I try to create another, **Then** an error message is shown

### US-14: Tab Name Sync
**As a** TM, **I want** tab names to auto-sync with the session title from the agent, **so that** I can identify conversations at a glance.

**Traces**: FR-18

**Acceptance Criteria**:
- **Given** the agent updates the session title, **When** the tab is active, **Then** the tab label updates to match

### US-15: Per-Tab Configuration
**As a** PU, **I want** to configure agent mode, model, permission policy, and effort level independently per tab, **so that** I can run different agents or settings in parallel.

**Traces**: FR-19

**Acceptance Criteria**:
- **Given** I change the model on tab-1, **When** tab-2 is active, **Then** tab-2 retains its own model selection
- **Given** I set permission policy to "allow-all" on one tab, **When** another tab prompts, **Then** the other tab still uses its own policy

---

## 4. Permission Management

### US-16: Permission Prompts
**As a** Dev, **I want** to see permission prompts when the agent requests tool approval, **so that** I can decide whether to allow actions like file writes or command execution.

**Traces**: FR-20

**Acceptance Criteria**:
- **Given** the agent requests permission, **When** the prompt arrives, **Then** a dialog shows the tool title and available options (allow once, always, reject once, always)
- **Given** I select an option, **When** clicked, **Then** the decision is sent back to the agent and the dialog disappears

### US-17: Permission Policies
**As a** PU, **I want** to set a per-tab permission policy (ask, allow-all, approve-reads), **so that** I can control my approval workflow without clicking every prompt.

**Traces**: FR-21

**Acceptance Criteria**:
- **Given** policy is "allow-all", **When** the agent requests any permission, **Then** it is auto-approved without prompting
- **Given** policy is "approve-reads", **When** a read-kind tool requests permission, **Then** it is auto-approved; write-kind still prompts
- **Given** policy is "ask", **When** any tool requests permission, **Then** the user is prompted

### US-18: Persistent Trust Rules
**As a** Dev, **I want** "always allow" and "always reject" decisions to persist across sessions, **so that** I don't have to re-approve trusted tools every time.

**Traces**: FR-22, FR-23

**Acceptance Criteria**:
- **Given** I select "allow always" for a tool, **When** that tool requests permission in a future session, **Then** it is auto-approved without prompting
- **Given** trust rules exist, **When** a permission is requested, **Then** trust is checked before policy before prompting user

---

## 5. Slash Commands & Autocomplete

### US-19: Slash Command Autocomplete
**As a** Dev, **I want** autocomplete suggestions to appear when I type `/`, **so that** I can discover and use available commands without memorizing them.

**Traces**: FR-24, FR-25

**Acceptance Criteria**:
- **Given** I type `/` in the input, **When** commands are available, **Then** a dropdown shows matching commands with descriptions
- **Given** I type `/agent `, **When** dynamic options are available, **Then** subcommand options are fetched via `_kiro.dev/commands/options` and displayed
- **Given** I select a command from the dropdown, **When** chosen, **Then** it is inserted into the input

### US-20: Slash Command Execution
**As a** Dev, **I want** slash commands to be sent as regular prompts, **so that** the agent handles them (Kiro CLI intercepts them server-side).

**Traces**: FR-26

**Acceptance Criteria**:
- **Given** I type `/help` and press Enter, **When** sent, **Then** the text is sent as a prompt and the agent processes it as a command

---

## 6. Conversation Branching (/rewind)

### US-21: Rewind Timeline Picker
**As a** Dev, **I want** a visual timeline picker when I invoke `/rewind`, **so that** I can select which turn to branch from.

**Traces**: FR-27

**Acceptance Criteria**:
- **Given** I send `/rewind`, **When** the timeline opens, **Then** it shows each turn as a selectable point with the user message preview
- **Given** I click a turn in the timeline, **When** selected, **Then** the conversation forks from that point

### US-22: Enriched Turn Summaries
**As a** Dev, **I want** the rewind timeline to show what happened in each turn (tool count, files touched, commands run), **so that** I can identify the right branch point.

**Traces**: FR-28

**Acceptance Criteria**:
- **Given** a turn had 4 tool calls touching 2 files, **When** the timeline shows it, **Then** the summary reads "4 tools · 2 files"
- **Given** a turn had no tool calls, **When** the timeline shows it, **Then** no summary metadata is displayed

### US-23: Fork Indicators
**As a** TM, **I want** to see fork indicators on sessions that were branched, **so that** I can distinguish original conversations from branches.

**Traces**: FR-29, FR-30

**Acceptance Criteria**:
- **Given** a session was created via rewind, **When** displayed in the sidebar, **Then** a ⑂ icon appears next to its name

---

## 7. Message Queue

### US-24: Always-On Queue
**As a** Dev, **I want** messages I send while the agent is running to be queued and sent automatically after the turn ends, **so that** I don't lose my thoughts.

**Traces**: FR-31, FR-32

**Acceptance Criteria**:
- **Given** the agent is running, **When** I send a message, **Then** it is added to the queue (not sent immediately)
- **Given** the agent turn ends and the queue is non-empty, **When** the next cycle starts, **Then** the first queued message is sent automatically

### US-25: Queue Manipulation
**As a** PU, **I want** to reorder, merge, edit, delete, and clear queued messages, **so that** I can refine my intent before it's sent.

**Traces**: FR-33, FR-34

**Acceptance Criteria**:
- **Given** multiple messages in the queue, **When** I click ↑/↓, **Then** the selected message moves position
- **Given** two messages in the queue, **When** I click merge (⊕), **Then** they combine into one
- **Given** messages in the queue, **When** I click "Send Now", **Then** all queued messages are flushed immediately
- **Given** a queued message, **When** I click edit, **Then** I can modify its text before it's sent

---

## 8. Follow-up Suggestions

### US-26: Suggestion Generation
**As a** Dev, **I want** AI-generated follow-up suggestions to appear after each agent response, **so that** I can quickly continue the conversation without thinking of the next prompt.

**Traces**: FR-35, FR-36

**Acceptance Criteria**:
- **Given** a turn ends with a substantial response, **When** suggestions are enabled, **Then** up to N clickable suggestion chips appear
- **Given** I click a suggestion, **When** clicked, **Then** its text is sent as the next prompt and suggestions disappear

### US-27: Suggestion Transparency
**As a** Dev, **I want** the suggestions JSON block to be stripped from the displayed message, **so that** I see a clean response.

**Traces**: FR-37

**Acceptance Criteria**:
- **Given** the agent response contains a ```suggestions code fence, **When** rendered, **Then** the fence is not visible in the message
- **Given** the fence contains valid JSON array, **When** parsed, **Then** suggestions are extracted (max 5)

### US-28: Suggestion Configuration
**As a** PU, **I want** to configure suggestions (enable/disable, AWS region, profile, model, count), **so that** I control cost and relevance.

**Traces**: FR-38

**Acceptance Criteria**:
- **Given** I disable suggestions in settings, **When** a turn ends, **Then** no Bedrock call is made and no chips appear
- **Given** I set count to 5, **When** suggestions are generated, **Then** up to 5 are shown
- **Given** I change the model, **When** the test button is clicked, **Then** connectivity is verified with the new model

---

## 9. Goal Iterations

### US-29: Start a Goal
**As a** PU, **I want** to use `/goal <text>` to start an iterative agent loop toward an objective, **so that** the agent works autonomously with self-verification.

**Traces**: FR-39, FR-40

**Acceptance Criteria**:
- **Given** I send `/goal refactor auth module`, **When** parsed, **Then** a goal state is created with text, maxIterations=5, currentIteration=1, status=active
- **Given** a goal is active, **When** rendered, **Then** a banner shows iteration progress ("1/5"), goal text (truncated), and a cancel button

### US-30: Goal Iteration Tracking
**As a** PU, **I want** the goal banner to update as iterations progress, **so that** I know how many cycles remain.

**Traces**: FR-41, FR-42

**Acceptance Criteria**:
- **Given** an active goal, **When** a turn ends, **Then** the iteration counter increments (e.g., "2/5")
- **Given** a `_kiro.dev/goal/status` notification arrives, **When** processed, **Then** the iteration and status are updated from the notification
- **Given** all iterations are exhausted, **When** the goal hasn't succeeded, **Then** the banner shows "Goal incomplete (5/5)"

### US-31: Cancel / Complete Goal
**As a** PU, **I want** to cancel a goal with `/goal clear` or see it complete when criteria are met, **so that** I can regain control or celebrate success.

**Traces**: FR-43

**Acceptance Criteria**:
- **Given** an active goal, **When** I send `/goal clear`, **Then** goal state resets to null and the banner disappears
- **Given** goal status becomes "complete", **When** updated, **Then** the banner briefly shows "✓ Goal complete" then disappears

### US-32: Custom Max Iterations
**As a** PU, **I want** to set custom max iterations with `/goal --max N`, **so that** I can give complex tasks more cycles.

**Traces**: FR-39

**Acceptance Criteria**:
- **Given** I send `/goal --max 10 migrate to Vitest`, **When** parsed, **Then** maxIterations is set to 10

---

## 10. Subagent Visualization

### US-33: Subagent Pipeline Display
**As a** PU, **I want** to see a panel showing subagent stages with their names, roles, and statuses, **so that** I can track multi-agent orchestration progress.

**Traces**: FR-44, FR-45

**Acceptance Criteria**:
- **Given** a SubagentListUpdate arrives with entries, **When** rendered, **Then** a panel shows each stage with name and status icon (⏳/⟳/✓/✗)
- **Given** no subagents are active, **When** rendering, **Then** no panel is shown

### US-34: Subagent Activity Feed
**As a** PU, **I want** to see real-time activity from running subagents (e.g., "reading file.ts"), **so that** I know what each stage is doing.

**Traces**: FR-46

**Acceptance Criteria**:
- **Given** a SessionActivity event arrives for a running stage, **When** processed, **Then** the activity text appears under that stage in the panel

### US-35: Subagent Completion & Failure
**As a** PU, **I want** the panel to auto-collapse when done and highlight failures, **so that** I can focus on issues.

**Traces**: FR-47, FR-48

**Acceptance Criteria**:
- **Given** all stages are completed, **When** the final update arrives, **Then** the panel auto-collapses
- **Given** a stage fails, **When** rendered, **Then** it is styled with red/warning and shows error context

---

## 11. MCP Server Management

### US-36: MCP Server Status
**As a** PU, **I want** to see MCP server status with live dots (green=online, red=error, grey=offline), **so that** I know which integrations are active.

**Traces**: FR-49, FR-50

**Acceptance Criteria**:
- **Given** MCP servers are reported via CommandsAvailable, **When** rendered in the panel, **Then** each server shows a colored status dot and tool count
- **Given** I expand a server, **When** tools are listed, **Then** each tool shows its name and description

### US-37: MCP OAuth Flow
**As a** Dev, **I want** the UI to handle OAuth authentication for MCP servers, **so that** I can authorize integrations without leaving the app.

**Traces**: FR-51

**Acceptance Criteria**:
- **Given** an MCP server requires OAuth, **When** McpOauthRequest arrives, **Then** a banner shows the auth URL as a clickable link
- **Given** I complete OAuth externally, **When** the server re-initializes, **Then** the banner disappears and status turns green

### US-38: MCP Governance State
**As a** TM, **I want** to see when MCP governance has been disabled (admin-level), **so that** I understand why servers might not load.

**Traces**: FR-52

**Acceptance Criteria**:
- **Given** McpGovernanceDisabled notification arrives, **When** displayed, **Then** a message explains MCP is disabled with context

---

## 12. Session History

### US-39: Session List
**As a** TM, **I want** to see my past sessions in the sidebar (scoped to the current workspace), **so that** I can resume previous conversations.

**Traces**: FR-53, FR-55

**Acceptance Criteria**:
- **Given** the sidebar is open, **When** sessions are loaded, **Then** workspace-scoped sessions are listed with titles and timestamps
- **Given** I click a session, **When** selected, **Then** it loads into the current tab

### US-40: Session Title Filter
**As a** TM, **I want** to filter sessions by title text, **so that** I can find specific conversations quickly.

**Traces**: FR-54

**Acceptance Criteria**:
- **Given** I type in the session filter input, **When** text is entered, **Then** only sessions with matching titles are shown

---

## 13. Metering & Context

### US-41: Token & Cost Display
**As a** PU, **I want** to see cumulative token usage (input + output) and cost per session, **so that** I can track resource consumption.

**Traces**: FR-56

**Acceptance Criteria**:
- **Given** Metadata arrives with meteringUsage, **When** accumulated, **Then** cumulative tokens and cost are displayed in the UI
- **Given** a new session starts, **When** rendered, **Then** cumulative counters reset to zero

### US-42: Context Usage Meter
**As a** Dev, **I want** to see a context usage pie chart that shows compact mode when usage exceeds 50%, **so that** I know when I'm approaching limits.

**Traces**: FR-57

**Acceptance Criteria**:
- **Given** contextUsagePercentage is below 50%, **When** rendered, **Then** the meter is hidden or minimal
- **Given** contextUsagePercentage exceeds 50%, **When** rendered, **Then** a compact pie-chart button appears

### US-43: Compaction Status
**As a** Dev, **I want** to see when context compaction is happening, **so that** I understand why there might be a pause.

**Traces**: FR-58

**Acceptance Criteria**:
- **Given** CompactionStatus with type "started" arrives, **When** displayed, **Then** a banner indicates compaction is in progress
- **Given** CompactionStatus with type "completed" arrives, **When** displayed, **Then** the banner disappears or shows success

---

## 14. Settings & Configuration

### US-44: Settings Page
**As a** Dev, **I want** a settings page with organized sections (general, agent, suggestions, permissions, limits, debug), **so that** I can configure the tool to my preferences.

**Traces**: FR-59, FR-60

**Acceptance Criteria**:
- **Given** I navigate to settings, **When** the page loads, **Then** all sections are accessible and current values are displayed
- **Given** I change a setting, **When** saved, **Then** it persists to `~/.kiro-ui/settings.json` and takes effect immediately

### US-45: Editor Integration
**As a** Dev, **I want** to choose my editor (VS Code, Cursor, IntelliJ, none) for file path links, **so that** clicking a path opens the file where I work.

**Traces**: FR-61

**Acceptance Criteria**:
- **Given** I select "cursor" as my editor, **When** a file path is clicked, **Then** it opens with the `cursor://file/` scheme
- **Given** I select "none", **When** file paths render, **Then** they are not clickable

### US-46: Workspace Directory
**As a** Dev, **I want** to set the workspace directory (with a native folder picker), **so that** sessions default to my project root.

**Traces**: FR-62

**Acceptance Criteria**:
- **Given** I click "Browse" next to workspace, **When** the OS folder picker opens, **Then** I can select a directory and it saves
- **Given** a workspace is set, **When** a new session starts, **Then** its cwd is the configured workspace

### US-47: Kiro CLI Agent Settings
**As a** PU, **I want** to view and modify Kiro CLI agent settings from the UI, **so that** I don't need to use the terminal for configuration.

**Traces**: FR-63

**Acceptance Criteria**:
- **Given** I open the agent settings section, **When** loaded, **Then** settings from `_kiro.dev/settings/list` are displayed
- **Given** I change a kiro setting, **When** saved, **Then** `_kiro.dev/settings/set` is called and confirmation shown

### US-48: Effort Level Control
**As a** Dev, **I want** an effort level dropdown that dynamically shows available levels for the current model, **so that** I can balance speed vs quality.

**Traces**: FR-64

**Acceptance Criteria**:
- **Given** the current model supports effort levels, **When** the dropdown is shown, **Then** available levels are listed (probed via command_options)
- **Given** I select a level, **When** applied, **Then** `set_config_option` is sent with the effort value
- **Given** the model doesn't support effort, **When** rendered, **Then** the dropdown is hidden or disabled

---

## 15. Theme & UI

### US-49: Dark/Light Theme
**As a** Dev, **I want** to toggle between dark (default) and light themes with persistence, **so that** the UI matches my environment.

**Traces**: FR-65

**Acceptance Criteria**:
- **Given** I toggle the theme, **When** changed, **Then** CSS variables switch and the choice persists in localStorage
- **Given** I reload the page, **When** it loads, **Then** the previously selected theme is applied

### US-50: Keyboard Shortcuts
**As a** Dev, **I want** keyboard shortcuts (⌘N new chat, ⌘T new tab, ⌘B sidebar, ⌘L clear), **so that** I can navigate quickly without the mouse.

**Traces**: FR-66

**Acceptance Criteria**:
- **Given** I press ⌘N, **When** in any state, **Then** a new chat session starts in the current tab
- **Given** I press ⌘B, **When** pressed, **Then** the sidebar toggles open/closed
- **Given** I press ⌘L, **When** a conversation exists, **Then** messages are cleared

### US-51: Message Actions
**As a** Dev, **I want** copy, retry (on failure), and rewind actions on messages, **so that** I can act on specific messages.

**Traces**: FR-67

**Acceptance Criteria**:
- **Given** I hover a message, **When** actions appear, **Then** I can copy its text to clipboard
- **Given** the last turn failed, **When** the retry action is shown, **Then** clicking it resends the message
- **Given** any user message, **When** I click rewind, **Then** the rewind flow starts from that turn

### US-52: Chat Export
**As a** TM, **I want** to export the current conversation as a markdown file, **so that** I can share or archive it.

**Traces**: FR-68

**Acceptance Criteria**:
- **Given** I click the export button, **When** triggered, **Then** a .md file downloads with the full conversation

### US-53: Protocol Debug Panel
**As a** PU, **I want** a debug panel showing raw JSON-RPC traffic (in/out), **so that** I can diagnose protocol issues.

**Traces**: FR-69

**Acceptance Criteria**:
- **Given** debug mode is enabled, **When** messages flow, **Then** the debug panel shows timestamped in/out JSON lines
- **Given** debug mode is off, **When** rendering, **Then** no debug panel or logging occurs

### US-54: Agent Welcome & Empty State
**As a** TM, **I want** to see the agent's description and welcome message in an empty session, **so that** I know what agent I'm talking to.

**Traces**: FR-70

**Acceptance Criteria**:
- **Given** a new session starts, **When** no messages exist, **Then** the agent description is shown in the empty state
- **Given** the agent is switched, **When** AgentSwitched arrives with welcomeMessage, **Then** it is displayed

### US-55: File Follow-Along Panel
**As a** Dev, **I want** a floating panel that tracks which files the agent is currently editing, **so that** I can follow along in my editor.

**Traces**: FR-71

**Acceptance Criteria**:
- **Given** tool calls reference file paths, **When** the agent is working, **Then** a panel shows currently active files
- **Given** a tool call completes, **When** the file is no longer being edited, **Then** it fades from the panel

---

## 16. Transport & Connectivity

### US-56: Process Transport
**As a** Dev, **I want** the UI to spawn a kiro-cli acp child process per tab (default), **so that** it works out of the box on my machine.

**Traces**: FR-72

**Acceptance Criteria**:
- **Given** transport is "process", **When** a new tab is created, **Then** a kiro-cli acp child process is spawned with stdio communication

### US-57: TCP Transport
**As a** TM, **I want** to connect to a remote kiro-cli over TCP, **so that** I can use a shared agent server without installing kiro-cli locally.

**Traces**: FR-73

**Acceptance Criteria**:
- **Given** transport is "tcp" with host/port configured, **When** a new tab is created, **Then** a TCP connection is established instead of spawning a process
- **Given** the TCP connection drops, **When** detected, **Then** the crash recovery mechanism activates

### US-58: WebSocket Auto-Reconnect
**As a** Dev, **I want** the WebSocket to auto-reconnect with exponential backoff, **so that** temporary disconnections don't lose my session.

**Traces**: FR-74

**Acceptance Criteria**:
- **Given** the WebSocket disconnects, **When** reconnecting, **Then** delay starts at 1s and doubles up to 30s max
- **Given** reconnection succeeds, **When** connected, **Then** the delay resets to 1s

### US-59: Agent Crash Recovery
**As a** Dev, **I want** crashed agent processes to auto-restart within 1 second, **so that** I can continue working with minimal disruption.

**Traces**: FR-75

**Acceptance Criteria**:
- **Given** the agent process exits unexpectedly, **When** detected, **Then** a new process is spawned within 1s and the tab re-initializes
- **Given** 5 crashes within 60s, **When** the limit is hit, **Then** auto-restart stops and an error message is shown

### US-60: Auth Error Detection
**As a** Dev, **I want** the UI to detect kiro-cli authentication failures and show a clear message (without restart-looping), **so that** I know to run `kiro-cli login`.

**Traces**: FR-76

**Acceptance Criteria**:
- **Given** kiro-cli stderr contains "not authenticated", **When** detected, **Then** an AuthError message is shown and no restart is attempted

---

## 17. Desktop (Electron)

### US-61: Desktop Packaging
**As a** Dev, **I want** Kiro UI available as a native desktop app on macOS, Linux, and Windows, **so that** I can use it without a browser tab.

**Traces**: FR-77

**Acceptance Criteria**:
- **Given** I run `electron:build:mac`, **When** complete, **Then** a DMG + ZIP are produced for universal macOS
- **Given** I run `electron:build:linux`, **When** complete, **Then** AppImage + deb are produced
- **Given** I run `electron:build:win`, **When** complete, **Then** NSIS installer + portable are produced

### US-62: Single Instance & Window State
**As a** Dev, **I want** only one instance of the desktop app to run, and window position/size to persist, **so that** I always return to my workspace.

**Traces**: FR-78, FR-80

**Acceptance Criteria**:
- **Given** the app is running, **When** I launch it again, **Then** the existing window is focused (no second instance)
- **Given** I resize and move the window, **When** I next launch, **Then** it opens at the saved position/size

### US-63: PATH Fix & External Links
**As a** Dev, **I want** the Electron app to fix PATH on macOS (when launched from Finder) and open external links in my default browser, **so that** kiro-cli is found and navigation works correctly.

**Traces**: FR-79, FR-81

**Acceptance Criteria**:
- **Given** the app is launched from Finder, **When** starting, **Then** PATH is populated from the user's shell profile
- **Given** I click an external link, **When** navigating, **Then** it opens in the default browser (not in the app window)

---

## 18. Backlog Features (Planned)

### US-64: Queue Steering Mode
**As a** PU, **I want** to choose between "steer" (inject mid-turn at tool boundary) and "queue" (buffer until turn ends) modes, **so that** I can interrupt or guide the agent in real-time.

**Traces**: FR-82

**Acceptance Criteria**:
- **Given** the agent is running, **When** I send a message in steer mode, **Then** it is injected at the next tool boundary (mid-turn)
- **Given** the agent is running, **When** I send a message in queue mode, **Then** it is buffered until the turn ends
- **Given** both modes are available, **When** I toggle, **Then** the mode switches and persists per-tab

### US-65: ACP-Native Session Config
**As a** PU, **I want** agent/model/effort configuration to use the ACP `session/set_config_option` API, **so that** options are auto-discovered and robust.

**Traces**: FR-83

**Acceptance Criteria**:
- **Given** the session starts, **When** config options are available, **Then** the UI auto-discovers available categories (mode, model, thought_level)
- **Given** I change the effort level, **When** applied, **Then** `session/set_config_option` is called (not a custom slash command)

### US-66: Terminal Embedding
**As a** Dev, **I want** live terminal output embedded within tool blocks (full terminal lifecycle: create → output → wait → release), **so that** I can see command execution as it happens.

**Traces**: FR-84

**Acceptance Criteria**:
- **Given** a tool call is of type Terminal, **When** terminal/output events arrive, **Then** output streams line-by-line in an embedded terminal block
- **Given** the terminal exits, **When** terminal/release arrives, **Then** the block shows final exit code

### US-67: Multi-Format Transcript Export
**As a** TM, **I want** to export conversations in markdown, plaintext, or JSON (matching kiro-cli `/transcript save` formats), **so that** I can use exports in different tools.

**Traces**: FR-85

**Acceptance Criteria**:
- **Given** I click export, **When** a format selector is shown, **Then** I can choose markdown, plaintext, or JSON
- **Given** I choose JSON, **When** exported, **Then** the output matches kiro-cli's transcript structure

### US-68: Persistent Model/Effort Sync
**As a** Dev, **I want** my model and effort choices to sync with kiro-cli's persistent preferences, **so that** changes in the UI reflect everywhere and vice versa.

**Traces**: FR-86

**Acceptance Criteria**:
- **Given** I change the model in the UI, **When** applied, **Then** kiro-cli persists it
- **Given** the model was changed via terminal, **When** a new session starts, **Then** the UI reflects the persisted preference

### US-69: Scheduled Prompts
**As a** PU, **I want** to schedule prompts on a cron-like interval, **so that** the agent can run recurring tasks (daily code review, periodic checks) automatically.

**Traces**: FR-87

**Acceptance Criteria**:
- **Given** I open the scheduler panel, **When** I define a prompt + interval + workspace, **Then** the schedule is saved
- **Given** a scheduled time is reached, **When** triggered, **Then** the prompt is sent to the configured workspace session

### US-70: Full-Text Session Search
**As a** TM, **I want** to search across all session content (not just titles), **so that** I can find past conversations by what was discussed.

**Traces**: FR-88

**Acceptance Criteria**:
- **Given** a search ACP extension exists, **When** I search, **Then** results include sessions matching content
- *Note*: Blocked until `_kiro.dev/session/list` supports content search

### US-71: Agent Display Side Channel
**As a** PU, **I want** `$AGENT_DISPLAY_OUT` content shown in a dedicated panel or inline, **so that** I can see agent-generated display content.

**Traces**: FR-89

**Acceptance Criteria**:
- **Given** a tool call emits AGENT_DISPLAY_OUT, **When** received, **Then** the content renders in a distinct panel/section

### US-72: Keyboard Shortcuts Help
**As a** TM, **I want** a shortcuts help overlay accessible via `?` or a help button, **so that** I can discover available keyboard shortcuts.

**Traces**: FR-90

**Acceptance Criteria**:
- **Given** I press `?` or click help, **When** triggered, **Then** a modal shows all available keyboard shortcuts

### US-73: Multi-Agent Collaboration
**As a** PU, **I want** multiple agents to collaborate on the same project (assign tasks, share context), **so that** complex work can be parallelized.

**Traces**: FR-91

**Acceptance Criteria**:
- **Given** ACP subagent support is mature, **When** I assign work to multiple agents, **Then** they collaborate with shared context
- *Note*: Blocked until ACP subagent maturity

### US-74: Display Settings Sync
**As a** Dev, **I want** kiro-cli display/accessibility settings (animations, icons) mirrored in the UI, **so that** my preferences are consistent across terminal and UI.

**Traces**: FR-92

**Acceptance Criteria**:
- **Given** I set display preferences in kiro-cli, **When** the UI loads, **Then** it reflects those preferences (e.g., no animations if disabled)

---

## 19. System Stories (Non-Functional Requirements)

### SS-1: Network Binding Security
**As the** Server, **when** starting up, **it must** bind exclusively to 127.0.0.1, preventing any external network access.

**Traces**: NFR-1

**Acceptance Criteria**:
- **Given** the server starts, **When** listening, **Then** it binds to 127.0.0.1 (not 0.0.0.0)
- **Given** a connection attempt from a non-local IP, **When** received, **Then** it is rejected

### SS-2: Per-Startup Auth Token
**As the** Server, **when** a client connects, **it must** require a per-startup cryptographic auth token for all WebSocket and API connections.

**Traces**: NFR-2

**Acceptance Criteria**:
- **Given** no token is provided, **When** connecting to /api or WS, **Then** a 401 response is returned
- **Given** an invalid token, **When** connecting, **Then** the connection is rejected
- **Given** a valid token, **When** connecting, **Then** the connection is accepted

### SS-3: WebSocket Origin Validation
**As the** Server, **when** a WebSocket upgrade request arrives, **it must** validate the origin header is localhost or 127.0.0.1.

**Traces**: NFR-3

**Acceptance Criteria**:
- **Given** origin is `http://localhost:5173`, **When** connecting, **Then** accepted
- **Given** origin is `http://evil.com`, **When** connecting, **Then** rejected

### SS-4: Content Security Policy
**As the** Server, **when** serving any response, **it must** include CSP headers restricting scripts to self and styles to self + unsafe-inline.

**Traces**: NFR-4

**Acceptance Criteria**:
- **Given** any HTTP response, **When** headers are sent, **Then** CSP header is present with `script-src 'self'`

### SS-5: XSS Sanitization
**As the** Server (frontend), **when** rendering markdown content, **it must** sanitize all output via DOMPurify with no raw HTML execution.

**Traces**: NFR-5

**Acceptance Criteria**:
- **Given** markdown contains `<script>alert(1)</script>`, **When** rendered, **Then** the script tag is stripped

### SS-6: Rate Limiting
**As the** Server, **when** receiving WebSocket messages, **it must** enforce a configurable rate limit (default 30 messages per minute per connection).

**Traces**: NFR-6

**Acceptance Criteria**:
- **Given** 31 messages sent within 60s, **When** the limit is exceeded, **Then** an error is returned and excess messages are dropped

### SS-7: Tab Limit Enforcement
**As the** Server, **when** a new tab is requested, **it must** reject it if the configurable maximum (default 10) is reached.

**Traces**: NFR-7

**Acceptance Criteria**:
- **Given** 10 tabs are open, **When** tab 11 is requested, **Then** an error message is returned

### SS-8: Child Process Memory Limits
**As the** Server, **when** spawning kiro-cli child processes, **it must** set memory limits via --max-old-space-size (default 512 MB).

**Traces**: NFR-8

**Acceptance Criteria**:
- **Given** a child process is spawned, **When** NODE_OPTIONS is set, **Then** it includes `--max-old-space-size=512`

### SS-9: Path Input Validation
**As the** Server, **when** receiving user-provided paths, **it must** validate them against a whitelist regex to prevent path traversal.

**Traces**: NFR-9

**Acceptance Criteria**:
- **Given** a path containing `../`, **When** validated, **Then** it is rejected
- **Given** a path matching the whitelist, **When** validated, **Then** it is accepted

### SS-10: Streaming Performance
**As the** Server (frontend), **when** rendering streaming chunks, **it must** process each chunk with no perceptible delay (< 16ms per chunk to DOM).

**Traces**: NFR-10

**Acceptance Criteria**:
- **Given** rapid chunks arrive, **When** rendered, **Then** no visible stutter at 60fps (visual verification)

### SS-11: WebSocket Reconnection Timing
**As the** Server (frontend), **when** the WebSocket disconnects, **it must** attempt reconnection within 1s on first failure, with exponential backoff to 30s max.

**Traces**: NFR-11

**Acceptance Criteria**:
- **Given** first disconnection, **When** reconnecting, **Then** delay is ≤ 1000ms
- **Given** successive failures, **When** backing off, **Then** delay doubles up to 30s

### SS-12: Agent Crash Recovery
**As the** Server, **when** an agent process exits unexpectedly, **it must** restart it within 1s (max 5 restarts per 60s before circuit-breaking).

**Traces**: NFR-12

**Acceptance Criteria**:
- **Given** the process exits, **When** < 5 restarts in 60s, **Then** a new process starts within 1s
- **Given** 5 restarts in 60s, **When** the 6th crash occurs, **Then** no restart is attempted and an error is emitted

### SS-13: Test Coverage Gate
**As the** CI pipeline, **when** running tests, **it must** achieve ≥ 80% unit test coverage.

**Traces**: NFR-13

**Acceptance Criteria**:
- **Given** `npm run test:coverage` runs, **When** complete, **Then** coverage report shows ≥ 80%

### SS-14: TypeScript Strict Compliance
**As the** CI pipeline, **when** type-checking, **it must** pass TypeScript strict mode with zero errors.

**Traces**: NFR-14

**Acceptance Criteria**:
- **Given** `tsc --noEmit` runs, **When** complete, **Then** exit code is 0

### SS-15: Lint Compliance
**As the** CI pipeline, **when** linting, **it must** pass ESLint with zero errors.

**Traces**: NFR-15

**Acceptance Criteria**:
- **Given** `npm run lint` runs, **When** complete, **Then** exit code is 0

### SS-16: Minimum Node.js Version
**As the** Server, **when** starting, **it must** require Node.js 22+ as the minimum runtime.

**Traces**: NFR-16

**Acceptance Criteria**:
- **Given** package.json engines field, **When** checked, **Then** `"node": ">=22.0.0"` is specified

### SS-17: Cross-Platform Distribution
**As the** build system, **when** packaging, **it must** produce artifacts for macOS, Linux, and Windows (Electron) and serve web (any browser).

**Traces**: NFR-17

**Acceptance Criteria**:
- **Given** build scripts for each platform, **When** executed, **Then** platform-specific artifacts are produced

### SS-18: Graceful Shutdown
**As the** Server, **when** receiving SIGTERM or SIGINT, **it must** close WebSocket connections, terminate child processes, and force-kill after 3s.

**Traces**: NFR-18

**Acceptance Criteria**:
- **Given** SIGTERM is received, **When** shutting down, **Then** WS clients are closed, children get SIGTERM, then SIGKILL after 3s
- **Given** shutdown completes, **When** done, **Then** no orphan processes remain

### SS-19: Electron Sandbox Security
**As the** Electron app, **when** creating a BrowserWindow, **it must** set nodeIntegration=false, contextIsolation=true, sandbox=true.

**Traces**: NFR-19

**Acceptance Criteria**:
- **Given** the window is created, **When** webPreferences are set, **Then** all three security flags are enforced

### SS-20: No External Database
**As the** system, **when** persisting state, **it must** use only JSON files or in-memory state — no external database dependency.

**Traces**: NFR-20

**Acceptance Criteria**:
- **Given** the entire codebase, **When** inspected, **Then** no database driver or connection string exists

---

## 20. Traceability Matrix

| Requirement | Story | Status |
|-------------|-------|--------|
| FR-1 | US-1 | Implemented |
| FR-2 | US-1 | Implemented |
| FR-3 | US-2 | Implemented |
| FR-4 | US-3 | Implemented |
| FR-5 | US-4 | Implemented |
| FR-6 | US-5 | Implemented |
| FR-7 | US-6 | Implemented |
| FR-8 | US-7 | Implemented |
| FR-9 | US-8 | Implemented |
| FR-10 | US-9 | Implemented |
| FR-11 | US-10 | Implemented |
| FR-12 | US-11 | Implemented |
| FR-13 | US-8 | Implemented |
| FR-14 | US-12 | Implemented |
| FR-15 | US-13 | Implemented |
| FR-16 | US-13 | Implemented |
| FR-17 | US-13 | Implemented |
| FR-18 | US-14 | Implemented |
| FR-19 | US-15 | Implemented |
| FR-20 | US-16 | Implemented |
| FR-21 | US-17 | Implemented |
| FR-22 | US-18 | Implemented |
| FR-23 | US-18 | Implemented |
| FR-24 | US-19 | Implemented |
| FR-25 | US-19 | Implemented |
| FR-26 | US-20 | Implemented |
| FR-27 | US-21 | Implemented |
| FR-28 | US-22 | Implemented |
| FR-29 | US-23 | Implemented |
| FR-30 | US-23 | Implemented |
| FR-31 | US-24 | Implemented |
| FR-32 | US-24 | Implemented |
| FR-33 | US-25 | Implemented |
| FR-34 | US-25 | Implemented |
| FR-35 | US-26 | Implemented |
| FR-36 | US-26 | Implemented |
| FR-37 | US-27 | Implemented |
| FR-38 | US-28 | Implemented |
| FR-39 | US-29, US-32 | Implemented |
| FR-40 | US-29 | Implemented |
| FR-41 | US-30 | Implemented |
| FR-42 | US-30 | Implemented |
| FR-43 | US-31 | Implemented |
| FR-44 | US-33 | Implemented |
| FR-45 | US-33 | Implemented |
| FR-46 | US-34 | Implemented |
| FR-47 | US-35 | Implemented |
| FR-48 | US-35 | Implemented |
| FR-49 | US-36 | Implemented |
| FR-50 | US-36 | Implemented |
| FR-51 | US-37 | Implemented |
| FR-52 | US-38 | Implemented |
| FR-53 | US-39 | Implemented |
| FR-54 | US-40 | Implemented |
| FR-55 | US-39 | Implemented |
| FR-56 | US-41 | Implemented |
| FR-57 | US-42 | Implemented |
| FR-58 | US-43 | Implemented |
| FR-59 | US-44 | Implemented |
| FR-60 | US-44 | Implemented |
| FR-61 | US-45 | Implemented |
| FR-62 | US-46 | Implemented |
| FR-63 | US-47 | Implemented |
| FR-64 | US-48 | Implemented |
| FR-65 | US-49 | Implemented |
| FR-66 | US-50 | Implemented |
| FR-67 | US-51 | Implemented |
| FR-68 | US-52 | Implemented |
| FR-69 | US-53 | Implemented |
| FR-70 | US-54 | Implemented |
| FR-71 | US-55 | Implemented |
| FR-72 | US-56 | Implemented |
| FR-73 | US-57 | Implemented |
| FR-74 | US-58 | Implemented |
| FR-75 | US-59 | Implemented |
| FR-76 | US-60 | Implemented |
| FR-77 | US-61 | Implemented |
| FR-78 | US-62 | Implemented |
| FR-79 | US-63 | Implemented |
| FR-80 | US-62 | Implemented |
| FR-81 | US-63 | Implemented |
| FR-82 | US-64 | Planned (High) |
| FR-83 | US-65 | Planned (High) |
| FR-84 | US-66 | Planned (Medium) |
| FR-85 | US-67 | Planned (Medium) |
| FR-86 | US-68 | Planned (Medium) |
| FR-87 | US-69 | Planned (Medium) |
| FR-88 | US-70 | Blocked |
| FR-89 | US-71 | Planned (Low) |
| FR-90 | US-72 | Planned (Low) |
| FR-91 | US-73 | Blocked |
| FR-92 | US-74 | Planned (Low) |
| NFR-1 | SS-1 | Implemented |
| NFR-2 | SS-2 | Implemented |
| NFR-3 | SS-3 | Implemented |
| NFR-4 | SS-4 | Implemented |
| NFR-5 | SS-5 | Implemented |
| NFR-6 | SS-6 | Implemented |
| NFR-7 | SS-7 | Implemented |
| NFR-8 | SS-8 | Implemented |
| NFR-9 | SS-9 | Implemented |
| NFR-10 | SS-10 | Implemented |
| NFR-11 | SS-11 | Implemented |
| NFR-12 | SS-12 | Implemented |
| NFR-13 | SS-13 | Implemented |
| NFR-14 | SS-14 | Implemented |
| NFR-15 | SS-15 | Implemented |
| NFR-16 | SS-16 | Implemented |
| NFR-17 | SS-17 | Implemented |
| NFR-18 | SS-18 | Implemented |
| NFR-19 | SS-19 | Implemented |
| NFR-20 | SS-20 | Implemented |
