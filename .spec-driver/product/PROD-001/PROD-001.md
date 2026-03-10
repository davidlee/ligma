---
id: PROD-001
slug: figma_fetch_and_normalization_pipeline
name: Figma fetch and normalization pipeline
created: '2026-03-10'
updated: '2026-03-10'
status: draft
kind: prod
aliases: [ligma, figma-fetch]
relations: []
guiding_principles:
  - Structural truth is the product
  - Visual truth is mandatory
  - Sparse first, detailed second
  - Output shaped for implementation, not archival
  - Determinism over cleverness
assumptions:
  - Figma REST API v1 remains stable
  - Personal access token auth is sufficient for v1
  - Target consumers are code-generation agents (Claude Code primarily)
---

# PROD-001 – Figma fetch and normalization pipeline

```yaml supekku:spec.relationships@v1
schema: supekku.spec.relationships
version: 1
spec: PROD-001
requirements:
  primary:
    - PROD-001.FR-001
    - PROD-001.FR-002
    - PROD-001.FR-003
    - PROD-001.FR-004
    - PROD-001.FR-005
    - PROD-001.FR-006
    - PROD-001.FR-007
    - PROD-001.FR-008
    - PROD-001.FR-009
    - PROD-001.FR-010
    - PROD-001.FR-011
    - PROD-001.FR-012
    - PROD-001.FR-013
    - PROD-001.FR-014
    - PROD-001.FR-015
    - PROD-001.NF-001
    - PROD-001.NF-002
    - PROD-001.NF-003
    - PROD-001.NF-004
    - PROD-001.NF-005
    - PROD-001.NF-006
  collaborators: []
interactions: []
```

```yaml supekku:spec.capabilities@v1
schema: supekku.spec.capabilities
version: 1
spec: PROD-001
capabilities:
  - id: url-parsing
    name: Figma URL parsing
    responsibilities:
      - Parse file key and node ID from Figma URLs
      - Normalize node ID format (dash to colon)
      - Reject invalid URLs with precise errors
    requirements:
      - PROD-001.FR-001
    summary: >-
      Accept Figma design/share URLs containing file key and node-id,
      extract structured identifiers for API consumption.
    success_criteria:
      - All documented URL formats parse correctly
      - Invalid URLs produce actionable error messages

  - id: node-retrieval
    name: Node subtree retrieval
    responsibilities:
      - Fetch node JSON via Figma REST API
      - Support depth-limited traversal
      - Support optional geometry and plugin data inclusion
    requirements:
      - PROD-001.FR-002
      - PROD-001.FR-003
    summary: >-
      Retrieve structured node data from the Figma API with configurable
      depth, geometry, and plugin data options.
    success_criteria:
      - Correct node subtree returned for valid file key + node ID
      - Depth parameter limits traversal as expected

  - id: visual-export
    name: Visual reference export
    responsibilities:
      - Export PNG render of target node
      - Optionally export SVG
      - Handle render failures gracefully
    requirements:
      - PROD-001.FR-004
    summary: >-
      Produce visual reference artifacts (PNG mandatory, SVG optional)
      for the target node to serve as validation backstop.
    success_criteria:
      - PNG always produced when API is reachable
      - SVG produced when requested and node is vector-friendly
      - Render failure recorded in manifest without blocking pipeline

  - id: normalization
    name: Structural normalization
    responsibilities:
      - Transform raw Figma JSON into compact, implementation-oriented representation
      - Normalize layout, appearance, text, components, variables, and assets
      - Classify nodes into implementation-relevant types and roles
      - Produce diagnostics for uncertain inferences
    requirements:
      - PROD-001.FR-005
      - PROD-001.FR-006
      - PROD-001.FR-007
      - PROD-001.FR-008
      - PROD-001.FR-009
      - PROD-001.FR-010
    summary: >-
      The core value of the system. Converts noisy Figma JSON into a compact,
      legible, implementation-oriented representation of structural truth.
      Every normalization rule is explicit, testable, and stable.
    success_criteria:
      - Normalized output is significantly smaller than raw input
      - Layout, text, component, and variable information is implementation-ready
      - Heuristic inferences include confidence and provenance diagnostics
      - An agent can implement a typical UI frame from normalized output + PNG

  - id: outline-generation
    name: Sparse outline generation
    responsibilities:
      - Generate JSON outline for navigation
      - Generate XML outline for compact agent consumption
    requirements:
      - PROD-001.FR-011
    summary: >-
      Produce lightweight navigation artifacts that let agents decide
      what to expand without reading full normalized JSON.
    success_criteria:
      - Outline correctly reflects node hierarchy
      - XML outline is compact and readable

  - id: context-generation
    name: Agent context file generation
    responsibilities:
      - Generate context.md summarizing all artifacts
      - Include structural summary, tokens, assets, implementation notes
    requirements:
      - PROD-001.FR-012
    summary: >-
      Produce a concise markdown file as the primary agent entrypoint,
      summarizing source, structure, tokens, assets, and implementation guidance.
    success_criteria:
      - context.md is self-contained enough for initial agent orientation
      - Content is stable and deterministic across identical inputs

  - id: artifact-output
    name: Artifact bundle output
    responsibilities:
      - Write all artifacts to structured output directory
      - Generate machine-readable manifest
      - Support configurable output format
    requirements:
      - PROD-001.FR-013
      - PROD-001.FR-014
    summary: >-
      Emit a deterministic artifact bundle with manifest, visual references,
      structural data, token extracts, and optional asset exports.
    success_criteria:
      - Output directory structure matches specification
      - Manifest accurately describes all produced artifacts

  - id: selective-expansion
    name: Selective child expansion
    responsibilities:
      - Detect when deeper node fetches are needed
      - Refetch specific children selectively
      - Merge expanded data into normalized output
    requirements:
      - PROD-001.FR-015
    summary: >-
      Handle large or deeply nested frames with staged retrieval:
      shallow fetch, outline, then targeted expansion of relevant children.
    success_criteria:
      - Large frames handled without excessive API calls
      - Expansion triggers are explicit and testable
```

```yaml supekku:verification.coverage@v1
schema: supekku.verification.coverage
version: 1
subject: PROD-001
entries: []
```

## 1. Intent & Summary

- **Problem / Purpose**: Code-generation agents need structured, implementation-oriented design context from Figma. Raw Figma JSON is too noisy, too large, and not shaped for the questions agents actually ask (what is this, how is it laid out, what's reusable, what's a token vs literal). This tool bridges the gap.
- **Value Signals**: An agent can implement a typical UI frame from `context.md` + `normalized-node.json` + `frame.png` without needing raw Figma JSON.
- **Guiding Principles**: Structural truth is the product. Visual truth is mandatory. Sparse first, detailed second. Output shaped for implementation, not archival. Determinism over cleverness.
- **Change History**: Initial specification from `docs/brief.md`.

## 2. Stakeholders & Journeys

- **Personas / Actors**:
  - *Agent operator*: Developer using Claude Code (or similar) to implement UI from Figma designs. Needs compact, trustworthy design context without manual Figma inspection.
  - *Code agent*: Claude Code or equivalent. Needs deterministic, token-efficient, implementation-oriented artifacts.

- **Primary Journeys / Flows**:
  1. Operator copies Figma node URL from design file
  2. Runs `figma-fetch "<url>" --token "$FIGMA_TOKEN" --out ./artifacts`
  3. CLI parses URL, fetches node subtree + PNG render
  4. Normalization layer transforms raw JSON → compact structural representation
  5. Pipeline emits artifact bundle: `context.md`, normalized JSON, outline, visual refs, tokens, manifest
  6. Agent consumes `context.md` as entrypoint, references normalized JSON and PNG for implementation

- **Edge Cases & Non-goals**:
  - Writing back to Figma: out of scope
  - Full-file ingestion by default: out of scope
  - Generalized conversational design exploration: out of scope
  - Full-fidelity vector reconstruction: out of scope
  - Design generation, Code Connect, plugin authoring: out of scope
  - Image processing beyond download/export: out of scope

## 3. Responsibilities & Requirements

### Capability Overview

See `supekku:spec.capabilities@v1` block above for structured capability definitions.

### Functional Requirements

- **FR-001**: System MUST parse Figma URLs containing file key and node-id, extracting `fileKey`, `nodeId`, and `originalUrl`. Node IDs in URL format (`123-456`) MUST be normalized to API format (`123:456`). Invalid URLs MUST produce precise error messages.

- **FR-002**: System MUST fetch node subtree JSON via `GET /v1/files/:key/nodes?ids=:nodeId` with configurable depth (default: 2), optional `geometry=paths`, and optional plugin data inclusion.

- **FR-003**: System MUST authenticate via `X-Figma-Token` header using personal access token. Auth module MUST be designed so OAuth support can be added later without changing the core fetch pipeline.

- **FR-004**: System MUST export a PNG render of the target node via `GET /v1/images/:key?ids=:nodeId&format=png&scale=2`. SVG export MUST be available as an option. If image export fails but JSON fetch succeeds, the pipeline MUST continue and record the render failure in the manifest.

- **FR-005**: System MUST normalize raw Figma JSON into a compact, recursively structured, implementation-oriented representation. The normalized model MUST include: id, name, type classification, role inference, visibility, bounds, hierarchy metadata, layout, appearance, text, component info, variable bindings, asset info, semantic flags, children, and diagnostics.

- **FR-006**: System MUST classify Figma node types into a reduced implementation-relevant type set: `document`, `page`, `frame`, `group`, `component`, `instance`, `variant-set`, `text`, `shape`, `vector`, `image`, `line`, `boolean-operation`, `mask`, `section`, `unknown`.

- **FR-007**: System MUST infer UI semantic roles from node properties (type, name, text content, auto-layout config, dimensions, child structure, component metadata). Role vocabulary: `screen`, `container`, `stack`, `grid`, `card`, `button`, `icon-button`, `label`, `heading`, `body-text`, `input`, `image`, `icon`, `divider`, `badge`, `avatar`, `list`, `list-item`, `modal`, `navigation`, `unknown`. Inference MUST be conservative — prefer `unknown` over overconfident guesses.

- **FR-008**: System MUST normalize layout properties into implementation-facing terms: mode (none/horizontal/vertical/absolute), sizing (fixed/fill/hug/unknown per axis), alignment (main/cross), padding, gap, wrap, constraints, position, and clip behavior.

- **FR-009**: System MUST normalize text nodes to include: content, style (font family/weight/size/line-height/letter-spacing/case/alignment), color, token references, semantic kind (heading/label/body/caption/button/unknown), and truncation settings.

- **FR-010**: System MUST extract and normalize variable/token bindings, distinguishing literal values from variable-bound values. Where possible, expose both resolved literal value and token reference (e.g., `color: "#FFFFFF"` + `tokenRef: "color.bg.surface"`).

- **FR-011**: System MUST generate sparse outlines in both JSON and XML formats. Outlines MUST include: id, name, type, role, visibility, bounds, child count, and children. The XML outline MUST be compact and human-readable.

- **FR-012**: System MUST generate a `context.md` file as the primary agent entrypoint, containing: source metadata, visual reference path, structural summary, important children list, tokens used, assets, and implementation notes.

- **FR-013**: System MUST emit all artifacts to a structured output directory with subdirectories: `visual/`, `structure/`, `tokens/`, `assets/`, `logs/`. A machine-readable `manifest.json` MUST describe all produced artifacts.

- **FR-014**: System MUST implement file-based caching under `.cache/figma-fetch`. Cache key MUST include: file key, node ID, requested depth, version (if pinned), and relevant fetch flags.

- **FR-015**: System MUST support selective expansion of child nodes when normalization detects ambiguity or truncation. Expansion triggers include: many descendants, incomplete layout container children, text nodes needing deeper inspection, component instances needing referenced metadata, vector/icon nodes needing export data, image fills needing extraction, and incomplete variable binding context.

### Non-Functional Requirements

- **NF-001**: Normalized output MUST be significantly smaller than raw Figma JSON input (target: >50% reduction in token count for typical frames).

- **NF-002**: Output MUST be deterministic — identical inputs MUST produce identical outputs (stable, diffable).

- **NF-003**: Every normalization heuristic MUST be implemented as an isolated pure function with unit tests.

- **NF-004**: System MUST handle API errors gracefully: auth failure, file/node not found, rate limiting, render failure, and normalization failure MUST produce typed, actionable errors.

- **NF-005**: System MUST be structured as a library + CLI, not a single script. Core logic MUST be importable for future MCP wrapper.

- **NF-006**: System MUST use minimal dependencies: TypeScript, Zod, native fetch/undici, commander/yargs, p-limit, vitest.

### Success Metrics / Signals

- **Adoption**: Agent can implement a typical UI frame from `context.md` + `normalized-node.json` + `frame.png` without needing raw Figma JSON.
- **Quality**: Normalization heuristics produce `high` confidence for >80% of nodes in typical design frames.
- **Efficiency**: Normalized output is >50% smaller than raw input in token count.

## 4. Solution Outline

- **User Experience / Outcomes**: Single CLI command transforms a Figma URL into an agent-ready artifact bundle. The `context.md` file serves as the primary orientation artifact; normalized JSON provides detailed structural truth; PNG provides visual validation backstop.
- **Data & Contracts**: See brief §§ Critical data model, Classification model, Role inference, Layout normalization, Appearance normalization, Text normalization, Component normalization, Variable normalization, Asset normalization, Outline format, Manifest.

## 5. Behaviour & Scenarios

- **Primary Flows**:
  1. Parse URL → validate → extract fileKey + nodeId
  2. Authenticate → build headers
  3. Fetch node JSON (depth-limited) + fetch PNG (parallel)
  4. Optionally fetch SVG
  5. Build sparse outline from JSON
  6. Normalize root + immediate descendants
  7. Evaluate expansion triggers → selectively refetch children if needed
  8. Extract tokens/variables
  9. Classify assets
  10. Generate context.md
  11. Write artifact bundle + manifest

- **Error Handling / Guards**:
  - Invalid URL → exit with precise parse error
  - Auth failure → exit with auth error
  - Node not found → exit with not-found error
  - Rate limit → retry with backoff
  - Render failure → continue, record in manifest
  - Partial normalization failure → preserve best-effort parent, record diagnostics

## 6. Quality & Verification

- **Testing Strategy**:
  - Unit tests: URL parsing, layout mapping, role inference, text normalization, component extraction, token binding extraction, asset classification, outline generation
  - Fixture tests: raw Figma JSON fixtures for representative UI patterns (card, form, table row, nav bar, modal, icon button, marketing block, component instance, token-bound theme)
  - Golden tests: raw input → expected normalized JSON + outline XML + context.md
  - Normalization layer developed like a compiler pass with snapshot tests

- **Observability & Analysis**: Debug mode (`--debug`) emits `logs/fetch-metadata.json` with request/response metadata.

## 7. Backlog Hooks & Dependencies

- **Related Specs / PROD**: Future TECH assembly spec to be created for system architecture.
- **Risks & Mitigations**:
  - Figma API rate limiting → caching + p-limit concurrency control
  - Heuristic inaccuracy → conservative defaults + diagnostics + confidence scoring
  - Large frames exceeding practical limits → staged retrieval strategy
- **Known Gaps / Debt**: MCP wrapper deferred to future phase.
- **Open Decisions / Questions**:
  - Exact thresholds for expansion triggers (child count, vector complexity)
  - OAuth support timeline and requirements
