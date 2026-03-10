---
id: SPEC-001.TESTS
slug: figma_fetch_and_normalization_system-tests
name: Figma fetch and normalization system Testing Guide
created: '2026-03-10'
updated: '2026-03-10'
status: draft
kind: guidance
aliases: []
relations: []
guiding_principles:
  - Normalization layer is tested like a compiler pass
  - Fixture-driven development for representative UI patterns
  - Every heuristic is an isolated pure function with its own tests
assumptions: []
---

# SPEC-001 Testing Guide

## 1. Overview
- **Tech Spec**: SPEC-001 - Figma fetch and normalization system
- **Purpose**: Define testing strategy, fixture inventory, and suite structure for the normalization pipeline.
- **Test Owners**: Implementation agent per-delta

## 2. Guidance & Conventions
- **Frameworks / Libraries**: vitest
- **Structure**: `tests/` directory mirroring `src/` structure. `tests/fixtures/` for raw Figma JSON. `tests/golden/` for expected output snapshots.
- **Factories & Helpers**: Fixture builders for raw Figma node JSON with sensible defaults. Helper to create minimal valid `NormalizedNode` for composition in tests.
- **Mocking Strategy**: Figma API calls mocked at HTTP level (no real API calls in unit/fixture tests). Filesystem operations mocked for output tests. Normalization modules tested with raw JSON fixtures directly (no mocking — pure function inputs).

## 3. Strategy Matrix

| Capability / Scenario | Level | Rationale | Delta |
| --- | --- | --- | --- |
| URL parsing (all formats, errors) | Unit | Pure function, exhaustive input space | DE-002 |
| Auth header generation | Unit | Simple contract | DE-002 |
| Client retry/rate-limit | Unit (mocked HTTP) | Behaviour under failure | DE-002 |
| Image export (PNG/SVG, failure) | Unit (mocked HTTP) | Error path critical | DE-002 |
| Type classification | Unit | Pure mapping, complete coverage | DE-003 |
| Layout normalization | Unit + Fixture | Complex property mapping | DE-003 |
| Appearance normalization | Unit + Fixture | Fill/stroke/effect extraction | DE-003 |
| Text normalization | Unit + Fixture | Style extraction, semantic kind | DE-003 |
| Core node normalization | Fixture + Golden | Recursive tree transformation | DE-003 |
| Role inference heuristics (8 rules) | Unit | Each rule isolated, pure function | DE-004 |
| Component metadata extraction | Unit + Fixture | Variant/property extraction | DE-004 |
| Variable binding extraction | Unit + Fixture | Per-node binding, null safety | DE-004 |
| Asset classification | Unit | Export suggestion logic | DE-004 |
| Used-token summary aggregation | Unit + Fixture | Deduplication, scoping | DE-004 |
| Outline generation (JSON) | Unit + Golden | Tree → outline structure | DE-005 |
| Outline generation (XML) | Unit + Golden | Element vocabulary, attributes | DE-005 |
| context.md generation | Golden | Template rendering, stability | DE-005 |
| Determinism (NF-003) | Golden | Same input → identical output | DE-005 |
| Token count reduction (NF-001) | Fixture | Measure normalized vs raw size | DE-003 |
| Selective expansion triggers | Unit | Each trigger independently | DE-006 |
| Expansion merge | Integration | Shallow → expand → merged tree | DE-006 |
| Cache key generation | Unit | Key composition correctness | DE-006 |
| Cache hit/miss/invalidation | Integration | Cached vs uncached identical | DE-006 |
| Error hierarchy | Unit | Each error type, context fields | DE-002 |
| Full pipeline | Integration + Golden | Raw JSON → complete artifact bundle | DE-005 |
| Manifest accuracy | Unit | All artifacts described | DE-002 |

## 4. Test Suite Inventory

### `tests/figma/url.test.ts`
- **Purpose**: URL parsing and node ID normalization
- **Key Cases**:
  1. Standard design URL → correct fileKey + nodeId
  2. Share URL with node-id → correct extraction
  3. Node ID `123-456` → normalized to `123:456`
  4. Missing node-id → FigmaUrlParseError
  5. Invalid URL format → FigmaUrlParseError with message
  6. URL with extra query params → still parses correctly
- **Dependencies**: None (pure function)

### `tests/figma/auth.test.ts`
- **Purpose**: Auth module contract
- **Key Cases**:
  1. Token → correct `X-Figma-Token` header
  2. Auth module satisfies swappable interface
- **Dependencies**: None

### `tests/figma/client.test.ts`
- **Purpose**: HTTP client retry and rate-limit handling
- **Key Cases**:
  1. Successful request → returns data
  2. 429 → retries with backoff
  3. 500 → retries up to max attempts
  4. 404 → throws FigmaNotFoundError immediately
  5. 403 → throws FigmaAuthError immediately
- **Dependencies**: Mocked HTTP (msw or similar)

### `tests/normalize/classify.test.ts`
- **Purpose**: Type classification completeness
- **Key Cases**: Every raw Figma node type maps to expected NormalizedNodeType
- **Dependencies**: None (pure function)

### `tests/normalize/layout.test.ts`
- **Purpose**: Layout property extraction
- **Key Cases**:
  1. Horizontal auto-layout → `mode: "horizontal"`
  2. Vertical auto-layout → `mode: "vertical"`
  3. No auto-layout with positioned children → `mode: "absolute"`
  4. Hug/fill/fixed sizing → correct enum
  5. Padding, gap, wrap extraction
  6. Constraint mapping
- **Dependencies**: Fixtures

### `tests/normalize/style.test.ts`
- **Purpose**: Appearance normalization
- **Key Cases**:
  1. Solid fill → `kind: "solid"`, correct color
  2. Gradient → `kind: "gradient"`
  3. Image fill → `kind: "image"`, imageRef
  4. Token-bound fill → color + tokenRef
  5. Stroke extraction
  6. Corner radius (uniform and per-corner)
  7. Effects (shadow, blur)
  8. Opacity in appearance only (not node-level)
- **Dependencies**: Fixtures

### `tests/normalize/text.test.ts`
- **Purpose**: Text content and style extraction
- **Key Cases**:
  1. Simple text → content + style
  2. Semantic kind inference (heading, label, body, caption, button)
  3. Truncation settings
  4. Token references in text styles
  5. Text alignment
- **Dependencies**: Fixtures

### `tests/normalize/heuristics.test.ts`
- **Purpose**: Role inference (8 rules, each isolated)
- **Key Cases**:
  1. Container: frame with children + padding → `container`
  2. Stack: auto-layout frame → `stack`
  3. Heading: large bold short text at top → `heading`
  4. Label: small text adjacent to field → `label`
  5. Button: padded auto-layout instance with short text child → `button`
  6. Input: label + text region + border, width > height → `input`
  7. Icon: small square vector group, no text → `icon`
  8. Asset: image fill or many vector descendants → asset candidate
  9. Noise: invisible/zero-size → low-priority diagnostic
  10. Conservative: ambiguous node → `unknown`
- **Dependencies**: Fixtures

### `tests/normalize/tokens-used.test.ts`
- **Purpose**: Used-token summary aggregation
- **Key Cases**:
  1. Multiple nodes with same token → deduplicated
  2. Scope metadata correct (fileKey, rootNodeId, isFullInventory: false)
  3. Missing token names → null in output
  4. Summary counts correct
  5. Style references collected
- **Dependencies**: Fixtures

## 5. Fixture Inventory

Raw Figma JSON fixtures representing:

| Fixture | UI Pattern | Key Properties |
| --- | --- | --- |
| `simple-card.json` | Card with heading, body, button | Auto-layout, text styles, component instance |
| `form-with-inputs.json` | Form with labeled inputs | Input-like containers, labels, field structure |
| `table-row.json` | Data table row | Horizontal layout, repeated structure |
| `nav-bar.json` | Navigation bar | Horizontal auto-layout, icon buttons, labels |
| `modal.json` | Modal dialog | Overlay structure, card-like content |
| `icon-button.json` | Icon-only button | Small vector group, padded container |
| `marketing-block.json` | Illustration-heavy marketing section | Image fills, complex vectors, mixed content |
| `component-instance.json` | Component instance with variants | componentId, variant properties, property references |
| `token-bound-theme.json` | Token-bound themed component | boundVariables, explicitVariableModes |

## 6. Golden Test Strategy

For representative real frames:
- Raw input fixture → expected normalized JSON
- Raw input fixture → expected outline XML
- Raw input fixture → expected outline JSON
- Raw input fixture → expected context.md
- Raw input fixture → expected tokens-used.json

Golden tests use snapshot comparison. Updates require explicit approval (`vitest --update`).

## 7. Infrastructure & Amenities
- Run: `npx vitest` or `npx vitest run`
- Watch: `npx vitest --watch`
- Coverage: `npx vitest --coverage`
- Update snapshots: `npx vitest --update`

## 8. Coverage Expectations
- Normalization modules: exhaustive unit coverage for all mapping rules
- Heuristic functions: each rule tested with positive, negative, and edge cases
- Integration: at least one golden test per fixture
- Error hierarchy: each error type instantiated and verified

## 9. Backlog Hooks
- Outstanding: golden fixtures require real Figma frame captures (may need manual extraction)
- Planned: property-based testing for layout normalization edge cases
