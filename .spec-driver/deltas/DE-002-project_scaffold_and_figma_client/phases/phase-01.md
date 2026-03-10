---
id: IP-002.PHASE-01
slug: 002-project_scaffold_and_figma_client-phase-01
name: Project scaffold + errors + URL parser
created: '2026-03-10'
updated: '2026-03-10'
status: complete
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-002.PHASE-01
plan: IP-002
delta: DE-002
objective: >-
  Initialize TypeScript project, define typed error hierarchy, implement URL
  parser with node ID normalization. All three are independent and testable
  in isolation.
entrance_criteria:
  - DR-002 accepted
exit_criteria:
  - pnpm test passes
  - VT-001 (URL parsing) passing
  - VT-005 (error hierarchy) passing
  - Zero lint warnings
verification:
  tests:
    - VT-001
    - VT-005
  evidence:
    - 45 tests passing (32 error hierarchy, 13 URL parser)
    - eslint clean
    - tsc --noEmit clean
tasks:
  - id: '1.1'
    name: Project scaffold
  - id: '1.2'
    name: Error hierarchy
  - id: '1.3'
    name: URL parser
risks:
  - description: Package manager choice may conflict with flake.nix
    mitigation: Resolved — pnpm per user decision, available in flake.nix
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-002.PHASE-01
```

# Phase 1 — Project scaffold + errors + URL parser

## 1. Objective
Initialize the TypeScript project with build tooling, define the typed error hierarchy (FR-017), and implement the URL parser with node ID normalization (FR-001). These three workstreams are independent and can be verified in isolation.

## 2. Links & References
- **Delta**: DE-002
- **Design Revision Sections**: DR-002 §3 (error hierarchy, URL parser contracts)
- **Specs / PRODs**: PROD-001.FR-001, PROD-001.FR-017, PROD-001.NF-004, PROD-001.NF-006
- **Support Docs**: SPEC-001.tests §4 (VT-001, VT-005 test expectations)

## 3. Entrance Criteria
- [x] DR-002 accepted (patched with adversarial review findings)

## 4. Exit Criteria / Done When
- [x] `pnpm test` passes with VT-001 + VT-005 (45 tests)
- [x] URL parser handles: standard design URL, file URL (legacy), node ID normalization, missing node-id error, invalid URL error, URLs with extra query params
- [x] Error hierarchy: all 6 classes instantiable, carry context (message, cause, relevant IDs), instanceof checks work
- [x] Zero lint warnings
- [x] `tsc --noEmit` passes

## 5. Verification
- `npx vitest run` — 45 tests pass
- `npx tsc --noEmit` — clean
- `npx eslint src/ tests/` — clean
- VT-001: `tests/figma/url.test.ts` (13 tests)
- VT-005: `tests/errors.test.ts` (32 tests)

## 6. Assumptions & STOP Conditions
- Assumptions:
  - Node 20 available in flake.nix environment (confirmed)
  - ESM module system (type: "module" in package.json) (confirmed)
  - pnpm as package manager (user decision)
  - vitest for testing (DEC from DR-002) (confirmed)

## 7. Tasks & Progress

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [x] | 1.1 | Project scaffold | No | pnpm, ESM, strict TS, vitest, eslint |
| [x] | 1.2 | Error hierarchy | Yes | 6 classes, context fields, cause chain |
| [x] | 1.3 | URL parser | Yes | design/file URLs, node ID normalization |

### Task Details

- **1.1 Project scaffold**
  - **Files / Components**: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `eslint.config.js`, `.gitignore`
  - **Observations & AI Notes**: Split tsconfig into base (includes tests, noEmit) and build (src only, emits). eslint uses `projectService: true` against base tsconfig. pnpm chosen over bun/npm per user preference.
  - **Commits / References**: —

- **1.2 Error hierarchy (VT-005)**
  - **Files / Components**: `src/errors.ts`, `tests/errors.test.ts`
  - **Testing**: 32 tests — each of 6 subclasses: instantiation, extends FigmaError+Error, correct name, cause chain. Plus: FigmaRateLimitError.retryAfter, context fields on FigmaUrlParseError/FigmaNotFoundError/FigmaRenderError, default context undefined.
  - **Observations & AI Notes**: `FigmaErrorOptions` extends `ErrorOptions` to add `context?: Record<string, unknown>`. `FigmaRateLimitErrorOptions` adds `retryAfter?: number`. All errors set `this.name = this.constructor.name` in base class.

- **1.3 URL parser (VT-001)**
  - **Files / Components**: `src/figma/url.ts`, `tests/figma/url.test.ts`
  - **Testing**: 13 tests — standard design URL, file URL (legacy), no file name segment, dash→colon normalization, already-encoded colon format, extra query params, non-Figma URL error, missing node-id error, empty string error, garbage input error, descriptive error message, error carries URL context, missing node-id descriptive message.
  - **Observations & AI Notes**: Supports both `/design/` and `/file/` path prefixes. Node ID normalization is a simple `replace(/-/g, ':')`. URL-encoded colons (`%3A`) are decoded by the URL constructor automatically.

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
| --- | --- | --- |
| flake.nix tooling conflict | Resolved: pnpm per user decision | Closed |

## 9. Decisions & Outcomes
- `2026-03-10` - pnpm as package manager (user preference; flake.nix updated)
- `2026-03-10` - Split tsconfig: base includes src+tests (noEmit), tsconfig.build.json for compilation (src only)

## 10. Findings / Research Notes
- eslint `projectService` with typescript-eslint v8 auto-discovers tsconfig.json — test files must be included in a tsconfig that projectService can find
- Figma URLs use both `/design/` (current) and `/file/` (legacy) path prefixes

## 11. Wrap-up Checklist
- [x] Exit criteria satisfied
- [x] Verification evidence stored
- [ ] Spec/Delta/Plan updated with lessons
- [ ] Hand-off notes to next phase (if any)
