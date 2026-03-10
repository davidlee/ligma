# DE-003 Normalization Design Principles

Distilled from DR-003 design sessions. Reference for implementation agents.

## 1. Absence semantics are load-bearing

`null` means "not attempted or not applicable." An enum value `"unknown"` means "attempted but indeterminate." These are not interchangeable.

- `role: null` — DE-003 doesn't attempt role inference
- `type: "unknown"` — classification was attempted, Figma type unmapped
- `text.semanticKind: "unknown"` — text extraction ran, kind undetermined
- `layout: null` — node type cannot have layout (DOCUMENT, CANVAS)
- `layout: { mode: "none", ... }` — node can have layout, but doesn't

Mixing these up silently corrupts downstream consumers. (DEC-016, DEC-018)

## 2. Extractors are pure, composable, and independent

Each extractor takes a raw `FigmaNode`, returns `ExtractorResult<T>`. No extractor depends on another's output. `node.ts` is the sole composition point.

This means:
- No extractor imports another extractor
- No extractor reads from `NormalizedNode` — only from raw input
- No extractor checks node type to decide applicability — `node.ts` gates calls (DEC-018)
- Diagnostics (warnings, omittedFields) flow up, never sideways
- Testing is trivial: raw node in, typed result out

DE-004 may add a post-processing stage that combines results across extractors. That's a separate concern, not a reason to couple extractors now. (DEC-009)

## 3. Warnings, not exceptions

`normalize()` degrades gracefully. Unsupported paint types, missing position fields, unknown constraints — all produce diagnostic warnings, never throw. `NormalizationError` is reserved for catastrophic failure (malformed root node with missing id/name/type).

A normalized tree with warnings is far more useful than a crash. (DEC-019)

## 4. The type surface is the contract

The full `NormalizedNode` skeleton is defined in DE-003, including fields DE-004 will populate. These fields are `null` now. This is deliberate:
- Downstream consumers type against the final shape from day one
- DE-004 is additive (populating nulls), not structural (changing the type)
- No breaking changes, no intersection types, no schema evolution pain

(DEC-007)

## 5. Implementation-oriented, not API-mirroring

The normalizer is not a 1:1 Figma API wrapper. It answers implementation questions:

- "What is this?" → `type` (classified), not raw Figma type string
- "How is it laid out?" → `layout.mode`, `sizing`, `align` — not raw `layoutMode`/`primaryAxisSizingMode`
- "What color?" → `#RRGGBB` hex, not `{ r: 0.5, g: 0.5, b: 0.5, a: 1 }`
- "Fixed or unitful?" → `DimensionValue { unit, value }`, not ambiguous `string | number`

Where the API is unitful (lineHeight), we normalize to structured values. Where the API has legacy/duplicate fields (sizing), we prefer the newer field and fall back. Where the API lacks a concept we need ("absolute" layout mode), we infer it.

## 6. Passthrough isolation

Raw `FigmaNode` uses Zod `.passthrough()` — fields beyond `id`/`name`/`type`/`children` are `unknown`. All access goes through `getRawProperty()`, not scattered casts. One location for the unsafe type narrowing. (DEC-017)

## 7. Confidence is meaningful

`"high"` = clean extraction, no warnings. `"medium"` = at least one extractor produced a warning (unsupported paint, missing position, etc.). `"low"` = reserved for DE-004 heuristic uncertainty.

If every node is `"high"`, confidence carries no signal. The downgrade-on-warning rule ensures it reflects real extraction quality. (DEC-009)
