# Notes for DE-002

## Session 1: Planning + definition (2026-03-10)

### What's done
- DE-001 (planning delta) completed and closed
- PROD-001 created: 17 FRs + 6 NFRs with capabilities
- SPEC-001 created: tech assembly spec, 17 FRs + 4 NFRs, module architecture, traceability matrix
- SPEC-001.tests populated with strategy matrix, fixture inventory, suite definitions
- Critical review patch applied (token inventory descoped, heuristic catalogue transcribed, auth/client split, error hierarchy promoted, expansion triggers made configurable, outline XML vocabulary defined, opacity deduplicated)
- DE-002 through DE-006 created with requirement allocation (full PROD-001 coverage verified)
- DR-002 drafted with type contracts, code impact summary, verification alignment
- IP-002 drafted with 3 phases, 7 VTs
- Adversarial review of DR-002 completed (external model review via PAL)

### Adversarial review findings — DR-002 needs patching before implementation

**Must fix (blocks downstream):**
1. **Client return types missing**: `fetchNode()` and `fetchImage()` have no return type contracts. DE-003 has nothing to design against.
2. **Image export two-step flow**: Figma Images API returns presigned URLs, not binary data. DR treats it as single-step. Need to acknowledge: render request → URL → download binary. Two independent failure points.
3. **No concurrency model**: p-limit is a dependency but DR never says where/how. Add `concurrency` to client options, state p-limit wraps outbound API calls.

**Should fix:**
4. **Selective expansion re-entry**: Clarify `FigmaClient` is injectable/reusable, not one-shot pipeline. DE-006 calls `fetchNode` repeatedly.
5. **Manifest errors structured**: Change `errors: string[]` to `Array<{ type, message, nodeId? }>`.
6. **fetch-assets.ts silently missing**: SPEC-001 lists it, DR-002 doesn't include or defer. Add to Out of Scope with explicit deferral to DE-004.

**Nice to fix:**
7. **schemas/raw.ts vs figma/types-raw.ts**: Clarify split — types-raw.ts = TS types, schemas/raw.ts = Zod schemas that validate into those types.

### Commits
- `6ad4820` feat(DE-001): PROD-001 spec + delivery planning delta
- `01594a2` feat(DE-001): SPEC-001 assembly spec + phase 1 complete
- `409dc22` feat(DE-001): delivery deltas DE-002–DE-006 + coverage verified
- `78f4dba` fix(PROD-001,SPEC-001): critical review patch
- `b40a3be` chore(DE-001): close planning delta
- `f1bce85` feat(DE-002): define DR-002 and IP-002 for scaffold delta

### Spec-driver state
- All `.spec-driver` changes committed promptly per doctrine
- `spec-driver validate` passes (warnings only: audit gates on draft deltas, expected)
- Stale SPEC-001.NF-005 manually removed from registry (caching promoted to FR-009)

### Open questions
- Default thresholds for expansion triggers (deferred to DE-006)
- OAuth support timeline (deferred indefinitely)

## Session 2: DR-002 adversarial review patch (2026-03-10)

### What's done
- All 7 adversarial review findings patched into DR-002:
  1. Client return types added: `FigmaFileResponse`, `FetchImageResult`
  2. Image export two-step flow documented (render request → presigned URL → download)
  3. Concurrency model defined: `concurrency` option on `FigmaClientOptions`, p-limit wraps all outbound calls
  4. Client design stance section added: stateless, injectable, reusable by DE-003/DE-006
  5. Manifest errors made structured: `ManifestError[]` with type/message/nodeId
  6. `fetch-assets.ts` explicitly deferred to DE-004 in Out of Scope
  7. Schema file roles clarified: `types-raw.ts` = TS types, `schemas/raw.ts` = Zod schemas
- DR-002 status → accepted
- NormalizationError annotated as hierarchy placeholder for DE-003+

### Next step
- `/execute-phase` for IP-002.PHASE-01 (scaffold + errors + URL parser)

## Session 2 (cont.): IP-002.PHASE-01 implementation (2026-03-10)

### What's done
- Project scaffold: pnpm, ESM, strict TS, vitest, eslint with typescript-eslint
- Error hierarchy (`src/errors.ts`): 6 typed subclasses with `FigmaErrorOptions` (context + cause). `FigmaRateLimitError` adds `retryAfter`. 32 tests.
- URL parser (`src/figma/url.ts`): parses `/design/` and `/file/` URLs, node ID dash→colon normalization, throws `FigmaUrlParseError` with context. 13 tests.
- VT-001 and VT-005 verified. All 45 tests pass, lint clean, typecheck clean.
- DE-002 → in-progress, PHASE-01 → complete, IP-002 progress tracking updated.

### Adaptations
- **pnpm** chosen over bun (flake.nix had bun; user chose pnpm as middle ground)
- **Split tsconfig**: `tsconfig.json` is the base (includes src+tests, noEmit — used by eslint projectService and IDE). `tsconfig.build.json` extends it for compilation (src only, emits to dist). This resolved the eslint/typescript-eslint problem of test files not being in a project.

### Commits
- `4a5f3f9` fix(DE-002): patch DR-002 with 7 adversarial review findings
- `22a94b1` feat(DE-002): create IP-002.PHASE-01 phase sheet
- `ba7b759` feat(DE-002): implement IP-002.PHASE-01 — scaffold, errors, URL parser

### Spec-driver state
- All `.spec-driver` changes committed together with code per doctrine
- DE-002 status: in-progress
- IP-002: PHASE-01 complete, VT-001/VT-005 verified

### Next step
- `/execute-phase` for IP-002.PHASE-02 (auth, HTTP client, node fetch, image export)

## New Agent Instructions

### Task card
DE-002 — Project scaffold and Figma client

### Required reading (in order)
1. `.spec-driver/deltas/DE-002-project_scaffold_and_figma_client/notes.md` (this file — especially the adversarial review findings)
2. `.spec-driver/deltas/DE-002-project_scaffold_and_figma_client/DR-002.md`
3. `.spec-driver/deltas/DE-002-project_scaffold_and_figma_client/IP-002.md`
4. `.spec-driver/deltas/DE-002-project_scaffold_and_figma_client/DE-002.md`

### Related documents
- `.spec-driver/tech/SPEC-001/SPEC-001.md` — assembly spec (FR-001 through FR-004, FR-015, FR-016 are DE-002's scope)
- `.spec-driver/tech/SPEC-001/SPEC-001.tests.md` — testing guide (§3 strategy matrix, §4 suite inventory for DE-002 phases)
- `.spec-driver/product/PROD-001/PROD-001.md` — product spec
- `docs/brief.md` — original brief
- `docs/patch-01.md` — token inventory decision (option 3: used-token summary)

### Key files
- `src/errors.ts` — error hierarchy (6 classes)
- `src/figma/url.ts` — URL parser
- `tests/errors.test.ts` — VT-005 (32 tests)
- `tests/figma/url.test.ts` — VT-001 (13 tests)
- `tsconfig.json` — base (src+tests, noEmit, used by eslint/IDE)
- `tsconfig.build.json` — build (src only, emits to dist)

### What the next agent must do
1. Create PHASE-02 phase sheet via `/plan-phases`
2. `/execute-phase` for IP-002.PHASE-02 (auth, HTTP client, node fetch, image export)

### Routing
`/plan-phases` then `/execute-phase` for IP-002.PHASE-02.

### Gotchas
- `spec-driver sync --force` does NOT prune stale requirements from the registry. If a requirement is removed from a spec, you must manually edit `.spec-driver/registry/requirements.yaml`.
- SPEC-001.TESTS has requirement-like table rows that spec-driver warns about but correctly ignores. This is harmless noise.
- The Figma Images API returns JSON with presigned URLs to rendered images, NOT binary data. This is a two-step process: render request → URL response → download image from URL. Do not design fetch-image.ts as a single HTTP call.
