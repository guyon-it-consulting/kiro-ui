# Enriched /rewind Preview — Acceptance Criteria

## Context

The `/rewind` timeline picker currently shows each turn as "Turn N" + the first 80 characters of the user's message. This makes it difficult to identify the right branch point when many turns look similar. The enrichment adds a summary of what happened *during* each turn (between the user message and the next user message): tool calls, files touched, and commands run.

---

## User Scenarios

### Scenario 1: Turn with tool calls shows tool count

**Given** a conversation with 3 turns where turn 2 triggered 4 tool calls  
**When** the user opens the rewind timeline  
**Then** turn 2 displays "4 tools" below the user message text

### Scenario 2: Turn with file modifications shows file paths

**Given** a conversation where the agent edited `src/App.tsx` and `src/styles.css` during turn 2  
**When** the user opens the rewind timeline  
**Then** turn 2 shows the file names (`App.tsx`, `styles.css`) in the turn summary

### Scenario 3: Turn with shell commands shows command count

**Given** a conversation where the agent ran 2 shell commands during turn 3  
**When** the user opens the rewind timeline  
**Then** turn 3 displays "2 commands" in the turn summary

### Scenario 4: Turn with no tool calls shows no enrichment

**Given** a conversation where turn 2 was a simple text response (no tools)  
**When** the user opens the rewind timeline  
**Then** turn 2 shows only the user text, with no summary metadata

### Scenario 5: Turn with mixed activity shows combined summary

**Given** a turn that had 3 tool calls, touched 2 files, and ran 1 command  
**When** the user opens the rewind timeline  
**Then** the turn shows "3 tools · 2 files · 1 command"

### Scenario 6: File deduplication

**Given** a turn where the agent edited `App.tsx` three times  
**When** the enrichment computes files touched  
**Then** `App.tsx` appears only once in the file list

---

## Acceptance Criteria

| # | Criterion | Verified by |
|---|-----------|-------------|
| AC-1 | Each turn in the rewind timeline shows a summary line with: tool count, unique files touched, commands run | Unit test + E2E |
| AC-2 | Tool count = number of `tool` role messages between this user message and the next | Unit test |
| AC-3 | Files touched = unique file paths extracted from `tool.content[].path` and `tool.title` path patterns | Unit test |
| AC-4 | Commands = tool calls where `tool.kind === 'shell'` or `tool.title` starts with common shell prefixes (`bash`, `shell`, `Execute`) | Unit test |
| AC-5 | If a turn has zero tools, no summary line is rendered (clean fallback) | Unit test |
| AC-6 | File names are shown as basename only (not full paths), max 3 displayed with "+N more" overflow | Unit test |
| AC-7 | Summary is visually distinct (smaller, muted color) from the user message text | CSS verification |
| AC-8 | Existing rewind behavior (click to rewind, newest-first ordering, turn 1 excluded) is unaffected | Existing E2E tests still pass |
