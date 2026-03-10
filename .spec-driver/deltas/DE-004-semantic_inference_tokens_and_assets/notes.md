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

