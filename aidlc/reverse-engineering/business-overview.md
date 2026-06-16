# Business Overview

## Domain

**AI-Assisted Software Development** — specifically, providing a browser/desktop graphical interface for interacting with the Kiro CLI agentic coding assistant.

## Problem Statement

AI coding assistants are either locked inside IDEs (Cursor, Copilot) or limited to basic terminal chat UIs that cannot display diffs, tool calls, multi-session workflows, or real-time streaming in a visual way. Developers and teams need a visual, self-hosted, cross-platform interface that preserves the full power of Kiro CLI without requiring terminal expertise.

## Solution

Kiro UI is a lightweight, self-hosted chat interface that streams Kiro CLI's full agentic capabilities — tool calls with diffs, MCP server management, multi-tab sessions, permission controls — all in a browser or as a native desktop app. It communicates with kiro-cli exclusively through the Agent Client Protocol (ACP).

## Target Users

| Persona | Description |
|---------|-------------|
| **Visual Developer** | Prefers a GUI over terminal for AI-assisted coding; wants to see diffs, tool output, and streaming responses graphically |
| **Team Lead / Manager** | Wants a shared, accessible interface to Kiro without IDE lock-in |
| **Power User** | Needs to observe tool calls, protocol traffic, and agent internals in real-time |

## Key Business Transactions

| Transaction | Flow | Value Delivered |
|-------------|------|-----------------|
| **Prompt → Agent Response** | User types → WS message → server → ACP SDK → kiro-cli → streaming response back | Core value: AI-assisted coding with real-time streaming |
| **Tool Call Execution** | Agent invokes tool → permission check → user approves/auto-approves → tool runs → result displayed with diff | Visual tool call transparency |
| **Session Management** | Create/switch/load/branch tabs → each tab = independent agent process | Multi-context parallel work |
| **Permission Management** | Agent requests permission → trust rules checked → policy applied → user prompt if needed → outcome sent back | Security & control over agent actions |
| **Follow-up Suggestions** | Turn ends → assistant text sent to Amazon Bedrock → suggestions rendered as clickable chips | Guided next-step discovery |
| **MCP Server Lifecycle** | Agent initializes MCP servers → status pushed to UI → OAuth flows triggered if needed | Extensibility & integration management |
| **Conversation Branching** | User invokes /rewind → timeline picker shown → forks conversation at selected point | Non-destructive exploration |
| **Goal Iterations** | User invokes /goal → agent loops with iteration tracking until goal met or max reached | Structured multi-step tasks |

## Domain Dictionary

| Term | Meaning |
|------|---------|
| **ACP** | Agent Client Protocol — the JSON-RPC protocol between UI and kiro-cli |
| **Tab/Session** | A browser tab maps 1:1 to a kiro-cli acp child process (or TCP connection) |
| **Mode** | An agent personality/configuration (e.g., different system prompts, tools) |
| **Trust Rule** | Persistent permission decision — "always allow" or "always reject" a specific tool |
| **Permission Policy** | Per-tab policy: ask, allow-all, approve-reads |
| **MCP** | Model Context Protocol — server extensions providing additional tools to the agent |
| **Compaction** | Context window compression performed by kiro-cli when context is too large |
| **Turn** | A single prompt→response cycle (may include multiple tool calls) |
| **Queue** | Messages queued while agent is processing; auto-sent sequentially |
| **Goal** | A /goal command that loops the agent for up to N iterations to achieve an objective |
| **Subagent** | Orchestrated child agent sessions with dependency tracking |

## Business Constraints

- **Self-hosted only** — no cloud SaaS; data never leaves user's machine (except Bedrock calls for suggestions)
- **kiro-cli dependency** — requires `kiro-cli` installed, authenticated, and in PATH
- **Single-user** — designed for localhost access; auth token is per-process, not multi-user
- **Protocol-first** — all features must work through ACP; no direct file system access from the UI
- **No database** — state is ephemeral (in-memory) + two JSON files on disk (settings.json, trust.json)

## Revenue Model

Open-source (Apache 2.0). No monetization. Published by Guyon IT Consulting.

## Success Metrics (inferred)

- Test coverage: 84% (198 tests passing)
- Cross-platform distribution: macOS DMG, Linux AppImage/deb, Windows NSIS
- Feature parity with terminal: all ACP capabilities surfaced in UI
