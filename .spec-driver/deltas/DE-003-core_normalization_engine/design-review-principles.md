Use these as review heuristics.

**1. Structural truth beats raw fidelity**
Prefer representations that help an agent answer “what is this, how is it laid out, what matters?” over mirroring Figma’s schema. Raw Figma JSON is an input format; the normalized schema is a working model.

**2. Normalize for implementation, not archival**
Keep fields that change code decisions: hierarchy, layout, text, styling, assets, bindings, provenance. Drop or collapse fields that are noisy, decorative, redundant, or hard to act on.

**3. Determinism over cleverness**
A simple explicit rule is better than a sophisticated inference that is hard to predict. Reviewers should prefer mappings and heuristics that are stable, testable, and explainable.

**4. Sparse first, deeper only when justified**
The default path should produce a compact, useful result from a scoped node subtree. Any expansion in depth, geometry, variables, or assets should be deliberate and motivated by a concrete consumer need.

**5. The selected subtree is the product boundary**
v1 is about “implement this node/frame,” not “crawl the whole design system.” Anything that shifts scope toward full-file inventory, generalized exploration, or system-wide analysis should be treated as a separate capability.

**6. Inline truth first, aggregate truth second**
If a value is meaningful on a node, keep it on the node even if it may later appear in summaries. Aggregates are conveniences; inline normalized fields are the source of truth for implementation.

**7. Prefer used-context over global inventory**
When forced to choose, summarize what is actually encountered in the normalized subtree rather than fetching full-file catalogs. “Tokens used here” is more aligned with implementation than “all tokens in the file.”

**8. Avoid duplicate absence semantics**
Do not mix `null`, `"unknown"`, omitted fields, and default values casually. Each should have a distinct meaning:

* `null` = not applicable / intentionally not populated
* `"unknown"` = applicable but could not be classified
* default object = intentionally present with empty/false values

**9. Use structured values where units matter**
If the raw API carries unit semantics or mode semantics, do not flatten them into vague strings. Dimensioned values, constraints, and grid/layout modes should preserve implementation-relevant structure.

**10. Prefer enums to passthrough strings**
If consumers branch on a field, normalize it into a small enum. Free-form strings are acceptable only for provenance, diagnostics, or clearly low-value pass-throughs.

**11. Stable provenance is mandatory**
Every lossy normalization should remain debuggable. Keep enough breadcrumb/provenance data to explain where a value came from and why something was omitted or downgraded.

**12. Diagnostics are part of the product**
Warnings and omitted-field tracking are not optional extras. If the normalizer simplifies, ignores, or weakly infers something, the output should say so.

**13. Unknown is acceptable; silent distortion is not**
If the model cannot represent a Figma feature well, map it to `unknown` and emit a warning rather than pretending it cleanly fits an existing bucket.

**14. Preserve agent-legibility over theoretical completeness**
A slightly incomplete but small, readable, and reliable schema is better than a fully expressive schema that agents misuse or ignore.

**15. Composition should stay one-directional**
Leaf extractors should stay pure and domain-local; orchestration belongs in `node.ts`. Reviewers should resist cross-module entanglement unless there is clear second-order value.

**16. Keep fan-out modules boring**
`node.ts` should orchestrate, not invent logic. If a concern becomes nontrivial, split it into its own extractor/helper before `node.ts` becomes a sludge layer.

**17. Default shapes should simplify consumers**
Where a field is conceptually always useful as hints, prefer a default object over nullable plumbing. Where a field is only meaningful for certain node classes, prefer discriminated/null patterns.

**18. Visual truth remains the backstop**
Normalization is allowed to be lossy because the image/render remains the visual source of truth. Structural outputs should support implementation against that reference, not replace it entirely.

**19. Test the compiler pass, not just the functions**
Think of normalization as a compiler stage: fixtures in, stable normalized artifacts out. Golden tests and reduction tests matter as much as per-function unit tests.

**20. Every new field must justify its carrying cost**
Before adding a field, ask:

* Does it change implementation decisions?
* Is it stable enough to normalize deterministically?
* Can agents use it reliably?
* Is it worth the extra schema, code, and token surface?

**21. Prefer explicit future seams over premature scope**
If something is clearly valuable but outside v1, leave a clean seam for it: nullable fields, reserved subobjects, manifest placeholders, future endpoints. Do not smuggle v2 scope into v1 under vague promises.

**22. Normalize according to current Figma semantics, not old assumptions**
Figma’s API evolves. Where the API has first-class concepts like `GRID`, `boundVariables`, or modern truncation fields, reflect those directly instead of forcing them through older mental models.

**23. Best-effort values must be labeled as best-effort**
Fields like local position, inferred absolute layout, or image/type detection can be useful even when not guaranteed. Keep them, but mark uncertainty through diagnostics rather than treating them as hard truth.

**24. Name modules after the normalized domain, not the raw source**
Prefer `appearance.ts` over `style.ts`, `normalizeNode` over “mapper”, and so on. Module names should reflect the output contract reviewers are protecting.

**25. Compactness is a non-functional requirement, not a side effect**
Reduction in output size is part of correctness. The system is not only trying to be right; it is trying to be right in a form that is materially easier for agents to consume.

That set should keep future reviews aligned: narrow scope, strong normalization, explicit uncertainty, small outputs, and clear seams for later expansion.

