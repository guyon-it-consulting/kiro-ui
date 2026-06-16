# Suggestions Feature — Acceptance Criteria

## User Scenarios

### Scenario 1: Suggestions appear after agent response
**Given** the user sends a message and the agent responds
**When** the turn ends
**Then** up to 5 suggestion buttons appear below the messages, above the input area

### Scenario 2: Clicking a suggestion sends it as prompt
**Given** suggestions are visible
**When** the user clicks one
**Then** the suggestion text is sent as the next prompt, suggestions disappear, and the agent starts running

### Scenario 3: Suggestions disappear when a new message is sent manually
**Given** suggestions are visible
**When** the user types and sends their own message
**Then** the suggestions disappear

### Scenario 4: Suggestions block is stripped from displayed text
**Given** the agent responds with a ```suggestions block at the end
**When** the message is displayed
**Then** the raw suggestions JSON is NOT visible in the rendered message

### Scenario 5: Suggestions are not shown while agent is running
**Given** the agent is currently processing
**Then** no suggestion buttons are displayed

## Acceptance Conditions

1. `extractSuggestions()` correctly parses valid JSON arrays from fenced blocks
2. `extractSuggestions()` returns empty array for malformed/missing blocks
3. Maximum 5 suggestions are shown (excess trimmed)
4. Suggestion buttons are styled as clickable pills
5. The hidden prompt instruction is never visible to the user in the UI
6. The suggestions block is never visible in the rendered assistant message
