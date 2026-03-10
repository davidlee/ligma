# Notes for DE-008

## Phase 1 — Implementation (2026-03-11)

### Stroke weight (ISSUE-001)
- `parseIndividualWeights` extracted to keep `resolveStrokeWeight` under complexity limit
- Zero is a valid weight — `null` strictly means "field absent"
- `individualStrokeWeights` precedence over scalar confirmed correct per Figma docs
- Blast radius confirmed contained: no downstream code reads `.weight` as bare number

### Interaction extraction (ISSUE-002)
- Action kind derived from `action.navigation` for node-targeting actions, not top-level `action.type`
- `DIRECT_ACTION_MAP` handles BACK, CLOSE, URL, OPEN_URL to keep `mapAction` under complexity limit
- Lossy normalization boundary documented: SET_VARIABLE, SET_VARIABLE_MODE, CONDITIONAL, UPDATE_MEDIA_RUNTIME → `unknown` + warning
- Media triggers (ON_MEDIA_HIT, ON_MEDIA_END) → `unknown` + warning

### Quality gate
- 607 tests passing (30 new interaction, 7 updated stroke weight)
- Zero lint warnings
- Contracts synced
- Requirements registry auto-linked DE-008 → FR-006
