---
id: IP-006.PHASE-03
slug: 006-selective_expansion_and_caching-phase-03
name: IP-006 Phase 03 — Integration and CLI
created: '2026-03-11'
updated: '2026-03-11'
status: draft
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-006.PHASE-03
plan: IP-006
delta: DE-006
objective: >-
  Wire expansion loop and cache into orchestrate, extend FetchConfig with
  expansion + cache fields and validation, add CLI flags. Produces the
  end-to-end pipeline: fetch → cache → normalize → trigger → refetch →
  merge → re-normalize. Regression boundary: expansion-disabled path
  identical to pre-DE-006 behavior.
entrance_criteria:
  - P01 complete (cache layer)
  - P02 complete (expansion engine)
  - DR-006 §§9–10 reviewed
exit_criteria:
  - VT-034 through VT-038 pass
  - mise run check green (typecheck + lint + all tests)
  - No regressions in existing test suites
  - Contracts regenerated
verification:
  tests:
    - VT-034
    - VT-035
    - VT-036
    - VT-037
    - VT-038
  evidence: []
tasks:
  - id: '3.1'
    description: FetchConfig expansion + cache fields
  - id: '3.2'
    description: Orchestrate expansion loop + cache wiring
  - id: '3.3'
    description: CLI flags
  - id: '3.4'
    description: Regression + resilience tests
risks:
  - description: Orchestrate complexity exceeds max-lines-per-function
    mitigation: Extract expansion loop and cache setup into helper functions
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-006.PHASE-03
```

# Phase 03 — Integration and CLI

## 1. Objective

Wire the cache layer (P01) and expansion engine (P02) into the existing pipeline. Extend `FetchConfig` with expansion and cache fields, add validation in `resolveConfig`, wire the expansion loop into `orchestrate`, and add CLI flags. The expansion-disabled path must produce identical results to pre-DE-006 behavior.

## 2. Links & References
- **Delta**: DE-006
- **Design Revision Sections**: DR-006 §9 (config changes), §10 (orchestrate flow), §11 (adversarial findings)
- **Requirements**: PROD-001.FR-014, PROD-001.FR-015
- **Key Decisions**: DEC-032 (expand in orchestrate), DEC-035 (cache at fetch boundary), DEC-036 (single pass), DEC-039 (version threading), DEC-040 (image fetch once)

## 3. Entrance Criteria
- [x] P01 complete (cache layer: 41 tests)
- [x] P02 complete (expansion engine: 36 tests)
- [x] DR-006 §§9–10 reviewed

## 4. Exit Criteria / Done When
- [x] `src/config.ts` gains expansion + cache fields with validation
- [x] `src/orchestrate.ts` wires expansion loop + cache-aware fetch
- [x] `src/cli.ts` adds --no-expand, --max-expand, --expand-depth, --no-cache, --cache-directory
- [x] `OrchestrateResult` gains `expansion: ExpansionResult | null`
- [x] VT-034 through VT-038 all pass
- [x] Existing 18 orchestrate tests still pass (regression)
- [x] `mise run check` green
- [x] Contracts regenerated

## 5. Verification

| VT | Description | Test file | Type |
| --- | --- | --- | --- |
| VT-034 | Orchestrate expansion loop: shallow fetch → trigger → refetch → merge → re-normalize | `tests/orchestrate.test.ts` | integration |
| VT-035 | Expansion disabled produces identical result to pre-DE-006 path | `tests/orchestrate.test.ts` | regression |
| VT-036 | Failed expansion fetch: pipeline continues, original subtree intact, diagnostic recorded | `tests/orchestrate.test.ts` | integration |
| VT-037 | Expansion respects maxTargets bound | `tests/orchestrate.test.ts` | integration |
| VT-038 | Config validation: depth >= 1, expansionDepth >= 1, maxTargets >= 0 | `tests/config.test.ts` or inline | unit |

Commands: `mise run check`, `mise run contracts`

## 6. Assumptions & STOP Conditions
- **Assumptions**: Existing orchestrate tests use global fetch mock and can coexist with expansion tests. `fetchNode` accepts depth/geometry options already. Version available on `FigmaFileResponse.version`.
- **STOP when**: Orchestrate complexity requires restructuring beyond helper extraction. If the expansion loop pushes orchestrate past testable complexity, consider extracting an `expandAndMerge` coordinator function.

## 7. Tasks & Progress

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [x] | 3.1 | FetchConfig expansion + cache fields + validation + VT-038 | | 9 tests |
| [x] | 3.2 | Orchestrate expansion loop + cache wiring + VT-034–036 | | 5 tests |
| [x] | 3.3 | CLI flags (--no-expand, --max-expand, --expand-depth, --no-cache, --cache-directory) | | Wired in |
| [x] | 3.4 | VT-035 regression + VT-037 maxTargets bound | | 2 tests |

### Task Details

- **3.1 FetchConfig expansion + cache fields**
  - **Files**: `src/config.ts`, `tests/config.test.ts` (new or extend)
  - **Design**: DR-006 §9. Add `expansionEnabled`, `maxExpansionTargets`, `expansionDepth`, `cacheEnabled`, `cacheDirectory`. Defaults: true, 10, 2, true, '.cache/figma-fetch'. Validation: depth >= 1, expansionDepth >= 1, maxExpansionTargets >= 0, scale > 0.
  - **Testing**: VT-038 — invalid depth/expansionDepth/maxTargets rejected.
  - **Notes**: `cacheDir` → `cacheDirectory` per `unicorn/prevent-abbreviations`. resolveConfig currently just spreads defaults — needs validation step.

- **3.2 Orchestrate expansion loop + cache wiring**
  - **Files**: `src/orchestrate.ts`, `tests/orchestrate.test.ts`
  - **Design**: DR-006 §10. Create cache (noop if disabled). Use fetchNodeCached/fetchImageCached. After initial normalize: if expansion enabled, evaluate triggers, refetch targets (concurrent via p-limit), merge into raw tree, re-normalize. OrchestrateResult gains `expansion` field.
  - **Testing**: VT-034 (end-to-end expansion loop), VT-036 (failed fetch resilience). Mock fetch must return deeper nodes for expansion refetch URLs.
  - **Notes**: Version threading: initial fetch unversioned (null), expansion fetches use fileResponse.version. Image fetch parallel with initial node fetch, not rerun after expansion (DEC-040). Extract `runExpansionLoop` helper to keep orchestrate under complexity limit.

- **3.3 CLI flags**
  - **Files**: `src/cli.ts`
  - **Design**: DR-006 §9 CLI flags. `--no-expand`, `--max-expand <n>`, `--expand-depth <n>`, `--no-cache`, `--cache-dir <path>`. Wire into resolveConfig call.
  - **Testing**: Covered transitively by orchestrate integration tests. CLI parsing verified by commander's built-in validation.

- **3.4 Regression + resilience tests**
  - **Files**: `tests/orchestrate.test.ts`
  - **Testing**: VT-035 (expansion disabled = identical pre-DE-006 result), VT-037 (maxTargets cap enforced in orchestrate context).

## 8. Risks & Mitigations

| Risk | Mitigation | Status |
| --- | --- | --- |
| Orchestrate exceeds complexity/line limits | Extract expansion loop into helper function | planned |
| Existing orchestrate tests break from new config fields | Defaults preserve pre-DE-006 behavior; existing tests use resolveConfig which gains defaults | monitor |
| Mock fetch complexity for expansion tests | Extend mockFetchSuccess to handle expansion refetch URLs | planned |

## 9. Decisions & Outcomes
- Decisions inherited from DR-006 (DEC-032, DEC-035–036, DEC-039–040).

## 10. Findings / Research Notes
- (populated during execution)

## 11. Wrap-up Checklist
- [x] Exit criteria satisfied — 16 new tests, `mise run check` green (782 total)
- [x] Verification evidence stored — commit `f037e4b`
- [x] Phase tracking updated
- [x] Contracts regenerated
- [ ] Hand-off to audit
