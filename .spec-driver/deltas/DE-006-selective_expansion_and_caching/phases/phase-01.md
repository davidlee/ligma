---
id: IP-006.PHASE-01
slug: 006-selective_expansion_and_caching-phase-01
name: IP-006 Phase 01 — Cache layer
created: '2026-03-11'
updated: '2026-03-11'
status: draft
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-006.PHASE-01
plan: IP-006
delta: DE-006
objective: >-
  Implement file-based caching for Figma API responses: typed cache interface,
  deterministic key derivation, file-based store with metadata sidecars, and
  cache-aware fetch helpers (fetchNodeCached, fetchImageCached). Establishes
  the caching foundation that expansion refetches will use in P02/P03.
entrance_criteria:
  - DR-006 approved
  - DE-006 delta exists with FR-014 linked
exit_criteria:
  - VT-023 through VT-028 pass
  - mise run check green (typecheck + lint + all tests)
  - No regressions in existing test suites
verification:
  tests:
    - VT-023
    - VT-024
    - VT-025
    - VT-026
    - VT-027
    - VT-028
  evidence: []
tasks:
  - id: '1.1'
    description: Cache types
  - id: '1.2'
    description: Cache key derivation
  - id: '1.3'
    description: Cache store
  - id: '1.4'
    description: Cache-aware fetch helpers
  - id: '1.5'
    description: NoopCache
risks:
  - description: Atomic write race on crash
    mitigation: Acceptable for local dev cache; metadata is debugging aid
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-006.PHASE-01
```

# Phase 01 — Cache layer

## 1. Objective

Implement file-based caching for Figma API responses (FR-014). The cache sits at the semantic fetch boundary — wrapping `fetchNode` and `fetchImage` — without modifying the existing client or normalization layers. This phase produces a standalone, fully tested cache module that P03 wires into orchestrate.

## 2. Links & References
- **Delta**: DE-006
- **Design Revision**: DR-006 §§ 5 (Cache types), 8 (Cache Design)
- **Requirements**: PROD-001.FR-014
- **Key Decisions**: DEC-035 (cache at fetch boundary), DEC-039 (version threading)

## 3. Entrance Criteria
- [x] DR-006 approved
- [x] DE-006 exists with FR-014 linked

## 4. Exit Criteria / Done When
- [ ] `src/cache/types.ts` — Cache interface, NodeCacheKey, ImageCacheKey, CacheEntryMetadata, CacheConfig
- [ ] `src/cache/keys.ts` — deterministic key → path derivation with tests
- [ ] `src/cache/store.ts` — file-based store with metadata sidecars and atomic writes
- [ ] `src/cache/index.ts` — createCache(), createNoopCache(), fetchNodeCached(), fetchImageCached()
- [ ] VT-023 through VT-028 all pass
- [ ] `mise run check` green

## 5. Verification

| VT | Description | Test file | Type |
| --- | --- | --- | --- |
| VT-023 | Cache key generation: deterministic, sorted, collision-free | `tests/cache/keys.test.ts` | unit |
| VT-024 | Cache store: JSON r/w, binary r/w, metadata sidecar, atomic writes | `tests/cache/store.test.ts` | unit |
| VT-025 | Cache hit/miss: fetchNodeCached returns cached on hit, fetches on miss | `tests/cache/index.test.ts` | unit |
| VT-026 | Cache invalidation: invalidateFile removes entries, clear removes all | `tests/cache/store.test.ts` | unit |
| VT-027 | Version-aware keys: same node with different version = cache miss | `tests/cache/keys.test.ts` | unit |
| VT-028 | Cached vs uncached fetch produces identical normalized output | `tests/cache/index.test.ts` | integration |

Commands: `mise run check`

## 6. Assumptions & STOP Conditions
- **Assumptions**: Node.js `crypto` module available for SHA-256. `fs/promises` rename is atomic on the target filesystem.
- **STOP when**: Cache key derivation reveals collision risk that sorted-key JSON + SHA-256 doesn't cover.

## 7. Tasks & Progress

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [x] | 1.1 | Cache types (`src/cache/types.ts`) | [P] | Pure types, no deps |
| [x] | 1.2 | Cache key derivation (`src/cache/keys.ts`) + VT-023, VT-027 | [P] | 16 tests |
| [x] | 1.3 | Cache store (`src/cache/store.ts`) + VT-024, VT-026 | | 15 tests |
| [x] | 1.4 | Cache-aware fetch helpers (`src/cache/index.ts`) + VT-025, VT-028 | | 10 tests |
| [x] | 1.5 | NoopCache implementation (`src/cache/index.ts`) | [P] | Covered in 1.4 tests |

### Task Details

- **1.1 Cache types**
  - **Files**: `src/cache/types.ts`
  - **Design**: DR-006 §5 Cache types. Typed interfaces: Cache, NodeCacheKey, ImageCacheKey, CacheEntryMetadata, CacheConfig. `getNode` returns `FigmaFileResponse | null`. `getImage` returns `Uint8Array | null`. `pluginData` field is `'none' | 'shared' | 'all'` (not boolean).
  - **Testing**: Type-only module; verified transitively by consumer tests.

- **1.2 Cache key derivation**
  - **Files**: `src/cache/keys.ts`, `tests/cache/keys.test.ts`
  - **Design**: DR-006 §8 Key derivation. Sorted-key JSON → SHA-256 → 16 hex chars. Directory: `<cacheDir>/nodes/<fileKey>/<nodeId>/<hash>.json`. Images: `<cacheDir>/images/<fileKey>/<nodeId>/<hash>.<format>`. Metadata: `<hash>.meta.json`. Normalize booleans/numbers explicitly before hashing.
  - **Testing**: VT-023 (determinism, stability across runs, different keys produce different hashes). VT-027 (version in key changes hash; null version produces distinct hash from any string version).

- **1.3 Cache store**
  - **Files**: `src/cache/store.ts`, `tests/cache/store.test.ts`
  - **Design**: DR-006 §8 Store. Read/write JSON with metadata sidecar. Read/write binary with metadata sidecar. Atomic writes: write temp file, rename. `invalidateFile(fileKey)` = rm directory. `clear()` = rm cacheDir. Graceful on missing files (return null, not throw).
  - **Testing**: VT-024 (round-trip JSON, round-trip binary, metadata written alongside, temp file cleaned up). VT-026 (invalidateFile removes target dir, clear removes all, both are no-op if dir doesn't exist).

- **1.4 Cache-aware fetch helpers**
  - **Files**: `src/cache/index.ts`, `tests/cache/index.test.ts`
  - **Design**: DR-006 §8 Cache-aware fetch helpers. `fetchNodeCached` checks cache, returns `{ response, fromCache }`. On miss: call `fetchNode`, cache result, return `{ response, fromCache: false }`. `fetchImageCached` similarly for images. Both construct `NodeCacheKey`/`ImageCacheKey` from their arguments. `createCache(config)` returns a real Cache instance. Version passed through from caller.
  - **Testing**: VT-025 (mock client; first call = miss + fetch + cache; second call = hit + no fetch). VT-028 (cached response normalizes identically to direct fetch response).

- **1.5 NoopCache**
  - **Files**: `src/cache/index.ts`
  - **Design**: `createNoopCache()` returns Cache where all gets return null and all sets are no-ops. Used when `--no-cache` is set.
  - **Testing**: Covered by VT-025 (noop variant: always misses, never stores).

## 8. Risks & Mitigations

| Risk | Mitigation | Status |
| --- | --- | --- |
| Atomic write race on crash | Metadata is debugging aid; payload-only or metadata-only is tolerable | accepted |
| SHA-256 collision | 16 hex chars = 64 bits; collision probability negligible for cache use | accepted |

## 9. Decisions & Outcomes
- Decisions inherited from DR-006 (DEC-035, DEC-039). No new decisions expected.

## 10. Findings / Research Notes
- (populated during execution)

## 11. Wrap-up Checklist
- [x] Exit criteria satisfied — 41 tests, `mise run check` green (730 total)
- [x] Verification evidence stored — commit `e6b9f62`
- [x] Phase tracking updated
- [ ] Hand-off notes to Phase 02
