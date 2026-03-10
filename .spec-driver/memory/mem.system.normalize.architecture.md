---
id: mem.system.normalize.architecture
name: Normalize module architecture
kind: memory
status: active
memory_type: system
updated: '2026-03-11'
verified: '2026-03-11'
confidence: high
tags:
  - normalization
  - architecture
summary: >-
  How the normalization pipeline works: extractor pattern, node compositor,
  DEC-018 skip gates, orchestrate wiring, confidence min-rule.
scope:
  globs:
    - src/normalize/**
    - tests/normalize/**
provenance:
  sources:
    - SPEC-001
    - DR-003
    - DE-003
    - DR-004
---

# Normalize module architecture

## Pipeline

```
orchestrate() → normalize(rawRoot) → normalizeNode(raw, context) per node
```

- `normalize/index.ts` — entry point. Creates root context, validates root has id/name/type, throws `NormalizationError` on malformed input.
- `normalize/node.ts` — recursive compositor. For each node: classify → run extractors → build hierarchy → recurse children. Confidence via min-rule across all results.
- `orchestrate.ts` — calls `normalize()`, stores result as `normalizedNode` in `OrchestrateResult`.

## Result type hierarchy (DEC-021)

```
AnalysisResult<T> = { value, confidence, warnings }
ExtractorResult<T> extends AnalysisResult<T> + { omittedFields }
```

- `AnalysisResult<T>` — base type for both extraction and inference results.
- `ExtractorResult<T>` — extends with `omittedFields` (extraction-specific).
- `classify()` returns `AnalysisResult<NormalizedNodeType>` (no omittedFields — classification, not extraction).
- All other extractors return `ExtractorResult<T>` with explicit confidence.
- `node.ts` computes node confidence as min across all results (`CONFIDENCE_ORDER` lookup).

## Extractor pattern

Each extractor is a pure function: `(raw: FigmaNode) → ExtractorResult<T>`.

Extractors (all in `src/normalize/`):
- `classify.ts` — `NormalizedNodeType` (16 types + unknown). Returns `AnalysisResult`.
- `bounds.ts` — `Bounds | null` from absoluteBoundingBox
- `layout.ts` — `NormalizedLayout` (mode/sizing/align/padding/gap/wrap/grid/constraints/position/clip)
- `appearance.ts` — `NormalizedAppearance` (fills/strokes/effects/cornerRadius/blendMode/opacity)
- `text.ts` — `NormalizedText` (content/style/color/tokenRefs/semanticKind/truncation)

## Key invariants

- **DEC-018**: `node.ts` gates extractors via `SKIP_EXTRACTORS` set for document/page. Extractors themselves are NOT type-aware — they always return populated defaults when called.
- **No `as` casts** — [[mem.fact.lint.strict-config]]. All raw field access via typed accessors in `raw-helpers.ts`.
- **DE-004 placeholders**: `component`, `variables`, `asset` are `null`; `role` is `null`; `semantics` are all `false`. Being populated by DE-004.
- **Confidence**: min-rule across all extraction (and future inference) results. high > medium > low.
- **hierarchy.path**: ancestor chain (current node excluded). Grows with depth.

## Shared utilities

- `raw-helpers.ts` — `getRawProperty`, `getRawString`, `getRawNumber`, `getRawBoolean`, `getRawArray`, `getRawRecord`, `isRecord`, `ok()` helper, `AnalysisResult<T>`, `ExtractorResult<T>`, `colorToHex()`.
- `colorToHex()` — shared utility for Figma RGBA → hex conversion (DEC-020). Used by appearance.ts and text.ts.

## Schema note

- `NormalizedComponentInfoSchema.propertyValues` (renamed from `variantProperties` in DE-004 P01).
