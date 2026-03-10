---
id: IP-004.PHASE-01
slug: 004-semantic_inference_tokens_and_assets-phase-01
name: Prep and type refactor
created: '2026-03-11'
updated: '2026-03-11'
status: draft
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-004.PHASE-01
plan: IP-004
delta: DE-004
objective: >-
  Introduce AnalysisResult<T> base type, add explicit confidence to all extractors,
  deduplicate colorToHex(), rename variantProperties → propertyValues. Zero behavioral
  change — all existing tests must pass with updated types.
entrance_criteria:
  - DR-004 drafted and approved
  - DE-003 complete, all VTs passing
exit_criteria:
  - AnalysisResult<T> and ExtractorResult<T> types in raw-helpers.ts
  - All existing extractors return explicit confidence field
  - classify() returns AnalysisResult<NormalizedNodeType>
  - colorToHex() in raw-helpers.ts, removed from appearance.ts and text.ts
  - variantProperties renamed to propertyValues in schema
  - node.ts computes confidence via min-rule
  - All existing tests updated and passing (VT-008, VT-010, VT-011, VT-012, VT-013)
  - mise run green
verification:
  tests:
    - VT-008 (classify) — updated assertions for AnalysisResult return type
    - VT-010 (appearance) — updated imports, confidence assertions
    - VT-011 (text) — updated imports, confidence assertions
    - VT-012 (node) — confidence min-rule assertions
    - VT-013 (reduction-check) — still passing (no size change expected)
  evidence:
    - mise run output showing all tests pass
tasks:
  - id: '1.1'
    description: Add AnalysisResult<T> type and refactor ExtractorResult<T>
  - id: '1.2'
    description: Move colorToHex() to raw-helpers.ts
  - id: '1.3'
    description: Add explicit confidence to all DE-003 extractors
  - id: '1.4'
    description: Refactor classify() to return AnalysisResult
  - id: '1.5'
    description: Update node.ts confidence computation to min-rule
  - id: '1.6'
    description: Rename variantProperties → propertyValues in schema
  - id: '1.7'
    description: Update all existing tests
risks:
  - description: Refactor introduces regressions in DE-003 extractors
    mitigation: Atomic change with all tests updated simultaneously; run mise run after each task
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-004.PHASE-01
```

# Phase 01 — Prep and type refactor

## 1. Objective
Introduce the unified `AnalysisResult<T>` / `ExtractorResult<T>` type hierarchy (DEC-021), deduplicate `colorToHex()`, and rename `variantProperties` → `propertyValues` (DEC-023). This phase is pure refactoring — zero behavioral change. All existing tests must continue to pass with updated types and imports.

## 2. Links & References
- **Delta**: DE-004
- **Design Revision Sections**: DR-004 §5.1 (shared result types), §4 (code impact — raw-helpers, appearance, text, bounds, layout, classify, node, schemas)
- **Specs / PRODs**: No new requirements — this is prep work
- **Support Docs**: DE-003 design-principles.md (extractor independence, passthrough isolation)

## 3. Entrance Criteria
- [x] DR-004 drafted
- [x] DE-003 complete, all VTs passing
- [x] `mise run` green on current main

## 4. Exit Criteria / Done When
- [ ] `AnalysisResult<T>` and `ExtractorResult<T>` types defined in `raw-helpers.ts`
- [ ] All existing extractors return explicit `confidence` field
- [ ] `classify()` returns `AnalysisResult<NormalizedNodeType>` (not `ExtractorResult`)
- [ ] `colorToHex()` lives in `raw-helpers.ts`; removed from `appearance.ts` and `text.ts`
- [ ] `variantProperties` renamed to `propertyValues` in `NormalizedComponentInfoSchema`
- [ ] `node.ts` computes confidence via min-rule across all results
- [ ] All existing test suites updated and passing
- [ ] `mise run` green

## 5. Verification
- Run all existing test suites: VT-008, VT-010, VT-011, VT-012, VT-013
- Verify no behavioral change: normalized output for existing fixtures must be identical (except confidence now comes from extractors, not node.ts — same values)
- `mise run` (typecheck + test + lint) must pass

## 6. Assumptions & STOP Conditions
- Assumptions: Existing extractors all follow the `{ value, warnings, omittedFields }` pattern consistently
- STOP when: If any extractor has a non-standard return shape that doesn't fit the `ExtractorResult<T>` contract

## 7. Tasks & Progress
*(Status: `[ ]` todo, `[WIP]`, `[x]` done, `[blocked]`)*

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [ ] | 1.1 | Add `AnalysisResult<T>` type, refactor `ExtractorResult<T>` | | DEC-021. In `raw-helpers.ts` |
| [ ] | 1.2 | Move `colorToHex()` to `raw-helpers.ts` | | Export from raw-helpers, update imports in appearance.ts + text.ts |
| [ ] | 1.3 | Add explicit confidence to all DE-003 extractors | | bounds, layout, appearance, text. `warnings.length > 0 ? 'medium' : 'high'` |
| [ ] | 1.4 | Refactor `classify()` to return `AnalysisResult<NormalizedNodeType>` | | Not `ExtractorResult` — no omittedFields |
| [ ] | 1.5 | Update `node.ts` confidence to min-rule | | Remove current derivation; take min across all results |
| [ ] | 1.6 | Rename `variantProperties` → `propertyValues` in schema | | `src/schemas/normalized.ts` |
| [ ] | 1.7 | Update all existing tests | | VT-008, VT-010, VT-011, VT-012. Assertions for confidence field, imports for colorToHex |

### Task Details

- **1.1 Add `AnalysisResult<T>` type**
  - **Design / Approach**: Per DR-004 §5.1. `AnalysisResult<T> = { value, confidence, warnings }`. `ExtractorResult<T> = AnalysisResult<T> & { omittedFields }`. Update `ok<T>()` helper to include `confidence: 'high'`.
  - **Files**: `src/normalize/raw-helpers.ts`
  - **Testing**: Type-level change; existing tests will fail until 1.3/1.7 complete.

- **1.2 Move `colorToHex()` to `raw-helpers.ts`**
  - **Design / Approach**: Copy from `appearance.ts` to `raw-helpers.ts`, export it. Update imports in `appearance.ts` and `text.ts`. Delete both local copies.
  - **Files**: `src/normalize/raw-helpers.ts`, `src/normalize/appearance.ts`, `src/normalize/text.ts`
  - **Testing**: Existing color conversion tests in VT-010 and VT-011 validate behavior.

- **1.3 Add explicit confidence to all DE-003 extractors**
  - **Design / Approach**: Each extractor currently returns `{ value, warnings, omittedFields }`. Add `confidence: warnings.length > 0 ? 'medium' : 'high'` to every return statement. Same logic as current `node.ts` derivation, moved to source.
  - **Files**: `src/normalize/bounds.ts`, `src/normalize/layout.ts`, `src/normalize/appearance.ts`, `src/normalize/text.ts`
  - **Testing**: Update VT-010, VT-011 to assert confidence field.

- **1.4 Refactor `classify()` return type**
  - **Design / Approach**: `classify()` currently returns a bare `NormalizedNodeType`. Change to `AnalysisResult<NormalizedNodeType>`. Classification is always high confidence (no warnings in current implementation).
  - **Files**: `src/normalize/classify.ts`
  - **Testing**: Update VT-008 to destructure `{ value, confidence }` from classify results.

- **1.5 Update `node.ts` confidence to min-rule**
  - **Design / Approach**: Remove current `warnings.length > 0 ? 'medium' : 'high'` in `normalizeNode`. Instead, collect confidences from all extractor/analysis results and take the min. Import `Confidence` type, define ordering: high > medium > low.
  - **Files**: `src/normalize/node.ts`
  - **Testing**: VT-012 assertions updated; behavior should be identical since extractors now return same confidence values.

- **1.6 Rename `variantProperties` → `propertyValues`**
  - **Design / Approach**: Per DEC-023. Field currently always `{}` inside a null component block. No downstream breakage.
  - **Files**: `src/schemas/normalized.ts`
  - **Testing**: No test changes expected (field is inside a null-stubbed block).

- **1.7 Update all existing tests**
  - **Design / Approach**: Update assertions for confidence field in extractor results. Update imports where colorToHex moved. Verify VT-013 (reduction-check) still passes without modification.
  - **Files**: `tests/normalize/classify.test.ts`, `tests/normalize/appearance.test.ts`, `tests/normalize/text.test.ts`, `tests/normalize/node.test.ts`, `tests/normalize/bounds.test.ts`, `tests/normalize/layout.test.ts`
  - **Testing**: `mise run` must pass after all updates.

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
| --- | --- | --- |
| Extractor return shape inconsistency | Read each extractor before modifying; verify pattern | open |
| classify() callers assume bare string return | Search all call sites before changing | open |

## 9. Decisions & Outcomes
- 2026-03-11 — DEC-021: Unified `AnalysisResult<T>` base type (from DR-004 design session)
- 2026-03-11 — DEC-023: `variantProperties` → `propertyValues` rename (from DR-004 design session)

## 10. Findings / Research Notes
- `colorToHex()` is identical in `appearance.ts` (lines 20-37) and `text.ts` (lines 12-29)
- `classify()` is called only from `node.ts` — single call site for return type change
- Existing `ok<T>()` helper in `raw-helpers.ts` will need `confidence: 'high'` added

## 11. Wrap-up Checklist
- [ ] Exit criteria satisfied
- [ ] Verification evidence stored
- [ ] Spec/Delta/Plan updated with lessons
- [ ] Hand-off notes to next phase (if any)
