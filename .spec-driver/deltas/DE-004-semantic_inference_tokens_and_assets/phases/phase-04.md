---
id: IP-004.PHASE-04
slug: 004-semantic_inference_tokens_and_assets-phase-04
name: Summary and integration
created: '2026-03-11'
updated: '2026-03-11'
status: draft
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-004.PHASE-04
plan: IP-004
delta: DE-004
objective: >-
  Build aggregateTokensUsed() summary reducer and TokensUsedSummary schema.
  Wire into orchestrate.ts as a post-normalization step. Extend OrchestrateResult
  and OutputArtifacts to carry tokens-used.json. Write VT-022 (tokens-used unit),
  VT-023 (integration). Verify NF-001 2.0x ceiling still holds. mise run green.
entrance_criteria:
  - P03 complete — inference wired, 548 tests passing (commit 79645ca)
  - mise run green on current main
  - DR-004 §5.10 design stable
exit_criteria:
  - src/schemas/tokens-used.ts — TokensUsedSummary, TokenReference, StyleReference, EncounteredLocation schemas
  - src/summary/tokens-used.ts — aggregateTokensUsed(root, fileKey, rootNodeId) implemented
  - orchestrate.ts calls aggregateTokensUsed() after normalize(), includes tokensUsed in result
  - OrchestrateResult extended with tokensUsed field
  - OutputArtifacts extended with tokensUsed field
  - writeOutput writes tokens/tokens-used.json when tokensUsed present
  - VT-022 (tokens-used summary) passing
  - VT-023 (full pipeline integration with DE-004 fields) passing
  - NF-001 2.0x ceiling verified (tokens-used.json is separate artifact, not in normalized tree)
  - All existing tests still passing
  - mise run green
verification:
  tests:
    - VT-022 — tests/summary/tokens-used.test.ts
    - VT-023 — tests/normalize/node.test.ts (extended), tests/orchestrate.test.ts (extended)
    - VT-013 — tests/normalize/node.test.ts (NF-001 ceiling re-verified)
  evidence:
    - mise run output showing all tests pass
tasks:
  - id: '4.1'
    description: Create TokensUsedSummary schemas in src/schemas/tokens-used.ts
  - id: '4.2'
    description: Implement aggregateTokensUsed() in src/summary/tokens-used.ts + write VT-022
  - id: '4.3'
    description: Wire into orchestrate.ts + extend OrchestrateResult and OutputArtifacts
  - id: '4.4'
    description: Extend VT-023 integration tests + verify NF-001 ceiling + run full suite
risks:
  - description: NF-001 ceiling breach after populating fields
    mitigation: tokens-used.json is a separate artifact outside NormalizedNode; P03 ratio was 1.36x — large headroom
  - description: Paint-level tokenRef supplemental logic adds complexity
    mitigation: Appearance paints already carry tokenRef (nullable string) — straightforward to collect
  - description: counts.typography classification ambiguity
    mitigation: DR-004 schema defines it; no resolvedType maps to 'typography' in DE-004; set to 0 (styles array is empty placeholder)
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-004.PHASE-04
```

# Phase 04 — Summary and integration

## 1. Objective
Build the tokens-used summary reducer (`aggregateTokensUsed`) and its schema (`TokensUsedSummary`). Wire into `orchestrate.ts` as a post-normalization step that produces `tokens-used.json`. Extend the output pipeline to write this new artifact. Verify integration with fully-populated DE-004 fields and confirm NF-001 2.0x ceiling.

## 2. Links & References
- **Delta**: DE-004
- **Design Revision Sections**: DR-004 §5.10 (aggregateTokensUsed algorithm, schema), §3 (pipeline), §4 (code_impacts for orchestrate.ts, schemas/tokens-used.ts, summary/tokens-used.ts)
- **Specs / PRODs**: PROD-001.FR-016 (used-token summary), PROD-001.FR-005 (component/asset), PROD-001.NF-001 (size ceiling)
- **Support Docs**: DE-003 design-principles.md (summary lives outside normalize/)
- **Schemas**: `src/schemas/normalized.ts` — NormalizedVariableBindings, NormalizedPaint (tokenRef), NormalizedStroke (tokenRef)

## 3. Entrance Criteria
- [x] P03 complete — inference wired, 548 tests passing (commit 79645ca)
- [x] `mise run` green on current main
- [x] DR-004 §5.10 design stable (no open questions)

## 4. Exit Criteria / Done When
- [x] `src/schemas/tokens-used.ts` — `EncounteredLocationSchema`, `TokenReferenceSchema`, `StyleReferenceSchema`, `TokensUsedSummarySchema` + inferred types
- [x] `src/summary/tokens-used.ts` — `aggregateTokensUsed(root, fileKey, rootNodeId)` with tree walk, dedup, conflict resolution, paint supplemental, counts
- [x] `src/orchestrate.ts` — calls `aggregateTokensUsed()` after `normalize()`, includes `tokensUsed` in `OrchestrateResult`
- [x] `src/output/write.ts` — `OutputArtifacts` extended, writes `tokens/tokens-used.json`
- [x] VT-022 passing (tokens-used summary unit tests) — 21 tests
- [x] VT-023 passing (integration tests with DE-004 fields) — 2 new orchestrate tests
- [x] NF-001 2.0x ceiling verified — 1.36x (unchanged, separate artifact)
- [x] All existing tests still passing — 571 total
- [x] `mise run` green

## 5. Verification
- VT-022: `tests/summary/tokens-used.test.ts` — single node, tree dedup, resolvedType conflict (prefer specific over unknown), paint tokenRef supplemental, counts by resolvedType, scope passthrough, empty tree, styles always empty
- VT-023: `tests/normalize/node.test.ts` (extended) — full pipeline with DE-004 fields populated, confidence min-rule; `tests/orchestrate.test.ts` (extended) — orchestrate returns tokensUsed, writeOutput writes tokens-used.json
- VT-013: `tests/normalize/node.test.ts` — NF-001 2.0x ceiling assertion (existing, re-verified)
- Run: `mise run` (typecheck + test + lint)

## 6. Assumptions & STOP Conditions
- **Assumptions**:
  - `tokensUsed` is a separate artifact written to `tokens/tokens-used.json`, NOT embedded in the normalized tree. NF-001 ceiling applies only to normalized output.
  - `styles` array is always `[]` in DE-004. Schema defines `StyleReferenceSchema` as forward-compatibility placeholder only.
  - `counts.typography` is 0 in DE-004 — no `resolvedType` maps to typography. This count is reserved for style reference extraction (future).
  - Paint-level `tokenRef` on `NormalizedPaint`/`NormalizedStroke` is already populated by `extractAppearance()` — strings like `"VariableID:xxx"` when present on raw fills/strokes.
  - `OrchestrateResult` gains a `tokensUsed` field; `OutputArtifacts` gains a `tokensUsed` field. Both are optional (for callers that don't need it).
- **STOP when**:
  - Paint-level `tokenRef` is not populated by `extractAppearance()` — would need P02 regression
  - NF-001 ratio exceeds 2.0x on the fixture
  - `OrchestrateResult` or `OutputArtifacts` changes break existing downstream consumers

## 7. Tasks & Progress
*(Status: `[ ]` todo, `[WIP]`, `[x]` done, `[blocked]`)*

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [x] | 4.1 | Create `TokensUsedSummary` schemas in `src/schemas/tokens-used.ts` | | e84331b |
| [x] | 4.2 | Implement `aggregateTokensUsed()` + write VT-022 | | e84331b — 21 tests |
| [x] | 4.3 | Wire into `orchestrate.ts` + extend `OrchestrateResult`/`OutputArtifacts` | | e84331b |
| [x] | 4.4 | Extend VT-023 integration tests + verify NF-001 + run full suite | | e84331b — 571 total |

### Task Details

- **4.1 Create `TokensUsedSummary` schemas**
  - **Design / Approach**: Per DR-004 §5.10. Four Zod schemas: `EncounteredLocationSchema` (nodeId, nodeName, field), `TokenReferenceSchema` (tokenId, tokenName, collectionId, resolvedType, encounteredOn), `StyleReferenceSchema` (type, id, name, encounteredOn), `TokensUsedSummarySchema` (scope, variables, styles, counts). Export inferred types. `scope.isFullInventory` is `z.literal(false)` — this is a subtree summary, not a file inventory.
  - **Files**: `src/schemas/tokens-used.ts` (new)
  - **Testing**: Type correctness verified by compilation; schema validated in VT-022.

- **4.2 Implement `aggregateTokensUsed()` + write VT-022**
  - **Design / Approach**: Per DR-004 §5.10 algorithm. Recursive tree walk. For each node: (a) collect from `node.variables.bindings` — dedup by `tokenId`, first encounter wins metadata, conflict on `resolvedType` prefers specific over `'unknown'`, genuine conflict emits warning and keeps first; (b) supplemental: collect `appearance.fills[*].tokenRef` and `strokes[*].tokenRef` if not already represented in `node.variables.bindings` — create a binding-like entry with `resolvedType: 'color'`; (c) accumulate `encounteredOn` locations (nodeId, nodeName, field). Classify counts: `'color'` → colors, `'number'` → numbers, `'string'`/`'boolean'`/`'unknown'` → other. `typography` always 0. `styles` always `[]`.
  - **Files**: `src/summary/tokens-used.ts` (new), `tests/summary/tokens-used.test.ts` (new)
  - **Testing**: VT-022 — single node with bindings, multi-node dedup, resolvedType conflict (unknown→color wins, color vs number warns), paint tokenRef supplemental (only when not in bindings), counts aggregation, scope passthrough, empty tree → empty summary, styles always empty.

- **4.3 Wire into `orchestrate.ts` + extend `OrchestrateResult`/`OutputArtifacts`**
  - **Design / Approach**: `orchestrate()` calls `aggregateTokensUsed(normalizedNode, parsed.fileKey, parsed.nodeId)` after `normalize()`. Add `tokensUsed: TokensUsedSummary` to `OrchestrateResult`. Add `tokensUsed?: TokensUsedSummary | undefined` to `OutputArtifacts`. `writeOutput()` writes `tokens/tokens-used.json` when `tokensUsed` present. Update manifest outputs to include `tokensUsedJson` path.
  - **Files**: `src/orchestrate.ts`, `src/output/write.ts`, `src/schemas/manifest.ts` (if outputs shape needs extending)
  - **Testing**: Existing orchestrate tests updated to assert `tokensUsed` field. Integration test asserts `tokens/tokens-used.json` written.

- **4.4 Extend VT-023 integration + verify NF-001 + run full suite**
  - **Design / Approach**: Extend `node.test.ts` integration section with fixture that has variable bindings and paint tokenRefs — verify `aggregateTokensUsed` produces expected summary. Verify NF-001 ceiling on existing fixture (tokens-used is separate, doesn't affect ratio). Run `mise run`.
  - **Files**: `tests/normalize/node.test.ts`, `tests/orchestrate.test.ts`, full test suite
  - **Testing**: VT-023 (integration), VT-013 (NF-001 re-verification)

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
| --- | --- | --- |
| NF-001 ceiling breach | tokens-used.json is separate artifact; P03 ratio 1.36x — large headroom | open |
| Paint tokenRef not populated by extractAppearance | Verified: appearance.ts line 75 sets `tokenRef: null` default; raw paint's tokenRef extracted when present | open |
| counts.typography ambiguity | 0 in DE-004 — reserved for future style extraction; documented in schema | open |
| Manifest outputs schema may need extending | Check if `ManifestOutputsSchema` allows additional fields; if not, extend | open |

## 9. Decisions & Outcomes
- 2026-03-11 — Paint-level `tokenRef` is always null in current `extractAppearance()`. Supplemental collection implemented for correctness but effectively no-op. Variables `boundVariables` is the canonical source for paint-bound tokens.
- 2026-03-11 — `ManifestInput.outputs` extended with `tokensUsedJson` field + `buildOutputs()` passthrough. `ManifestOutputsSchema` already had the field.

## 10. Findings / Research Notes
- `unicorn/prevent-abbreviations`: `acc` → `accumulator`, `Ref` → `Reference`, `i` → `index`. Same pattern as P02/P03.
- `@typescript-eslint/switch-exhaustiveness-check`: default case in switch on enum union is rejected — must enumerate all cases explicitly.
- `ManifestOutputsSchema` already had `tokensUsedJson` as optional — no schema change needed, only `ManifestInput` and `buildOutputs()` needed extending.

## 11. Wrap-up Checklist
- [x] Exit criteria satisfied — all 9 criteria met, 571 tests, mise run green
- [x] Verification evidence stored — commit e84331b
- [x] Spec/Delta/Plan updated with lessons (DE-004 closure)
- [x] Hand-off notes — delta closing, ISSUE-001/ISSUE-002 filed for follow-up
