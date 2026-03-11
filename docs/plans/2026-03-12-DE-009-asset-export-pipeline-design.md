# DE-009: Asset Export Pipeline — Design Revision

**Delta**: DE-009 — Asset export pipeline — fetch and write detected assets to disk
**Spec**: SPEC-001 (FR-004, FR-011, FR-015)
**Driver**: IMPR-005
**Date**: 2026-03-12

## 1. Problem

Asset detection (FR-011) correctly identifies bitmap fills and complex vectors
during normalization. The metadata feeds expansion triggers and context.md
documentation. But no code collects, fetches, or writes detected assets to disk.
`orchestrate.ts` hardcodes `assets: []` in the manifest; the `assets/`
subdirectory is created but always empty.

## 2. Design Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| DEC-001 | Format is kind-driven by default: bitmap→PNG, svg→SVG, mixed→both | Matches asset nature; most useful output |
| DEC-002 | `--asset-format` flag overrides format for all assets | User control when kind-driven isn't desired |
| DEC-003 | Filenames: `{sanitized-name}-{node-id}.{ext}` | Human-readable, collision-proof, stable across re-runs |
| DEC-004 | Reuse existing `fetchImageCached` — no separate concurrency pool | Same Figma images endpoint; no reason for separate pool |
| DEC-005 | Per-asset failure recorded in manifest errors, non-blocking | Consistent with FR-004 error contract |
| DEC-006 | `--max-assets` flag, default 20, prioritised by confidence | Independent of expansion cap; prevents runaway on large docs |
| DEC-007 | New modules in `src/assets/` (collect + fetch) | Keeps asset logic cohesive; avoids bloating orchestrate |

## 3. Data Flow

```
normalizedNode (post-expansion)
  │
  ▼
collectExportTargets(node, maxAssets)        ← src/assets/collect.ts
  │  walks tree, filters exportSuggested,
  │  prioritises by confidence, caps at maxAssets
  │  returns: ExportTarget[]
  ▼
fetchAssets(client, cache, fileKey, targets) ← src/assets/fetch.ts
  │  for each target: determine format from kind (or override),
  │  call fetchImageCached, collect results + errors
  │  returns: AssetFetchResult
  ▼
orchestrate()                                ← wiring point
  │  calls collect → fetch → passes results to manifest + write
  ▼
writeAssets(outputDir, fetchedAssets)         ← output/write.ts
  │  writes each buffer to assets/{name}-{nodeId}.{ext}
  │  returns: string[] (relative paths for manifest)
```

## 4. New Modules

### 4.1 `src/assets/collect.ts`

Walks the normalized tree, collects nodes where `asset.exportSuggested === true`,
prioritises, caps.

```typescript
interface ExportTarget {
  readonly nodeId: string
  readonly nodeName: string
  readonly kind: AssetKind        // 'bitmap' | 'svg' | 'mixed'
}

function collectExportTargets(
  root: NormalizedNode,
  maxAssets: number,
): ExportTarget[]
```

- Priority order: bitmap (high confidence) first, then svg/mixed (medium)
- Within same priority: tree-walk order (depth-first, stable)
- `mixed` kind produces two fetch operations (PNG + SVG) — cap applies to *nodes*
  discovered, not individual fetches, so manifest `assets` array may contain up
  to `2 × maxAssets` entries when mixed nodes are present

### 4.2 `src/assets/fetch.ts`

Fetches image exports for collected targets.

```typescript
interface FetchedAsset {
  readonly target: ExportTarget
  readonly format: 'png' | 'svg'
  readonly buffer: Buffer
}

interface AssetFetchResult {
  readonly fetched: readonly FetchedAsset[]
  readonly errors: readonly ManifestError[]
}

function fetchAssets(
  client: FigmaClient,
  cache: Cache,
  fileKey: string,
  targets: readonly ExportTarget[],
  formatOverride: 'png' | 'svg' | null,
): Promise<AssetFetchResult>
```

- Format logic: if `formatOverride` is set, use it for all. Otherwise:
  bitmap→png, svg→svg, mixed→both (png + svg).
- Uses `fetchImageCached` per target — sequential with cache, same as expansion.
- Failed fetches produce `ManifestError` with `type: 'AssetExportError'`.

### 4.3 Filename generation

```typescript
function assetFileName(target: ExportTarget, format: 'png' | 'svg'): string {
  const sanitized = sanitizeName(target.nodeName)
  const idSlug = target.nodeId.replace(':', '-')
  return `${sanitized}-${idSlug}.${format}`
}
```

`sanitizeName`: lowercase, replace non-alphanumeric with hyphens, collapse runs,
trim leading/trailing hyphens. Empty → `asset`.

## 5. Changes to Existing Modules

### 5.1 `config.ts`

Add two fields to `FetchConfig`:

```typescript
readonly maxAssets: number          // default 20
readonly assetFormat: 'png' | 'svg' | 'auto'  // default 'auto'
```

Validation: `maxAssets >= 0`, `assetFormat` in `['png', 'svg', 'auto']`.

### 5.2 `cli.ts`

Add two flags:

```
--max-assets <number>      Maximum assets to export (default 20)
--asset-format <format>    Asset export format: auto, png, svg (default auto)
```

### 5.3 `orchestrate.ts`

After expansion loop, before manifest construction:

```typescript
const exportTargets = collectExportTargets(normalizedNode, config.maxAssets)
const assetResult = await fetchAssets(
  client, cache, parsed.fileKey, exportTargets,
  config.assetFormat === 'auto' ? null : config.assetFormat,
)
errors.push(...assetResult.errors)
```

Pass `assetResult.fetched` through to `OrchestrateResult` and into `writeOutput`.

Replace `assets: []` in manifest with actual written paths.

### 5.4 `output/write.ts`

Add `assets` field to `OutputArtifacts`:

```typescript
readonly assets?: readonly FetchedAsset[]
```

Add `writeAssets()` function that writes each buffer to
`assets/{name}-{nodeId}.{ext}` and returns the relative paths for manifest.

### 5.5 `schemas/manifest.ts`

No changes needed — `assets: z.array(z.string())` already exists.

## 6. Verification Strategy

### Unit tests

**`tests/assets/collect.test.ts`**:
- Collects only nodes with `exportSuggested: true`
- Respects `maxAssets` cap
- Priority ordering: bitmap before svg/mixed
- Mixed kind counted correctly against cap
- Empty tree → empty array
- `sanitizeName` edge cases (special chars, empty string, long names)
- `assetFileName` produces expected `{name}-{id}.{ext}` shape

**`tests/assets/fetch.test.ts`**:
- Successful fetch returns buffer + format
- Format override forces all targets to specified format
- `auto` mode: bitmap→png, svg→svg, mixed→both
- Failed fetch produces `ManifestError`, doesn't throw
- Mixed with one format failing still produces the other

### Integration tests (extend existing)

**`tests/orchestrate.test.ts`**:
- Orchestrate with exportable assets produces non-empty `manifest.outputs.assets`
- Asset fetch failure appears in `manifest.errors`, pipeline completes
- `maxAssets: 0` disables asset export (empty array)

**`tests/output/write.test.ts`**:
- `writeOutput` with assets writes files to `assets/` subdirectory
- Written filenames match manifest paths

### Config/CLI tests (extend existing)

**`tests/config.test.ts`**:
- Default `maxAssets: 20`, `assetFormat: 'auto'`
- Validation: `maxAssets >= 0`, `assetFormat` is valid enum

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Figma rate limiting on batch asset exports | Medium | Medium | Existing p-limit + cache; sequential fetch |
| Large documents produce many exportable assets | Low | Medium | `maxAssets` cap, confidence-based priority |
| Filename collisions after sanitization | Very low | Low | Node ID suffix guarantees uniqueness |

## 8. Out of Scope

- Token name resolution (IMPR-006)
- CLI progress feedback (IMPR-004)
- Asset format negotiation beyond PNG/SVG
- Asset deduplication (same imageRef on multiple nodes)
