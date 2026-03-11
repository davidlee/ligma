---
id: SPEC-001
slug: figma_fetch_and_normalization_system
name: Figma fetch and normalization system
created: '2026-03-10'
updated: '2026-03-10'
status: draft
kind: spec
aliases: [ligma-system]
relations:
  - type: implements
    target: PROD-001
guiding_principles:
  - Normalization layer is the product; everything else is plumbing
  - Library-first architecture; CLI is a thin consumer
  - Heuristics must be isolated pure functions
  - Compact output over exhaustive mirroring
assumptions:
  - Figma REST API v1 endpoints remain stable
  - Node subtree responses fit in memory for typical design frames
  - TypeScript + Zod + native fetch stack
  - Variables REST API requires Enterprise full-seat access; v1 does not depend on it
category: assembly
c4_level: container
---

# SPEC-001 – Figma fetch and normalization system

```yaml supekku:spec.relationships@v1
schema: supekku.spec.relationships
version: 1
spec: SPEC-001
requirements:
  primary:
    - SPEC-001.FR-001
    - SPEC-001.FR-002
    - SPEC-001.FR-003
    - SPEC-001.FR-004
    - SPEC-001.FR-005
    - SPEC-001.FR-006
    - SPEC-001.FR-007
    - SPEC-001.FR-008
    - SPEC-001.FR-009
    - SPEC-001.FR-010
    - SPEC-001.FR-011
    - SPEC-001.FR-012
    - SPEC-001.FR-013
    - SPEC-001.FR-014
    - SPEC-001.FR-015
    - SPEC-001.FR-016
    - SPEC-001.FR-017
    - SPEC-001.FR-018
    - SPEC-001.NF-001
    - SPEC-001.NF-002
    - SPEC-001.NF-003
    - SPEC-001.NF-004
  collaborators: []
interactions:
  - target: PROD-001
    type: implements
    description: Technical implementation of product requirements
```

```yaml supekku:spec.capabilities@v1
schema: supekku.spec.capabilities
version: 1
spec: SPEC-001
capabilities:
  - id: figma-client
    name: Figma API client
    responsibilities:
      - URL parsing and node ID normalization
      - Authentication via X-Figma-Token header
      - HTTP client with retry and rate-limit handling
      - Node subtree fetching with depth/geometry/plugin-data options
      - Image export (PNG/SVG)
    requirements:
      - SPEC-001.FR-001
      - SPEC-001.FR-002
      - SPEC-001.FR-003
      - SPEC-001.FR-004
    summary: >-
      Encapsulates all Figma REST API interaction. Parses URLs, manages auth,
      fetches node data and images, handles errors and retries.
    success_criteria:
      - Valid URLs parse to correct fileKey + nodeId
      - Auth module is swappable (token today, OAuth later)
      - API requests include correct auth headers
      - Depth/geometry/plugin-data options passed correctly
      - PNG/SVG exports retrieved at configured scale
      - Rate-limited requests retry with backoff

  - id: normalization-engine
    name: Normalization engine
    responsibilities:
      - Type classification (Figma types → implementation types)
      - Role inference from node properties via documented heuristic rules
      - Layout normalization (auto-layout → mode/sizing/alignment)
      - Appearance normalization (fills, strokes, effects, corner radius)
      - Text normalization (content, style, semantic kind)
      - Component/instance metadata extraction
      - Per-node variable/token binding extraction
      - Asset classification and export advice
      - Interaction extraction (trigger/action pairs from prototyping data)
      - Diagnostic generation (confidence, warnings, provenance)
    requirements:
      - SPEC-001.FR-005
      - SPEC-001.FR-006
      - SPEC-001.FR-007
      - SPEC-001.FR-008
      - SPEC-001.FR-009
      - SPEC-001.FR-010
      - SPEC-001.FR-011
      - SPEC-001.FR-018
    summary: >-
      The core value of the system. Transforms raw Figma JSON into compact,
      implementation-oriented normalized representation. Each heuristic is
      an isolated pure function with tests. Role inference uses a 13-rule
      priority chain. Inference operates as a top-down post-pass over the
      assembled tree via a dedicated infer/ subdirectory.
    success_criteria:
      - Output significantly smaller than input
      - Layout, text, component, variable info is implementation-ready
      - Heuristic inferences include confidence and provenance
      - All normalization rules are testable in isolation

  - id: token-summary
    name: Used-token summary
    responsibilities:
      - Aggregate encountered variable/token references from normalized subtree
      - Aggregate encountered style references from normalized subtree
      - Emit scoped summary artifact
    requirements:
      - SPEC-001.FR-012
    summary: >-
      Collects and deduplicates token and style references seen during
      normalization of the selected subtree. Not a file-level inventory.
    success_criteria:
      - All encountered bindings present in summary
      - Summary correctly scoped (isFullInventory: false)
      - Null-safe for unresolvable token names

  - id: outline-generation
    name: Outline generation
    responsibilities:
      - JSON outline from normalized tree
      - XML outline from normalized tree with defined element vocabulary
    requirements:
      - SPEC-001.FR-013
    summary: >-
      Produces lightweight navigation artifacts for agent consumption.
      JSON for programmatic use, XML for compact human/agent reading.
    success_criteria:
      - Outline reflects normalized hierarchy accurately
      - XML element names follow defined vocabulary
      - XML is compact and self-documenting

  - id: output-pipeline
    name: Output pipeline
    responsibilities:
      - Artifact directory structure creation
      - Manifest generation
      - context.md generation
      - File writing with deterministic output
    requirements:
      - SPEC-001.FR-014
      - SPEC-001.FR-015
    summary: >-
      Writes all artifacts to structured output directory. Generates
      manifest.json and context.md as agent-facing entrypoints.
    success_criteria:
      - Output directory matches specified structure
      - Manifest accurately describes all artifacts
      - context.md is concise and self-contained
      - Identical inputs produce identical outputs

  - id: error-handling
    name: Typed error hierarchy
    responsibilities:
      - Define typed error classes for all failure modes
      - Ensure partial failures preserve best-effort output
    requirements:
      - SPEC-001.FR-016
    summary: >-
      Shared typed error hierarchy across all modules. Each error carries
      actionable context. Partial failures produce diagnostics, not crashes.
    success_criteria:
      - Every documented failure mode has a typed error class
      - Partial failures are recoverable with diagnostics

  - id: selective-expansion
    name: Selective expansion
    responsibilities:
      - Evaluate configurable expansion triggers after initial fetch
      - Trigger-based child refetching
      - Merge expanded data into normalized tree
    requirements:
      - SPEC-001.FR-017
    summary: >-
      Staged retrieval strategy for large/deep frames. Evaluates configurable
      expansion triggers after initial shallow fetch and selectively refetches.
    success_criteria:
      - Expansion triggers are configurable with documented defaults
      - Expanded data merges correctly into normalized tree
      - Large frames handled without excessive API calls
```

```yaml supekku:verification.coverage@v1
schema: supekku.verification.coverage
version: 1
subject: SPEC-001
entries:
  - artefact: VT-001
    kind: VT
    requirement: SPEC-001.FR-001
    status: verified
    notes: URL parsing + node ID normalization — 13 tests (DE-002)
  - artefact: VT-002
    kind: VT
    requirement: SPEC-001.FR-002
    status: verified
    notes: Auth module (X-Figma-Token header) — 6 tests (DE-002)
  - artefact: VT-003
    kind: VT
    requirement: SPEC-001.FR-003
    status: verified
    notes: HTTP client + retry + rate-limit — 27 tests across 3 suites (DE-002)
  - artefact: VT-004
    kind: VT
    requirement: SPEC-001.FR-004
    status: verified
    notes: Two-step image export (PNG/SVG) — 9 tests (DE-002)
  - artefact: VT-006
    kind: VT
    requirement: SPEC-001.FR-015
    status: verified
    notes: Manifest + directory writer + artifact structure — 28 tests (DE-002)
  - artefact: VT-005
    kind: VT
    requirement: SPEC-001.FR-016
    status: verified
    notes: Typed error hierarchy (6 classes) — 32 tests (DE-002)
  - artefact: VT-008
    kind: VT
    requirement: SPEC-001.FR-005
    status: verified
    notes: Type classification — 32 tests (DE-003, updated DE-004)
  - artefact: VT-009
    kind: VT
    requirement: SPEC-001.FR-008
    status: verified
    notes: Layout extraction — 36 tests (DE-003)
  - artefact: VT-010
    kind: VT
    requirement: SPEC-001.FR-006
    status: verified
    notes: Appearance extraction — 36 tests (DE-003, updated DE-004, DE-008 per-side stroke weights)
  - artefact: VT-011
    kind: VT
    requirement: SPEC-001.FR-009
    status: verified
    notes: Text extraction — 29 tests (DE-003, updated DE-004)
  - artefact: VT-012
    kind: VT
    requirement: SPEC-001.FR-006
    status: verified
    notes: Node composition + confidence min-rule — 33 tests (DE-003, updated DE-004)
  - artefact: VT-013
    kind: VT
    requirement: SPEC-001.NF-001
    status: verified
    notes: Representation efficiency (2.0x ceiling) — 1 test (DE-003, re-verified DE-004)
  - artefact: VT-014
    kind: VT
    requirement: SPEC-001.FR-010
    status: verified
    notes: Component metadata extraction — 14 tests (DE-004)
  - artefact: VT-015
    kind: VT
    requirement: SPEC-001.FR-008
    status: verified
    notes: Variable/token binding extraction — 27 tests (DE-004)
  - artefact: VT-016
    kind: VT
    requirement: SPEC-001.FR-011
    status: verified
    notes: Asset classification — 14 tests (DE-004)
  - artefact: VT-017
    kind: VT
    requirement: SPEC-001.FR-007
    status: verified
    notes: Role inference 13-rule priority chain — 39 tests (DE-004)
  - artefact: VT-018
    kind: VT
    requirement: SPEC-001.FR-009
    status: verified
    notes: Text semantic kind inference — 16 tests (DE-004)
  - artefact: VT-019
    kind: VT
    requirement: SPEC-001.FR-007
    status: verified
    notes: Semantic flag derivation — 20 tests (DE-004)
  - artefact: VT-020
    kind: VT
    requirement: SPEC-001.FR-007
    status: verified
    notes: Inference composition and wiring — 11 tests (DE-004)
  - artefact: VT-021
    kind: VT
    requirement: SPEC-001.NF-002
    status: verified
    notes: Pure function signal helpers — 53 tests (DE-004)
  - artefact: VT-022
    kind: VT
    requirement: SPEC-001.FR-012
    status: verified
    notes: Tokens-used summary aggregation — 21 tests (DE-004)
  - artefact: VT-023
    kind: VT
    requirement: SPEC-001.FR-006
    status: verified
    notes: Full pipeline integration with DE-004 fields — 2 tests (DE-004)
  - artefact: VT-024
    kind: VT
    requirement: SPEC-001.FR-018
    status: verified
    notes: Interaction extraction — 30 tests (DE-008)
  - artefact: VT-025
    kind: VT
    requirement: SPEC-001.FR-013
    status: verified
    notes: Outline JSON + XML generation — 32 tests across outline.test.ts + outline-xml.test.ts (DE-005)
  - artefact: VT-026
    kind: VT
    requirement: SPEC-001.FR-014
    status: verified
    notes: context.md generation — 36 tests in tests/output/context-md.test.ts (DE-005)
  - artefact: VT-027
    kind: VT
    requirement: SPEC-001.NF-003
    status: verified
    notes: Determinism — 5 tests in tests/output/context-md-determinism.test.ts (DE-005)
```

## 1. Intent & Summary

- **Scope / Boundaries**: The complete figma-fetch system — from CLI invocation through Figma API interaction, normalization, and artifact output. Excludes MCP wrapper, OAuth, write-back to Figma, and full file-level token/style inventory.
- **Value Signals**: An agent can implement a typical UI frame from the output artifacts without needing raw Figma JSON.
- **Guiding Principles**: Normalization is the product. Library-first. Heuristics as pure functions. Compact over exhaustive.
- **Change History**: Initial spec from DE-001. Patch-01: auth/client split, heuristic catalogue transcribed, caching promoted to FR, error hierarchy FR added, token scope clarified, outline XML vocabulary defined, opacity deduplicated, traceability matrix added.

## 2. Stakeholders & Journeys

- **Systems / Integrations**:
  - Figma REST API v1 (`/v1/files/:key/nodes`, `/v1/images/:key`)
  - Local filesystem for artifact output and cache
- **Primary Journeys / Flows**:
  1. CLI receives Figma URL + token + options
  2. URL parser extracts fileKey + nodeId
  3. Auth module builds headers
  4. Client fetches node JSON + PNG in parallel
  5. Normalizer transforms raw JSON → normalized tree
  6. Token aggregator collects encountered references
  7. Outline generator produces JSON + XML outlines
  8. Output pipeline writes artifact bundle
- **Edge Cases & Non-goals**: See PROD-001 §2. Additionally: full file-level variable inventory (requires Variables API / Enterprise access) is explicitly out of scope.

## 3. Responsibilities & Requirements

### Module Architecture

```
src/
  cli.ts              → CLI entry point, option parsing, orchestration
  config.ts           → Configuration types and defaults
  errors.ts           → Typed error hierarchy (FR-016)

  figma/
    url.ts            → URL parsing and node ID normalization
    auth.ts           → Authentication (X-Figma-Token header)
    client.ts         → HTTP client with retry/rate-limit handling
    endpoints.ts      → Endpoint URL builders
    fetch-node.ts     → Node subtree fetching
    fetch-image.ts    → Image export (PNG/SVG)
    fetch-assets.ts   → Asset download
    types-raw.ts      → Raw Figma API response types

  normalize/
    index.ts          → Normalization pipeline orchestration
    classify.ts       → Node type classification
    node.ts           → Core node normalization (extraction + assembly)
    raw-helpers.ts    → AnalysisResult<T>, ExtractorResult<T>, colorToHex()
    layout.ts         → Layout property normalization
    appearance.ts     → Appearance/paint normalization (opacity here, not node-level)
    text.ts           → Text content and style normalization
    components.ts     → Component/instance metadata extraction
    variables.ts      → Per-node variable/token binding extraction
    assets.ts         → Asset classification and export advice
    infer/
      index.ts        → applyInferences() composition + recursive post-pass
      types.ts        → InferenceInput, InferenceResults, toInferenceInput()
      signals.ts      → Shared signal helpers (name match, size, child inspection)
      role.ts         → inferRole() 13-rule priority chain
      text-kind.ts    → inferTextKind() role-derived + fallback
      semantics.ts    → inferSemantics() flag derivation

  summary/
    tokens-used.ts    → Used-token summary aggregation

  orchestrate.ts      → Pipeline orchestration (normalize → summary → output)

  output/
    manifest.ts       → Manifest generation
    context-md.ts     → context.md generation
    write.ts          → Artifact file writing

  schemas/
    raw.ts            → Zod schemas for raw Figma types
    normalized.ts     → Zod schemas for normalized types
    outline.ts        → Zod schemas for outline types
    tokens-used.ts    → Zod schema for tokens-used.json
    manifest.ts       → Zod schemas for manifest

  util/
    cache.ts          → File-based caching (FR-009)
    fs.ts             → Filesystem helpers
    hash.ts           → Content hashing for cache keys
    log.ts            → Logging
    retry.ts          → Retry with backoff
```

### Traceability Matrix (PROD-001 → SPEC-001)

| PROD-001 | Description | SPEC-001 | Module |
| --- | --- | --- | --- |
| FR-001 | URL parsing | FR-001 | `figma/url.ts` |
| FR-002 | Node subtree fetch | FR-003 | `figma/client.ts`, `fetch-node.ts` |
| FR-003 | Authentication | FR-002 | `figma/auth.ts` |
| FR-004 | Image export | FR-004 | `figma/fetch-image.ts` |
| FR-005 | Normalized model | FR-006 | `normalize/node.ts`, `layout.ts`, `style.ts`, `text.ts` |
| FR-006 | Type classification | FR-005 | `normalize/classify.ts` |
| FR-007 | Role inference | FR-007 | `normalize/infer/` |
| FR-008 | Layout normalization | FR-006 | `normalize/layout.ts` |
| FR-009 | Text normalization | FR-006 | `normalize/text.ts` |
| FR-010 | Per-node variable bindings | FR-008 | `normalize/variables.ts` |
| FR-011 | Outline generation | FR-013 | `normalize/outline.ts` |
| FR-012 | context.md | FR-014 | `output/context-md.ts` |
| FR-013 | Artifact directory + manifest | FR-015 | `output/manifest.ts`, `write.ts` |
| FR-014 | Caching | FR-009 | `util/cache.ts` |
| FR-015 | Selective expansion | FR-017 | cross-cutting |
| FR-016 | Used-token summary | FR-012 | `summary/tokens-used.ts` |
| FR-017 | Typed error hierarchy | FR-016 | `errors.ts` |
| NF-001 | Representation efficiency (RE-002) | NF-001 | — |
| NF-002 | Deterministic output | NF-003 | — |
| NF-003 | Heuristics as pure functions | NF-002 | — |
| NF-004 | Graceful error handling | FR-016 | `errors.ts` |
| NF-005 | Library + CLI architecture | NF-004 | — |
| NF-006 | Minimal dependencies | NF-004 | — |

### Functional Requirements

- **FR-001**: `figma/url.ts` MUST parse Figma URLs into `{ fileKey, nodeId, originalUrl }`, converting node IDs from URL format (`123-456`) to API format (`123:456`). Invalid URLs MUST throw typed `FigmaUrlParseError`.

- **FR-002**: `figma/auth.ts` MUST provide an authentication module with the contract `{ token: string; header(): Record<string, string> }` that produces `X-Figma-Token` headers. The module MUST be designed so OAuth support can be added later without changing consumer code.

- **FR-003**: `figma/client.ts` MUST send authenticated requests to the Figma REST API with configurable depth, geometry, and plugin data options. Failed requests MUST be retried with exponential backoff (max 3 attempts). Rate limit responses (429) MUST trigger backoff. The client MUST use the auth module (FR-002) for header injection.

- **FR-004**: `figma/fetch-image.ts` MUST export PNG at scale=2 by default. SVG export MUST be available via option. Render failure MUST NOT block the pipeline — failure is recorded in manifest.

- **FR-005**: `normalize/classify.ts` MUST map raw Figma node types to the `NormalizedNodeType` enum: `document`, `page`, `frame`, `group`, `component`, `instance`, `variant-set`, `text`, `shape`, `vector`, `image`, `line`, `boolean-operation`, `mask`, `section`, `unknown`.

- **FR-006**: `normalize/node.ts`, `layout.ts`, `style.ts`, `text.ts` MUST transform raw Figma JSON into `NormalizedNode` trees. Layout MUST normalize to mode/sizing/alignment/padding/gap/wrap/constraints/position/clip. Appearance MUST normalize fills, strokes, effects, corner radius. Opacity MUST be represented only in `NormalizedAppearance`, not duplicated at the node level. Text MUST normalize content, style, color, token refs, semantic kind, truncation.

- **FR-007**: `normalize/infer/` MUST infer `NormalizedRole` from node properties via a 13-rule priority chain with noise early-out. Inference MUST be conservative — `null` role over overconfident guesses. Each heuristic MUST be an isolated pure function. The following heuristic rules MUST be implemented:

  1. **Container detection**: A node is likely a container if it is a frame/group/component/instance with children, has nontrivial bounds, and has layout or padding properties present.

  2. **Stack detection**: A node is likely a stack if auto layout exists, children are arranged along one axis, and gap/padding properties are meaningful.

  3. **Text semantic inference**: Infer from font size, font weight, node name, text length, and parent context. Large bold short text near top of parent → heading. Small text adjacent to field → label. Text inside button-like instance → button label.

  4. **Button-like detection**: Signals: instance/component/frame with one short text child, fixed or hug sizing, padded auto-layout, visible fill, name contains button/cta/primary/secondary.

  5. **Input-like detection**: Signals: label + text region + border/fill, rectangular container, width > height, names like input/field/search/email/password.

  6. **Icon detection**: Signals: small vector group, square-ish bounds, no text, simple naming.

  7. **Export-worthy asset detection**: Signals: image fills, many vector descendants, masks, illustration-like names, complex boolean operations.

  8. **Noise reduction**: De-emphasize invisible nodes (unless structurally important), zero-size nodes, decorative micro-layers, deeply nested wrappers with no distinct style/layout semantics. Mark as low-priority in diagnostics rather than deleting from output.

- **FR-008**: `normalize/variables.ts` MUST extract `boundVariables` and `explicitVariableModes` from node JSON, mapping them to `NormalizedVariableBindings` with resolved token names where available. Both literal value and token reference MUST be surfaced. This is per-node extraction only — file-level variable inventory is out of scope.

- **FR-009**: `util/cache.ts` MUST implement file-based caching under `.cache/figma-fetch`. Cache key MUST include: file key, node ID, requested depth, version (if pinned), and relevant fetch flags. Caching is a day-one requirement. Cache MUST be wrapping Figma client calls.

- **FR-010**: `normalize/components.ts` MUST extract component/instance metadata including componentId, componentName, componentSetId, variant properties, property references, and reusability assessment.

- **FR-011**: `normalize/assets.ts` MUST classify nodes as likely assets based on: image fills, vector complexity, naming patterns, boolean operations. MUST produce export suggestions with reason strings.

- **FR-012**: `summary/tokens-used.ts` MUST aggregate variable and style references encountered during normalization of the selected subtree into a `tokens-used.json` artifact. The artifact MUST include: scope metadata (`fileKey`, `rootNodeId`, `isFullInventory: false`), deduplicated variable references (token ID, name (nullable), collection ID, resolved type, encountered-on locations), style references (type, ID, name, encountered-on locations), and a count summary by category. Fields unresolvable without the Variables API MUST accept null.

- **FR-013**: `normalize/outline.ts` MUST generate JSON and XML outlines from normalized trees. XML MUST use the following element vocabulary mapping `NormalizedNodeType` to element names:

  | NormalizedNodeType | XML Element |
  | --- | --- |
  | `frame` | `<frame>` |
  | `group` | `<group>` |
  | `component` | `<component>` |
  | `instance` | `<instance>` |
  | `variant-set` | `<variant-set>` |
  | `text` | `<text>` |
  | `shape` | `<shape>` |
  | `vector` | `<vector>` |
  | `image` | `<image>` |
  | `line` | `<line>` |
  | `boolean-operation` | `<boolean-op>` |
  | `mask` | `<mask>` |
  | `section` | `<section>` |
  | `document` | `<document>` |
  | `page` | `<page>` |
  | `unknown` | `<node>` |

  Required attributes on every element: `id`, `name`. Optional attributes: `role` (if not null/unknown), `w` (width), `h` (height), `visible` (only when false). Self-closing for leaf nodes.

- **FR-014**: `output/context-md.ts` MUST generate `context.md` with sections: source metadata, visual reference, structural summary, important children, tokens used, assets, implementation notes.

- **FR-015**: `output/write.ts` MUST create the artifact directory structure (`visual/`, `structure/`, `tokens/`, `assets/`, `logs/`) and write all artifacts. `output/manifest.ts` MUST generate `manifest.json` describing all produced artifacts. The `tokens/` directory contains `tokens-used.json` only.

- **FR-016**: `errors.ts` MUST define a typed error hierarchy: `FigmaUrlParseError`, `FigmaAuthError`, `FigmaNotFoundError`, `FigmaRateLimitError`, `FigmaRenderError`, `NormalizationError`. Each error MUST carry actionable context (message, cause, relevant IDs). Partial failures MUST preserve best-effort output with diagnostics.

- **FR-017**: Selective expansion MUST evaluate configurable expansion triggers with documented default thresholds after initial normalization. Triggers: child count exceeding configurable threshold, incomplete layout container children, text nodes needing deeper inspection, component instances needing referenced component metadata, vector/icon nodes needing export data, image fills needing extraction, incomplete variable binding context. Default thresholds MUST be documented and overridable via configuration. The system MUST refetch specific child nodes and merge expanded data into the normalized tree.

- **FR-018**: `normalize/interactions.ts` MUST extract Figma `interactions` arrays into `NormalizedInteraction[]`. Trigger types MUST be normalized to lowercase kebab-case. Action kinds for node-navigation MUST be derived from the `navigation` field, not the top-level action type. Direct actions (BACK, CLOSE, URL/OPEN_URL) MUST be mapped to their respective kinds. Unsupported action families (SET_VARIABLE, SET_VARIABLE_MODE, CONDITIONAL, UPDATE_MEDIA_RUNTIME) and media triggers (ON_MEDIA_HIT, ON_MEDIA_END) MUST normalize to `unknown` with warnings. Absent or empty interactions MUST normalize to `null`. *(Added by DE-008.)*

### Non-Functional Requirements

- **NF-001**: Normalized representation efficiency. The normalized schema MUST materially simplify the raw node surface by exposing a smaller, fixed, implementation-oriented top-level field set than typical raw Figma nodes. Total normalized output size, measured as `JSON.stringify` length without pretty-printing, MUST NOT exceed 2.0x the corresponding raw input size on representative fixtures. Size ratio SHOULD be tracked across fixtures to catch regressions, but semantic clarity and implementation utility take precedence over raw byte reduction. *(Revised by RE-002.)*

- **NF-002**: All normalization heuristics MUST be implemented as isolated pure functions with unit tests. Fixture-driven testing for representative UI patterns.

- **NF-003**: Output MUST be deterministic — identical inputs produce identical byte-for-byte output.

- **NF-004**: System MUST be structured as a library + CLI, not a single script. Core logic MUST be importable for future MCP wrapper. Minimal dependencies: TypeScript, Zod, native fetch/undici, commander/yargs, p-limit, vitest.

### Operational Targets

- **Maintainability**: Each normalization module testable independently. Assembly tested via golden fixtures.

## 4. Solution Outline

### Architecture

```
CLI (cli.ts)
  │
  ├─ URL Parser (figma/url.ts)
  ├─ Auth (figma/auth.ts)           ← FR-002: swappable auth module
  │
  ├─ Cache (util/cache.ts)          ← FR-009: wraps client calls
  │    │
  │    └─ Figma Client (figma/client.ts)  ← FR-003: retry + rate-limit
  │         ├─ fetch-node.ts  ─→ raw node JSON
  │         ├─ fetch-image.ts ─→ PNG/SVG binary
  │         └─ fetch-assets.ts ─→ asset binaries
  │
  ├─ Error hierarchy (errors.ts)    ← FR-016: shared across all modules
  │
  ├─ Normalizer (normalize/index.ts)
  │    ├─ classify.ts      ─→ type classification
  │    ├─ node.ts          ─→ core normalization (extraction + assembly)
  │    ├─ raw-helpers.ts   ─→ AnalysisResult<T>, colorToHex()
  │    ├─ layout.ts        ─→ layout extraction
  │    ├─ appearance.ts    ─→ appearance extraction (opacity here, not node-level)
  │    ├─ text.ts          ─→ text extraction
  │    ├─ components.ts    ─→ component metadata
  │    ├─ variables.ts     ─→ per-node token bindings
  │    ├─ assets.ts        ─→ asset classification
  │    ├─ infer/           ─→ role inference (13 rules), text-kind, semantic flags
  │    └─ outline.ts       ─→ JSON + XML outlines (defined element vocabulary)
  │
  ├─ Summary (summary/tokens-used.ts) ─→ token aggregation
  │
  ├─ Orchestrate (orchestrate.ts)  ─→ normalize → summary → output
  │
  └─ Output (output/)
       ├─ manifest.ts    ─→ manifest.json
       ├─ context-md.ts  ─→ context.md
       └─ write.ts       ─→ file writing
```

### Data Flow

1. `cli.ts` parses args, calls `figma/url.ts` to parse URL
2. `figma/auth.ts` builds auth headers
3. `util/cache.ts` wraps `figma/client.ts` — fetches node JSON + image in parallel
4. `normalize/index.ts` orchestrates extraction → assembly → inference post-pass
5. `summary/tokens-used.ts` aggregates encountered token references
6. `normalize/outline.ts` generates outlines from normalized tree
7. `output/` writes everything to disk with manifest

### Key Types

All types defined in `schemas/` using Zod:
- `schemas/raw.ts` — raw Figma API response shapes
- `schemas/normalized.ts` — `NormalizedNode` and sub-types (opacity in appearance only)
- `schemas/outline.ts` — `OutlineNode` shape
- `schemas/tokens-used.ts` — `TokensUsed` shape
- `schemas/manifest.ts` — `Manifest` shape

## 5. Behaviour & Scenarios

- **Primary Flow**: See §4 Data Flow
- **Error Handling**: See FR-016. Render failure → continue with warning in manifest. Partial normalization failure → preserve parent, record diagnostics on failed subtree.
- **Selective Expansion**: After initial depth-2 fetch, normalizer evaluates configurable triggers (FR-017). If triggered, client refetches specific children. Normalizer merges expanded nodes into tree.

## 6. Quality & Verification

- **Testing Strategy**:
  - Unit: each normalize module independently, each heuristic function, each error type
  - Fixture: raw JSON fixtures for representative UI patterns
  - Golden: input → expected normalized JSON + outline XML + context.md + tokens-used.json
  - Integration: full pipeline from raw JSON to artifact bundle
  - See [SPEC-001.tests](./SPEC-001.tests.md) for detailed testing guide
- **Verification Coverage**: Populated per-delta as implementation proceeds

## 7. Backlog Hooks & Dependencies

- **Related Specs / PROD**: Implements PROD-001
- **Risks & Mitigations**:
  - Figma API rate limiting → caching (FR-009) + p-limit concurrency
  - Heuristic drift → conservative defaults + confidence scoring
- **Known Gaps**:
  - MCP wrapper deferred
  - OAuth deferred
  - Full file-level variable inventory (Variables API, Enterprise access) deferred
  - Full file-level style inventory deferred
