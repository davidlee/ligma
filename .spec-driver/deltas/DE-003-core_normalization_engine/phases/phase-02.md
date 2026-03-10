---
id: IP-003.PHASE-02
slug: 003-core_normalization_engine-phase-02
name: Layout + appearance + text extractors
created: '2026-03-10'
updated: '2026-03-10'
status: in-progress
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-003.PHASE-02
plan: IP-003
delta: DE-003
objective: >-
  Implement layout, appearance, and text extractors per DR-003 §4.
  Each is independent, pure, and tested in isolation.
entrance_criteria:
  - Phase 1 complete (schemas, raw helpers, classify, bounds)
exit_criteria:
  - VT-009 passing (layout)
  - VT-010 passing (appearance)
  - VT-011 passing (text)
  - Zero lint warnings, tsc clean
verification:
  tests:
    - VT-009
    - VT-010
    - VT-011
  evidence: []
tasks:
  - id: '2.1'
    name: Layout extractor
  - id: '2.2'
    name: Appearance extractor
  - id: '2.3'
    name: Text extractor
risks: []
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-003.PHASE-02
```

# Phase 2 — Layout + appearance + text extractors

## 1. Objective
Implement the three complex extractors per DR-003 §4. Each is a pure function: raw FigmaNode in, ExtractorResult out. No cross-extractor dependencies.

## 3. Entrance Criteria
- [x] Phase 1 complete

## 4. Exit Criteria / Done When
- [ ] VT-009: layout extraction tested
- [ ] VT-010: appearance extraction tested
- [ ] VT-011: text extraction tested
- [ ] Zero lint warnings, tsc clean

## 7. Tasks & Progress

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [ ] | 2.1 | Layout extractor | Yes | mode/sizing/align/padding/gap/wrap/grid/constraints/position |
| [ ] | 2.2 | Appearance extractor | Yes | paints/strokes/effects/cornerRadius/opacity/blendMode |
| [ ] | 2.3 | Text extractor | Yes | content/style/DimensionValue/color/truncation |

## 9. Decisions & Outcomes
- (to be filled)

## 11. Wrap-up Checklist
- [ ] Exit criteria satisfied
- [ ] Verification evidence stored
- [ ] Hand-off notes to next phase
