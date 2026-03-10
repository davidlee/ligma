# Notes for DE-004

## P01 — Prep & type refactor (complete)
- `AnalysisResult<T>` base type + `ExtractorResult<T>` extension — clean split
- `colorToHex()` moved to `raw-helpers.ts` — both appearance.ts and text.ts import it
- `classify()` now returns `AnalysisResult<NormalizedNodeType>`, not bare string. Single call site in node.ts — clean migration.
- Confidence min-rule in node.ts uses `CONFIDENCE_ORDER` lookup table for comparison
- `variantProperties` → `propertyValues` in schema — no downstream impact (field inside null component block)
- All existing test patterns (`.value`, `.warnings`, `.omittedFields`) continued to work — only classify tests needed `.value` destructuring and ok() test needed confidence assertion
- 349 tests (up from 347 — added 2 AnalysisResult contract tests in classify)

## P02 — New extractors (complete)
- `extractComponent` (components.ts): INSTANCE/COMPONENT/COMPONENT_SET → `NormalizedComponentInfo`. Flattens `componentProperties` from `{ name: { value, type } }` to `Record<name, value>`. Missing componentId on instance → medium confidence + warning.
- `extractVariables` (variables.ts): node-level `boundVariables` → bindings array. Handles both scalar and array alias forms. `resolvedType` inferred from field name via lookup sets. Per-binding `modeId` always null (DEC-024); `explicitModes` at node level from `explicitVariableModes`.
- `extractAsset` (assets.ts): image fills → bitmap/high, vector complexity (≥3 children or nested boolean-ops) → svg/medium, both → mixed. Name-only match never triggers. `exportNodeIds: [node.id]`.
- Wiring: `node.ts` split into `runCoreExtractors()` + `runExtractors()` to stay under complexity limit. All extractors included in confidence min-rule and warning/omittedField aggregation.
- Lint: `unicorn/prevent-abbreviations` caught `refs` → `references`, `props` → `properties`. Complexity limit (8) required extracting `runCoreExtractors`. `curly` rule requires braces on all if-return patterns.
- NF-001: 1.35x (up from 1.28x in P01). Well within 2.0x ceiling.
- 405 tests (up from 349 — added 55: VT-014 14, VT-015 27, VT-016 14)

## P03 — Inference layer (complete)
- 6 new modules in `src/normalize/infer/`: types.ts, signals.ts, role.ts, text-kind.ts, semantics.ts, index.ts
- `InferenceInput` is a named recursive readonly type (DEC-022) — not `Pick<NormalizedNode>`. `toInferenceInput()` strips write-target and extraction-only fields, recursively maps children. Excludes `id`, `rotation`, `variables`, `asset`, `role`, `semantics`, `diagnostics`.
- 12 signal helpers in signals.ts — all pure, all take typed input. Used across role rules and sibling inspection.
- `inferRole()`: 13-rule priority chain with noise early-out. Each rule is a standalone function to stay under complexity 8. `buttonRule` required extracting `countButtonSignals()`, `bodyTextRule` required extracting `isBodyTextStyle()`, `inferTextKindFallback` required extracting `isHeadingStyle()`.
- Sibling access for label rule: `inferRecursive` computes `childSiblingInputs` from parent's children, passes to each child's `inferRole` call.
- `applyInferencesRecursive()` wired in `normalize/index.ts` after `normalizeNode()` returns the completed tree (DEC-031 top-down post-pass). `normalizeNode` still returns defaults; inference mutates in-place.
- Existing `normalizeNode` tests unaffected — they call `normalizeNode` directly, not `normalize()`. New inference-wiring tests added to `node.test.ts` via `normalize()`.
- Lint surprises: `import/order` requires sibling (`./`) type imports before parent (`../`) type imports. `@typescript-eslint/prefer-optional-chain` caught `layout === null || layout.padding === null` pattern. `no-duplicate-type-constituents` rejected `T | null | undefined` on optional params.
- NF-001: 1.36x (up from 1.35x in P02). Minimal size increase from populating role/semantics/textKind.
- 548 tests (up from 405 — added 143: VT-021 53, VT-017 39, VT-018 16, VT-019 20, VT-020 11, node.test.ts 4)
- Commits: 65d6872 (types+signals), 68b178a (inference modules+tests), 79645ca (wiring)
- `mise run` green. `.spec-driver` phase sheet committed earlier (333d5ae). Notes pending commit.

## P04 — Summary and integration (complete)
- `src/schemas/tokens-used.ts`: 4 Zod schemas — `EncounteredLocationSchema`, `TokenReferenceSchema`, `StyleReferenceSchema`, `TokensUsedSummarySchema`. `scope.isFullInventory` is `z.literal(false)`.
- `src/summary/tokens-used.ts`: `aggregateTokensUsed(root, fileKey, rootNodeId)` — recursive tree walk, dedup by tokenId, resolvedType conflict resolution (specific wins over unknown, genuine conflict warns and keeps first), supplemental paint tokenRef collection from `appearance.fills/strokes`.
- Paint-level `tokenRef`: currently always `null` in `extractAppearance()` (hardcoded line 75). Supplemental collection path is implemented but effectively a no-op in DE-004. Variables `boundVariables` already captures paint-bound tokens at the node level. Future work could populate `tokenRef` on paints directly.
- `orchestrate.ts`: calls `aggregateTokensUsed()` after `normalize()`. `OrchestrateResult` gained `tokensUsed: TokensUsedSummary`. Manifest outputs now includes `tokensUsedJson: 'tokens/tokens-used.json'`.
- `output/write.ts`: `OutputArtifacts` gained optional `tokensUsed`. `writeOutput()` writes `tokens/tokens-used.json`.
- `output/manifest.ts`: `ManifestInput.outputs` extended with `tokensUsedJson`. `buildOutputs()` passes it through.
- `styles` array: always `[]`. Schema only — forward-compatibility placeholder per DR-004 §5.10.
- `counts.typography`: always 0. No `resolvedType` maps to typography in DE-004. Reserved for future style extraction.
- Lint: `unicorn/prevent-abbreviations` caught `acc` → `accumulator`, `Ref` → `Reference`, `Refs` → `References`, `i` → `index`. `@typescript-eslint/switch-exhaustiveness-check` required explicit cases for `string`/`boolean`/`unknown` in countByType switch. `import/order` caught test import ordering.
- NF-001: 1.36x (unchanged from P03 — tokens-used.json is separate artifact, not in normalized tree).
- 571 tests (up from 548 — added 23: VT-022 21, orchestrate 2). 31 test files.
- Commits: 81758c8 (phase sheet), e84331b (implementation + tests)
- `mise run` green. Phase sheet and notes pending commit together.

## Value-prop evaluation (post-P04)

Ran a live comparison: fetched a real production Figma frame (depth 10), normalized it, extracted representative subtrees (a card component and a filter bar), and sent both raw and normalized representations to an external model with the prompt "implement this in React + Tailwind — which input is more useful?"

### What works well

- **Structure and comprehension**: Normalized output dramatically faster to understand. Role inference (`button`, `icon`, `heading`, `grid`, `stack`) gives an AI agent immediate understanding of what each node IS without parsing raw Figma properties.
- **Signal vs noise**: Raw Figma JSON carries large amounts of renderer-internal data (`absoluteRenderBounds`, `scrollBehavior`, `cornerSmoothing`, `styleOverrideTable`, `imageTransform`) that are useless for implementation. Normalized output strips this effectively.
- **Implementation clarity**: Layout normalization (`mode: "horizontal"` → flexbox, `mode: "absolute"` → positioned) maps directly to CSS concepts. Appearance separation is clean. `asset.exportSuggested` is directly actionable.
- **Component metadata**: `component.kind`, `propertyValues` (e.g. `State: "Selected"` vs `"Unselected"`) immediately communicates component variant state — high value for implementation.

### What doesn't work yet

- **Data loss — per-side stroke weights (ISSUE-001, p2)**: `extractAppearance()` reads `strokeWeight` (scalar) and ignores `individualStrokeWeights` (per-side). A bottom-only 2px underline becomes `weight: 1`. Produces incorrect CSS. This is the most critical finding — the normalized output is factually wrong for these nodes.
- **Data loss — interactions (ISSUE-002, p3)**: `interactions` array (hover/click prototyping) dropped entirely. Lower priority but still useful signal for interactive components.
- **Token names**: `tokenName: null` across all bindings. The `variables.bindings` structure is better organized than raw `boundVariables`, but not actionable without resolved names. Would become high-value if populated (requires Variables API / Enterprise access).
- **Paint-level tokenRef**: Always `null` in `extractAppearance()`. The supplemental collection path in `aggregateTokensUsed()` is a no-op. Variables `boundVariables` covers the same tokens at the node level, so this is not a data loss — just an unfulfilled schema field.

### Size comparison (real frame)

- Raw (minified): 312KB
- Normalized (minified): 420KB (1.35x ratio)
- Raw (pretty): 721KB
- Normalized (pretty): 1.07MB
- tokens-used.json: 47KB

The normalized output is larger because it adds semantic fields (role, semantics, component, variables, asset, diagnostics, hierarchy) that don't exist in raw. This is expected and acceptable — the value is in the enrichment, not compression.

### Verdict

The normalization engine delivers clear value for structure, comprehension, and implementation planning. The role inference and layout normalization are the highest-value features. The critical gap is data fidelity — per-side stroke weights must not be lost. Filed as ISSUE-001 (p2) and ISSUE-002 (p3).
