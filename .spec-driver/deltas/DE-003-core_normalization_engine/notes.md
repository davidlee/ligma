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
