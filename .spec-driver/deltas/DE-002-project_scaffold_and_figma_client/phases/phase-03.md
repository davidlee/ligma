---
id: IP-002.PHASE-03
slug: 002-project_scaffold_and_figma_client-phase-03
name: Output pipeline + CLI integration
created: '2026-03-10'
updated: '2026-03-10'
status: draft
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-002.PHASE-03
plan: IP-002
delta: DE-002
objective: >-
  Implement manifest schema + builder, artifact directory writer, config types,
  CLI entry point with commander, and orchestration function that wires
  parseFigmaUrl → createAuth → createClient → fetchNode + fetchImage → buildManifest → writeOutput.
  VT-006 (manifest accuracy) and VT-007 (CLI smoke) verified.
entrance_criteria:
  - Phase 2 complete (auth, client, fetch-node, fetch-image)
  - DR-002 accepted
exit_criteria:
  - VT-006 (manifest accuracy) passing
  - VT-007 (CLI smoke) passing
  - 'figma-fetch --help prints usage'
  - Artifact directory written with manifest.json + raw-node.json + image
  - Zero lint warnings
  - tsc --noEmit clean
  - mise run passes
verification:
  tests:
    - VT-006
    - VT-007
  evidence: []
tasks:
  - id: '3.1'
    name: Manifest Zod schema
  - id: '3.2'
    name: Manifest builder
  - id: '3.3'
    name: Config types
  - id: '3.4'
    name: Directory writer
  - id: '3.5'
    name: Orchestration function
  - id: '3.6'
    name: CLI entry point
  - id: '3.7'
    name: CLI smoke test (VT-007)
risks:
  - description: Orchestration error handling — partial failures (image export fails but node fetch succeeds) must produce manifest with errors, not crash
    mitigation: Orchestration catches FigmaRenderError specifically, records it in manifest errors array, continues writing available artifacts
  - description: Commander ESM import — commander v13 is ESM-native but bin shebang needs care
    mitigation: Package.json already has type=module and bin pointing to dist/cli.js; add shebang in cli.ts
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-002.PHASE-03
```

# Phase 3 — Output pipeline + CLI integration

## 1. Objective
Implement the output pipeline (manifest schema, manifest builder, directory writer) and CLI entry point that orchestrates the full flow: URL parse → auth → client → fetch node + fetch image → build manifest → write output. This completes DE-002 — a working `figma-fetch` CLI.

## 2. Links & References
- **Delta**: DE-002
- **Design Revision Sections**: DR-002 §3 (Manifest type contract, config types), §4 (cli.ts, config.ts, output/manifest.ts, output/write.ts, schemas/manifest.ts, util/log.ts, util/fs.ts)
- **Specs / PRODs**: PROD-001.FR-013 (artifact directory + manifest), PROD-001.NF-005 (library + CLI architecture), SPEC-001.FR-015 (directory structure + manifest.json)
- **Support Docs**: SPEC-001.tests §3 (manifest accuracy row), §4 (VT-006, VT-007)

## 3. Entrance Criteria
- [x] Phase 2 complete — 118 tests passing, lint/typecheck clean
- [x] DR-002 accepted

## 4. Exit Criteria / Done When
- [ ] Manifest Zod schema validates the DR-002 §3 Manifest type (VT-006)
- [ ] `buildManifest()` produces correct manifest from fetch results (VT-006)
- [ ] `writeOutput()` creates artifact directory with correct structure (VT-006)
- [ ] `src/config.ts` defines `FetchConfig` type mapping CLI args to module options
- [ ] `src/cli.ts` parses args via commander and calls orchestration function
- [ ] Valid args → orchestration runs, writes artifacts (VT-007)
- [ ] Invalid URL → exits with error code + message (VT-007)
- [ ] Missing token → exits with error code + message (VT-007)
- [ ] `figma-fetch --help` prints usage
- [ ] Zero lint warnings, `tsc --noEmit` clean
- [ ] `mise run` passes

## 5. Verification
- `pnpm test` — all tests pass
- `pnpm run typecheck` — clean
- `pnpm run lint` — clean
- VT-006: `tests/schemas/manifest.test.ts` + `tests/output/manifest.test.ts` + `tests/output/write.test.ts`
- VT-007: `tests/cli.test.ts`

## 6. Assumptions & STOP Conditions
- Assumptions:
  - DE-002 scope writes `visual/` (PNG/SVG), `structure/` (raw-node.json), and `manifest.json` at root. Subdirs `tokens/`, `assets/`, `logs/` are created empty for forward-compat with DE-003+.
  - Manifest `outputs` fields not applicable to DE-002 (`normalizedNodeJson`, `outlineJson`, `outlineXml`, `contextMd`, `tokensUsedJson`) are omitted from the manifest output (not present as undefined/null).
  - VT-007 tests `orchestrate()` in `src/orchestrate.ts` directly (not subprocess). CLI arg parsing tested separately.
  - `src/util/log.ts` and `src/util/fs.ts` are created as thin wrappers — seams for future growth.
  - Image export failure is non-fatal: manifest records the error, raw node JSON is still written.
  - Node fetch + image fetch run in parallel via `Promise.allSettled`.
- STOP when:
  - Commander's ESM support requires workarounds beyond a standard `new Command()` setup
  - Manifest type contract in DR-002 §3 is ambiguous about which fields are required vs optional for DE-002 scope

## 7. Tasks & Progress
*(Status: `[ ]` todo, `[WIP]`, `[x]` done, `[blocked]`)*

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [ ] | 3.1 | Manifest Zod schema | Yes | |
| [ ] | 3.2 | Manifest builder | No (depends on 3.1) | |
| [ ] | 3.3 | Config types + util/log + util/fs | Yes | |
| [ ] | 3.4 | Directory writer | No (depends on 3.1, 3.2, 3.3) | |
| [ ] | 3.5 | Orchestration function | No (depends on 3.2, 3.3) | |
| [ ] | 3.6 | CLI entry point | No (depends on 3.3, 3.5) | |
| [ ] | 3.7 | CLI smoke test (VT-007) | No (depends on 3.5, 3.6) | |

### Task Details

- **3.1 Manifest Zod schema (VT-006 partial)**
  - **Design / Approach**: Zod schema in `src/schemas/manifest.ts` matching DR-002 §3 Manifest type. `ManifestErrorSchema` = `{ type: string, message: string, nodeId?: string | undefined }`. `ManifestSchema` = `{ source: {...}, outputs: {...}, errors: ManifestError[] }`. Source fields `fileName`, `version`, `lastModified` are optional. Output fields for DE-003+ (`normalizedNodeJson`, `outlineJson`, `outlineXml`, `contextMd`, `tokensUsedJson`) are optional. Export inferred types.
  - **Files / Components**: `src/schemas/manifest.ts`, `tests/schemas/manifest.test.ts`
  - **Testing**: Valid manifest parses, missing required fields rejected, optional fields accepted when present, optional fields accepted when absent, ManifestError validates

- **3.2 Manifest builder (VT-006 partial)**
  - **Design / Approach**: `buildManifest(input: ManifestInput): Manifest` pure function. `ManifestInput` contains: source info (fileKey, nodeId, fileName?, version?, lastModified?), output file paths (relative to output dir), errors array. Builder assembles the Manifest object. Does not write files — that's the writer's job.
  - **Files / Components**: `src/output/manifest.ts`, `tests/output/manifest.test.ts`
  - **Testing**: All fields populated correctly from input, missing optional fields omitted, errors array populated, output validates against ManifestSchema

- **3.3 Config types + util/log + util/fs**
  - **Design / Approach**: `FetchConfig` type in `src/config.ts` mapping CLI flags to internal options. Fields: `url: string`, `token: string`, `outputDir: string` (default `./artifacts`), `format: 'png' | 'svg'` (default `'png'`), `scale: number` (default `2`, validated 0.01–4.0 at CLI boundary), `depth: number` (default `2`). `resolveConfig` applies defaults. `src/util/log.ts`: `log.error()`, `log.info()` wrapping console. `src/util/fs.ts`: `ensureDirectory()`, `writeJsonFile()` (pretty-printed, 2-space), `writeBinaryFile()`.
  - **Files / Components**: `src/config.ts`, `src/util/log.ts`, `src/util/fs.ts`, `tests/util/fs.test.ts`
  - **Testing**: `util/fs` tested with tmpdir (writeJsonFile produces valid pretty JSON, writeBinaryFile round-trips, ensureDirectory creates nested dirs). Config tested inline with VT-007.

- **3.4 Directory writer (VT-006 partial)**
  - **Design / Approach**: `writeOutput(outputDir: string, artifacts: OutputArtifacts): Promise<void>`. Creates output directory structure: `outputDir/visual/`, `outputDir/structure/`, `outputDir/tokens/`, `outputDir/assets/`, `outputDir/logs/`. Writes: `manifest.json` at root, `visual/{nodeId}.{format}` for image, `structure/raw-node.json` for raw node JSON. `OutputArtifacts` = `{ manifest: Manifest, rawNode: unknown, image?: FetchImageResult }`. Reads `nodeId` from `artifacts.manifest.source.nodeId`, `format` from `artifacts.image.format`. Uses `util/fs` helpers.
  - **Files / Components**: `src/output/write.ts`, `tests/output/write.test.ts`
  - **Testing**: Creates correct directory structure, writes manifest.json (valid JSON, matches schema), writes raw-node.json, writes image file when present, omits image file when absent, uses os tmpdir for test isolation

- **3.5 Orchestration function**
  - **Design / Approach**: `orchestrate(config: FetchConfig): Promise<OrchestrateResult>` in `src/orchestrate.ts`. Flow: `parseFigmaUrl(config.url) → createAuth(config.token) → createClient({auth}) → Promise.allSettled([fetchNode(...), fetchImage(...)]) → buildManifest(...)`. Image failure → `ManifestError` in manifest, continues. Node failure → throws. Returns `{ manifest, rawNode, image? }`. No I/O, no process.exit.
  - **Files / Components**: `src/orchestrate.ts`, `tests/orchestrate.test.ts`
  - **Testing**: Tested via VT-007 (task 3.7). Orchestration is the primary test target.

- **3.6 CLI entry point**
  - **Design / Approach**: `src/cli.ts` — thin commander wrapper. Parses args, calls `resolveConfig`, calls `orchestrate`, calls `writeOutput`. On error: prints `error.message` to stderr + `error.context` as pretty JSON if present, exits with code 1. Shebang `#!/usr/bin/env node`.
  - **Files / Components**: `src/cli.ts`
  - **Testing**: Minimal — arg parsing tested in VT-007 (commander `.parse()` with test args).

- **3.7 CLI smoke test (VT-007)**
  - **Design / Approach**: Test `orchestrate()` directly with mocked fetch. Tests: (a) valid config with mocked API responses → returns OrchestrateResult with populated manifest. (b) invalid URL → throws FigmaUrlParseError. (c) missing/empty token → throws FigmaAuthError. (d) image export failure → manifest has errors array populated, rawNode still present. Integration: `orchestrate → writeOutput` with tmpdir, verify files on disk. Commander arg parsing tested separately.
  - **Files / Components**: `tests/orchestrate.test.ts`, `tests/cli.test.ts`
  - **Testing**: See above — covers VT-007 exit criteria

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
| --- | --- | --- |
| Partial failure (image fails, node succeeds) must not crash | Orchestration uses Promise.allSettled, catches image errors into manifest | Open |
| Filesystem tests slow or flaky | Use os.tmpdir() + unique dirs, cleanup in afterEach | Open |
| Manifest type has many optional fields — easy to get wrong | Zod schema is source of truth; builder output validated against it in tests | Open |

## 9. Decisions & Outcomes
- `2026-03-10` — VT-007 tests `orchestrate()` directly rather than spawning subprocess. Rationale: faster, more reliable, avoids build step in test. Commander arg parsing tested separately with minimal unit tests.
- `2026-03-10` — Image export failure is non-fatal. Rationale: FR-004 says "Render failure MUST NOT block the pipeline — failure is recorded in manifest." Orchestration catches `FigmaRenderError` specifically.
- `2026-03-10` — `orchestrate()` lives in `src/orchestrate.ts`, not `src/cli.ts`. Rationale: library-first (DEC-006) — importing orchestrate must not pull in commander. CLI is a thin wrapper that imports orchestrate.
- `2026-03-10` — `src/util/log.ts` and `src/util/fs.ts` created as thin wrappers — seams for future growth per user decision.
- `2026-03-10` — `writeJsonFile` produces pretty-printed JSON (2-space indent). Supports deterministic output (NF-003) and debuggability.
- `2026-03-10` — CLI error presentation: `error.message` + `JSON.stringify(error.context, null, 2)` to stderr.
- `2026-03-10` — Empty subdirs (`tokens/`, `assets/`, `logs/`) created for forward-compat per FR-015. Costs nothing, avoids DE-003 needing to handle "dir might not exist."

## 10. Findings / Research Notes
- Commander v13 is fully ESM-native. `new Command()` + `.requiredOption()` + `.option()` + `.action()` is the standard pattern.
- `process.exit()` in CLI should only happen in the thin wrapper, never in `execute()`. This keeps orchestration testable.
- FR-015 specifies subdirs: `visual/`, `structure/`, `tokens/`, `assets/`, `logs/`. For DE-002, only `visual/` and `structure/` have content.

## 11. Wrap-up Checklist
- [ ] Exit criteria satisfied
- [ ] Verification evidence stored
- [ ] Spec/Delta/Plan updated with lessons
- [ ] Hand-off notes to next phase (if any)
