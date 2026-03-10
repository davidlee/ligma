# Technical brief: Figma fetch + normalization pipeline for agent-friendly design context

## Purpose

Build a small TypeScript CLI that takes a Figma URL and API token, fetches the selected node and required related data via the Figma REST API, and emits a deterministic artifact bundle optimized for code agents.

The main value is **not** raw retrieval. It is the **normalization layer** that converts noisy Figma JSON into a compact, legible, implementation-oriented representation of structural truth.

The CLI is the primary interface. A thin MCP wrapper may be added later for Claude Desktop, but only as a transport layer over the same core library.

Figma’s REST API supports exactly the primitives needed here: scoped file/node JSON retrieval using `ids`, optional shallow traversal using `depth`, optional vector export data via `geometry=paths`, and rendered images or SVGs for specific nodes. Figma’s own MCP implementation guidance also follows the same pattern: parse URL, fetch structured design context, fetch a screenshot, and fall back to sparse metadata plus targeted child fetches when responses are too large. ([developers.figma.com][1])

---

## Product goal

Given a Figma node URL, emit:

* one visual reference artifact,
* one normalized structural artifact,
* one sparse outline artifact,
* optional asset exports,
* one small markdown context file intended for direct agent consumption.

The output should be stable, deterministic, diffable, and token-efficient.

---

## Non-goals

Do not build a full replacement for the Figma MCP server.

Specifically out of scope for v1:

* writing back to Figma,
* generalized conversational design exploration across many nodes,
* full-fidelity vector reconstruction for every node,
* design generation,
* Code Connect integration,
* plugin authoring,
* image processing beyond download/export,
* full-file ingestion by default.

---

## Core design principles

### 1. Structural truth is the product

The system exists to help agents reliably infer:

* hierarchy,
* layout,
* text semantics,
* component boundaries,
* reusable assets,
* design-token bindings,
* implementation-relevant styling.

Raw Figma JSON is an input format, not a useful output format.

### 2. Visual truth is mandatory

Every fetch must produce a screenshot or render of the target node, because structural interpretation needs a visual backstop. Figma’s own implementation workflow treats the screenshot as the source of truth for validation. ([Figma Developer Docs][2])

### 3. Sparse first, detailed second

Large or deeply nested frames should be handled with a staged retrieval strategy:

* shallow fetch,
* outline generation,
* targeted expansion of relevant children.

This mirrors Figma MCP’s documented fallback when full design context is too large. ([Figma Developer Docs][2])

### 4. Output should be shaped for implementation, not archival

Prefer compact, opinionated schemas over exhaustive mirroring of the REST API.

### 5. Determinism over cleverness

Heuristics are acceptable; opaque inference is not. Every normalization rule should be explicit, testable, and stable.

---

## User-facing CLI contract

```bash
figma-fetch "<figma-url>" --token "$FIGMA_TOKEN" --out ./artifacts
```

Optional flags:

```bash
--format json
--depth 2
--include-geometry
--include-plugin-data shared
--include-svg
--include-assets
--debug
```

### Expected output directory

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
    variables.json
    colors.json
    typography.json
    spacing.json
  assets/
    ...
  logs/
    fetch-metadata.json  # optional debug
```

---

## Input handling

### Supported input

A Figma URL containing:

* file key
* node ID

Examples:

* `https://www.figma.com/design/:fileKey/:fileName?node-id=123-456`
* equivalent share URLs that still contain `node-id`

Figma’s docs confirm the URL shape and that the file key and node ID can be parsed directly from it. ([Figma Developer Docs][1])

### URL parsing requirements

Implement a dedicated parser that returns:

```ts
type ParsedFigmaUrl = {
  fileKey: string
  nodeId: string
  originalUrl: string
}
```

Normalization rule:

* convert `123-456` from URL form into `123:456` for API requests where required.

If URL parsing fails, exit with a precise error.

---

## Retrieval strategy

## Phase 1: initial fetch

For the selected node:

1. Fetch node subtree JSON.
2. Fetch rendered PNG.
3. Optionally fetch SVG if the root appears vector-friendly.
4. Build sparse outline from returned JSON.
5. Normalize root and immediate descendants.
6. Decide whether deeper expansion is needed.

### Preferred endpoint choices

Use:

* `GET /v1/files/:key/nodes?ids=:nodeId`
* `GET /v1/images/:key?ids=:nodeId&format=png&scale=2`

The nodes endpoint is the most direct fit for selected-node retrieval. It supports `depth`, `geometry=paths`, and plugin data inclusion. The image endpoint supports PNG/SVG/PDF/JPG exports, scaling, and SVG metadata options such as including element IDs or node IDs. ([Figma Developer Docs][1])

### Initial fetch defaults

For first pass:

* `depth=2` by default,
* no `geometry=paths`,
* no plugin data unless explicitly requested,
* `format=png`,
* `scale=2`.

Rationale:

* keep payload small,
* get enough hierarchy for structural inference,
* avoid vector noise unless needed.

## Phase 2: targeted expansion

If normalization detects ambiguity or truncation risk, refetch specific child nodes selectively.

Expansion triggers:

* node has many descendants,
* important layout container has incomplete child information,
* text nodes require deeper inspection,
* component instances require referenced component metadata,
* vector/icon nodes need better export data,
* image fills need extraction,
* variable bindings exist but context is incomplete.

This follows the same basic idea as Figma MCP’s “metadata first, then child node fetches” fallback. ([Figma Developer Docs][2])

---

## Authentication

Support personal access token via:

* `X-Figma-Token` header

Design auth so it can later support OAuth without changing the core fetch pipeline.

Auth module contract:

```ts
type FigmaAuth = {
  token: string
  header(): Record<string, string>
}
```

---

## Project structure

```text
src/
  cli.ts
  config.ts
  errors.ts

  figma/
    auth.ts
    client.ts
    url.ts
    endpoints.ts
    fetch-node.ts
    fetch-image.ts
    fetch-assets.ts
    types-raw.ts

  normalize/
    index.ts
    classify.ts
    node.ts
    layout.ts
    style.ts
    text.ts
    components.ts
    variables.ts
    assets.ts
    outline.ts
    heuristics.ts

  output/
    manifest.ts
    context-md.ts
    write.ts

  schemas/
    raw.ts
    normalized.ts
    outline.ts
    manifest.ts

  util/
    fs.ts
    hash.ts
    log.ts
    retry.ts
```

---

## Recommended stack

* TypeScript
* Zod
* native `fetch` or `undici`
* `commander` or `yargs`
* `p-limit`
* `tsx` for local dev
* `vitest`

Do not add heavy framework dependencies.

---

## Critical data model: normalized structural representation

This is the most important part of the system.

The normalized model should be:

* much smaller than raw Figma JSON,
* recursively structured,
* implementation-oriented,
* explicit about uncertainty.

## Top-level shape

```ts
type NormalizedNode = {
  id: string
  name: string
  type: NormalizedNodeType
  role: NormalizedRole | null
  visible: boolean

  bounds: Bounds | null
  rotation: number | null
  opacity: number | null

  hierarchy: {
    parentId: string | null
    depth: number
    childCount: number
    path: string[]
  }

  layout: NormalizedLayout | null
  appearance: NormalizedAppearance | null
  text: NormalizedText | null
  component: NormalizedComponentInfo | null
  variables: NormalizedVariableBindings | null
  asset: NormalizedAssetInfo | null

  semantics: {
    likelyInteractive: boolean
    likelyTextInput: boolean
    likelyIcon: boolean
    likelyImage: boolean
    likelyMask: boolean
    likelyReusableComponent: boolean
  }

  children: NormalizedNode[]

  diagnostics: {
    sourceNodeType: string
    omittedFields: string[]
    warnings: string[]
    confidence: "high" | "medium" | "low"
  }
}
```

---

## Normalization goals

The normalization layer must answer the questions an agent actually has:

* What is this thing?
* How is it laid out?
* What are its children?
* Which nodes matter for implementation?
* Which values are literal versus token-bound?
* What can be ignored safely?
* What should become an asset versus code?

---

## Classification model

Map Figma node types into a smaller working set.

Example:

```ts
type NormalizedNodeType =
  | "document"
  | "page"
  | "frame"
  | "group"
  | "component"
  | "instance"
  | "variant-set"
  | "text"
  | "shape"
  | "vector"
  | "image"
  | "line"
  | "boolean-operation"
  | "mask"
  | "section"
  | "unknown"
```

Use raw Figma node `type` as input, but normalize to categories that matter for implementation.

---

## Role inference

Agents care about likely UI semantics more than literal Figma layer labels.

Infer a best-effort role:

```ts
type NormalizedRole =
  | "screen"
  | "container"
  | "stack"
  | "grid"
  | "card"
  | "button"
  | "icon-button"
  | "label"
  | "heading"
  | "body-text"
  | "input"
  | "image"
  | "icon"
  | "divider"
  | "badge"
  | "avatar"
  | "list"
  | "list-item"
  | "modal"
  | "navigation"
  | "unknown"
```

Inference sources:

* node type,
* name,
* text content,
* auto-layout configuration,
* dimensions,
* child structure,
* component metadata.

Rules should be conservative. Prefer `unknown` over overconfident bad guesses.

---

## Layout normalization

Layout is the highest-value extraction.

Represent only implementation-relevant properties.

```ts
type NormalizedLayout = {
  mode: "none" | "horizontal" | "vertical" | "absolute"
  sizing: {
    horizontal: "fixed" | "fill" | "hug" | "unknown"
    vertical: "fixed" | "fill" | "hug" | "unknown"
  }
  align: {
    main: "start" | "center" | "end" | "space-between" | "unknown"
    cross: "start" | "center" | "end" | "stretch" | "baseline" | "unknown"
  }
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  } | null
  gap: number | null
  wrap: boolean | null
  constraints: {
    horizontal: string | null
    vertical: string | null
  } | null
  position: {
    x: number
    y: number
    positioning: "flow" | "absolute"
  } | null
  clipsContent: boolean | null
}
```

### Layout normalization rules

Translate Figma-specific concepts into implementation-facing terms:

* auto layout horizontal → `mode: "horizontal"`
* auto layout vertical → `mode: "vertical"`
* no auto layout and positioned children → `mode: "absolute"`
* Figma hug/fill/fixed semantics → explicit sizing enum
* collapse redundant defaults where possible

Important: retain raw-to-normalized traceability in diagnostics for debugging.

---

## Appearance normalization

Only include appearance fields that materially affect implementation.

```ts
type NormalizedAppearance = {
  fills: NormalizedPaint[]
  strokes: NormalizedStroke[]
  cornerRadius: CornerRadius | null
  effects: NormalizedEffect[]
  blendMode: string | null
  opacity: number | null
}
```

### Paint normalization

Each fill/stroke should distinguish:

* solid literal,
* gradient,
* image fill,
* token-bound value.

```ts
type NormalizedPaint = {
  kind: "solid" | "gradient" | "image" | "video" | "unknown"
  visible: boolean
  color: string | null
  opacity: number | null
  tokenRef: string | null
  imageRef: string | null
}
```

Do not carry every raw paint property through unless needed.

---

## Text normalization

Text nodes should be flattened into a highly legible representation.

```ts
type NormalizedText = {
  content: string
  charactersLength: number
  style: {
    fontFamily: string | null
    fontWeight: number | null
    fontSize: number | null
    lineHeight: string | number | null
    letterSpacing: string | number | null
    textCase: string | null
    textAlignHorizontal: string | null
    textAlignVertical: string | null
  }
  color: string | null
  tokenRefs: string[]
  semanticKind: "heading" | "label" | "body" | "caption" | "button" | "unknown"
  truncation: {
    maxLines: number | null
    ellipsis: boolean | null
  } | null
}
```

### Text-specific rules

* preserve actual text content,
* strip irrelevant raw text metadata,
* identify typography token references where possible,
* infer semantic kind conservatively from size, weight, name, and context.

---

## Component and instance normalization

Figma exposes component mappings and component-related metadata in file responses, and nodes also expose `componentPropertyReferences`. That should be surfaced directly because it is high-value implementation context. ([Figma Developer Docs][1])

```ts
type NormalizedComponentInfo = {
  kind: "none" | "component" | "instance" | "component-set"
  componentId: string | null
  componentName: string | null
  componentSetId: string | null
  variantProperties: Record<string, string>
  propertyReferences: Record<string, string>
  isExposedToAgentAsReusable: boolean
}
```

### Goals

Help the agent answer:

* is this a reusable component?
* is this an instance of an existing component?
* what variant dimensions matter?
* should this be implemented using an existing local component?

---

## Variable and token normalization

Figma nodes expose `boundVariables`, `explicitVariableModes`, and plugin/shared plugin data when requested. These fields are core to the output because they distinguish literal styling from token-driven styling. ([Figma Developer Docs][3])

```ts
type NormalizedVariableBindings = {
  bindings: Array<{
    field: string
    tokenId: string
    tokenName: string | null
    collectionId: string | null
    modeId: string | null
    resolvedType: "color" | "number" | "string" | "boolean" | "unknown"
  }>
  explicitModes: Record<string, string>
}
```

### Rules

* always distinguish literal values from variable-bound values,
* where possible, expose both:

  * resolved literal value,
  * token reference.

Example:

```json
{
  "fills": [
    {
      "kind": "solid",
      "color": "#FFFFFF",
      "tokenRef": "color.bg.surface"
    }
  ]
}
```

This is much more useful than raw alias objects.

---

## Asset normalization

Agents need clear answers about whether a thing should be code or asset.

```ts
type NormalizedAssetInfo = {
  kind: "none" | "svg" | "bitmap" | "mixed"
  exportSuggested: boolean
  reason: string | null
  exportNodeIds: string[]
  imageRefs: string[]
}
```

### Asset classification rules

Mark as likely asset when:

* image fill is present,
* vector complexity exceeds threshold,
* node is named like icon/logo/illustration,
* boolean/vector composition is unlikely to be worth reconstructing in code.

Do not overfit. The goal is “reasonable default export advice.”

---

## Sparse outline format

The outline is the cheap navigation layer.

Emit both JSON and XML.

### JSON outline

```ts
type OutlineNode = {
  id: string
  name: string
  type: string
  role: string | null
  visible: boolean
  bounds: Bounds | null
  childCount: number
  children?: OutlineNode[]
}
```

### XML outline example

```xml
<frame id="123:456" name="Login Card" role="card" w="320" h="240">
  <text id="123:457" name="Title" role="heading" />
  <frame id="123:458" name="Form Fields" role="stack" />
  <instance id="123:459" name="Primary Button" role="button" />
</frame>
```

The outline exists so an agent can decide what to expand without reading full normalized JSON.

---

## Manifest

Emit a machine-readable manifest describing produced artifacts.

```ts
type Manifest = {
  source: {
    fileKey: string
    nodeId: string
    fileName?: string
    version?: string
    lastModified?: string
  }
  outputs: {
    png?: string
    svg?: string
    rawNodeJson: string
    normalizedNodeJson: string
    outlineJson: string
    outlineXml: string
    contextMd: string
    variablesJson?: string
    colorsJson?: string
    typographyJson?: string
    spacingJson?: string
    assets: string[]
  }
}
```

---

## Agent-facing `context.md`

This file is the primary entrypoint for Claude Code.

It should be short, stable, and explicit.

### Required structure

```md
# Figma context

## Source
- File key: ...
- Node ID: ...
- File version: ...

## Visual reference
- PNG: ./visual/frame.png

## Structural summary
- Root type: frame
- Role: card
- Size: 320x240
- Layout: vertical auto-layout
- Padding: 24/24/24/24
- Gap: 16

## Important children
1. Heading text
2. Email input container
3. Primary button instance

## Tokens used
- color.bg.surface
- color.text.primary
- spacing.24
- radius.md

## Assets
- logo.svg
- hero-illustration.png

## Notes for implementation
- Prefer stack layout
- Root appears reusable
- Button is a component instance
- Use exported asset for icon cluster rather than recreating in code
```

Keep this concise. It should summarize, not duplicate the JSON artifacts.

---

## Required normalization heuristics

These heuristics are the heart of the project.

Implement them as isolated pure functions with tests.

## 1. Container detection

A node is likely a container if:

* frame/group/component/instance with children,
* nontrivial bounds,
* layout or padding properties present.

## 2. Stack detection

A node is likely a stack if:

* auto layout exists,
* children are arranged along one axis,
* gap/padding properties are meaningful.

## 3. Text semantic inference

Heuristic inputs:

* font size,
* font weight,
* node name,
* text length,
* parent context.

Example:

* large bold short text near top of card → heading
* small text adjacent to field → label
* text inside button-like instance → button label

## 4. Button-like detection

Signals:

* instance/component/frame,
* one short text child,
* fixed or hug sizing,
* padded auto-layout,
* visible fill,
* name contains button/cta/primary/secondary.

## 5. Input-like detection

Signals:

* label + text region + border/fill,
* rectangular container,
* width > height,
* names like input/field/search/email/password.

## 6. Icon detection

Signals:

* small vector group,
* square-ish bounds,
* no text,
* simple naming.

## 7. Export-worthy asset detection

Signals:

* image fills,
* many vector descendants,
* masks,
* illustration-like names,
* complex boolean operations.

## 8. Ignore-noise rules

Collapse or de-emphasize:

* invisible nodes unless structurally important,
* zero-size nodes,
* decorative micro-layers that don’t affect implementation decisions,
* deeply nested wrappers with no distinct style/layout semantics.

Do not fully delete noisy nodes from raw output. Instead mark them as low-priority or omit from normalized children with diagnostics.

---

## Diagnostics and debuggability

Every normalized node should preserve enough provenance to debug bad inferences.

Include:

* source node type,
* omitted raw fields,
* warnings,
* confidence score.

Examples:

* `"warning": "vector-heavy node simplified as asset candidate"`
* `"warning": "layout inferred from child bounds; no explicit auto-layout metadata"`
* `"confidence": "medium"`

This matters because heuristic systems will be wrong sometimes, and the operator needs to see why.

---

## Error handling

Return explicit, typed errors for:

* invalid Figma URL,
* missing node ID,
* auth failure,
* file not found,
* node not found,
* null node response,
* render failure,
* rate limit,
* unsupported node shape,
* normalization failure.

If image export fails but JSON fetch succeeds, continue and mark render failure in manifest.

If normalization partially fails for a subtree, preserve best-effort parent output and record subtree diagnostics.

---

## Caching

Add simple local caching from day one.

Cache key should include:

* file key,
* node ID,
* requested depth,
* version if pinned,
* relevant fetch flags.

Use file-based cache under `.cache/figma-fetch`.

Reason:

* lowers token and API cost during iterative work,
* improves determinism while debugging normalization rules.

---

## Testing strategy

## Unit tests

Focus heavily on normalization.

Test modules:

* URL parsing
* layout mapping
* role inference
* text normalization
* component/instance extraction
* token binding extraction
* asset classification
* outline generation

## Fixture tests

Create a set of raw Figma JSON fixtures representing:

* simple card
* form with inputs
* table row
* nav bar
* modal
* icon-only button
* illustration-heavy marketing block
* component instance with variants
* token-bound theme example

For each fixture, assert normalized output snapshots.

## Golden tests

For representative real frames:

* raw input fixture,
* expected normalized JSON,
* expected outline XML,
* expected context.md.

The normalization layer should be developed like a compiler pass, not a casual mapper.

---

## Implementation phases

## Phase 1: scaffold

* CLI
* URL parsing
* auth/client
* node fetch
* image fetch
* file writing
* manifest

## Phase 2: minimal normalization

* bounds
* hierarchy
* layout
* text
* appearance
* outline
* context.md

## Phase 3: high-value semantics

* role inference
* component/instance info
* token/variable extraction
* asset classification
* diagnostics

## Phase 4: selective expansion

* child-node targeted refetch
* shallow-to-deep escalation
* better handling of large frames

## Phase 5: optional thin MCP wrapper

Expose a minimal tool surface over the same library:

* `figma_get_outline`
* `figma_get_node`
* `figma_get_render`
* `figma_get_assets`

No business logic in the MCP layer.

---

## Definition of done for v1

Given a valid Figma URL and token, the CLI should:

* parse file key and node ID,
* fetch selected node subtree,
* export PNG render,
* emit normalized structural JSON,
* emit sparse outline JSON and XML,
* emit a concise `context.md`,
* extract variable/token references where available,
* classify likely assets,
* preserve diagnostics for uncertain inferences.

Success criterion:
an agent should usually be able to implement a typical UI frame from `context.md + normalized-node.json + frame.png` without needing raw Figma JSON.

---

## Notes for Claude Code

Implement the project as a small library plus CLI, not a single script.

Prioritize:

1. schema design,
2. normalization correctness,
3. test fixtures,
4. deterministic output.

Deprioritize:

* fancy CLI UX,
* premature abstraction,
* full API coverage,
* MCP support.

The normalization layer is the product. Everything else is plumbing.

---

## Key API facts to respect

* `GET /v1/files/:key` and `GET /v1/files/:key/nodes` both support scoped retrieval via `ids`; `depth` limits traversal; `geometry=paths` enables vector data; and `plugin_data` includes plugin/shared plugin data when requested. ([Figma Developer Docs][1])
* `GET /v1/images/:key` renders node images and supports output formats including `png` and `svg`, scaling, and SVG options such as including layer IDs or node IDs. ([Figma Developer Docs][1])
* Figma node global properties include `pluginData`, `sharedPluginData`, `componentPropertyReferences`, `boundVariables`, and `explicitVariableModes`, which should be surfaced selectively in normalized outputs because they carry high implementation value. ([Figma Developer Docs][3])
* Figma’s own MCP implementation guidance recommends parsing the URL, fetching structured design context, fetching a screenshot, and falling back to sparse metadata plus targeted child fetches when the response is too large. ([Figma Developer Docs][2])

[1]: https://developers.figma.com/docs/rest-api/file-endpoints/ "Endpoints | Developer Docs"
[2]: https://developers.figma.com/docs/figma-mcp-server/skill-implement-design/ "Skill: Implement Design | Developer Docs"
[3]: https://developers.figma.com/docs/rest-api/files/ "Global properties | Developer Docs"
