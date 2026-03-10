# Notes for DE-003

## 2026-03-10 — DR-003 critical review (pre-planning)

Gave the DR a final critical pass before planning. Found 14 issues (4 high, 5 medium, 5 low). All internal specification gaps — no external API research needed. Amendments applied directly to DR-003.md and design-principles.md.

### High issues resolved

1. **`position.positioning` had no data source** — added `layoutPositioning: "ABSOLUTE" → "absolute"`, `"AUTO"/absent → "flow"` mapping to layout mapping section.
2. **`extractVisible`/`extractRotation` violated DEC-017** — pseudocode now uses `getRawProperty()`. `extractVisible` inlined into node return (one-liner). `extractRotation` documented as using `getRawProperty`.
3. **Image classification prose/code contradiction** — removed "visible" qualifier from prose. Classify is presence-only; appearance extractor handles visibility.
4. **DEC-018 ownership ambiguous** — `node.ts` now explicitly gates extractor calls via `SKIP_EXTRACTORS` set for document/page. Extractors are not type-aware. Added to design-principles.md §2.

### Medium issues resolved

5. **`mode: "absolute"` underspecified** — scoped to FRAME/COMPONENT/INSTANCE only, requires ≥1 child. GROUP → "none", SECTION → "none", zero-children → "none".
6. **blendMode NORMAL vs PASS_THROUGH** — only PASS_THROUGH → null now. NORMAL preserved as "normal" (semantically distinct for groups). Updated DEC-020.
7. **Wrap mapping missing** — added `layoutWrap` mapping. `counterAxisSpacing` noted as omittedField when wrap is true.
8. **Grid align semantics** — added note that main/cross map from same API fields but axis semantics differ from flexbox.
9. **Cross-axis alignment mapping** — fully spelled out including BASELINE → baseline.

### Low issues noted (no DR changes needed)

10. `counterAxisSpacing` omitted — acknowledged via omittedFields (see #7).
11. Padding null conflates "not applicable" with "explicitly zero" — accepted trade-off.
12. `strokeWeight` per-node vs per-stroke type shape — added clarifying note to appearance mapping.
13. Text `color: null` when no visible fills — added explicit null case to text mapping.
14. Negative `itemSpacing` — passes through; no action needed.

### Final review round (owner feedback)

6 additional consistency fixes applied:

1. **`ConstraintMode` added `"unknown"`** — unmapped constraint values now have a type-safe landing spot instead of a gap between warning and representation.
2. **`semanticKind` made non-nullable** — was `TextSemanticKind | null` but DEC-016 already treats it as attempted-but-indeterminate (`"unknown"`). Removed `| null` to match the absence-semantics contract.
3. **Extractor default-object contract** — added explicit prose: when called (non-document/page), extractors always return populated defaults, never null. Extractors don't reason about node-type applicability.
4. **VT-013 measurement defined** — serialized JSON string length (`JSON.stringify`, no pretty-printing), both sides include image URLs.
5. **`rotation` softened** — wording now says "best-effort, non-blocking" with explicit "must verify against real response and degrade to null if unavailable."
6. **`"image"` classification clarified** — added sentence: semantic implementation category, not a raw node-kind analogue.

### DR status

Ready for acceptance and planning. No blocking issues remain. The 4 open questions in §9 are implementation-time verifications against real API responses, not design gaps.

## 2026-03-10 — Phase 1 + Phase 2 implementation

### What's done

**Phase 1** (complete, committed `e371f98`, docs `0e3f04d`):
- `src/schemas/normalized.ts` — 30+ Zod schemas, recursive NormalizedNode via `z.lazy()`
- `src/normalize/raw-helpers.ts` — `getRawProperty`, typed accessors, `ExtractorResult<T>`, `ok()`
- `src/normalize/classify.ts` — 16-entry type map, isMask override, IMAGE fill detection
- `src/normalize/bounds.ts` — absoluteBoundingBox extraction with malformed warning
- 59 tests (VT-008 verified)

**Phase 2** (complete, committed `2a6a131`):
- `src/normalize/layout.ts` — mode/sizing/align/padding/gap/wrap/grid/constraints/position
- `src/normalize/appearance.ts` — paints/strokes/effects/cornerRadius/blendMode/opacity
- `src/normalize/text.ts` — content/style/DimensionValue/color/truncation
- 95 tests (VT-009, VT-010, VT-011 verified)

### Surprises / adaptations

1. **`consistent-type-assertions: { assertionStyle: 'never' }`** — NO `as` casts allowed anywhere. DR-003's `getRawProperty<T>` pseudocode used `as T` which is illegal. Adapted to typed runtime accessors (`getRawString`, `getRawNumber`, etc.) that do runtime narrowing. More type-safe than the DR.
2. **`complexity: 8` limit** — forced extraction of several helpers (`parsePerCornerRadii`, `collectFills`, `runExtractors`, `buildChildContext`) to keep functions under the cap. Slightly more decomposed than DR pseudocode but cleaner.
3. **`noUncheckedIndexedAccess: true`** — array destructuring returns `T | undefined`, requiring explicit null-safe access patterns (e.g., `corners[0] ?? 0`).
4. **Import order strictness** — sibling type imports must come before parent type imports. Required rearranging imports in every file.

## 2026-03-11 — RE-002: NF-001 revision (mid-Phase 3)

### What happened

Phase 3 implementation (recursive node compositor, orchestrate wiring) went cleanly — 344/345 tests passed on the first cut. The sole failure was VT-013, which asserted normalized output is >50% smaller than raw input by `JSON.stringify` length.

### Why it failed

Tested against real Figma data (a 37-node design system frame, ~10KB raw after Zod parse). Normalized output came in at 12.9KB — 28% *larger*, not 50% smaller. The synthetic fixture showed the same pattern at -67%.

This wasn't a fixture quality issue. The normalized schema intentionally adds per-node structural metadata that the raw format doesn't have:

- `hierarchy.path` — ancestor chain, ~120 chars/node at average depth 3
- `semantics` — 6 boolean flags, ~130 chars/node
- `diagnostics` — sourceNodeType, omittedFields, warnings, confidence, ~80 chars/node
- DE-004 null placeholders (component, variables, asset, role) — ~50 chars/node

These additions (~380 chars/node × 37 nodes ≈ 14KB) outweigh what field stripping saves (~240 chars/node × 37 ≈ 9KB). The schema was designed correctly — it trades raw byte count for agent-useful structure. The metric was wrong.

### How it was resolved

This is a good example of spec-driver's revision flow handling a mid-implementation discovery:

1. **Obstacle surfaced during phase execution** — implementation revealed the empirical gap.
2. **Consulted before deciding** — presented root cause analysis and 5 options with tradeoffs to the project owner rather than silently adjusting.
3. **Owner refined the metric** — converged on a two-part efficiency measure that tests what actually matters: (a) schema simplification (fixed, smaller top-level field set), (b) bounded overhead (≤2.0x raw size ceiling).
4. **Shaped as a revision** — created RE-002 to document the rationale and cascade the change through the artefact graph.
5. **Spec patches applied in place** — PROD-001 NF-001, SPEC-001 NF-001, DR-003 §2/§3/§6, IP-003 VT table — all updated with RE-002 traceability.
6. **VT-013 rewritten** — two clean assertions replacing the single wrong one.
7. **Result**: 347/347 pass, `mise run` green.

The key insight: the original ">50% reduction" was set aspirationally before the normalized schema was designed. Once the schema correctly prioritised agent utility (hierarchy paths, diagnostics, forward-compatible placeholders), the byte-reduction target became structurally impossible to meet. Revising the metric was the right call — not gaming the measurement, not stripping useful fields, not deferring the test.

## Phase 3 — implementation

**Phase 3** (complete, ready to commit):
- `src/normalize/node.ts` — recursive compositor with DEC-018 skip gates, hierarchy path building, extractor aggregation, confidence downgrade on warnings
- `src/normalize/index.ts` — entry point with NormalizationError on malformed root
- `src/orchestrate.ts` — wired `normalizedNode` into `OrchestrateResult`
- `tests/normalize/node.test.ts` — VT-012 (26 tests) + VT-013 (2 tests, RE-002 metric)
- `tests/normalize/reduction-check.test.ts` — diagnostic fixture for manual size verification

### Rough edges / follow-ups

- Future: add fixture-based percentile tracking once DE-004 fills component/variable/asset fields (potential hardening: "median ratio across representative fixtures ≤ 1.5x").
- `colorToHex()` is duplicated in `appearance.ts` and `text.ts`. Should be extracted to a shared utility in a follow-up.
- Phase 2 `.spec-driver` docs not fully updated (phase-02.md still in-progress, task statuses not checked off). Should be finalized once Phase 3 is committed.

### Durable facts for memory

- eslint `assertionStyle: 'never'` is project-wide — no `as` casts in any module
- Import order: value imports (by group), blank line, type imports (sibling before parent)
- `FigmaNode` has `[key: string]: unknown` index signature — direct `node.someField` returns `unknown` without casts
- `z.lazy()` + explicit interface is the pattern for recursive Zod schemas (same as FigmaNodeSchema)
- NF-001 revised by RE-002 — metric is now schema simplification + ≤2.0x size ceiling, not ">50% reduction"
