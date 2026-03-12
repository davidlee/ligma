---
id: IP-010.PHASE-02
slug: 010-minimal_mcp_transport_layer-phase-02
name: MCP server and tools
created: '2026-03-12'
updated: '2026-03-12'
status: draft
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-010.PHASE-02
plan: IP-010
delta: DE-010
objective: >-
  Implement MCP stdio server with 6 granular tools delegating to pipeline
  primitives. Add ligma-mcp bin entry. Full test coverage for tool handlers.
entrance_criteria:
  - Phase 1 complete (session extraction, orchestrate refactor)
exit_criteria:
  - src/mcp.ts implements stdio MCP server with 6 tools
  - ligma-mcp bin entry in package.json
  - All tools delegate to pipeline primitives with zero business logic
  - Image-returning tools write to disk and return paths
  - Server fails fast if FIGMA_TOKEN is unset
  - VT-mcp-tools pass
  - mise run check passes
verification:
  tests:
    - VT-mcp-tools
  evidence: []
tasks:
  - id: '2.1'
    summary: Add @modelcontextprotocol/sdk dependency
  - id: '2.2'
    summary: Implement src/mcp.ts — server scaffold + FIGMA_TOKEN validation
  - id: '2.3'
    summary: Implement figma_get_node tool
  - id: '2.4'
    summary: Implement figma_get_outline tool
  - id: '2.5'
    summary: Implement figma_get_render tool
  - id: '2.6'
    summary: Implement figma_list_assets tool
  - id: '2.7'
    summary: Implement figma_get_asset tool
  - id: '2.8'
    summary: Implement figma_get_assets tool
  - id: '2.9'
    summary: Add ligma-mcp bin entry in package.json
  - id: '2.10'
    summary: Write tests for all 6 tool handlers
risks:
  - MCP SDK API surface — mitigated by pinning version and minimal usage
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-010.PHASE-02
```

# Phase 2 — MCP server and tools

## 1. Objective
Implement a stdio MCP server (`src/mcp.ts`) exposing 6 granular tools per DR-010 §4. Each tool delegates to existing pipeline primitives. Zero business logic in the MCP layer.

## 2. Links & References
- **Delta**: DE-010
- **Design Revision**: DR-010 §4 (MCP Tool Specifications), §9 (Operational Notes)
- **Specs**: PROD-001.NF-005
- **Phase 1**: `phases/phase-01.md` — session extraction (complete)

## 3. Entrance Criteria
- [x] Phase 1 complete (session extraction, all tests green)

## 4. Exit Criteria / Done When
- [x] `src/mcp.ts` exports stdio MCP server with 6 registered tools
- [x] `ligma-mcp` bin entry in `package.json` pointing to `dist/mcp.js`
- [x] Text/JSON tools return inline; image tools write to disk and return paths
- [x] Server fails fast with clear error if `FIGMA_TOKEN` is unset
- [x] All tool handlers tested (VT-mcp-tools)
- [x] `mise run check` passes

## 5. Verification
- `mise run test` — VT-mcp-tools suite passes
- `mise run check` — typecheck + test + lint all green
- Each tool tested for: correct pipeline delegation, correct return shape, error handling

## 6. Assumptions & STOP Conditions
- Assumes `@modelcontextprotocol/sdk` provides `McpServer` + `StdioServerTransport` (standard API)
- Assumes pipeline primitives (`fetchNodeCached`, `fetchImageCached`, `normalize`, etc.) are stable from Phase 1
- STOP if MCP SDK API differs materially from expected shape

## 7. Tasks & Progress

| Status | ID | Description | Parallel? | Notes |
|--------|-----|-------------|-----------|-------|
| [x] | 2.1 | Add `@modelcontextprotocol/sdk` dep | | pnpm add |
| [x] | 2.2 | Server scaffold + FIGMA_TOKEN validation | | Entry point, shebang, fail-fast |
| [x] | 2.3 | `figma_get_node` tool | | fetchNodeCached → normalize → contextMd → tokensUsed |
| [x] | 2.4 | `figma_get_outline` tool | | fetchNodeCached → normalize → buildOutline → outlineToXml |
| [x] | 2.5 | `figma_get_render` tool | | fetchImageCached → disk write → return path |
| [x] | 2.6 | `figma_list_assets` tool | | fetchNodeCached → normalize → collectExportTargets |
| [x] | 2.7 | `figma_get_asset` tool | | fetchImageCached for specific node → disk write → return path |
| [x] | 2.8 | `figma_get_assets` tool | | full asset pipeline → disk write → return paths |
| [x] | 2.9 | Add `ligma-mcp` bin entry | | package.json |
| [x] | 2.10 | Write tests for all tool handlers | | Mock pipeline primitives, verify delegation + return shape |

### Task Details

- **2.1 Add dependency**
  - `pnpm add @modelcontextprotocol/sdk`

- **2.2 Server scaffold**
  - **Files**: `src/mcp.ts` (new)
  - **Approach**: `#!/usr/bin/env node` shebang. Read `FIGMA_TOKEN` from env, fail fast if unset. Create `McpServer` with name `ligma`. Connect via `StdioServerTransport`. Register 6 tools.

- **2.3 figma_get_node**
  - **Params**: `url` (required), `depth?`, `includeHidden?`, expansion opts
  - **Pipeline**: `createSession` → `fetchNodeCached` → `normalize` → `generateContextMd` → `aggregateTokensUsed`
  - **Returns**: inline JSON with normalized data, context.md, tokens-used

- **2.4 figma_get_outline**
  - **Params**: `url` (required), `depth?`, `includeHidden?`
  - **Pipeline**: `createSession` → `fetchNodeCached` → `normalize` → `buildOutline` → `outlineToXml`
  - **Returns**: inline outline JSON + XML

- **2.5 figma_get_render**
  - **Params**: `url` (required), `format?`, `scale?`, `outputDir?`
  - **Pipeline**: `createSession` → `fetchImageCached`
  - **Returns**: writes image to disk, returns path. Description notes slowness.

- **2.6 figma_list_assets**
  - **Params**: `url` (required), `depth?`
  - **Pipeline**: `createSession` → `fetchNodeCached` → `normalize` → `collectExportTargets`
  - **Returns**: inline list of `{ nodeId, name, format, reason }`

- **2.7 figma_get_asset**
  - **Params**: `url` (required), `nodeId` (required), `format?`, `outputDir?`
  - **Pipeline**: `createSession` → `fetchImageCached` for specific node
  - **Returns**: writes to disk, returns path. Description notes slowness.

- **2.8 figma_get_assets**
  - **Params**: `url` (required), `depth?`, `format?`, `outputDir?`, `maxAssets?`
  - **Pipeline**: `createSession` → full asset pipeline (`collectExportTargets` → `fetchAssets`)
  - **Returns**: writes to disk, returns paths. Description notes slowness.

- **2.9 Add bin entry**
  - **Files**: `package.json`
  - **Change**: `"ligma-mcp": "dist/mcp.js"` in `bin` object

- **2.10 Write tests**
  - **Files**: `tests/mcp.test.ts` (new)
  - **Strategy**: Mock pipeline primitives (fetchNodeCached, fetchImageCached, normalize, etc.). For each tool: verify correct primitives called with correct args, verify return shape matches spec.

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
|------|-----------|--------|
| MCP SDK API surface differs from expected | Pin version, check docs during 2.1 | open |

## 9. Decisions & Outcomes
- `2026-03-12` — Tool specifications finalized in DR-010 §4

## 10. Findings / Research Notes
- MCP SDK v1.27.1: `server.tool()` is deprecated in favor of `server.registerTool()` with config object
- SDK's `callTool()` return type has `[x: string]: unknown` index signature — makes typed access awkward in tests; round-trip through JSON + zod for clean narrowing
- `exactOptionalPropertyTypes` requires stripping `undefined` values before passing to `resolveConfig`; used `Object.assign` + runtime filter pattern
- Tool handlers split into individual `register*` functions to stay under 80-line function limit (eslint `max-lines-per-function`)
- Disk cache persists between test runs — fetch mock verification unreliable without explicit `cacheEnabled: false`

## 11. Wrap-up Checklist
- [x] Exit criteria satisfied
- [x] Verification evidence stored (mise run check: 832/832 tests, lint clean, typecheck clean)
- [ ] Hand-off notes to Phase 3
