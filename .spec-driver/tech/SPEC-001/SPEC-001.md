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
    - SPEC-001.NF-001
    - SPEC-001.NF-002
    - SPEC-001.NF-003
    - SPEC-001.NF-004
    - SPEC-001.NF-005
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
      - Node subtree fetching with depth/geometry/plugin-data options
      - Image export (PNG/SVG)
      - Rate-limit-aware request handling with retry
    requirements:
      - SPEC-001.FR-001
      - SPEC-001.FR-002
      - SPEC-001.FR-003
    summary: >-
      Encapsulates all Figma REST API interaction. Parses URLs, manages auth,
      fetches node data and images, handles errors and retries.
    success_criteria:
      - Valid URLs parse to correct fileKey + nodeId
      - API requests include correct auth headers
      - Depth/geometry/plugin-data options passed correctly
      - PNG/SVG exports retrieved at configured scale

  - id: normalization-engine
    name: Normalization engine
    responsibilities:
      - Type classification (Figma types → implementation types)
      - Role inference from node properties
      - Layout normalization (auto-layout → mode/sizing/alignment)
      - Appearance normalization (fills, strokes, effects, corner radius)
      - Text normalization (content, style, semantic kind)
      - Component/instance metadata extraction
      - Variable/token binding extraction
      - Asset classification and export advice
      - Diagnostic generation (confidence, warnings, provenance)
    requirements:
      - SPEC-001.FR-004
      - SPEC-001.FR-005
      - SPEC-001.FR-006
      - SPEC-001.FR-007
      - SPEC-001.FR-008
      - SPEC-001.FR-009
    summary: >-
      The core value of the system. Transforms raw Figma JSON into compact,
      implementation-oriented normalized representation. Each heuristic is
      an isolated pure function with tests.
    success_criteria:
      - Output significantly smaller than input
      - Layout, text, component, variable info is implementation-ready
      - Heuristic inferences include confidence and provenance
      - All normalization rules are testable in isolation

  - id: outline-generation
    name: Outline generation
    responsibilities:
      - JSON outline from normalized tree
      - XML outline from normalized tree
    requirements:
      - SPEC-001.FR-010
    summary: >-
      Produces lightweight navigation artifacts for agent consumption.
      JSON for programmatic use, XML for compact human/agent reading.
    success_criteria:
      - Outline reflects normalized hierarchy accurately
      - XML is compact and self-documenting

  - id: output-pipeline
    name: Output pipeline
    responsibilities:
      - Artifact directory structure creation
      - Manifest generation
      - context.md generation
      - File writing with deterministic output
    requirements:
      - SPEC-001.FR-011
      - SPEC-001.FR-012
    summary: >-
      Writes all artifacts to structured output directory. Generates
      manifest.json and context.md as agent-facing entrypoints.
    success_criteria:
      - Output directory matches specified structure
      - Manifest accurately describes all artifacts
      - context.md is concise and self-contained
      - Identical inputs produce identical outputs

  - id: selective-expansion
    name: Selective expansion
    responsibilities:
      - Detect when deeper node fetches are needed
      - Trigger-based child refetching
      - Merge expanded data into normalized tree
    requirements:
      - SPEC-001.FR-013
    summary: >-
      Staged retrieval strategy for large/deep frames. Evaluates expansion
      triggers after initial shallow fetch and selectively refetches children.
    success_criteria:
      - Expansion triggers are explicit and testable
      - Expanded data merges correctly into normalized tree
      - Large frames handled without excessive API calls
```

```yaml supekku:verification.coverage@v1
schema: supekku.verification.coverage
version: 1
subject: SPEC-001
entries: []
```

## 1. Intent & Summary

- **Scope / Boundaries**: The complete figma-fetch system — from CLI invocation through Figma API interaction, normalization, and artifact output. Excludes MCP wrapper, OAuth, and write-back to Figma.
- **Value Signals**: An agent can implement a typical UI frame from the output artifacts without needing raw Figma JSON.
- **Guiding Principles**: Normalization is the product. Library-first. Heuristics as pure functions. Compact over exhaustive.
- **Change History**: Initial spec from DE-001 planning delta.

## 2. Stakeholders & Journeys

- **Systems / Integrations**:
  - Figma REST API v1 (`/v1/files/:key/nodes`, `/v1/images/:key`)
  - Local filesystem for artifact output and cache
- **Primary Journeys / Flows**:
  1. CLI receives Figma URL + token + options
  2. URL parser extracts fileKey + nodeId
  3. Client fetches node JSON + PNG in parallel
  4. Normalizer transforms raw JSON → normalized tree
  5. Outline generator produces JSON + XML outlines
  6. Output pipeline writes artifact bundle
- **Edge Cases & Non-goals**: See PROD-001 §2.

## 3. Responsibilities & Requirements

### Module Architecture

```
src/
  cli.ts              → CLI entry point, option parsing, orchestration
  config.ts           → Configuration types and defaults

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
    node.ts           → Core node normalization
    layout.ts         → Layout property normalization
    style.ts          → Appearance/paint normalization
    text.ts           → Text content and style normalization
    components.ts     → Component/instance metadata extraction
    variables.ts      → Variable/token binding extraction
    assets.ts         → Asset classification and export advice
    outline.ts        → JSON + XML outline generation
    heuristics.ts     → Role inference and semantic detection

  output/
    manifest.ts       → Manifest generation
    context-md.ts     → context.md generation
    write.ts          → Artifact file writing

  schemas/
    raw.ts            → Zod schemas for raw Figma types
    normalized.ts     → Zod schemas for normalized types
    outline.ts        → Zod schemas for outline types
    manifest.ts       → Zod schemas for manifest

  util/
    fs.ts             → Filesystem helpers
    hash.ts           → Content hashing for cache keys
    log.ts            → Logging
    retry.ts          → Retry with backoff

  errors.ts           → Typed error hierarchy
```

### Requirement Allocation by Module

| Module | PROD-001 Requirements | SPEC-001 Requirements |
| --- | --- | --- |
| `figma/url.ts` | FR-001 | FR-001 |
| `figma/auth.ts` | FR-003 | FR-002 |
| `figma/client.ts`, `fetch-node.ts` | FR-002 | FR-002 |
| `figma/fetch-image.ts` | FR-004 | FR-003 |
| `normalize/classify.ts` | FR-006 | FR-004 |
| `normalize/node.ts`, `layout.ts`, `style.ts`, `text.ts` | FR-005, FR-008, FR-009 | FR-005 |
| `normalize/heuristics.ts` | FR-007 | FR-006 |
| `normalize/components.ts` | FR-005 (component part) | FR-007 |
| `normalize/variables.ts` | FR-010 | FR-008 |
| `normalize/assets.ts` | FR-005 (asset part) | FR-009 |
| `normalize/outline.ts` | FR-011 | FR-010 |
| `output/context-md.ts` | FR-012 | FR-011 |
| `output/manifest.ts`, `write.ts` | FR-013 | FR-012 |
| selective expansion (cross-cutting) | FR-015 | FR-013 |
| `util/` (caching) | FR-014 | NF-005 |

### Functional Requirements

- **FR-001**: `figma/url.ts` MUST parse Figma URLs into `{ fileKey, nodeId, originalUrl }`, converting node IDs from URL format (`123-456`) to API format (`123:456`). Invalid URLs MUST throw typed `FigmaUrlParseError`.

- **FR-002**: `figma/client.ts` MUST send authenticated requests to Figma REST API with configurable depth, geometry, and plugin data options. Auth MUST use `X-Figma-Token` header. Failed requests MUST be retried with exponential backoff (max 3 attempts). Rate limit responses (429) MUST trigger backoff.

- **FR-003**: `figma/fetch-image.ts` MUST export PNG at scale=2 by default. SVG export MUST be available via option. Render failure MUST NOT block the pipeline — failure is recorded in manifest.

- **FR-004**: `normalize/classify.ts` MUST map raw Figma node types to the `NormalizedNodeType` enum: `document`, `page`, `frame`, `group`, `component`, `instance`, `variant-set`, `text`, `shape`, `vector`, `image`, `line`, `boolean-operation`, `mask`, `section`, `unknown`.

- **FR-005**: `normalize/node.ts`, `layout.ts`, `style.ts`, `text.ts` MUST transform raw Figma JSON into `NormalizedNode` trees. Layout MUST normalize to mode/sizing/alignment/padding/gap/wrap/constraints/position/clip. Appearance MUST normalize fills, strokes, effects, corner radius. Text MUST normalize content, style, color, token refs, semantic kind, truncation.

- **FR-006**: `normalize/heuristics.ts` MUST infer `NormalizedRole` from node properties using documented heuristic rules (container, stack, button, input, icon, heading, etc.). Inference MUST be conservative — `unknown` over overconfident guesses. Each heuristic MUST be an isolated pure function.

- **FR-007**: `normalize/components.ts` MUST extract component/instance metadata including componentId, componentName, componentSetId, variant properties, property references, and reusability assessment.

- **FR-008**: `normalize/variables.ts` MUST extract `boundVariables` and `explicitVariableModes`, mapping them to `NormalizedVariableBindings` with resolved token names where available. Both literal value and token reference MUST be surfaced.

- **FR-009**: `normalize/assets.ts` MUST classify nodes as likely assets based on: image fills, vector complexity, naming patterns, boolean operations. MUST produce export suggestions with reason strings.

- **FR-010**: `normalize/outline.ts` MUST generate JSON and XML outlines from normalized trees. XML MUST use compact element-per-node format with key attributes (id, name, role, bounds).

- **FR-011**: `output/context-md.ts` MUST generate `context.md` with sections: source metadata, visual reference, structural summary, important children, tokens used, assets, implementation notes.

- **FR-012**: `output/write.ts` MUST create the artifact directory structure (`visual/`, `structure/`, `tokens/`, `assets/`, `logs/`) and write all artifacts. `output/manifest.ts` MUST generate `manifest.json` describing all produced artifacts.

- **FR-013**: Selective expansion MUST detect ambiguity/truncation triggers (many descendants, incomplete layout containers, text needing deeper inspection, component instances needing referenced metadata, vectors needing export data, image fills needing extraction, incomplete variable context) and refetch specific child nodes.

### Non-Functional Requirements

- **NF-001**: Normalized output MUST be >50% smaller than raw input in token count for typical frames.

- **NF-002**: All normalization heuristics MUST be implemented as isolated pure functions with unit tests. Fixture-driven testing for representative UI patterns.

- **NF-003**: Output MUST be deterministic — identical inputs produce identical byte-for-byte output.

- **NF-004**: Typed error hierarchy: `FigmaUrlParseError`, `FigmaAuthError`, `FigmaNotFoundError`, `FigmaRateLimitError`, `FigmaRenderError`, `NormalizationError`. Partial failures MUST preserve best-effort output with diagnostics.

- **NF-005**: File-based caching under `.cache/figma-fetch`. Cache key includes: file key, node ID, depth, version, fetch flags.

### Operational Targets

- **Maintainability**: Each normalization module testable independently. Assembly tested via golden fixtures.

## 4. Solution Outline

### Architecture

```
CLI (cli.ts)
  │
  ├─ URL Parser (figma/url.ts)
  ├─ Auth (figma/auth.ts)
  │
  ├─ Figma Client (figma/client.ts)
  │    ├─ fetch-node.ts  ─→ raw node JSON
  │    ├─ fetch-image.ts ─→ PNG/SVG binary
  │    └─ fetch-assets.ts ─→ asset binaries
  │
  ├─ Normalizer (normalize/index.ts)
  │    ├─ classify.ts    ─→ type classification
  │    ├─ node.ts        ─→ core normalization
  │    ├─ layout.ts      ─→ layout extraction
  │    ├─ style.ts       ─→ appearance extraction
  │    ├─ text.ts        ─→ text extraction
  │    ├─ heuristics.ts  ─→ role inference
  │    ├─ components.ts  ─→ component metadata
  │    ├─ variables.ts   ─→ token bindings
  │    ├─ assets.ts      ─→ asset classification
  │    └─ outline.ts     ─→ JSON + XML outlines
  │
  └─ Output (output/)
       ├─ manifest.ts    ─→ manifest.json
       ├─ context-md.ts  ─→ context.md
       └─ write.ts       ─→ file writing
```

### Data Flow

1. `cli.ts` parses args, calls `figma/url.ts` to parse URL
2. `figma/client.ts` fetches node JSON + image in parallel
3. `normalize/index.ts` orchestrates the normalization pipeline on raw JSON
4. `normalize/outline.ts` generates outlines from normalized tree
5. `output/` writes everything to disk with manifest

### Key Types

All types defined in `schemas/` using Zod:
- `schemas/raw.ts` — raw Figma API response shapes
- `schemas/normalized.ts` — `NormalizedNode` and sub-types (as specified in PROD-001)
- `schemas/outline.ts` — `OutlineNode` shape
- `schemas/manifest.ts` — `Manifest` shape

## 5. Behaviour & Scenarios

- **Primary Flow**: See §4 Data Flow
- **Error Handling**: See NF-004. Render failure → continue with warning in manifest. Partial normalization failure → preserve parent, record diagnostics on failed subtree.
- **Selective Expansion**: After initial depth-2 fetch, normalizer evaluates triggers. If triggered, client refetches specific children. Normalizer merges expanded nodes into tree.

## 6. Quality & Verification

- **Testing Strategy**:
  - Unit: each normalize module independently, each heuristic function
  - Fixture: raw JSON fixtures for representative UI patterns
  - Golden: input → expected normalized JSON + outline XML + context.md
  - Integration: full pipeline from raw JSON to artifact bundle
- **Verification Coverage**: Populated per-delta as implementation proceeds

## 7. Backlog Hooks & Dependencies

- **Related Specs / PROD**: Implements PROD-001
- **Risks & Mitigations**:
  - Figma API rate limiting → caching + p-limit concurrency
  - Heuristic drift → conservative defaults + confidence scoring
- **Known Gaps**: MCP wrapper deferred. OAuth deferred.
