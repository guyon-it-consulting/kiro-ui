# /goal Command Support — Acceptance Criteria

## Context

Kiro CLI 2.7 introduces `/goal` — an iterative agent loop where Kiro works autonomously toward an objective, cycling through implementation and self-verification until acceptance criteria are met (default: 5 iterations, configurable with `--max`). `/goal clear` cancels an active goal.

The UI needs to surface goal progress so the user can track iterations and know when the agent is in a verification cycle vs implementing.

---

## User Scenarios

### Scenario 1: User starts a goal

**Given** the user types `/goal refactor auth to use JWT and ensure tests pass`  
**When** the message is sent  
**Then** a goal status banner appears showing the goal is active, with iteration "1/5"

### Scenario 2: Goal iterates through cycles

**Given** an active goal that requires multiple iterations  
**When** the agent completes an iteration and starts the next  
**Then** the banner updates to show current iteration (e.g., "2/5", "3/5")

### Scenario 3: Goal completes successfully

**Given** an active goal  
**When** the agent verifies all criteria are met and the turn ends  
**Then** the goal banner shows "✓ Goal complete" briefly, then disappears

### Scenario 4: User cancels a goal

**Given** an active goal  
**When** the user sends `/goal clear`  
**Then** the goal banner disappears and the session returns to normal mode

### Scenario 5: Goal with custom max iterations

**Given** the user types `/goal --max 10 migrate tests to Vitest`  
**When** the message is sent  
**Then** the banner shows iteration progress out of 10 (e.g., "1/10")

### Scenario 6: Goal hits max iterations without success

**Given** an active goal that doesn't converge  
**When** the agent exhausts all iterations  
**Then** the banner shows "⚠ Goal incomplete (5/5)" and the turn ends

---

## Acceptance Criteria

| # | Criterion | Verified by |
|---|-----------|-------------|
| AC-1 | When `/goal <text>` is sent, a goal state is stored on the tab with: text, maxIterations (default 5), currentIteration (1), status (active) | Unit test |
| AC-2 | A goal banner renders above the input area showing: iteration progress ("Iteration 2/5"), goal text (truncated), and a cancel button | Unit test + E2E |
| AC-3 | If a `_kiro.dev/goal/status` notification arrives, it updates iteration count and status | Unit test |
| AC-4 | If no notification is available, goal iteration is inferred from successive turn completions while goal is active (each turn end = +1 iteration) | Unit test |
| AC-5 | `/goal clear` resets goal state to null and removes the banner | Unit test + E2E |
| AC-6 | When goal status becomes "complete" or turn ends with stopReason while at max iterations, banner shows completion/incomplete state | Unit test |
| AC-7 | The `--max N` flag is parsed from the user input to set maxIterations | Unit test |
| AC-8 | Goal state is cleared when starting a new session or tab | Unit test |
| AC-9 | Existing `/goal` is sent as a regular prompt to the agent (no special routing) | E2E |
