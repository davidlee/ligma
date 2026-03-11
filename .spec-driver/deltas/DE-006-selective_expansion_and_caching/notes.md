# Notes for DE-006

## Phase 01 — Cache layer

### Status: complete

All 5 tasks done, 41 tests pass, `mise run check` green (730 total tests, zero regressions).

### What was built

- `src/cache/types.ts` — Cache interface, NodeCacheKey, ImageCacheKey, CacheEntryMetadata, CacheConfig
- `src/cache/keys.ts` — deterministic key derivation (sorted-key JSON → SHA-256 → 16 hex)
- `src/cache/store.ts` — file-based store with atomic writes (temp+rename), metadata sidecars, Zod validation on read
- `src/cache/index.ts` — createCache, createNoopCache, fetchNodeCached, fetchImageCached

### Surprises / adaptations

- **`readFile` returns `Buffer`, not `Uint8Array`**: Cache `getImage` must convert via `new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)`. Without this, `toEqual` comparison fails because Buffer and Uint8Array are not structurally equal.
- **`unicorn/prevent-abbreviations` rule**: Blocks `cacheDir`, `ext`. Used `cacheDirectory`, `extensionIndex`. All cache types and keys use `cacheDirectory` consistently.
- **`@typescript-eslint/unbound-method`**: Strict config blocks `expect(cache.setNode).toHaveBeenCalled()` on object methods. Solved with call counters instead of vi.fn on methods.
- **`mockResolvedValue` with Response objects**: A single Response can only be `.text()`'d once. Tests requiring multiple fetches need `mockImplementation(() => Promise.resolve(jsonResponse(...)))` to create fresh Response per call.
- **Interface types don't satisfy `Record<string, unknown>`**: `canonicalize` helper needed a `toRecord` wrapper using spread to convert typed interfaces.

### Commits

- `e6b9f62` feat(DE-006): implement cache layer — types, keys, store, fetch helpers
- `.spec-driver` changes (delta status, IP, DR, phase sheet) committed separately prior to implementation.

### Verification

`mise run check` green at `e6b9f62`. All 730 tests pass, zero lint warnings.

### Follow-ups for P02/P03

- `fetchImageCached` sets `sourceUrl: ''` on cache hit (original sourceUrl stored in metadata sidecar but not read back). Acceptable for v1 — sourceUrl is a diagnostic, not a correctness field.
- `pluginData` in NodeCacheKey is hardcoded to `'none'` in fetchNodeCached. Needs to read from options when pluginData endpoint option is wired through in P03.

## Phase 02 — Expansion engine

### Status: complete

All 5 tasks done, 36 new tests pass, `mise run check` green (766 total tests, zero regressions).

### What was built

- `src/expand/types.ts` — ExpansionReasonCode, ExpansionTarget, TriggerContext, ExpansionTrigger, ExpansionConfig, ExecutedExpansion, SkippedExpansion, ExpansionResult, MergeInput, MergeResult
- `src/expand/triggers.ts` — depthTruncatedContainer, geometryNeeded, evaluateExpansionTriggers (dedup, priority sort, cap)
- `src/expand/merge.ts` — findRawNodeById, mergeExpansions (immutable path-cloning, deepest-first, soft failure)

### Surprises / adaptations

- **`noUncheckedIndexedAccess` + `assertionStyle: 'never'`**: Array indexed access returns `T | undefined` and neither `!` nor `as` are allowed. Pattern: extract a `childAt()` helper returning `T | undefined`, then guard with `=== undefined`. For tests, a throwing `child()` helper avoids the issue.
- **`max-lines-per-function: 80`**: `evaluateExpansionTriggers` exceeded limit. Extracted `collectTriggerResults`, `filterAlreadyExpanded`, `toExpansionTarget` helpers.
- **`strict-boolean-expressions`**: Nullable objects cannot be used in conditionals directly. Must compare `!== null` / `!== undefined` explicitly.
- **FigmaNode children**: `readonly FigmaNode[]` from `getChildren()`, but spread produces `FigmaNode[]`. Used `.map()` with identity replacement in `replaceChildAt` to avoid needing type casts.

### Commits

- `6c8e0c6` chore(DE-006): create P02 phase sheet
- `bc084cf` feat(DE-006): implement expansion engine — types, triggers, merge

### Verification

`mise run check` green at `bc084cf`. 766 tests, zero lint warnings.

### Follow-ups for P03

- `evaluateExpansionTriggers` returns `EvaluationResult` (not `ExpansionResult`) — the `ExpansionResult` type from types.ts includes `executed`/`skipped` fields for post-fetch results. P03 orchestrate will map between these.
- `variant-set` included in container types per DR-006 §6. If real-world data shows this produces excessive false positives, reconsider in a future delta.
- Triggers don't read `childCount` (per DR-006 §11 adversarial finding). The truncation signal is purely type + depth + empty children array.

