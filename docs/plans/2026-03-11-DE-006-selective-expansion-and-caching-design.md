# DE-006 Design: Selective expansion and caching

**Delta**: DE-006
**DR**: DR-006
**Date**: 2026-03-11

## Summary

Add selective child expansion (FR-015) and file-based fetch caching (FR-014) to the pipeline. Expansion evaluates triggers on the normalized tree after initial fetch, refetches truncated or geometry-deficient nodes, merges at the raw tree level, and re-normalizes. Caching wraps the semantic fetch boundary (fetchNode, fetchImage) with a typed file-based cache.

## Architectural invariants

1. **Raw tree is the merge substrate.** Normalized trees are derived artifacts — never mutated, never grafted. All expansion merges happen at the raw tree level; normalized trees are recomputed from scratch.
2. **Cache stores only remote fetch artifacts, never derived outputs.** Normalized, outline, context.md, and tokens-used are always recomputed.
3. **Expansion is a bounded enrichment step, not a recursive discovery engine.** Single-pass, capped targets, explicit enable/disable.
4. **Normalize stays pure.** No knowledge of expansion, caching, or I/O.
5. **Expansion decisions are made from normalized output plus trigger context, never from direct raw-tree inspection.**
6. **Triggers must only fire on signals that are monotonic under expansion.** Expanding a node must not create new ambiguous triggers elsewhere in the tree.

## Key decisions

| ID | Decision |
| --- | --- |
| DEC-032 | Expansion loop lives in orchestrate.ts; policy/mechanics in src/expand/ helper layer |
| DEC-033 | All expansion merges at raw-tree level; full re-normalization after merge — context correctness over optimization |
| DEC-034 | Triggers read normalized nodes + TriggerContext side-channel; no raw-node access |
| DEC-035 | Cache at semantic fetch boundary (fetchNode/fetchImage level), not at client or orchestrate level |
| DEC-036 | Single expansion pass only (v1); multi-pass off the table |
| DEC-037 | Whole-node replacement in merge, not children-only splice — richer refetches can add node-level fields |
| DEC-038 | Figma API depth is a positive integer (min 1); no depth: 0 in trigger or fetch contract |
| DEC-039 | Version threading: initial fetch unversioned, expansion fetches use fileResponse.version |
| DEC-040 | Image fetch runs once (parallel with initial node fetch), not rerun after expansion |

## New modules

### `src/expand/`

- `types.ts` — ExpansionTarget, ExpansionTrigger, TriggerContext, ExpansionConfig, ExpansionResult, ExecutedExpansion, SkippedExpansion
- `triggers.ts` — individual trigger functions + evaluateExpansionTriggers()
- `merge.ts` — findRawNodeById(), mergeExpansions() (immutable path-cloning)

### `src/cache/`

- `types.ts` — Cache interface, NodeCacheKey, ImageCacheKey, CacheEntryMetadata, CacheConfig
- `keys.ts` — deterministic cache key → file path derivation (sorted-key JSON → SHA-256 hash)
- `store.ts` — file-based read/write under .cache/figma-fetch, metadata sidecar, invalidation
- `index.ts` — createCache(), createNoopCache(), fetchNodeCached(), fetchImageCached()

## Modified modules

- `src/config.ts` — FetchConfig gains expansion + cache fields with validation
- `src/orchestrate.ts` — expansion loop + cache-aware fetch wiring
- `src/cli.ts` — new flags

## Untouched modules (by design)

- `src/normalize/**` — pure, no knowledge of expansion or caching
- `src/figma/client.ts` — unchanged; cache wraps at a higher level
- `src/figma/fetch-node.ts` — unchanged
- `src/figma/fetch-image.ts` — unchanged
- `src/output/**` — unchanged

## Types

### Expansion types (`src/expand/types.ts`)

```typescript
type ExpansionReasonCode =
  | 'depth-truncated-container'
  | 'geometry-needed'
  // extensible: 'image-fill-unresolved' when backed by fixtures

interface ExpansionTarget {
  nodeId: string
  reasonCode: ExpansionReasonCode
  reason: string
  depth: number | null       // null = use config default
  requireGeometry: boolean
  priority: number           // lower = higher priority; ties broken by discovery order
}

interface TriggerContext {
  requestedDepth: number
  fetchState: {
    requestedGeometry: boolean
    expandedNodeIds: ReadonlySet<string>
  }
}

type ExpansionTrigger = (
  node: NormalizedNode,
  context: TriggerContext,
) => ExpansionTarget | null

interface ExpansionConfig {
  enabled: boolean
  maxTargets: number         // default 10
  expansionDepth: number     // default 2
}

interface ExecutedExpansion {
  nodeId: string
  reasonCode: ExpansionReasonCode
  allReasonCodes: ExpansionReasonCode[]
  reason: string
  depth: number
  geometry: boolean
  success: boolean
  fetchedFromCache: boolean
  error?: string
}

interface SkippedExpansion {
  nodeId: string
  reasonCode: ExpansionReasonCode
  reason: string
  skippedBecause: 'max-targets-exceeded' | 'already-expanded' | 'deduplicated-lower-priority'
}

interface ExpansionResult {
  executed: ExecutedExpansion[]
  skipped: SkippedExpansion[]
  totalTriggered: number
  totalExecuted: number
  totalSkipped: number
}
```

### Cache types (`src/cache/types.ts`)

```typescript
interface NodeCacheKey {
  fileKey: string
  nodeId: string
  depth: number
  geometry: boolean
  pluginData: 'none' | 'shared' | 'all'
  version: string | null     // null = unversioned (weaker trust)
}

interface ImageCacheKey {
  fileKey: string
  nodeId: string
  format: 'png' | 'svg'
  scale: number
  version: string | null
}

interface CacheEntryMetadata {
  createdAt: string          // ISO 8601
  version: string | null
  canonicalKey: string       // JSON-serialized key for debugging
}

interface CacheConfig {
  enabled: boolean
  cacheDir: string           // default: '.cache/figma-fetch'
}

interface Cache {
  getNode(key: NodeCacheKey): Promise<FigmaFileResponse | null>
  setNode(key: NodeCacheKey, value: FigmaFileResponse): Promise<void>
  getImage(key: ImageCacheKey): Promise<Uint8Array | null>
  setImage(key: ImageCacheKey, value: Uint8Array): Promise<void>
  invalidateFile(fileKey: string): Promise<void>
  clear(): Promise<void>
}
```

## Triggers (v1)

### `depthTruncatedContainer` (priority 1–2)

```
Condition: node.hierarchy.depth === context.requestedDepth
           && node.children.length === 0
           && node.type ∈ {frame, group, component, instance, variant-set, section}
ReasonCode: 'depth-truncated-container'
Reason: "depth-truncated container: <name>"
        or "depth-truncated component instance: <name>" when type === 'instance'
Priority: 1 for instance/component, 2 for others
Depth: null (use config default)
RequireGeometry: false
```

A container-type node with no children at the exact depth boundary is the truncation signal. Genuinely childless containers at the boundary are harmless false positives — refetch confirms they have no children.

### `geometryNeeded` (priority 3)

```
Condition: node.type ∈ {vector, boolean-operation}
           && !context.fetchState.requestedGeometry
           && (node.asset?.exportSuggested === true || node.role === 'icon')
ReasonCode: 'geometry-needed'
Reason: "geometry data needed for export: <name>"
Depth: null (use config default)
RequireGeometry: true
Priority: 3
```

Payload-shape expansion, not depth expansion. Fires only when geometry wasn't already requested and the node is worth exporting.

### `evaluateExpansionTriggers`

1. Walk normalized tree depth-first
2. For each node, run all triggers
3. Collect non-null results
4. Group by nodeId
5. Merge duplicates: lowest priority, OR requireGeometry, max non-null depth. Targets that lose deduplication become SkippedExpansion with `skippedBecause: 'deduplicated-lower-priority'`
6. Filter out nodeIds in context.fetchState.expandedNodeIds → SkippedExpansion with `skippedBecause: 'already-expanded'`
7. Sort by priority (stable: ties broken by discovery order)
8. Take top config.maxTargets. Targets beyond the cap become SkippedExpansion with `skippedBecause: 'max-targets-exceeded'`

## Raw tree merge (`src/expand/merge.ts`)

```typescript
interface MergeInput {
  nodeId: string
  expandedNode: FigmaNode
}

interface MergeResult {
  merged: FigmaNode
  applied: string[]
  notFound: string[]
}

function findRawNodeById(
  root: FigmaNode,
  targetId: string,
): { node: FigmaNode; parent: FigmaNode | null; childIndex: number | null } | null

function mergeExpansions(
  root: FigmaNode,
  expansions: MergeInput[],
): MergeResult
```

Rules:
- **Whole-node replacement**: replace the entire target node with the refetched node
- **Immutable**: path-clone along modified branches; original tree untouched
- **Apply order**: deepest nodes first (children before parents). A parent replacement replaces the entire subtree including any already-applied child replacements, so applying children first ensures their work is preserved if the parent is *not* also a target. If the parent *is* also a target, child replacements are intentionally superseded by the richer parent refetch. This is a deliberate rule, not an accidental consequence.
- **Assumes unique nodeIds**: deduplication happens upstream in trigger evaluation
- **Supports root replacement**: parent: null, childIndex: null
- **Soft failure**: missing targets recorded in notFound, not fatal

## Cache design

### Key derivation (`src/cache/keys.ts`)

- Full key object → sorted-key JSON → SHA-256 → truncate to 16 hex chars
- Directory structure: `<cacheDir>/nodes/<fileKey>/<nodeId>/<hash>.json` (and `.meta.json`)
- Images: `<cacheDir>/images/<fileKey>/<nodeId>/<hash>.<format>` (and `.meta.json`)
- `invalidateFile(fileKey)` = rm cacheDir/nodes/<fileKey>/ + cacheDir/images/<fileKey>/
- Normalize booleans/numbers explicitly before hashing; no reliance on property order

### Store (`src/cache/store.ts`)

- Atomic writes: write to temp file, then rename
- JSON payloads stored with metadata sidecar
- Binary payloads stored with metadata sidecar
- No TTL, no LRU — explicit invalidation only
- `clear()` = rm entire cacheDir

### Cache-aware fetch helpers (`src/cache/index.ts`)

```typescript
function createCache(config: CacheConfig): Cache
function createNoopCache(): Cache  // gets return null, sets are no-ops

async function fetchNodeCached(
  client: FigmaClient,
  cache: Cache,
  fileKey: string,
  nodeId: string,
  options: NodesEndpointOptions & { version: string | null },
): Promise<{ response: FigmaFileResponse; fromCache: boolean }>

async function fetchImageCached(
  client: FigmaClient,
  cache: Cache,
  fileKey: string,
  nodeId: string,
  options: ImagesEndpointOptions & { version: string | null },
): Promise<{ result: FetchImageResult; fromCache: boolean }>
```

Version threading:
- Initial fetch: version null (unversioned cache entry, weaker trust)
- After initial fetch: extract fileResponse.version
- All expansion refetches: version included in cache key
- Unversioned entries may coexist with later versioned entries for the same node

## Config changes (`src/config.ts`)

```typescript
interface FetchConfig {
  // existing
  readonly url: string
  readonly token: string
  readonly outputDir: string
  readonly format: 'png' | 'svg'
  readonly scale: number
  readonly depth: number
  readonly includeHidden: boolean

  // new: expansion
  readonly expansionEnabled: boolean       // default: true
  readonly maxExpansionTargets: number      // default: 10
  readonly expansionDepth: number          // default: 2

  // new: cache
  readonly cacheEnabled: boolean           // default: true
  readonly cacheDir: string                // default: '.cache/figma-fetch'
}
```

Validation constraints in `resolveConfig`:
- `depth >= 1`
- `expansionDepth >= 1`
- `maxExpansionTargets >= 0`
- `scale > 0`

CLI flags:
- `--no-expand` → expansionEnabled: false
- `--max-expand <n>` → maxExpansionTargets
- `--expand-depth <n>` → expansionDepth
- `--no-cache` → cacheEnabled: false
- `--cache-dir <path>` → cacheDir

## Orchestrate flow

```
1.  parse URL, auth, create client
2.  create cache: config.cacheEnabled ? createCache({...}) : createNoopCache()
3.  fetchNodeCached(client, cache, fileKey, nodeId, { depth, version: null })
      → { response: fileResponse, fromCache }
4.  fetchImageCached(...) — parallel with 3, not rerun after expansion
5.  extract fileVersion = fileResponse.version
6.  let rawNode = fileResponse.document
7.  let normalizedNode = normalize(rawNode)
8.  if config.expansionEnabled:
      a. build TriggerContext { requestedDepth: config.depth, fetchState }
      b. evaluateExpansionTriggers(normalizedNode, triggerContext) → targets[]
      c. for each target (concurrent via existing client p-limit):
           finalDepth = max(1, min(target.depth ?? config.expansionDepth, config.expansionDepth))
           fetchNodeCached(client, cache, fileKey, target.nodeId, {
             depth: finalDepth,
             geometry: target.requireGeometry,
             version: fileVersion,
           })
      d. collect results; record successes and failures in ExecutedExpansion[]
      e. mergeExpansions(rawNode, successfulExpansions) → mergedRawNode
      f. rawNode = mergedRawNode
      g. normalizedNode = normalize(rawNode)  // full re-normalization
      h. build ExpansionResult
9.  tokensUsed from post-expansion normalizedNode
10. outline, contextMd, manifest — as before
11. return OrchestrateResult with expansion field
```

OrchestrateResult gains:
```typescript
readonly expansion: ExpansionResult | null  // null when expansion disabled
```

Failed expansion fetches: record as executed with `success: false`, keep original raw subtree intact, continue pipeline.

## Adversarial review findings

### Critical: depth-truncated trigger signal (corrected)

`hierarchy.childCount` (line 81 of node.ts) reflects children *returned by the API*, not the true child count. At the depth boundary, Figma omits the `children` field entirely, so both `childCount` and `children.length` are 0. The original trigger condition `childCount > 0 && children.length === 0` would never fire.

**Corrected trigger condition**: Drop the `childCount > 0` requirement. Use type-based inference instead:

```
node.hierarchy.depth === context.requestedDepth
&& node.children.length === 0
&& node.type ∈ {frame, group, component, instance, variant-set, section}
```

A genuinely childless container at the boundary is a harmless false positive (refetch confirms no children). Missing a truncated container is a real false negative.

### Minor: cache stores post-extraction FigmaFileResponse

`fetchNodeCached` caches the result of `extractFileResponse()` (the parsed `FigmaFileResponse`), not the raw HTTP response body. This avoids re-parsing on cache hit.

### Minor: orchestrate extracts .document before merge

`fetchNodeCached` returns `FigmaFileResponse`. Merge expects `FigmaNode`. Orchestrate bridges with `.document` extraction.

### Minor: sidecar atomicity

Payload + metadata sidecar writes are not jointly atomic. If process dies between the two renames, one file may exist without the other. Acceptable for local dev cache — metadata is a debugging aid. Document as known edge case.

### Doctrinal compliance

- ADR-001: zero lint warnings. New modules must pass quickcheck continuously.
- ADR-002: mise as task runner. All gates via mise.
- Design principles: normalize stays pure (confirmed untouched). Extractors independent (confirmed no changes). Absence semantics preserved.

## Verification alignment

| Requirement | VT ID | Test description |
| --- | --- | --- |
| FR-014 | VT-023 | Cache key generation: deterministic, sorted, collision-free |
| FR-014 | VT-024 | Cache store: JSON read/write, binary read/write, metadata sidecar, atomic writes |
| FR-014 | VT-025 | Cache hit/miss: fetchNodeCached returns cached on hit, fetches on miss |
| FR-014 | VT-026 | Cache invalidation: invalidateFile removes file entries, clear removes all |
| FR-014 | VT-027 | Version-aware keys: same node with different version = cache miss |
| FR-014 | VT-028 | Cached vs uncached fetch produces identical normalized output (determinism) |
| FR-015 | VT-029 | depthTruncatedContainer: fires at depth boundary with truncated children |
| FR-015 | VT-030 | geometryNeeded: fires for export-worthy vectors without geometry |
| FR-015 | VT-031 | evaluateExpansionTriggers: dedup by nodeId, priority sort, cap at maxTargets |
| FR-015 | VT-032 | mergeExpansions: whole-node replacement, immutable, preserves enriched fields |
| FR-015 | VT-033 | mergeExpansions: missing target = notFound, pipeline continues |
| FR-015 | VT-034 | Orchestrate expansion loop: shallow fetch → trigger → refetch → merge → re-normalize |
| FR-015 | VT-035 | Expansion disabled produces identical result to pre-DE-006 path (regression) |
| FR-015 | VT-036 | Failed expansion fetch: pipeline continues, original subtree intact, diagnostic recorded |
| FR-015 | VT-037 | Expansion respects maxTargets bound |
| FR-015 | VT-038 | Expansion config validation: depth >= 1, maxTargets >= 0 |
