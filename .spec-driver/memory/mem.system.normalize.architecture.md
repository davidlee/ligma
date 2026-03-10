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
  inference post-pass, DEC-018 skip gates, orchestrate wiring, confidence min-rule.
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
                                    → applyInferencesRecursive(root) top-down
```

- `normalize/index.ts` — entry point. Creates root context, validates root, calls `normalizeNode()` then `applyInferencesRecursive()`.
- `normalize/node.ts` — recursive compositor. For each node: classify → run extractors → build hierarchy → recurse children. Returns tree with role=null, semantics=defaults.
- `normalize/infer/index.ts` — top-down post-pass (DEC-031). Mutates tree in-place: populates `role`, `semantics`, `text.semanticKind`. Updates `diagnostics.confidence` to include inference results.
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
- `components.ts` — `NormalizedComponentInfo | null` (DEC-023). INSTANCE/COMPONENT/COMPONENT_SET → metadata; others → null. Flattens `componentProperties` to `Record<name, value>`.
- `variables.ts` — `NormalizedVariableBindings | null` (DEC-024). Node-level `boundVariables` → bindings; `explicitVariableModes` → `explicitModes`. Per-binding `modeId` always null; `tokenName`/`collectionId` null in v1.
- `assets.ts` — `NormalizedAssetInfo | null` (DEC-025). Image fills → bitmap/high; vector complexity → svg/medium; name-only never triggers.

## Inference layer (DEC-026–031)

All modules in `src/normalize/infer/`. Operates on `InferenceInput` (readonly view of assembled node, excludes write-targets). Pure functions returning `AnalysisResult<T>`.

- `types.ts` — `InferenceInput`, `InferenceResults`, `toInferenceInput()`. Named recursive type, not `Pick<NormalizedNode>`. Excludes `variables`, `asset`, `role`, `semantics`, `diagnostics`, `id`, `rotation`.
- `signals.ts` — 12 shared signal helpers (name matching, size/geometry, appearance, layout, child/sibling inspection). Used by role rules.
- `role.ts` — `inferRole()` 13-rule priority chain + noise early-out. Each rule is a standalone function. First match wins. Returns `AnalysisResult<NormalizedRole | null>`.
- `text-kind.ts` — `inferTextKind()`. Primary: derive from role. Parent context: text inside button → button. Fallback: fontSize/fontWeight heuristics.
- `semantics.ts` — `inferSemantics()`. 6 boolean flags derived from role/type/component. No independent heuristics.
- `index.ts` — `applyInferences()` composition, `applyInferencesRecursive()` top-down tree walk. Passes parent role to children, sibling inputs for label rule.

## Key invariants

- **DEC-018**: `node.ts` gates extractors via `SKIP_EXTRACTORS` set for document/page. Extractors themselves are NOT type-aware — they always return populated defaults when called.
- **No `as` casts** — [[mem.fact.lint.strict-config]]. All raw field access via typed accessors in `raw-helpers.ts`.
- **DE-004 fields**: `component`, `variables`, `asset` populated by extractors (P02). `role`, `semantics`, `text.semanticKind` populated by inference post-pass (P03).
- **Confidence**: min-rule across all extraction AND inference results. high > medium > low. Unmatched nodes get role=null/low, which drags overall confidence to low.
- **hierarchy.path**: ancestor chain (current node excluded). Grows with depth.

## Shared utilities

- `raw-helpers.ts` — `getRawProperty`, `getRawString`, `getRawNumber`, `getRawBoolean`, `getRawArray`, `getRawRecord`, `isRecord`, `ok()` helper, `AnalysisResult<T>`, `ExtractorResult<T>`, `colorToHex()`.
- `colorToHex()` — shared utility for Figma RGBA → hex conversion (DEC-020). Used by appearance.ts and text.ts.

## Schema note

- `NormalizedComponentInfoSchema.propertyValues` (renamed from `variantProperties` in DE-004 P01).
