---
id: IP-010.PHASE-01
slug: 010-minimal_mcp_transport_layer-phase-01
name: Session extraction and orchestrate refactor
created: '2026-03-12'
updated: '2026-03-12'
status: draft
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-010.PHASE-01
plan: IP-010
delta: DE-010
objective: >-
  Extract createSession() from orchestrate, refactor orchestrate to accept
  Session, fix all existing tests.
entrance_criteria:
  - DR-010 accepted
exit_criteria:
  - src/session.ts exists with createSession()
  - orchestrate accepts Session param
  - All existing tests pass
  - mise run check passes
verification:
  tests:
    - VT-session
    - VT-orchestrate-session
  evidence: []
tasks:
  - id: '1.1'
    summary: Create src/session.ts with createSession()
  - id: '1.2'
    summary: Refactor orchestrate to accept Session
  - id: '1.3'
    summary: Update cli.ts to create session
  - id: '1.4'
    summary: Fix existing tests
risks: []
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-010.PHASE-01
```

# Phase 1 — Session extraction and orchestrate refactor

## 1. Objective
Extract shared setup (URL parse, auth, client, cache) into `createSession()`. Refactor `orchestrate` to accept a `Session` instead of building internals. Pure refactor — no new features.

## 2. Links & References
- **Delta**: DE-010
- **Design Revision**: DR-010 §3 (Architecture Intent), §4 (Code Impact)
- **Specs**: PROD-001.NF-005

## 3. Entrance Criteria
- [x] DR-010 accepted

## 4. Exit Criteria / Done When
- [x] `src/session.ts` exports `Session` interface and `createSession()`
- [x] `orchestrate(session)` works with Session param
- [x] `cli.ts` creates session and passes to orchestrate
- [x] All existing tests pass (824/824)
- [x] `mise run check` passes (typecheck + test + lint)

## 5. Verification
- `mise run check` — all gates green
- Existing orchestrate tests pass with Session wiring
- New unit tests for `createSession`

## 6. Assumptions & STOP Conditions
- Assumes `buildCache` helper moves to session (it's currently private in orchestrate)
- STOP if refactor reveals orchestrate tests that depend on internal client/cache construction details

## 7. Tasks & Progress

| Status | ID | Description | Parallel? | Notes |
|--------|-----|-------------|-----------|-------|
| [x] | 1.1 | Create `src/session.ts` | | Session interface + createSession() |
| [x] | 1.2 | Refactor `orchestrate.ts` | | Accept Session, remove internal setup |
| [x] | 1.3 | Update `cli.ts` | | Create session, pass to orchestrate |
| [x] | 1.4 | Fix existing tests | | Wire Session in test calls via `run()` helper |
| [x] | 1.5 | Write `createSession` unit tests | | 7 tests in tests/session.test.ts |

### Task Details

- **1.1 Create `src/session.ts`**
  - **Files**: `src/session.ts` (new)
  - **Approach**: Extract lines 61–64 of orchestrate + `buildCache` helper. Export `Session` interface and `createSession(config: FetchConfig): Session`.

- **1.2 Refactor `orchestrate.ts`**
  - **Files**: `src/orchestrate.ts`
  - **Approach**: Change signature to `orchestrate(session: Session)`. Remove URL parse, auth, client, cache creation. Destructure from session. Keep all pipeline logic unchanged.

- **1.3 Update `cli.ts`**
  - **Files**: `src/cli.ts`
  - **Approach**: After `resolveConfig()`, call `createSession(config)`, pass session to `orchestrate(session)`.

- **1.4 Fix existing tests**
  - **Files**: `tests/orchestrate.test.ts` and any others calling orchestrate
  - **Approach**: Create a test session helper/fixture, wire into existing test calls.

- **1.5 Write `createSession` unit tests**
  - **Files**: `tests/session.test.ts` (new)
  - **Testing**: Verify client, cache, parsed fields are correctly constructed from config.

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
|------|-----------|--------|
| Tests tightly coupled to orchestrate internals | Inspect test fixtures first, adapt as needed | open |

## 9. Decisions & Outcomes
- `2026-03-12` — Session extraction approach decided in DR-010 design Q&A

## 10. Findings / Research Notes
- `orchestrate.ts` lines 61–64: the exact extraction point
- `buildCache` is a private helper — moves to session module

## 11. Wrap-up Checklist
- [x] Exit criteria satisfied
- [x] Verification evidence stored (mise run check: 824/824 tests, lint clean, typecheck clean)
- [ ] Hand-off notes to Phase 2
