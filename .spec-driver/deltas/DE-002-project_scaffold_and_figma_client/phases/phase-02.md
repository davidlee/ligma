---
id: IP-002.PHASE-02
slug: 002-project_scaffold_and_figma_client-phase-02
name: Auth, HTTP client, node fetch, image export
created: '2026-03-10'
updated: '2026-03-10'
status: complete
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-002.PHASE-02
plan: IP-002
delta: DE-002
objective: >-
  Implement the Figma API interaction layer: auth module, HTTP client with
  retry/rate-limit, endpoint URL builders, node subtree fetching, and two-step
  image export. All tested with mocked HTTP — no real API calls.
entrance_criteria:
  - Phase 1 complete (scaffold, errors, URL parser)
  - DR-002 accepted
exit_criteria:
  - VT-002 (auth) passing
  - VT-003 (client retry/rate-limit) passing
  - VT-004 (image export) passing
  - Zero lint warnings
  - tsc --noEmit clean
verification:
  tests:
    - VT-002
    - VT-003
    - VT-004
  evidence:
    - 118 tests passing (45 Phase 1 + 73 Phase 2)
    - eslint clean
    - tsc --noEmit clean
    - mise run passes
tasks:
  - id: '2.1'
    name: Auth module
  - id: '2.2'
    name: Endpoint URL builders
  - id: '2.3'
    name: Retry utility
  - id: '2.4'
    name: Raw type stubs + Zod schemas
  - id: '2.5'
    name: HTTP client core
  - id: '2.6'
    name: Node fetch
  - id: '2.7'
    name: Image export (two-step)
risks:
  - description: Figma Images API uses GET not POST — DR-002 says "POST render request"
    mitigation: Verified against API docs. GET /v1/images/:key with query params. Phase plan corrects this.
  - description: FigmaNode recursive type may be complex to express in Zod
    mitigation: Minimal schema with z.lazy() and .passthrough() — just enough for response envelope validation
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-002.PHASE-02
```

# Phase 2 — Auth, HTTP client, node fetch, image export

## 1. Objective
Implement the complete Figma API interaction layer: authentication, HTTP client with retry and rate-limit handling, endpoint URL builders, node subtree fetching via `/v1/files/:key/nodes`, and two-step image export via `/v1/images/:key`. All modules are tested with mocked HTTP — no real Figma API calls in the test suite.

## 2. Links & References
- **Delta**: DE-002
- **Design Revision Sections**: DR-002 §3 (FigmaAuth, FigmaClientOptions, FigmaFileResponse, FetchImageResult contracts), §4 (client design stance), §5 (retry/rate-limit behaviour)
- **Specs / PRODs**: PROD-001.FR-002, PROD-001.FR-003, PROD-001.FR-004, PROD-001.NF-004, PROD-001.NF-006
- **Support Docs**: SPEC-001.tests §3 (strategy matrix rows for auth/client/image), §4 (VT-002, VT-003, VT-004 suite definitions)

## 3. Entrance Criteria
- [x] Phase 1 complete — 45 tests passing, lint/typecheck clean
- [x] DR-002 accepted with adversarial review patches

## 4. Exit Criteria / Done When
- [x] Auth module: `createAuth(token)` returns `FigmaAuth` with correct `X-Figma-Token` header (VT-002)
- [x] Retry utility: exponential backoff with configurable max retries and base delay
- [x] HTTP client: successful request returns data, 429→retry with backoff, 500→retry up to max, 403→FigmaAuthError, 404→FigmaNotFoundError (VT-003)
- [x] Endpoint builders: correct URL construction for `/v1/files/:key/nodes` and `/v1/images/:key`
- [x] Node fetch: calls endpoint with depth/geometry/plugin-data options, validates response with Zod (VT-003)
- [x] Image export: two-step (GET render → download from presigned URL), PNG default scale=2, SVG option, render failure→FigmaRenderError (VT-004)
- [x] Concurrency: all outbound calls wrapped with p-limit
- [x] All 118 tests pass (existing 45 + 73 new)
- [x] Zero lint warnings, `tsc --noEmit` clean

## 5. Verification
- `pnpm test` — all tests pass
- `pnpm run typecheck` — clean
- `pnpm run lint` — clean
- VT-002: `tests/figma/auth.test.ts`
- VT-003: `tests/figma/client.test.ts` + `tests/figma/fetch-node.test.ts` + `tests/util/retry.test.ts`
- VT-004: `tests/figma/fetch-image.test.ts`

## 6. Assumptions & STOP Conditions
- Assumptions:
  - Figma Images API is GET `/v1/images/:key` with query params `ids`, `format`, `scale` (verified against API docs — DR-002 incorrectly says "POST")
  - Response envelope for `/v1/files/:key/nodes` contains `{ nodes: { [nodeId]: { document: FigmaNode, ... } } }`
  - Presigned image URLs expire after 30 days (per Figma docs) — no caching concern for this phase
  - `fetch-node.ts` and `fetch-image.ts` are standalone functions accepting a fetch/request dependency — not methods on a class
  - FigmaNode Zod schema is minimal (recursive with `.passthrough()`) — full node type modelling is DE-003
  - Mocking strategy: vitest `vi.fn()` to mock `fetch` — no msw needed for this scope
- STOP when:
  - Figma API response shape differs materially from what we can validate with a minimal schema
  - Retry/backoff logic requires features not expressible with the current error hierarchy

## 7. Tasks & Progress
*(Status: `[ ]` todo, `[WIP]`, `[x]` done, `[blocked]`)*

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [x] | 2.1 | Auth module | Yes | 6 tests |
| [x] | 2.2 | Endpoint URL builders | Yes | 15 tests |
| [x] | 2.3 | Retry utility | Yes | 9 tests |
| [x] | 2.4 | Raw type stubs + Zod schemas | Yes | 16 tests |
| [x] | 2.5 | HTTP client core | No | 9 tests |
| [x] | 2.6 | Node fetch | No | 9 tests |
| [x] | 2.7 | Image export (two-step) | No | 9 tests |

### Task Details

- **2.1 Auth module (VT-002)**
  - **Design / Approach**: `createAuth(token: string): FigmaAuth` factory function. `FigmaAuth` = `{ token: string; header(): Record<string, string> }`. Returns `{ "X-Figma-Token": token }`. Throw `FigmaAuthError` on empty/missing token.
  - **Files / Components**: `src/figma/auth.ts`, `tests/figma/auth.test.ts`
  - **Testing**: Token→correct header, empty token→FigmaAuthError, interface contract shape

- **2.2 Endpoint URL builders**
  - **Design / Approach**: Pure functions that build Figma API endpoint URLs. `buildNodesEndpoint(fileKey, nodeId, options?)` → URL string with query params. `buildImagesEndpoint(fileKey, nodeId, options?)` → URL string with query params. Base URL: `https://api.figma.com`.
  - **Files / Components**: `src/figma/endpoints.ts`, `tests/figma/endpoints.test.ts`
  - **Testing**: Correct URL construction, query param encoding, default values (depth=2, scale=2, format=png)

- **2.3 Retry utility**
  - **Design / Approach**: `withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>`. Exponential backoff: `baseDelay * 2^attempt`. Configurable `maxRetries` (default 3), `baseDelay` (default 1000ms). Retries on retriable errors only (determined by caller). Returns result or throws last error.
  - **Files / Components**: `src/util/retry.ts`, `tests/util/retry.test.ts`
  - **Testing**: Success on first try, success after retries, exhausts retries→throws, backoff timing (verify delays increase), respects maxRetries/baseDelay config

- **2.4 Raw type stubs + Zod schemas**
  - **Design / Approach**: Minimal `FigmaNode` type: `{ id, name, type, children? }` + `.passthrough()`. Response envelope schemas for nodes endpoint: `{ nodes: Record<string, { document: FigmaNode, ... }> }`. Images endpoint response: `{ images: Record<string, string | null> }`. Types in `src/figma/types-raw.ts`, Zod schemas in `src/schemas/raw.ts`.
  - **Files / Components**: `src/figma/types-raw.ts`, `src/schemas/raw.ts`, `tests/schemas/raw.test.ts`
  - **Testing**: Valid payloads parse, extra fields pass through, missing required fields reject, null image URLs accepted

- **2.5 HTTP client core (VT-003)**
  - **Design / Approach**: `createClient(options: FigmaClientOptions)` returns object with `request(url, options?)` method. Wraps native `fetch`. Injects auth headers. Wraps calls with `p-limit(concurrency)`. On response: 200→parse JSON, 429→extract `Retry-After` header→throw `FigmaRateLimitError`, 403→throw `FigmaAuthError`, 404→throw `FigmaNotFoundError`, 500+→throw retriable error. Caller (`fetchNode`, `fetchImage`) wraps with `withRetry` and decides retry policy.
  - **Files / Components**: `src/figma/client.ts`, `tests/figma/client.test.ts`
  - **Testing**: Successful request returns parsed JSON, 429→FigmaRateLimitError with retryAfter, 500→error (retriable), 403→FigmaAuthError (not retriable), 404→FigmaNotFoundError (not retriable), auth header injected, p-limit concurrency respected

- **2.6 Node fetch (VT-003)**
  - **Design / Approach**: `fetchNode(client, fileKey, nodeId, options?: FetchNodeOptions): Promise<FigmaFileResponse>`. Builds endpoint URL, calls `client.request()` with retry, validates response with Zod schema. Options: `depth` (default 2), `geometry` (default false), `pluginData` (default undefined). Returns validated `FigmaFileResponse`.
  - **Files / Components**: `src/figma/fetch-node.ts`, `tests/figma/fetch-node.test.ts`
  - **Testing**: Successful fetch→validated response, options forwarded to endpoint builder, retry on 500, immediate throw on 404, Zod validation rejects malformed response

- **2.7 Image export — two-step (VT-004)**
  - **Design / Approach**: `fetchImage(client, fileKey, nodeId, options?: FetchImageOptions): Promise<FetchImageResult>`. Step 1: GET `/v1/images/:key?ids=nodeId&format=png&scale=2` → JSON `{ images: { nodeId: "https://presigned-url" } }`. Step 2: fetch binary from presigned URL. If step 1 returns null URL → throw `FigmaRenderError`. If step 2 fails → throw `FigmaRenderError` with cause. Options: `format` ('png'|'svg', default 'png'), `scale` (default 2, ignored for SVG). Returns `{ format, buffer, sourceUrl }`.
  - **Files / Components**: `src/figma/fetch-image.ts`, `tests/figma/fetch-image.test.ts`
  - **Testing**: PNG success (both steps mocked), SVG option, null render URL→FigmaRenderError, presigned URL download failure→FigmaRenderError with cause, format/scale forwarded correctly

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
| --- | --- | --- |
| DR-002 says "POST" for image render — actually GET | Verified against Figma API docs. DR-002 patched. | Closed |
| Recursive FigmaNode Zod schema complexity | z.lazy() with .passthrough() works cleanly | Closed |
| Retry timing makes tests slow | Fake timers used throughout; rejectWith() helper avoids unhandled rejection warnings | Closed |
| exactOptionalPropertyTypes breaks optional params | Added `\| undefined` to FigmaRateLimitErrorOptions.retryAfter | Closed |

## 9. Decisions & Outcomes
- `2026-03-10` — Figma Images API confirmed as GET (not POST per DR-002). Two-step flow correct: GET→presigned URLs→download.
- `2026-03-10` — Client returns raw response; `fetchNode`/`fetchImage` own retry wrapping. This keeps the client thin and retry policy explicit per call site.
- `2026-03-10` — Mock strategy: `vi.fn()` replacing global `fetch` — simpler than msw for this scope.
- `2026-03-10` — Retry policy checks `context.status >= 500` instead of `instanceof FigmaError` to avoid retrying Zod validation errors.
- `2026-03-10` — `JSON.parse` wrapper (`parseJson`) with single eslint-disable to avoid `as unknown` assertions throughout the codebase.
- `2026-03-10` — `FigmaNodesResponseSchema` added for full endpoint envelope validation (not just inner document).

## 10. Findings / Research Notes
- Figma `/v1/images/:key` response: `{ images: { [nodeId]: string | null } }`. Null means render failed.
- Images expire after 30 days. Max 32 megapixels, larger images scaled down.
- Figma `/v1/files/:key/nodes` response: `{ nodes: { [nodeId]: { document: {...}, components: {...}, ... } } }`

## 11. Wrap-up Checklist
- [x] Exit criteria satisfied
- [x] Verification evidence stored (118 tests, mise run passes)
- [x] Spec/Delta/Plan updated with lessons
- [ ] Hand-off notes to next phase (if any)
