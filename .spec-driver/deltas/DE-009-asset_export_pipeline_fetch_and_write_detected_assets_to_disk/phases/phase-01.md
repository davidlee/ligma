---
id: IP-009.PHASE-01
slug: 009-asset_export_pipeline_fetch_and_write_detected_assets_to_disk-phase-01
name: IP-009 Phase 01 — Core asset modules and config
created: '2026-03-12'
updated: '2026-03-12'
status: complete
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-009.PHASE-01
plan: IP-009
delta: DE-009
objective: >-
  Implement core asset collection, fetching, and filename generation modules.
  Extend config and CLI with maxAssets and assetFormat. All with tests.
entrance_criteria:
  - DR-009 approved
exit_criteria:
  - src/assets/collect.ts implemented with tests
  - src/assets/fetch.ts implemented with tests
  - config.ts extended with maxAssets and assetFormat
  - cli.ts extended with --max-assets and --asset-format flags
  - quickcheck passes
verification:
  tests:
  - tests/assets/collect.test.ts
  - tests/assets/fetch.test.ts
  - tests/config.test.ts
  evidence: []
tasks:
  - id: '1.1'
    description: Create src/assets/collect.ts with ExportTarget type and collectExportTargets function
  - id: '1.2'
    description: Create tests/assets/collect.test.ts
  - id: '1.3'
    description: Create src/assets/fetch.ts with FetchedAsset type and fetchAssets function
  - id: '1.4'
    description: Create tests/assets/fetch.test.ts
  - id: '1.5'
    description: Extend config.ts with maxAssets and assetFormat fields
  - id: '1.6'
    description: Extend cli.ts with --max-assets and --asset-format flags
  - id: '1.7'
    description: Extend tests/config.test.ts with new field validation
risks: []
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-009.PHASE-01
```

# Phase 01 — Core asset modules and config

## 1. Objective
Implement the foundational asset modules (`collect.ts`, `fetch.ts`) and extend
config/CLI with the new flags. This phase produces testable, self-contained
units without wiring into orchestrate.

## 2. Links & References
- **Delta**: DE-009
- **Design Revision**: DR-009, [design doc](../../../../docs/plans/2026-03-12-DE-009-asset-export-pipeline-design.md)
- **Requirements**: SPEC-001.FR-004, SPEC-001.FR-011, SPEC-001.FR-015

## 3. Entrance Criteria
- [x] DR-009 approved

## 4. Exit Criteria / Done When
- [x] `src/assets/collect.ts` — `collectExportTargets()` + `assetFileName()` + `sanitizeName()`
- [x] `src/assets/fetch.ts` — `fetchAssets()` with format logic and error handling
- [x] `config.ts` — `maxAssets: number`, `assetFormat: 'png' | 'svg' | 'auto'`
- [x] `cli.ts` — `--max-assets`, `--asset-format` flags wired
- [x] All new code has tests (26 new + 2 extended)
- [x] `mise run check` passes (810 tests, 0 lint errors)

## 5. Verification
- `pnpm exec vitest run tests/assets/`
- `pnpm exec vitest run tests/config.test.ts`
- `mise run quickcheck`

## 6. Assumptions & STOP Conditions
- Assumptions: `fetchImageCached` accepts any node ID (confirmed in context exploration)
- STOP when: a design assumption proves wrong during implementation

## 7. Tasks & Progress

| Status | ID | Description | Parallel? | Notes |
|--------|-----|-------------|-----------|-------|
| [x] | 1.1 | `src/assets/collect.ts` | | ExportTarget, collectExportTargets, assetFileName, sanitizeName |
| [x] | 1.2 | `tests/assets/collect.test.ts` | [P] with 1.1 (TDD) | 18 tests — priority, cap, mixed, sanitize |
| [x] | 1.3 | `src/assets/fetch.ts` | | FetchedAsset, AssetFetchResult, fetchAssets with ImageFetcher DI |
| [x] | 1.4 | `tests/assets/fetch.test.ts` | [P] with 1.3 (TDD) | 8 tests — format logic, error handling, mixed |
| [x] | 1.5 | Extend `config.ts` | | maxAssets (default 20), assetFormat (default 'auto') |
| [x] | 1.6 | Extend `cli.ts` | [P] with 1.5 | --max-assets, --asset-format flags |
| [x] | 1.7 | Extend `tests/config.test.ts` | | maxAssets validation + defaults |
