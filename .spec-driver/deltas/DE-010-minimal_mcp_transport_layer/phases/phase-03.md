---
id: IP-010.PHASE-03
slug: 010-minimal_mcp_transport_layer-phase-03
name: CLI subcommands and polish
created: '2026-03-12'
updated: '2026-03-12'
status: draft
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-010.PHASE-03
plan: IP-010
delta: DE-010
objective: >-
  Add list-assets and get-asset CLI subcommands per DR-010 §5. Final
  verification — all quality gates pass, docs updated, delta ready for audit.
entrance_criteria:
  - Phase 2 complete (MCP server + 6 tools, all tests green)
exit_criteria:
  - list-assets subcommand prints JSON to stdout
  - get-asset subcommand writes asset to disk and prints path
  - Shared flags wired correctly (--token, --depth, --no-cache, --cache-directory, --out, --format)
  - VT-cli-subcommands pass
  - mise run check passes (typecheck + test + lint)
  - README updated with subcommand usage
verification:
  tests:
    - VT-cli-subcommands
  evidence:
    - 'mise run check: 842/842 tests, lint clean, typecheck clean'
tasks:
  - id: '3.1'
    summary: Add list-assets subcommand to cli.ts
  - id: '3.2'
    summary: Add get-asset subcommand to cli.ts
  - id: '3.3'
    summary: Write tests for both subcommands (VT-cli-subcommands)
  - id: '3.4'
    summary: Update README with subcommand documentation
  - id: '3.5'
    summary: Final verification — all gates pass
risks:
  - Commander subcommand pattern may need restructuring of existing single-action CLI
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-010.PHASE-03
```

# Phase 3 — CLI subcommands and polish

## 1. Objective
Add `list-assets <url>` and `get-asset <url> <node-id>` CLI subcommands per DR-010 §5. Shared flags (`--token`, `--depth`, `--no-cache`, `--cache-directory`) wired via commander. Final quality gate pass and doc update.

## 2. Links & References
- **Delta**: DE-010
- **Design Revision**: DR-010 §5 (CLI Subcommands)
- **Specs**: PROD-001.NF-005
- **Phase 2**: `phases/phase-02.md` (complete — MCP server + 6 tools)
- **Source**: `src/cli.ts`, `src/session.ts`, `src/assets/collect.ts`, `src/cache/index.ts`

## 3. Entrance Criteria
- [x] Phase 2 complete (MCP server + 6 tools, 832/832 tests, all gates green)

## 4. Exit Criteria / Done When
- [x] `ligma list-assets <url>` prints detected export targets as JSON to stdout
- [x] `ligma get-asset <url> <node-id>` writes single asset to disk, prints path
- [x] Shared flags: `--token`, `--depth`, `--no-cache`, `--cache-directory` on both
- [x] `get-asset` additionally supports `--out` and `--format`
- [x] VT-cli-subcommands pass
- [x] `mise run check` passes
- [x] README updated with subcommand usage

## 5. Verification
- `mise run test` — VT-cli-subcommands suite passes (7 tests)
- `mise run check` — 842/842 tests, typecheck clean, lint clean

## 6. Assumptions & STOP Conditions
- Commander supports subcommands alongside the existing default action pattern — **confirmed**
- `collectExportTargets` and `fetchImageCached` are stable from Phase 1/2 — **confirmed**

## 7. Tasks & Progress

| Status | ID | Description | Parallel? | Notes |
|--------|-----|-------------|-----------|-------|
| [x] | 3.0 | Fix MCP `figma_list_assets` output shape to match DR-010 | | Added `reason` to `ExportTarget`, added `toAssetListEntry` mapper |
| [x] | 3.1 | Add `list-assets` subcommand | yes (with 3.2) | JSON to stdout via `toAssetListEntry` |
| [x] | 3.2 | Add `get-asset` subcommand | yes (with 3.1) | Disk write + print absolute path |
| [x] | 3.3 | Write tests (VT-cli-subcommands) | | 7 tests covering both pipelines |
| [x] | 3.4 | Update README with subcommand docs | | |
| [x] | 3.5 | Final verification — all gates | | `mise run check` — 842/842 |

### Task Details

- **3.0 Fix MCP list-assets output shape**
  - DR-010 §4 specifies `{ nodeId, name, format, reason }` but MCP tool was dumping raw `ExportTarget` shape
  - Added `reason: string | null` to `ExportTarget` interface, populated from `NormalizedAssetInfo.reason`
  - Added `AssetListEntry` interface and `toAssetListEntry()` mapper in `src/assets/collect.ts`
  - Updated MCP `figma_list_assets` tool to use mapper
  - Updated all test fixtures for the new `reason` field

- **3.1 Add `list-assets` subcommand**
  - **Files**: `src/cli.ts`
  - **Pipeline**: `createSession` → `fetchNodeCached` → `normalize` → `collectExportTargets` → `toAssetListEntry` → JSON to stdout
  - Shared flags: `--token`, `--depth`, `--no-cache`, `--cache-directory`, `--max-assets`

- **3.2 Add `get-asset` subcommand**
  - **Files**: `src/cli.ts`
  - **Pipeline**: `createSession` → `fetchImageCached` → `assetFileName` → write to `outputDir/assets/` → print absolute path
  - Shared flags: `--token`, `--out`, `--format`, `--no-cache`, `--cache-directory`

- **3.3 Write tests (VT-cli-subcommands)**
  - **Files**: `tests/cli-subcommands.test.ts` (new)
  - Tests both pipelines via `vi.stubGlobal('fetch', ...)` pattern (matching MCP/orchestrate test style)
  - 4 list-assets tests: consumer shape, empty tree, depth parameter, valid JSON output
  - 3 get-asset tests: buffer fetch, disk write, svg format

- **3.4 Update README**
  - Added `### Subcommands` section with `list-assets` and `get-asset` documentation and flag tables

- **3.5 Final verification**
  - `mise run check` — 842/842 tests, typecheck clean, lint clean

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
|------|-----------|--------|
| Commander default action + subcommand coexistence | Confirmed working — commander routes subcommands before default action | resolved |

## 9. Decisions & Outcomes
- `2026-03-12` — Phase 3 scoped from DR-010 §5, IP-010 Phase 3 definition
- `2026-03-12` — Fixed MCP `figma_list_assets` to output DR-specified shape rather than raw ExportTarget. Added `reason` field to ExportTarget and `toAssetListEntry` mapper. Rationale: DR had been more carefully scrutinized; MCP dumping raw internal type was an oversight.
- `2026-03-12` — Unified MCP server as `ligma mcp` subcommand instead of separate `ligma-mcp` bin. Single entry point, simpler install. Removed `ligma-mcp` from package.json `bin`. Extracted `startMcpServer()` from self-executing `main()` in mcp.ts.

## 10. Findings / Research Notes
- Commander handles `program.command('list-assets')` alongside `program.argument('<url>').action(...)` without conflict
- `NormalizedAssetInfo` already had `reason: string | null` — the data was available but `ExportTarget` wasn't carrying it
- `ExportTarget.kind` maps cleanly to consumer-facing format: bitmap→png, svg→svg, mixed→png,svg
- Extracted `resolveToken()` helper in cli.ts to share token resolution across default action and subcommands
- `exactOptionalPropertyTypes` gotcha with `process.env.X`: env values are `string | undefined`, but `prop?: string` doesn't accept `undefined` as a value — must declare `prop?: string | undefined`

## 11. Implementation Notes

**What's done**: All 3 phases of DE-010 complete. Session extraction (P01), MCP server with 6 tools (P02), CLI subcommands + MCP output shape fix + `ligma mcp` unification (P03).

**Surprises / adaptations**:
- DR-010 §4 specified `{ nodeId, name, format, reason }` for list-assets output but Phase 2 MCP tool was dumping raw `ExportTarget` — fixed in P03 by adding `reason` to ExportTarget and a `toAssetListEntry` mapper
- `ligma-mcp` separate bin replaced with `ligma mcp` subcommand post-P03 (user direction)

**Rough edges / follow-ups**:
- DR-010 operational notes (§9) still reference `ligma-mcp` bin entry — needs reconciliation during audit
- Phase-02 sheet references `ligma-mcp` bin — same
- DE-010 §5 approach overview references `ligma-mcp` bin entry — same
- `get-asset` constructs a synthetic `ExportTarget` with `nodeName: nodeId` (no name lookup) — matches MCP tool pattern but the name in the filename is just the node ID
- Coverage drift warnings from contracts sync are pre-existing (SPEC-001.FR-004/006/011/015), not from this delta

**Verification**: `mise run check` — 842/842 tests, typecheck clean, lint clean. Last run after final code change.

**Commits** (all on main):
- `c9ba07f` feat(DE-010): CLI subcommands + fix MCP list-assets output shape (P03)
- `99bf656` refactor(DE-010): unify MCP server as `ligma mcp` subcommand
- `ba1c2fc` docs: update install and MCP setup instructions
- `3d7cdf9` chore: sync backlog registry after contracts regen

**.spec-driver changes**: committed with code per doctrine. Phase sheet and IP-010 updated inline.

## 12. Wrap-up Checklist
- [x] Exit criteria satisfied
- [x] Verification evidence stored (mise run check: 842/842 tests, lint clean, typecheck clean)
- [ ] Hand-off to audit (DR references to `ligma-mcp` bin need reconciliation)
