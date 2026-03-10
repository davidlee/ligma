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
  - Variables REST API requires Enterprise full-seat access; v1 does not depend on it
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
    - PROD-001.FR-016
    - PROD-001.FR-017
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

  - id: token-summary
    name: Used-token summary
    responsibilities:
      - Aggregate variable/token references encountered during normalization
      - Aggregate style references encountered during normalization
      - Emit a scoped summary artifact (not a file-level inventory)
    requirements:
      - PROD-001.FR-016
    summary: >-
      Collect and deduplicate token/variable and style references encountered
      while normalizing the selected node subtree. Output is scoped to what
      was seen, not a full file inventory.
    success_criteria:
      - All encountered variable bindings appear in summary
      - Summary correctly scoped (isFullInventory: false)
      - Null-safe for missing token names/collections

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
      - Include structural summary, tokens used, assets, implementation notes
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
      structural data, token summary, and optional asset exports.
    success_criteria:
      - Output directory structure matches specification
      - Manifest accurately describes all produced artifacts

  - id: error-handling
    name: Typed error hierarchy
    responsibilities:
      - Define typed error classes for all failure modes
      - Ensure partial failures preserve best-effort output
    requirements:
      - PROD-001.FR-017
    summary: >-
      Provide a shared typed error hierarchy used across all modules.
      Each error type carries actionable context. Partial failures
      preserve output with diagnostics rather than aborting.
    success_criteria:
      - Every documented failure mode has a typed error class
      - Partial failures produce diagnostics, not crashes

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
      - Expansion triggers are configurable and testable
```

```yaml supekku:verification.coverage@v1
schema: supekku.verification.coverage
version: 1
subject: PROD-001
entries:
  - artefact: VT-001
    kind: VT
    requirement: PROD-001.FR-001
    status: verified
    notes: URL parsing — 13 tests in tests/figma/url.test.ts (DE-002)
  - artefact: VT-003
    kind: VT
    requirement: PROD-001.FR-002
    status: verified
    notes: Node subtree fetch — 9 tests in tests/figma/fetch-node.test.ts (DE-002)
  - artefact: VT-002
    kind: VT
    requirement: PROD-001.FR-003
    status: verified
    notes: Auth module — 6 tests in tests/figma/auth.test.ts (DE-002)
  - artefact: VT-004
    kind: VT
    requirement: PROD-001.FR-004
    status: verified
    notes: Image export (two-step) — 9 tests in tests/figma/fetch-image.test.ts (DE-002)
  - artefact: VT-006
    kind: VT
    requirement: PROD-001.FR-013
    status: verified
    notes: Manifest + directory writer — 28 tests across 3 suites (DE-002)
  - artefact: VT-005
    kind: VT
    requirement: PROD-001.FR-017
    status: verified
    notes: Error hierarchy — 32 tests in tests/errors.test.ts (DE-002)
  - artefact: VT-005
    kind: VT
    requirement: PROD-001.NF-004
    status: verified
    notes: Graceful error handling via typed hierarchy + partial failure recovery (DE-002)
  - artefact: VT-007
    kind: VT
    requirement: PROD-001.NF-005
    status: verified
    notes: Library + CLI architecture — orchestrate/writeOutput split (DE-002)
  - artefact: VT-007
    kind: VT
    requirement: PROD-001.NF-006
    status: verified
    notes: Minimal deps — commander, p-limit, zod only (DE-002)
  - artefact: VT-012
    kind: VT
    requirement: PROD-001.FR-005
    status: verified
    notes: Normalized model — recursive tree, hierarchy, diagnostics. 26 tests in tests/normalize/node.test.ts (DE-003)
  - artefact: VT-008
    kind: VT
    requirement: PROD-001.FR-006
    status: verified
    notes: Type classification — 30 tests in tests/normalize/classify.test.ts (DE-003)
  - artefact: VT-009
    kind: VT
    requirement: PROD-001.FR-008
    status: verified
    notes: Layout normalization — 36 tests in tests/normalize/layout.test.ts (DE-003)
  - artefact: VT-011
    kind: VT
    requirement: PROD-001.FR-009
    status: verified
    notes: Text normalization — 29 tests in tests/normalize/text.test.ts (DE-003)
  - artefact: VT-013
    kind: VT
    requirement: PROD-001.NF-001
    status: verified
    notes: Representation efficiency (RE-002) — fixed field set + size ≤2.0x raw. 2 tests in tests/normalize/node.test.ts (DE-003)
  - artefact: VT-010
    kind: VT
    requirement: PROD-001.NF-003
    status: verified
    notes: Pure function heuristics — all extractors isolated and tested independently. 95 tests across layout/appearance/text suites (DE-003)
  - artefact: VT-017
    kind: VT
    requirement: PROD-001.FR-007
    status: verified
    notes: Role inference — 13-rule priority chain. 39 tests in tests/normalize/infer/role.test.ts (DE-004)
  - artefact: VT-015
    kind: VT
    requirement: PROD-001.FR-010
    status: verified
    notes: Per-node variable/token binding extraction — 27 tests in tests/normalize/variables.test.ts (DE-004)
  - artefact: VT-022
    kind: VT
    requirement: PROD-001.FR-016
    status: verified
    notes: Used-token summary aggregation — 21 tests in tests/summary/tokens-used.test.ts (DE-004)
```

## 1. Intent & Summary

- **Problem / Purpose**: Code-generation agents need structured, implementation-oriented design context from Figma. Raw Figma JSON is too noisy, too large, and not shaped for the questions agents actually ask (what is this, how is it laid out, what's reusable, what's a token vs literal). This tool bridges the gap.
- **Value Signals**: An agent can implement a typical UI frame from `context.md` + `normalized-node.json` + `frame.png` without needing raw Figma JSON.
- **Guiding Principles**: Structural truth is the product. Visual truth is mandatory. Sparse first, detailed second. Output shaped for implementation, not archival. Determinism over cleverness.
- **Change History**: Initial specification from `docs/brief.md`. Patch-01: token inventory descoped to used-token summary; expansion triggers made configurable; error hierarchy promoted to FR; opacity deduplication. RE-002: NF-001 revised — replaced unrealistic ">50% size reduction" with two-part efficiency metric (schema simplification + 2.0x size ceiling). RE-004: FR-007 expanded with 8 concrete heuristic sub-requirements (container, stack, text semantic, button-like, input-like, icon, export-worthy asset, noise reduction), confidence indicator, and provenance trail (driven by DR-004/DE-004).

## 2. Stakeholders & Journeys

- **Personas / Actors**:
  - *Agent operator*: Developer using Claude Code (or similar) to implement UI from Figma designs. Needs compact, trustworthy design context without manual Figma inspection.
  - *Code agent*: Claude Code or equivalent. Needs deterministic, token-efficient, implementation-oriented artifacts.

- **Primary Journeys / Flows**:
  1. Operator copies Figma node URL from design file
  2. Runs `figma-fetch "<url>" --token "$FIGMA_TOKEN" --out ./artifacts`
  3. CLI parses URL, fetches node subtree + PNG render
  4. Normalization layer transforms raw JSON → compact structural representation
  5. Pipeline emits artifact bundle: `context.md`, normalized JSON, outline, visual refs, used-token summary, manifest
  6. Agent consumes `context.md` as entrypoint, references normalized JSON and PNG for implementation

- **Edge Cases & Non-goals**:
  - Writing back to Figma: out of scope
  - Full-file ingestion by default: out of scope
  - Generalized conversational design exploration: out of scope
  - Full-fidelity vector reconstruction: out of scope
  - Design generation, Code Connect, plugin authoring: out of scope
  - Image processing beyond download/export: out of scope
  - Full file-level token/variable inventory (requires Variables API, Enterprise access): explicitly out of scope for v1. Future enhancement.
  - Full file-level style inventory: out of scope for v1. Local style metadata from file JSON may be used opportunistically but is not a v1 deliverable.

## 3. Responsibilities & Requirements

### Capability Overview

See `supekku:spec.capabilities@v1` block above for structured capability definitions.

### Functional Requirements

- **FR-001**: System MUST parse Figma URLs containing file key and node-id, extracting `fileKey`, `nodeId`, and `originalUrl`. Node IDs in URL format (`123-456`) MUST be normalized to API format (`123:456`). Invalid URLs MUST produce precise error messages.

- **FR-002**: System MUST fetch node subtree JSON via `GET /v1/files/:key/nodes?ids=:nodeId` with configurable depth (default: 2), optional `geometry=paths`, and optional plugin data inclusion.

- **FR-003**: System MUST authenticate via `X-Figma-Token` header using personal access token. Auth module MUST be designed so OAuth support can be added later without changing the core fetch pipeline.

- **FR-004**: System MUST export a PNG render of the target node via `GET /v1/images/:key?ids=:nodeId&format=png&scale=2`. SVG export MUST be available as an option. If image export fails but JSON fetch succeeds, the pipeline MUST continue and record the render failure in the manifest.

- **FR-005**: System MUST normalize raw Figma JSON into a compact, recursively structured, implementation-oriented representation. The normalized model MUST include: id, name, type classification, role inference, visibility, bounds, hierarchy metadata, layout, appearance, text, component info, variable bindings, asset info, semantic flags, children, and diagnostics. Opacity MUST be represented only in the appearance sub-object, not duplicated at the node level.

- **FR-006**: System MUST classify Figma node types into a reduced implementation-relevant type set: `document`, `page`, `frame`, `group`, `component`, `instance`, `variant-set`, `text`, `shape`, `vector`, `image`, `line`, `boolean-operation`, `mask`, `section`, `unknown`.

- **FR-007**: System MUST infer UI semantic roles from node properties. Role vocabulary: `screen`, `container`, `stack`, `grid`, `card`, `button`, `icon-button`, `label`, `heading`, `body-text`, `input`, `image`, `icon`, `divider`, `badge`, `avatar`, `list`, `list-item`, `modal`, `navigation`, `unknown`. Inference MUST be conservative — prefer `unknown` over overconfident guesses. Each inference MUST include a confidence indicator and provenance trail (which signals contributed to the decision).

  Required heuristic rules:

  1. **Container detection**: Frame, group, component, or instance with children, nontrivial bounds, and evidence of layout or padding. Distinguishes structural containers from leaf frames.
  2. **Stack detection**: Auto-layout node with children along one axis and meaningful gap or padding. Signals `stack` (single-axis) or `grid` (multi-axis / wrap).
  3. **Text semantic inference**: Infer `heading`, `label`, `body`, `caption`, or `button` from font size, weight, text length, node name, and parent context (e.g., large bold short text near top of a container → `heading`).
  4. **Button-like detection**: Instance, component, or frame with one short text child, fixed or hug sizing, padded auto-layout, visible fill, and button-suggestive naming. Signals `button` or `icon-button` (if icon child present instead of / alongside text).
  5. **Input-like detection**: Rectangular node with width > height, border or fill, label-adjacent text region, and input-suggestive naming. Signals `input`.
  6. **Icon detection**: Small vector group with square-ish aspect ratio, no text children, and simple or icon-suggestive naming. Signals `icon`.
  7. **Export-worthy asset detection**: Nodes with image fills, vector complexity above a threshold, illustration-suggestive naming, or complex boolean operations. Signals `image` role (for raster) or asset classification metadata.
  8. **Noise reduction**: Collapse invisible nodes (unless structurally important), zero-size nodes, decorative micro-layers, and deeply nested wrappers with no distinct semantics. These nodes SHOULD receive `unknown` role with a diagnostic noting the noise classification.

  Each heuristic MUST be an isolated pure function (NF-003). Heuristics MUST NOT throw — uncertain inference produces `unknown` role with diagnostic warnings.

- **FR-008**: System MUST normalize layout properties into implementation-facing terms: mode (none/horizontal/vertical/absolute), sizing (fixed/fill/hug/unknown per axis), alignment (main/cross), padding, gap, wrap, constraints, position, and clip behavior.

- **FR-009**: System MUST normalize text nodes to include: content, style (font family/weight/size/line-height/letter-spacing/case/alignment), color, token references, semantic kind (heading/label/body/caption/button/unknown), and truncation settings.

- **FR-010**: System MUST extract and normalize per-node variable/token bindings from `boundVariables` and `explicitVariableModes` in the node JSON, distinguishing literal values from variable-bound values. Where possible, expose both resolved literal value and token reference (e.g., `color: "#FFFFFF"` + `tokenRef: "color.bg.surface"`). This is per-node extraction only — file-level variable inventory is out of scope for v1.

- **FR-011**: System MUST generate sparse outlines in both JSON and XML formats. Outlines MUST include: id, name, type, role, visibility, bounds, child count, and children. The XML outline MUST be compact and human-readable.

- **FR-012**: System MUST generate a `context.md` file as the primary agent entrypoint, containing: source metadata, visual reference path, structural summary, important children list, tokens used, assets, and implementation notes.

- **FR-013**: System MUST emit all artifacts to a structured output directory with subdirectories: `visual/`, `structure/`, `tokens/`, `assets/`, `logs/`. The `tokens/` directory MUST contain a single `tokens-used.json` file (see FR-016). A machine-readable `manifest.json` MUST describe all produced artifacts.

- **FR-014**: System MUST implement file-based caching under `.cache/figma-fetch`. Cache key MUST include: file key, node ID, requested depth, version (if pinned), and relevant fetch flags. Caching is a day-one requirement, not optional quality-of-life.

- **FR-015**: System MUST support selective expansion of child nodes when normalization detects ambiguity or truncation. Expansion triggers MUST be configurable with documented default thresholds. Triggers include: child count exceeding threshold, incomplete layout container children, text nodes needing deeper inspection, component instances needing referenced metadata, vector/icon nodes needing export data, image fills needing extraction, and incomplete variable binding context. The requirement is testable by verifying that triggers are configurable and that defaults are documented.

- **FR-016**: System MUST emit a `tokens-used.json` artifact containing a best-effort aggregation of variable and style references encountered during normalization of the selected node subtree. This is NOT a full file-level inventory. The artifact MUST include: scope metadata (fileKey, rootNodeId, `isFullInventory: false`), deduplicated variable references with token ID, name (nullable), collection ID, resolved type, and encountered-on locations, style references with type, ID, name, and encountered-on locations, and a count summary by category (colors, typography, spacing). Fields that cannot be resolved without the Variables API (token name, collection name, resolved values by mode) MUST accept null.

- **FR-017**: System MUST implement a typed error hierarchy shared across all modules. Error types MUST include: `FigmaUrlParseError`, `FigmaAuthError`, `FigmaNotFoundError`, `FigmaRateLimitError`, `FigmaRenderError`, `NormalizationError`. Each error MUST carry actionable context. Partial failures (e.g., render failure, subtree normalization failure) MUST preserve best-effort output with diagnostics rather than aborting the pipeline.

### Non-Functional Requirements

- **NF-001**: Normalized representation efficiency. The normalized schema MUST materially simplify the raw node surface by exposing a smaller, fixed, implementation-oriented top-level field set than typical raw Figma nodes. Total normalized output size, measured as `JSON.stringify` length without pretty-printing, MUST NOT exceed 2.0x the corresponding raw input size on representative fixtures. Size ratio SHOULD be tracked across fixtures to catch regressions, but semantic clarity and implementation utility take precedence over raw byte reduction. *(Revised by RE-002: original ">50% reduction" target was empirically unreachable given intentional structural metadata additions.)*

- **NF-002**: Output MUST be deterministic — identical inputs MUST produce identical outputs (stable, diffable).

- **NF-003**: Every normalization heuristic MUST be implemented as an isolated pure function with unit tests.

- **NF-004**: System MUST handle API errors gracefully: auth failure, file/node not found, rate limiting, render failure, and normalization failure MUST produce typed, actionable errors via the FR-017 error hierarchy.

- **NF-005**: System MUST be structured as a library + CLI, not a single script. Core logic MUST be importable for future MCP wrapper.

- **NF-006**: System MUST use minimal dependencies: TypeScript, Zod, native fetch/undici, commander/yargs, p-limit, vitest.

### Success Metrics / Signals

- **Adoption**: Agent can implement a typical UI frame from `context.md` + `normalized-node.json` + `frame.png` without needing raw Figma JSON.
- **Quality**: Normalization heuristics produce `high` confidence for >80% of nodes in typical design frames.
- **Efficiency**: Normalized output does not exceed 2.0x raw input size (`JSON.stringify` length) on representative fixtures; normalized schema exposes a smaller fixed field set than raw nodes.

## 4. Solution Outline

- **User Experience / Outcomes**: Single CLI command transforms a Figma URL into an agent-ready artifact bundle. The `context.md` file serves as the primary orientation artifact; normalized JSON provides detailed structural truth; PNG provides visual validation backstop.
- **Data & Contracts**: See brief §§ Critical data model, Classification model, Role inference, Layout normalization, Appearance normalization, Text normalization, Component normalization, Variable normalization, Asset normalization, Outline format, Manifest. Note: `NormalizedNode.opacity` removed from top-level — opacity lives in `NormalizedAppearance` only.

### Expected output directory (v1)

```text
artifacts/
  manifest.json
  context.md
  visual/
    frame.png
    frame.svg            # optional
  structure/
    raw-node.json
    normalized-node.json
    outline.xml
    outline.json
  tokens/
    tokens-used.json     # scoped to fetched subtree, not file-level
  assets/
    ...
  logs/
    fetch-metadata.json  # optional debug
```

## 5. Behaviour & Scenarios

- **Primary Flows**:
  1. Parse URL → validate → extract fileKey + nodeId
  2. Authenticate → build headers
  3. Fetch node JSON (depth-limited) + fetch PNG (parallel)
  4. Optionally fetch SVG
  5. Build sparse outline from JSON
  6. Normalize root + immediate descendants
  7. Evaluate expansion triggers → selectively refetch children if needed
  8. Extract per-node token/variable bindings
  9. Aggregate encountered tokens into used-token summary
  10. Classify assets
  11. Generate context.md
  12. Write artifact bundle + manifest

- **Error Handling / Guards**:
  - Invalid URL → exit with `FigmaUrlParseError`
  - Auth failure → exit with `FigmaAuthError`
  - Node not found → exit with `FigmaNotFoundError`
  - Rate limit → retry with backoff, then `FigmaRateLimitError`
  - Render failure → continue, record in manifest via `FigmaRenderError`
  - Partial normalization failure → preserve best-effort parent, record `NormalizationError` diagnostics

## 6. Quality & Verification

- **Testing Strategy**:
  - Unit tests: URL parsing, layout mapping, role inference, text normalization, component extraction, token binding extraction, asset classification, outline generation, used-token aggregation
  - Fixture tests: raw Figma JSON fixtures for representative UI patterns (card, form, table row, nav bar, modal, icon button, marketing block, component instance, token-bound theme)
  - Golden tests: raw input → expected normalized JSON + outline XML + context.md + tokens-used.json
  - Normalization layer developed like a compiler pass with snapshot tests

- **Observability & Analysis**: Debug mode (`--debug`) emits `logs/fetch-metadata.json` with request/response metadata.

## 7. Backlog Hooks & Dependencies

- **Related Specs / PROD**: SPEC-001 (tech assembly spec).
- **Risks & Mitigations**:
  - Figma API rate limiting → caching + p-limit concurrency control
  - Heuristic inaccuracy → conservative defaults + diagnostics + confidence scoring
  - Large frames exceeding practical limits → staged retrieval strategy
- **Known Gaps / Debt**:
  - MCP wrapper deferred to future phase
  - Full file-level variable inventory (requires Variables API, Enterprise access) deferred
  - Full file-level style inventory deferred
- **Open Decisions / Questions**:
  - Default thresholds for expansion triggers (to be determined during DE-006 implementation)
  - OAuth support timeline and requirements
