---
id: IP-009.PHASE-02
slug: 009-asset_export_pipeline_fetch_and_write_detected_assets_to_disk-phase-02
name: IP-009 Phase 02 — Integration wiring and verification
created: '2026-03-12'
updated: '2026-03-12'
status: in-progress
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-009.PHASE-02
plan: IP-009
delta: DE-009
objective: >-
  Wire P01 modules into orchestrate and write pipeline. Extend tests.
  Rebuild, install, smoke test on real document.
entrance_criteria:
  - P01 complete
exit_criteria:
  - orchestrate.ts wires collect → fetch → manifest → write
  - output/write.ts writes assets to disk
  - OrchestrateResult includes fetched assets
  - manifest.outputs.assets populated with real paths
  - orchestrate and write tests extended
  - mise run check passes
  - smoke test on real document shows assets in artifacts/assets/
verification:
  tests:
  - tests/orchestrate.test.ts
  - tests/output/write.test.ts
  evidence: []
tasks:
  - id: '2.1'
    description: Extend output/write.ts — add assets to OutputArtifacts, add writeAssets()
  - id: '2.2'
    description: Wire orchestrate.ts — collect, fetch, pass to manifest + result
  - id: '2.3'
    description: Extend tests/output/write.test.ts with asset writing tests
  - id: '2.4'
    description: Extend tests/orchestrate.test.ts with asset pipeline tests
  - id: '2.5'
    description: Run mise run check — all tests pass, zero lint
  - id: '2.6'
    description: Rebuild + install + smoke test on real document
risks: []
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-009.PHASE-02
```

# Phase 02 — Integration wiring and verification

## 1. Objective
Wire P01 modules into the pipeline. Assets flow from normalized tree through
collection, fetching, writing, and into the manifest.

## 2. Links & References
- **Delta**: DE-009
- **Design Revision**: DR-009, [design doc](../../../../docs/plans/2026-03-12-DE-009-asset-export-pipeline-design.md)
- **Requirements**: SPEC-001.FR-004, SPEC-001.FR-011, SPEC-001.FR-015
- **P01 modules**: `src/assets/collect.ts`, `src/assets/fetch.ts`

## 3. Entrance Criteria
- [x] P01 complete

## 4. Exit Criteria / Done When
- [x] `output/write.ts` writes fetched assets to `assets/` subdir
- [x] `orchestrate.ts` wires collect → fetch → manifest → write
- [x] `manifest.outputs.assets` populated with real paths
- [x] Tests extended for both orchestrate and write
- [x] `mise run check` passes
- [x] Smoke test on real Figma document

## 5. Verification
- `pnpm exec vitest run tests/orchestrate.test.ts`
- `pnpm exec vitest run tests/output/write.test.ts`
- `mise run check`
- Manual smoke test: `ligma <url> -t $FIGMA_TOKEN` → inspect `artifacts/assets/`

## 6. Assumptions & STOP Conditions
- `fetchImageCached` accepts any node ID (confirmed in P01 preflight)
- `ImageFetcher` adapter is straightforward: `(nodeId, format) => fetchImageCached(...).then(r => r.result.buffer)`
- STOP if mock patterns in orchestrate tests can't accommodate asset fetch mocking cleanly

## 7. Tasks & Progress

| Status | ID | Description | Notes |
|--------|-----|-------------|-------|
| [x] | 2.1 | Extend `output/write.ts` | Added `assets?: readonly FetchedAsset[] \| undefined` to `OutputArtifacts`, added `writeAssets()` |
| [x] | 2.2 | Wire `orchestrate.ts` | Added `collectAndFetchAssets` helper, `resolveAssetFormatOverride`, fetcher adapter, asset paths in manifest |
| [x] | 2.3 | Extend write tests | 3 tests: correct filenames, empty array, undefined assets |
| [x] | 2.4 | Extend orchestrate tests | 4 tests (VT-038): manifest populated, result.assets, maxAssets=0, no exportable nodes |
| [x] | 2.5 | `mise run check` | 817/817 tests pass, zero lint, typecheck clean |
| [x] | 2.6 | Smoke test | MyCareSpace node 9292-2202 depth=10: 1 bitmap asset exported (imagewithfallback-9292-2516.png, 1.2MB) |

### Task Details

- **2.1 — output/write.ts**
  - Add `readonly assets?: readonly FetchedAsset[] | undefined` to `OutputArtifacts`
  - Add `writeAssets(outputDir, assets)` — iterates fetched assets, calls `assetFileName` for each, writes buffer to `assets/` subdir
  - Returns `string[]` of relative paths (for manifest population upstream)
  - Call from `writeOutput()` after image writing

- **2.2 — orchestrate.ts**
  - Import `collectExportTargets` and `fetchAssets`
  - Import `assetFileName` for manifest path generation
  - After expansion loop, before manifest: collect targets, build fetcher adapter, call `fetchAssets`
  - Build asset paths array from fetched results using `assetFileName`
  - Replace `assets: []` with actual paths
  - Merge asset errors into errors array
  - Add fetched assets to `OrchestrateResult` (new field)

- **2.3 — write tests**
  - Test: assets written to `assets/` with correct filenames
  - Test: empty assets array → no files in `assets/`
  - Test: assets field undefined → no crash

- **2.4 — orchestrate tests**
  - Need mock node with `asset.exportSuggested: true` to trigger collection
  - Verify `manifest.outputs.assets` is non-empty when exportable nodes exist
  - Verify `maxAssets: 0` produces empty assets
