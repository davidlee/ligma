---
id: IP-002.PHASE-01
slug: 002-project_scaffold_and_figma_client-phase-01
name: Project scaffold + errors + URL parser
created: '2026-03-10'
updated: '2026-03-10'
status: draft
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
  - npm test passes
  - VT-001 (URL parsing) passing
  - VT-005 (error hierarchy) passing
  - Zero lint warnings
verification:
  tests:
    - VT-001
    - VT-005
  evidence:
    - test output log
tasks:
  - id: '1.1'
    name: Project scaffold
  - id: '1.2'
    name: Error hierarchy
  - id: '1.3'
    name: URL parser
risks:
  - description: Package manager choice may conflict with flake.nix
    mitigation: Check existing flake.nix for declared tools before choosing
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
- [ ] `npm test` passes with VT-001 + VT-005
- [ ] URL parser handles: standard design URL, share URL, node ID normalization, missing node-id error, invalid URL error, URLs with extra query params
- [ ] Error hierarchy: all 6 classes instantiable, carry context (message, cause, relevant IDs), instanceof checks work
- [ ] Zero lint warnings
- [ ] `tsc --noEmit` passes

## 5. Verification
- `npx vitest run` — all tests pass
- `npx tsc --noEmit` — type-checks
- VT-001: `tests/figma/url.test.ts`
- VT-005: `tests/errors.test.ts`

## 6. Assumptions & STOP Conditions
- Assumptions:
  - Node 18+ available in flake.nix environment
  - ESM module system (type: "module" in package.json)
  - vitest for testing (DEC from DR-002)
- STOP when:
  - flake.nix declares a different package manager or test runner than expected
  - Fundamental TS config conflict with existing project setup

## 7. Tasks & Progress
*(Status: `[ ]` todo, `[WIP]`, `[x]` done, `[blocked]`)*

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [ ] | 1.1 | Project scaffold | No | Must complete before 1.2/1.3 |
| [ ] | 1.2 | Error hierarchy | Yes | Independent of 1.3 |
| [ ] | 1.3 | URL parser | Yes | Independent of 1.2 |

### Task Details

- **1.1 Project scaffold**
  - **Design / Approach**: Initialize `package.json` (ESM, Node 18+), `tsconfig.json` (strict, ESM), `vitest.config.ts`. Install: commander, zod, p-limit, vitest, typescript. Check `flake.nix` for existing tooling constraints.
  - **Files / Components**: `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts` (placeholder)
  - **Testing**: `npx tsc --noEmit` passes on empty project
  - **Observations & AI Notes**: —
  - **Commits / References**: —

- **1.2 Error hierarchy (VT-005)**
  - **Design / Approach**: Implement per DR-002 §3. Base `FigmaError extends Error` with `cause` chaining. Six subclasses. `FigmaRateLimitError` adds `retryAfter?: number`. `NormalizationError` defined but used in DE-003+. Each error must carry context fields (message, cause, relevant IDs like nodeId/fileKey/httpStatus).
  - **Files / Components**: `src/errors.ts`, `tests/errors.test.ts`
  - **Testing**: VT-005 — each type instantiable, context fields populated, cause chain works, instanceof checks correct across hierarchy
  - **Observations & AI Notes**: —
  - **Commits / References**: —

- **1.3 URL parser (VT-001)**
  - **Design / Approach**: Implement per DR-002 §3. Parse Figma URLs → `{ fileKey, nodeId, originalUrl }`. Convert node IDs from URL format (`123-456`) to API format (`123:456`). Throw `FigmaUrlParseError` on invalid input. Must handle: standard design URLs, share URLs with node-id param, URLs with extra query params.
  - **Files / Components**: `src/figma/url.ts`, `tests/figma/url.test.ts`
  - **Testing**: VT-001 — standard URL, share URL, node ID normalization, missing node-id → error, invalid URL → error with message, extra query params preserved
  - **Observations & AI Notes**: —
  - **Commits / References**: —

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
| --- | --- | --- |
| flake.nix tooling conflict | Read flake.nix before npm init | Open |

## 9. Decisions & Outcomes
*(none yet)*

## 10. Findings / Research Notes
*(none yet)*

## 11. Wrap-up Checklist
- [ ] Exit criteria satisfied
- [ ] Verification evidence stored
- [ ] Spec/Delta/Plan updated with lessons
- [ ] Hand-off notes to next phase (if any)
