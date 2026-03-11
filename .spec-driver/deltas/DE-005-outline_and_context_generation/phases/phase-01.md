---
id: IP-005.PHASE-01
slug: 005-outline_and_context_generation-phase-01
name: Core implementation
created: '2026-03-11'
updated: '2026-03-11'
status: draft
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-005.PHASE-01
plan: IP-005
delta: DE-005
objective: >-
  Implement outline generation (JSON + XML), context.md briefing, pipeline
  wiring, manifest schema update, and --include-hidden flag. All new modules
  with tests. mise run green.
entrance_criteria:
  - DR-005 accepted
  - DE-003 and DE-004 completed (role inference live)
exit_criteria:
  - OutlineNode schema defined and tested
  - buildOutline() + outlineToXml() implemented with VT-018 + VT-019 passing
  - generateContextMd() implemented with VT-020 passing
  - Manifest schema updated (DEC-024), regression tests passing
  - orchestrate() produces outline + context.md
  - writeOutput() writes all new artifacts unconditionally
  - --include-hidden wired config → orchestrate → CLI
  - mise run green (typecheck + test + lint)
verification:
  tests:
    - VT-018 outline projection
    - VT-019 outline XML
    - VT-020 context.md sections
  evidence: []
tasks:
  - id: '1.1'
    name: OutlineNode schema
  - id: '1.2'
    name: Outline generation + tests
  - id: '1.3'
    name: Outline XML serialization + tests
  - id: '1.4'
    name: context.md generation + tests
  - id: '1.5'
    name: Manifest schema update + regression fixes
  - id: '1.6'
    name: Pipeline wiring (orchestrate + write + config + CLI)
risks:
  - description: Manifest schema change cascades to many test files
    mitigation: Update manifest tests alongside schema change in task 1.5
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-005.PHASE-01
```

# Phase 1 — Core implementation

## 1. Objective
Implement all DE-005 modules and wire them into the pipeline. Every new module has tests. `mise run` green at exit.

## 2. Links & References
- **Delta**: [DE-005](../DE-005.md)
- **Design Revision**: [DR-005](../DR-005.md) — sections 5.1–5.7
- **Requirements**: FR-011, FR-012, NF-002
- **Design decisions**: DEC-021 through DEC-025

## 3. Entrance Criteria
- [x] DR-005 accepted
- [x] DE-003 and DE-004 completed

## 4. Exit Criteria / Done When
- [ ] `src/schemas/outline.ts` — OutlineNode schema defined
- [ ] `src/normalize/outline.ts` — `buildOutline()` + `outlineToXml()` implemented
- [ ] `src/output/context-md.ts` — `generateContextMd()` implemented
- [ ] `src/schemas/manifest.ts` — 5 output fields required (DEC-024)
- [ ] `src/orchestrate.ts` — produces outline + context.md, threads `includeHidden`
- [ ] `src/output/write.ts` — writes normalized JSON, outlines, context.md
- [ ] `src/config.ts` + `src/cli.ts` — `--include-hidden` wired
- [ ] VT-018, VT-019, VT-020 passing
- [ ] Manifest + orchestrate + write regression tests passing
- [ ] `mise run` green

## 5. Verification
- `npx vitest run tests/normalize/outline.test.ts` (VT-018)
- `npx vitest run tests/normalize/outline-xml.test.ts` (VT-019)
- `npx vitest run tests/output/context-md.test.ts` (VT-020)
- `mise run` (full gate)

## 6. Assumptions & STOP Conditions
- Assumptions: Role inference is wired and producing non-null roles for typical nodes. `makeNode()` test helpers exist and cover required fields.
- STOP when: manifest schema change causes unexpected cascading failures beyond test updates.

## 7. Tasks & Progress
*(Status: `[ ]` todo, `[WIP]`, `[x]` done, `[blocked]`)*

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [x] | 1.1 | OutlineNode schema | [P] | `src/schemas/outline.ts` created |
| [x] | 1.2 | Outline generation + tests | | 15 tests (VT-018) |
| [x] | 1.3 | Outline XML serialization + tests | | 17 tests (VT-019) |
| [x] | 1.4 | context.md generation + tests | [P] | 36 tests (VT-020) |
| [x] | 1.5 | Manifest schema update + regression fixes | [P] | 5 fields now required; all regression tests updated |
| [x] | 1.6 | Pipeline wiring (orchestrate + write + config + CLI) | | All files + regression tests updated |

### Task Details

- **1.1 OutlineNode schema**
  - **Files**: `src/schemas/outline.ts`
  - **Design**: DR-005 §5.1. Zod schema with `NormalizedNodeTypeSchema` and `NormalizedRoleSchema`. Explicit `OutlineNode` interface. `z.lazy` for recursion.
  - **Testing**: Schema validation in outline.test.ts (task 1.2)

- **1.2 Outline generation + tests**
  - **Files**: `src/normalize/outline.ts`, `tests/normalize/outline.test.ts`
  - **Design**: DR-005 §5.2. `buildOutline()` returns `{ outline, hiddenNodesOmitted }`. Root always included. `childCount` = total structural children. Hidden filtering with `includeHidden` option.
  - **Testing** (VT-018): Projection correctness, hidden filtering, includeHidden mode, childCount vs children.length, role/bounds propagation, empty tree, all-hidden tree, single node.

- **1.3 Outline XML serialization + tests**
  - **Files**: `src/normalize/outline.ts` (same file), `tests/normalize/outline-xml.test.ts`
  - **Design**: DR-005 §5.2. `outlineToXml()`. Element name from const record. Stable attribute order: id, name, role, w, h, child-count. XML escaping. Self-closing leaves. 2-space indent.
  - **Testing** (VT-019): Element naming, attribute escaping (adversarial names), self-closing, indentation, stable attribute order, child-count attribute, visible="false" in hidden mode.

- **1.4 context.md generation + tests**
  - **Files**: `src/output/context-md.ts`, `tests/output/context-md.test.ts`
  - **Design**: DR-005 §5.3. Seven section generators. Important children tiering (DEC-022). Six implementation note generators (DEC-023). Directive language stance.
  - **Testing** (VT-020): Each section generator independently, section omission, important children tiering + document order stability + cap, token listing + unresolved fallback, asset listing without invented filenames, each note generator, conservative language checks, one golden snapshot.

- **1.5 Manifest schema update + regression fixes**
  - **Files**: `src/schemas/manifest.ts`, `tests/output/manifest.test.ts`, `src/output/manifest.ts`
  - **Design**: DR-005 §5.5. DEC-024: normalizedNodeJson, outlineJson, outlineXml, contextMd, tokensUsedJson required. Update `buildManifest()` callers.
  - **Testing**: Update existing manifest tests for new required fields.

- **1.6 Pipeline wiring**
  - **Files**: `src/orchestrate.ts`, `src/output/write.ts`, `src/config.ts`, `src/cli.ts`, `tests/orchestrate.test.ts`, `tests/output/write.test.ts`
  - **Design**: DR-005 §5.4, §5.6, §5.7. `OrchestrateResult` gains outlineJson, outlineXml, contextMd. `OutputArtifacts` expanded. `writeOutput()` writes all four new files unconditionally. `FetchConfig` gains `includeHidden`. CLI adds `--include-hidden`.
  - **Testing**: Orchestrate produces new fields. Write creates all files. Regression tests updated.

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
| --- | --- | --- |
| Manifest schema change cascades | Update tests in same task (1.5) | resolved — 4 test files updated cleanly |
| context.md golden snapshot fragile | Use synthetic fixture, match key sections not byte-exact | resolved — golden test uses `toContain` checks, not byte-exact |

## 9. Decisions & Outcomes
- 2026-03-11 — Phase structure: 2 phases (core + verification/close). Research complete in preflight/DR.
- 2026-03-11 — Used `Map<string, string>` for XML element names instead of `Record<NormalizedNodeType, string>` to satisfy `no-unsafe-return` lint rule.
- 2026-03-11 — Split `buildOutline` into `projectNode` (always returns) + `projectChild` (may return null) to avoid non-null assertion on root.
- 2026-03-11 — Zod v3 lacks `.nonneg()` — used `.int().min(0)` in OutlineNodeSchema.

## 10. Findings / Research Notes
- Role inference confirmed wired in `normalize/index.ts` via `applyInferencesRecursive()`
- `writeOutput()` now writes normalized JSON (was missing) — closed in 1.6
- `makeNode()` helpers exist in test files for building NormalizedNode fixtures
- `assertionStyle: 'never'` in eslint bans `as Type` but exempts `as const`; `[] as string[]` fails — use `Array<string>()` for typed empty arrays in tests
- `writeTextFile` added to `src/util/fs.ts` for XML and markdown output
- `tokensUsed` write changed from conditional to unconditional (always produced by pipeline now)
- Manifest schema cascaded to: `tests/schemas/manifest.test.ts`, `tests/output/manifest.test.ts`, `tests/output/write.test.ts`, `tests/orchestrate.test.ts`

## 12. Implementation Notes
- **Status**: All tasks complete. `mise run` green (684 tests, 35 files, 0 lint warnings).
- **Uncommitted**: All work is uncommitted. Ready for commit.
- **Spec-driver changes**: Phase sheet updated, not yet committed.
- **New files**: `src/schemas/outline.ts`, `src/normalize/outline.ts`, `src/output/context-md.ts`, `tests/normalize/outline.test.ts`, `tests/normalize/outline-xml.test.ts`, `tests/output/context-md.test.ts`
- **Modified files**: `src/schemas/manifest.ts`, `src/output/manifest.ts`, `src/output/write.ts`, `src/orchestrate.ts`, `src/config.ts`, `src/cli.ts`, `src/util/fs.ts`, + 4 test files
- **Rough edges**: VT-021 (determinism) not in phase 1 scope — planned for phase 2. `CliOptions` interface added to cli.ts to avoid type assertions on commander options.
- **Follow-up**: Phase 2 should add VT-021 determinism tests and run AUD-005.

## 11. Wrap-up Checklist
- [ ] Exit criteria satisfied
- [ ] Verification evidence stored
- [ ] Spec/Delta/Plan updated with lessons
- [ ] Hand-off notes to next phase (if any)
