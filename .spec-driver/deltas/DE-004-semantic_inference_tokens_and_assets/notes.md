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

