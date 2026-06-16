# Personas

## Primary Actors

### Developer (Dev)

The primary user. A software developer who prefers a visual browser/desktop interface over the terminal for AI-assisted coding. They use Kiro UI daily for writing code, debugging, refactoring, and exploring solutions. They value real-time feedback, visual diffs, and the ability to run multiple parallel conversations.

**Goals**: Get high-quality code assistance fast; see what the agent is doing in real-time; control what the agent is allowed to do.

### Power User (PU)

An advanced developer who pushes the tool to its limits. They use multi-tab workflows, inspect protocol traffic, configure per-session agents and models, and leverage features like goal iterations and subagent pipelines. They want full transparency and control.

**Goals**: Observe and debug agent behavior at the protocol level; orchestrate complex multi-step tasks; fine-tune every aspect of the interaction.

### Team Member (TM)

A developer on a team that shares Kiro UI as their standard AI interface. They need easy onboarding, consistent behavior, and the ability to resume past sessions. They may connect to a shared remote agent via TCP transport.

**Goals**: Access AI assistance without terminal knowledge; find and resume past conversations; rely on sensible defaults.

---

## System Actors

### Kiro UI Server

The Express/WebSocket backend that bridges the browser to kiro-cli. It enforces security policies, manages session lifecycle, and handles crash recovery.

### Kiro CLI Agent

The kiro-cli acp child process (or TCP remote) that performs the actual AI work. It is the source of truth for session state, tool execution, and protocol messages.

### Amazon Bedrock

External AWS service used exclusively for generating follow-up suggestions. Optional — the system functions fully without it.
