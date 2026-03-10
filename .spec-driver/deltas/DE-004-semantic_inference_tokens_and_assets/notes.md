# Notes for DE-004

## P01 — Prep & type refactor (complete)
- `AnalysisResult<T>` base type + `ExtractorResult<T>` extension — clean split
- `colorToHex()` moved to `raw-helpers.ts` — both appearance.ts and text.ts import it
- `classify()` now returns `AnalysisResult<NormalizedNodeType>`, not bare string. Single call site in node.ts — clean migration.
- Confidence min-rule in node.ts uses `CONFIDENCE_ORDER` lookup table for comparison
- `variantProperties` → `propertyValues` in schema — no downstream impact (field inside null component block)
- All existing test patterns (`.value`, `.warnings`, `.omittedFields`) continued to work — only classify tests needed `.value` destructuring and ok() test needed confidence assertion
- 349 tests (up from 347 — added 2 AnalysisResult contract tests in classify)

