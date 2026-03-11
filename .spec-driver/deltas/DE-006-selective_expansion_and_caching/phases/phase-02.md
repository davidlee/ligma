---
id: IP-006.PHASE-02
slug: 006-selective_expansion_and_caching-phase-02
name: IP-006 Phase 02 — Expansion engine
created: '2026-03-11'
updated: '2026-03-11'
status: draft
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-006.PHASE-02
plan: IP-006
delta: DE-006
objective: >-
  Implement the expansion engine: type definitions, trigger functions
  (depthTruncatedContainer, geometryNeeded), trigger evaluation pipeline
  (dedup, priority, cap), and raw tree merge (immutable path-cloning with
  whole-node replacement). Standalone, fully tested — no orchestrate wiring.
entrance_criteria:
  - P01 complete (cache layer implemented and tested)
  - DR-006 §§5–7 reviewed
exit_criteria:
  - VT-029 through VT-033 pass
  - mise run check green (typecheck + lint + all tests)
  - No regressions in existing test suites
verification:
  tests:
    - VT-029
    - VT-030
    - VT-031
    - VT-032
    - VT-033
  evidence: []
tasks:
  - id: '2.1'
    description: Expansion type definitions
  - id: '2.2'
    description: depthTruncatedContainer trigger
  - id: '2.3'
    description: geometryNeeded trigger
  - id: '2.4'
    description: evaluateExpansionTriggers pipeline
  - id: '2.5'
    description: Raw tree merge (findRawNodeById + mergeExpansions)
risks:
  - description: childCount reflects API-returned children, not true count
    mitigation: Use type-based inference per DR-006 §11 corrected trigger
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-006.PHASE-02
```

# Phase 02 — Expansion engine

## 1. Objective

Implement the expansion engine module (`src/expand/`): type definitions, individual trigger functions, trigger evaluation pipeline, and raw tree merge. This phase produces standalone, fully tested units that P03 wires into orchestrate.

## 2. Links & References
- **Delta**: DE-006
- **Design Revision Sections**: DR-006 §5 (type definitions), §6 (triggers), §7 (raw tree merge), §11 (adversarial findings — corrected trigger signal)
- **Requirements**: PROD-001.FR-015
- **Key Decisions**: DEC-032 (expand helper layer), DEC-033 (merge at raw level), DEC-034 (triggers read normalized + TriggerContext), DEC-036 (single pass), DEC-037 (whole-node replacement), DEC-038 (depth >= 1)

## 3. Entrance Criteria
- [x] P01 complete (cache layer: 41 tests, `mise run check` green)
- [x] DR-006 §§5–7 reviewed

## 4. Exit Criteria / Done When
- [ ] `src/expand/types.ts` — all expansion type definitions
- [ ] `src/expand/triggers.ts` — depthTruncatedContainer, geometryNeeded, evaluateExpansionTriggers
- [ ] `src/expand/merge.ts` — findRawNodeById, mergeExpansions
- [ ] VT-029 through VT-033 all pass
- [ ] `mise run check` green

## 5. Verification

| VT | Description | Test file | Type |
| --- | --- | --- | --- |
| VT-029 | depthTruncatedContainer: fires at depth boundary for container types with 0 children, skips non-containers, skips already-expanded | `tests/expand/triggers.test.ts` | unit |
| VT-030 | geometryNeeded: fires for export-worthy vectors without geometry, skips when geometry already requested | `tests/expand/triggers.test.ts` | unit |
| VT-031 | evaluateExpansionTriggers: dedup by nodeId (merge priorities/geometry), priority sort, cap at maxTargets, skip already-expanded, discovery-order tiebreak | `tests/expand/triggers.test.ts` | unit |
| VT-032 | mergeExpansions: whole-node replacement, immutability (original untouched), deepest-first apply order, root replacement | `tests/expand/merge.test.ts` | unit |
| VT-033 | mergeExpansions: missing target → notFound array, pipeline continues with partial results | `tests/expand/merge.test.ts` | unit |

Commands: `mise run check`

## 6. Assumptions & STOP Conditions
- **Assumptions**: NormalizedNode type surface is stable (no schema changes in this phase). FigmaNode uses passthrough schema — spread/structural clone is sufficient for immutable merge.
- **STOP when**: Trigger conditions reveal ambiguity not covered by DR-006 §11 corrected signal. Merge immutability requires deep-clone beyond path-cloning (would indicate structural concern).

## 7. Tasks & Progress

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [ ] | 2.1 | Expansion types (`src/expand/types.ts`) | [P] | Pure types, no deps |
| [ ] | 2.2 | depthTruncatedContainer trigger + VT-029 | | Depends on 2.1 |
| [ ] | 2.3 | geometryNeeded trigger + VT-030 | | Depends on 2.1 |
| [ ] | 2.4 | evaluateExpansionTriggers pipeline + VT-031 | | Depends on 2.2, 2.3 |
| [ ] | 2.5 | Raw tree merge (`src/expand/merge.ts`) + VT-032, VT-033 | [P] | Independent of triggers |

### Task Details

- **2.1 Expansion types**
  - **Files**: `src/expand/types.ts`
  - **Design**: DR-006 §5. Types: `ExpansionReasonCode`, `ExpansionTarget`, `TriggerContext`, `ExpansionTrigger`, `ExpansionConfig`, `ExecutedExpansion`, `SkippedExpansion`, `ExpansionResult`. Also `MergeInput`, `MergeResult` (used by merge.ts).
  - **Testing**: Type-only module; verified transitively by consumer tests.
  - **Notes**: `ExpansionTrigger` is a function type `(node: NormalizedNode, context: TriggerContext) => ExpansionTarget | null`. Container types set: `frame, group, component, instance, variant-set, section`.

- **2.2 depthTruncatedContainer trigger**
  - **Files**: `src/expand/triggers.ts`, `tests/expand/triggers.test.ts`
  - **Design**: DR-006 §6 + §11 corrected condition. Fires when: `node.hierarchy.depth === context.requestedDepth && node.children.length === 0 && node.type ∈ CONTAINER_TYPES`. Priority 1 for instance/component, 2 for others. Depth: null. RequireGeometry: false.
  - **Testing**: VT-029 — fires at depth boundary with truncated container, doesn't fire for non-container types, doesn't fire for already-expanded nodes, doesn't fire when children present, correct priority assignment (1 vs 2), correct reason string.

- **2.3 geometryNeeded trigger**
  - **Files**: `src/expand/triggers.ts`, `tests/expand/triggers.test.ts`
  - **Design**: DR-006 §6. Fires when: `node.type ∈ {vector, boolean-operation} && !context.fetchState.requestedGeometry && (node.asset?.exportSuggested === true || node.role === 'icon')`. Priority 3. RequireGeometry: true.
  - **Testing**: VT-030 — fires for export-worthy vector without geometry, fires for icon-role vector, doesn't fire when geometry already requested, doesn't fire for non-vector types, doesn't fire when neither exportSuggested nor icon role.

- **2.4 evaluateExpansionTriggers pipeline**
  - **Files**: `src/expand/triggers.ts`, `tests/expand/triggers.test.ts`
  - **Design**: DR-006 §6 evaluateExpansionTriggers. Depth-first tree walk → run all triggers per node → collect → group by nodeId → merge duplicates (lowest priority, OR requireGeometry, max non-null depth) → filter already-expanded → sort by priority (stable, discovery order tiebreak) → cap at maxTargets. Losers become SkippedExpansion with appropriate `skippedBecause`.
  - **Testing**: VT-031 — deduplication merges correctly, priority sort is stable, maxTargets cap produces skipped entries, already-expanded filtering works, empty tree returns empty results.

- **2.5 Raw tree merge**
  - **Files**: `src/expand/merge.ts`, `tests/expand/merge.test.ts`
  - **Design**: DR-006 §7. `findRawNodeById(root, targetId)` returns `{ node, parent, childIndex } | null`. `mergeExpansions(root, expansions)` — whole-node replacement, immutable path-cloning, deepest-first order, supports root replacement, soft failure for missing targets.
  - **Testing**: VT-032 — single replacement, multiple replacements, deepest-first ordering, root replacement, original tree not mutated, enriched fields preserved. VT-033 — missing target in notFound, partial success (some found, some not), empty expansions returns clone.
  - **Notes**: FigmaNode is a passthrough `z.record` — structural clone via spread. Path-cloning: clone each ancestor along the path from root to target, leave untouched branches shared.

## 8. Risks & Mitigations

| Risk | Mitigation | Status |
| --- | --- | --- |
| childCount reflects API children, not true count | Corrected trigger uses type-based inference (DR-006 §11) | accepted |
| FigmaNode passthrough schema may have non-spreadable fields | Verify with existing test fixtures; FigmaNodeSchema is `z.record(z.string(), z.unknown())` base | monitor |

## 9. Decisions & Outcomes
- Decisions inherited from DR-006 (DEC-032–034, DEC-036–038). No new decisions expected.

## 10. Findings / Research Notes
- (populated during execution)

## 11. Wrap-up Checklist
- [ ] Exit criteria satisfied
- [ ] Verification evidence stored
- [ ] Phase tracking updated
- [ ] Hand-off notes to Phase 03
