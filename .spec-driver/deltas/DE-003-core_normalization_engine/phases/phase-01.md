---
id: IP-003.PHASE-01
slug: 003-core_normalization_engine-phase-01
name: Schemas + classify + bounds
created: '2026-03-10'
updated: '2026-03-10'
status: draft
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-003.PHASE-01
plan: IP-003
delta: DE-003
objective: >-
  Define the full NormalizedNode type surface as Zod schemas, implement shared
  raw-field accessor, type classifier with image/mask detection, and bounds
  extractor. Establishes the foundation all subsequent extractors build on.
entrance_criteria:
  - DR-003 accepted (tightened, internally consistent)
  - DE-002 scaffold in place (FigmaNode type, error hierarchy, Zod conventions)
exit_criteria:
  - All normalized types defined as Zod schemas with inferred TS types
  - VT-008 passing (type classification)
  - Bounds extractor tested
  - getRawProperty utility tested
  - Zero lint warnings, tsc clean
verification:
  tests:
    - VT-008
  evidence: []
tasks:
  - id: '1.1'
    name: Normalized Zod schemas
  - id: '1.2'
    name: Raw helpers (getRawProperty)
  - id: '1.3'
    name: Type classifier (classify)
  - id: '1.4'
    name: Bounds extractor
risks:
  - description: Zod schema complexity for discriminated unions (CornerRadius, NormalizedPaint)
    mitigation: Use z.discriminatedUnion where possible, z.union as fallback
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-003.PHASE-01
```

# Phase 1 — Schemas + classify + bounds

## 1. Objective
Define the complete `NormalizedNode` type surface as Zod schemas (including DE-004 placeholder fields), implement the shared `getRawProperty` utility (DEC-017), the type classifier (DEC-010), and the bounds extractor. This phase establishes the type contracts and proves the extractor pattern with the simplest extractor before tackling the complex ones.

## 2. Links & References
- **Delta**: DE-003
- **Design Revision Sections**: DR-003 §3 (architecture intent, shared raw field accessor, null vs populated semantics), §4 (all type contracts, classification rules)
- **Specs / PRODs**: PROD-001.FR-005 (normalized model), PROD-001.FR-006 (type classification), PROD-001.NF-003 (pure functions)
- **Support Docs**: [design-principles.md](../design-principles.md), [api-research.md](../api-research.md), SPEC-001.tests §3–§4

## 3. Entrance Criteria
- [x] DR-003 accepted (20 specification gaps resolved, internally consistent)
- [x] DE-002 scaffold in place (FigmaNode type via Zod passthrough, error hierarchy including NormalizationError)

## 4. Exit Criteria / Done When
- [ ] `src/schemas/normalized.ts` — all types from DR-003 §4 as Zod schemas with `z.infer` exports
- [ ] `src/normalize/raw-helpers.ts` — `getRawProperty<T>()` and `ExtractorResult<T>` type
- [ ] `src/normalize/classify.ts` — `classify(node): NormalizedNodeType` with all mapping rules
- [ ] `src/normalize/bounds.ts` — `extractBounds(node): ExtractorResult<Bounds | null>`
- [ ] VT-008 passing: every Figma type mapped, image detection via fills, mask detection via isMask, unmapped → "unknown"
- [ ] Bounds extractor tested: present/absent absoluteBoundingBox, null for missing
- [ ] getRawProperty tested: undefined → default, present → value
- [ ] Zero lint warnings, `tsc --noEmit` clean

## 5. Verification
- `npx vitest run` — all new tests pass
- `npx tsc --noEmit` — clean
- `npx eslint src/ tests/` — clean
- VT-008: `tests/normalize/classify.test.ts`
- Bounds: `tests/normalize/bounds.test.ts`
- Helpers: `tests/normalize/raw-helpers.test.ts`

## 6. Assumptions & STOP Conditions
- Assumptions:
  - FigmaNode Zod schema uses `.passthrough()` (confirmed in DE-002)
  - NormalizationError already exists in `src/errors.ts` (confirmed)
  - Test infrastructure (vitest, eslint) already configured (confirmed)
- STOP when: Zod cannot express a type from DR-003 §4 without losing type safety (consult before working around)

## 7. Tasks & Progress

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [ ] | 1.1 | Normalized Zod schemas | No | Must be first — all other tasks import these types |
| [ ] | 1.2 | Raw helpers (getRawProperty) | Yes | Independent of schemas beyond ExtractorResult |
| [ ] | 1.3 | Type classifier (classify) | Yes | Depends on NormalizedNodeType from 1.1 |
| [ ] | 1.4 | Bounds extractor | Yes | Depends on Bounds + ExtractorResult from 1.1/1.2 |

### Task Details

- **1.1 Normalized Zod schemas**
  - **Design / Approach**: Translate every type contract in DR-003 §4 into Zod schemas. Full `NormalizedNode` skeleton including DE-004 placeholder fields (null). Export both Zod schemas and `z.infer<>` TypeScript types. Enum types as `z.enum()`. Discriminated unions where possible (CornerRadius). `ExtractorResult<T>` can live here or in raw-helpers.
  - **Files / Components**: `src/schemas/normalized.ts`
  - **Testing**: Schema validation tests — valid normalized nodes parse, invalid data rejected. Type-level tests via `tsc --noEmit` (inferred types match DR-003 contracts).
  - **Observations & AI Notes**: DR-003 §4 defines: ExtractorResult, NormalizeContext, HierarchyEntry, Bounds, DimensionValue, GradientStop, NormalizedNodeType, NormalizedRole, LayoutMode, SizingMode, MainAlign, CrossAlign, ConstraintMode, NormalizedGrid, NormalizedLayout, NormalizedPaint, StrokeAlign, NormalizedStroke, CornerRadius, EffectKind, NormalizedEffect, NormalizedAppearance, TextSemanticKind, NormalizedText, ComponentKind, NormalizedComponentInfo, NormalizedVariableBindings, AssetKind, NormalizedAssetInfo, Semantics, Confidence, NormalizedNode.

- **1.2 Raw helpers (getRawProperty)**
  - **Design / Approach**: `getRawProperty<T>(node: FigmaNode, key: string, defaultValue: T): T` — isolates the Zod passthrough cast (DEC-017). Single location for `(node as Record<string, unknown>)[key]`. Place `ExtractorResult<T>` here if not in schemas.
  - **Files / Components**: `src/normalize/raw-helpers.ts`, `tests/normalize/raw-helpers.test.ts`
  - **Testing**: undefined key → default, present key → value, null key → null (not default), nested objects returned as-is.

- **1.3 Type classifier (classify)**
  - **Design / Approach**: `classify(node: FigmaNode): NormalizedNodeType`. Direct type map for simple cases. `isMask` override check. Image detection: `fills.some(f => f.type === "IMAGE")` — presence-only, not visibility-filtered (DEC-010). Uses `getRawProperty` for `isMask` and `fills` access.
  - **Files / Components**: `src/normalize/classify.ts`, `tests/normalize/classify.test.ts`
  - **Testing** (VT-008): One test per Figma type (DOCUMENT, CANVAS, FRAME, GROUP, COMPONENT, COMPONENT_SET, INSTANCE, TEXT, LINE, SECTION, RECTANGLE, ELLIPSE, POLYGON, STAR, VECTOR, BOOLEAN_OPERATION). Image detection: shape with IMAGE fill → "image". Mask detection: node with isMask=true → "mask" (overrides base type). Mask + image fill: mask wins. Unmapped type → "unknown". Null/missing fills → no image override.

- **1.4 Bounds extractor**
  - **Design / Approach**: `extractBounds(node: FigmaNode): ExtractorResult<Bounds | null>`. Reads `absoluteBoundingBox` via `getRawProperty`. Returns `{ x, y, width, height }` or null if absent. No warnings expected for absent bounds (some node types genuinely lack them).
  - **Files / Components**: `src/normalize/bounds.ts`, `tests/normalize/bounds.test.ts`
  - **Testing**: Present absoluteBoundingBox → Bounds object. Absent → null. Partial/malformed → null with warning.

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
| --- | --- | --- |
| Zod discriminated union for CornerRadius | Use `z.discriminatedUnion("uniform", [...])` — both branches have `uniform` as literal discriminator | Open |

## 9. Decisions & Outcomes
- (to be filled during execution)

## 10. Findings / Research Notes
- (to be filled during execution)

## 11. Wrap-up Checklist
- [ ] Exit criteria satisfied
- [ ] Verification evidence stored
- [ ] Spec/Delta/Plan updated with lessons
- [ ] Hand-off notes to next phase (if any)
