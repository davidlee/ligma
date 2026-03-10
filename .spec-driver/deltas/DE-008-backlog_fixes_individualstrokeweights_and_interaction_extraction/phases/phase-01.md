---
id: IP-008.PHASE-01
slug: 008-backlog_fixes_individualstrokeweights_and_interaction_extraction-phase-01
name: 'Schema, extractors, and tests'
created: '2026-03-11'
updated: '2026-03-11'
status: in-progress
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-008.PHASE-01
plan: IP-008
delta: DE-008
objective: >-
  Implement per-side stroke weight support and interaction extraction.
  Schema extensions, extractor code, tests, lint, contract sync.
entrance_criteria:
  - DR-008 approved
  - IP-008 active
exit_criteria:
  - mise run passes (typecheck + test + lint)
  - VT-010 extended for per-side stroke weight
  - VT-020 interaction extraction test suite passes
  - Contracts synced
verification:
  tests:
    - VT-010 (stroke weight — extended)
    - VT-020 (interaction extraction — new)
  evidence: []
tasks:
  - id: '1.1'
    name: StrokeWeight schema
  - id: '1.2'
    name: resolveStrokeWeight + collectStrokes update
  - id: '1.3'
    name: Stroke weight tests
  - id: '2.1'
    name: Interaction schemas
  - id: '2.2'
    name: extractInteractions extractor
  - id: '2.3'
    name: Wire into node.ts
  - id: '2.4'
    name: Interaction tests
  - id: '3.1'
    name: Lint + typecheck + contract sync
risks:
  - description: Raw action field names differ from docs
    mitigation: Verify against REST fixtures
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-008.PHASE-01
```

# Phase 1 — Schema, extractors, and tests

## 1. Objective
Implement both DE-008 work streams: per-side stroke weight support (ISSUE-001) and interaction extraction (ISSUE-002). Single phase — both are small, file-independent, share the same quality gate.

## 2. Links & References
- **Delta**: DE-008
- **Design Revision**: DR-008 (DEC-030 through DEC-033)
- **Design Doc**: `docs/plans/2026-03-11-DE-008-stroke-weights-and-interactions-design.md`
- **Spec**: SPEC-001, FR-006

## 3. Entrance Criteria
- [x] DR-008 approved
- [x] IP-008 active

## 4. Exit Criteria / Done When
- [ ] `StrokeWeight` discriminated union in schema
- [ ] `resolveStrokeWeight()` prefers `individualStrokeWeights` over scalar
- [ ] `NormalizedNode.interactions` field added
- [ ] `extractInteractions()` extractor wired into pipeline
- [ ] VT-010 extended (per-side, uniform, zero, precedence, malformed)
- [ ] VT-020 interaction tests (triggers, actions, navigation derivation, unknowns, malformed)
- [ ] `mise run` passes
- [ ] Contracts synced

## 5. Verification
- `pnpm vitest run` — all tests green
- `pnpm lint` — zero warnings (ADR-001)
- `mise run` — full quality gate (ADR-002)

## 6. Assumptions & STOP Conditions
- Figma REST `individualStrokeWeights` shape is `{ top: number, right: number, bottom: number, left: number }`
- Figma REST `interactions` array contains `{ trigger: { type: string }, actions: [{ type: string, navigation?: string, destinationId?: string, url?: string }] }`
- STOP if raw fixture data contradicts these assumptions

## 7. Tasks & Progress

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [ ] | 1.1 | `StrokeWeightSchema` in `schemas/normalized.ts` | [P] | DEC-030 |
| [ ] | 1.2 | `resolveStrokeWeight()` + update `collectStrokes`/`normalizeStroke` | | Depends on 1.1 |
| [ ] | 1.3 | Stroke weight tests (VT-010 extension) | | Depends on 1.2 |
| [ ] | 2.1 | Interaction schemas in `schemas/normalized.ts` | [P] | DEC-031, DEC-032, DEC-033 |
| [ ] | 2.2 | `extractInteractions()` in `normalize/interactions.ts` | | Depends on 2.1 |
| [ ] | 2.3 | Wire `extractInteractions` into `node.ts` | | Depends on 2.2 |
| [ ] | 2.4 | Interaction tests (VT-020) | | Depends on 2.3 |
| [ ] | 3.1 | Lint + typecheck + contract sync | | Depends on all above |

### Task Details

- **1.1 StrokeWeight schema**
  - Add `StrokeWeightSchema` discriminated union to `schemas/normalized.ts`
  - Change `NormalizedStrokeSchema.weight` from `z.number().nullable()` to `StrokeWeightSchema.nullable()`
  - Update `StrokeWeight` type export

- **1.2 resolveStrokeWeight + collectStrokes**
  - New `resolveStrokeWeight(node)` in `appearance.ts` using `getRawRecord`
  - Precedence: `individualStrokeWeights` > scalar `strokeWeight` > `null`
  - Zero is a valid weight, not null
  - Warn on malformed `individualStrokeWeights`
  - Update `normalizeStroke()` signature: `weight` becomes `StrokeWeight | null`
  - Update `collectStrokes()` to call `resolveStrokeWeight`

- **1.3 Stroke weight tests**
  - Per-side: `{ top: 0, right: 0, bottom: 2, left: 0 }` → non-uniform
  - Uniform collapse: `{ top: 2, right: 2, bottom: 2, left: 2 }` → `{ uniform: true, value: 2 }`
  - Scalar only: `strokeWeight: 3` → `{ uniform: true, value: 3 }`
  - Scalar zero: `strokeWeight: 0` → `{ uniform: true, value: 0 }`
  - Both present: `individualStrokeWeights` wins
  - Neither: `null`
  - All zeroes per-side: `{ uniform: true, value: 0 }`
  - Malformed `individualStrokeWeights`: falls back to scalar + warning
  - Update existing stroke tests for new weight shape

- **2.1 Interaction schemas**
  - `InteractionTriggerSchema`, `InteractionActionKindSchema`
  - `NormalizedActionSchema`, `NormalizedInteractionSchema`
  - Add `interactions` to `NormalizedNodeSchema` and `NormalizedNode` interface

- **2.2 extractInteractions**
  - New `src/normalize/interactions.ts`
  - Trigger mapping (ON_HOVER→hover, etc.)
  - Action extraction: BACK/CLOSE direct; URL/OPEN_URL→url; navigation-field derivation for node-targeting
  - Unknown types → `'unknown'` + warning
  - Skip malformed entries with warning

- **2.3 Wire into node.ts**
  - Import `extractInteractions`
  - Add to `ExtractionResults`, `runCoreExtractors`, `runExtractors`
  - Add `interactions: extracted.interactions.value` to `normalizeNode` return

- **2.4 Interaction tests**
  - Full suite per DR-008 §4 verification plan

- **3.1 Lint + typecheck + contract sync**
  - `mise run` passes
  - Regenerate contracts if needed

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
| --- | --- | --- |
| Raw action field names differ from docs | Verify against REST fixtures | open |
| Malformed `individualStrokeWeights` | Warn + fall back to scalar | designed |
| Missing `trigger.type` | Skip entry + warning | designed |
