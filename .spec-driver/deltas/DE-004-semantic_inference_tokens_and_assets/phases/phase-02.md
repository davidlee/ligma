---
id: IP-004.PHASE-02
slug: 004-semantic_inference_tokens_and_assets-phase-02
name: New extractors
created: '2026-03-11'
updated: '2026-03-11'
status: draft
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-004.PHASE-02
plan: IP-004
delta: DE-004
objective: >-
  Implement extractComponent, extractVariables, and extractAsset — three new
  Layer 1 extractors. Wire them into node.ts runExtractors. All three return
  ExtractorResult<T | null> following the established extractor pattern.
  VT-014, VT-015, VT-016 passing. mise run green.
entrance_criteria:
  - P01 complete — AnalysisResult<T>/ExtractorResult<T> types available
  - All existing tests passing (349 tests)
  - mise run green on current main
exit_criteria:
  - extractComponent returns ExtractorResult<NormalizedComponentInfo | null>
  - extractVariables returns ExtractorResult<NormalizedVariableBindings | null>
  - extractAsset returns ExtractorResult<NormalizedAssetInfo | null>
  - All three wired into node.ts runExtractors
  - node.ts populates component/variables/asset fields from extractor results
  - Confidence min-rule includes new extractor results
  - VT-014 (component extraction) passing
  - VT-015 (variable extraction) passing
  - VT-016 (asset extraction) passing
  - All existing tests still passing
  - mise run green
verification:
  tests:
    - VT-014 — tests/normalize/components.test.ts
    - VT-015 — tests/normalize/variables.test.ts
    - VT-016 — tests/normalize/assets.test.ts
    - VT-012 — tests/normalize/node.test.ts (extended for wiring)
    - VT-013 — tests/normalize/reduction-check.test.ts (NF-001 regression)
  evidence:
    - mise run output showing all tests pass
tasks:
  - id: '2.1'
    description: Implement extractComponent(raw) extractor
  - id: '2.2'
    description: Write VT-014 tests for component extraction
  - id: '2.3'
    description: Implement extractVariables(raw) extractor
  - id: '2.4'
    description: Write VT-015 tests for variable extraction
  - id: '2.5'
    description: Implement extractAsset(raw) extractor
  - id: '2.6'
    description: Write VT-016 tests for asset extraction
  - id: '2.7'
    description: Wire new extractors into node.ts
  - id: '2.8'
    description: Update node.test.ts for wiring and run full suite
risks:
  - description: boundVariables shape differs between node-level and paint-level contexts
    mitigation: Handle node-level boundVariables per DR-004; paint-level tokenRef is supplemental (P04 tokens-used)
  - description: NF-001 size ceiling breached when populating null fields
    mitigation: Monitor via VT-013 reduction-check after wiring
  - description: Fixture lacks componentPropertyReferences and explicitVariableModes examples
    mitigation: Create targeted synthetic fixtures for edge cases; design handles null gracefully
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-004.PHASE-02
```

# Phase 02 — New extractors

## 1. Objective
Implement the three new Layer 1 extractors specified in DR-004 §5.3–5.5: `extractComponent`, `extractVariables`, and `extractAsset`. Wire them into `node.ts` so that `NormalizedNode.component`, `.variables`, and `.asset` fields are populated instead of stubbed as `null`. Each extractor follows the established `ExtractorResult<T | null>` contract from P01. The three extractors are independent and parallelizable `[P]`.

## 2. Links & References
- **Delta**: DE-004
- **Design Revision Sections**: DR-004 §5.3 (extractComponent), §5.4 (extractVariables), §5.5 (extractAsset), §5.1 (ExtractorResult contract)
- **Specs / PRODs**: PROD-001.FR-005 (component/asset), PROD-001.FR-010 (variables)
- **Support Docs**: DE-003 design-principles.md (extractor independence, passthrough isolation)
- **Schemas**: `src/schemas/normalized.ts` — NormalizedComponentInfo, NormalizedVariableBindings, NormalizedAssetInfo

## 3. Entrance Criteria
- [x] P01 complete — `AnalysisResult<T>` / `ExtractorResult<T>` types in raw-helpers.ts
- [x] All existing tests passing (349 tests, commit f6f53a0)
- [x] `mise run` green on current main

## 4. Exit Criteria / Done When
- [ ] `src/normalize/components.ts` — `extractComponent(raw)` returning `ExtractorResult<NormalizedComponentInfo | null>`
- [ ] `src/normalize/variables.ts` — `extractVariables(raw)` returning `ExtractorResult<NormalizedVariableBindings | null>`
- [ ] `src/normalize/assets.ts` — `extractAsset(raw)` returning `ExtractorResult<NormalizedAssetInfo | null>`
- [ ] All three wired into `node.ts` `runExtractors()`
- [ ] `node.ts` populates `component`, `variables`, `asset` from extraction results (no longer `null` stubs)
- [ ] Confidence min-rule includes all new extractor results
- [ ] VT-014, VT-015, VT-016 all passing
- [ ] All existing tests still passing
- [ ] `mise run` green

## 5. Verification
- VT-014: `tests/normalize/components.test.ts` — instance, component, component-set, non-component → null, missing componentId warning
- VT-015: `tests/normalize/variables.test.ts` — boundVariables → bindings, explicitModes, resolvedType from field path, no boundVariables → null
- VT-016: `tests/normalize/assets.test.ts` — image fill → bitmap/high, vector complexity → svg/medium, mixed, name-only → null, no signals → null
- VT-012: `tests/normalize/node.test.ts` — extended to verify wiring (component/variables/asset populated)
- VT-013: `tests/normalize/reduction-check.test.ts` — NF-001 regression check
- Run: `mise run` (typecheck + test + lint)

## 6. Assumptions & STOP Conditions
- **Assumptions**:
  - Node-level `boundVariables` shape is `Record<field, { type: "VARIABLE_ALIAS", id: string } | Array<{ type: "VARIABLE_ALIAS", id: string }>>` — verified against fixture
  - `componentProperties` on instances is `Record<name, { value: string, type: string }>` — verified against fixture
  - `componentPropertyReferences` may not be present in fixture — handle absent gracefully, test with synthetic data
  - Per-binding `modeId` stays null per DEC-024 (node-level `explicitModes` only)
  - `NormalizedVariableBindingsSchema` has per-binding `modeId` field — populate as null, use `explicitModes` at node level
- **STOP when**:
  - `boundVariables` shape in real Figma JSON fundamentally differs from what the fixture shows (requires DR amendment)
  - NF-001 ceiling breach after wiring (escalate before relaxing constraint)

## 7. Tasks & Progress
*(Status: `[ ]` todo, `[WIP]`, `[x]` done, `[blocked]`)*

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [x] | 2.1 | Implement `extractComponent(raw)` | [P] | DEC-023. `src/normalize/components.ts` |
| [x] | 2.2 | Write VT-014 tests for component extraction | [P] | 14 tests passing |
| [x] | 2.3 | Implement `extractVariables(raw)` | [P] | DEC-024. `src/normalize/variables.ts` |
| [x] | 2.4 | Write VT-015 tests for variable extraction | [P] | 27 tests passing |
| [x] | 2.5 | Implement `extractAsset(raw)` | [P] | DEC-025. `src/normalize/assets.ts` |
| [x] | 2.6 | Write VT-016 tests for asset extraction | [P] | 14 tests passing |
| [x] | 2.7 | Wire new extractors into `node.ts` | | `runCoreExtractors` + `runExtractors` split |
| [x] | 2.8 | Update `node.test.ts` for wiring + run full suite | | 405 total tests, NF-001 1.35x |

### Task Details

- **2.1 Implement `extractComponent(raw)`**
  - **Design / Approach**: Per DR-004 §5.3 (DEC-023). Returns null for non-component types. Instance: kind='instance', componentId from raw, componentName from raw name, propertyValues from `componentProperties`, propertyReferences from `componentPropertyReferences`. Component: kind='component', componentId=null. Component-set: kind='component-set'. Missing componentId on instance → medium confidence + warning.
  - **Files**: `src/normalize/components.ts` (new)
  - **Testing**: VT-014 (task 2.2)

- **2.2 Write VT-014 tests**
  - **Design / Approach**: Test cases per DR-004 §6: instance with componentId + propertyValues; component with componentSetId; component-set; non-component → null; missing componentId → medium + warning; isReusable flag; propertyReferences mapping.
  - **Files**: `tests/normalize/components.test.ts` (new)

- **2.3 Implement `extractVariables(raw)`**
  - **Design / Approach**: Per DR-004 §5.4 (DEC-024). Read node-level `boundVariables` — each entry becomes a binding with field path, tokenId, resolvedType inferred from field path. `explicitModes` from raw `explicitVariableModes`. Per-binding `modeId` stays null (DEC-024). `tokenName` and `collectionId` null in v1 (require Variables API).
  - **Files**: `src/normalize/variables.ts` (new)
  - **Testing**: VT-015 (task 2.4)
  - **Key detail**: `boundVariables` values can be single `{ type, id }` or arrays — handle both. `resolvedType` inference: fills/strokes → 'color', padding/gap/spacing/size → 'number', textContent → 'string', visibility → 'boolean', else → 'unknown'.

- **2.4 Write VT-015 tests**
  - **Design / Approach**: Test cases per DR-004 §6: boundVariables → bindings; explicitVariableModes → node-level explicitModes; resolvedType from field path; no boundVariables → null; single vs array binding shapes; malformed → warning.
  - **Files**: `tests/normalize/variables.test.ts` (new)

- **2.5 Implement `extractAsset(raw)`**
  - **Design / Approach**: Per DR-004 §5.5 (DEC-025). Asset signals: image fill → bitmap/high, vector complexity (boolean-operation with children ≥3 or nested boolops) → svg/medium, naming patterns reinforce only. Kind resolution: bitmap if image fills, svg if vector without image, mixed if both. `exportSuggested` with reason string.
  - **Files**: `src/normalize/assets.ts` (new)
  - **Testing**: VT-016 (task 2.6)
  - **Key detail**: Reads raw fills for imageRef, raw type + children for vector complexity. Name-only match never triggers extraction.

- **2.6 Write VT-016 tests**
  - **Design / Approach**: Test cases per DR-004 §6: image fill → bitmap/high; vector complexity → svg/medium; mixed; name-only → null; no signals → null; exportSuggested + reason.
  - **Files**: `tests/normalize/assets.test.ts` (new)

- **2.7 Wire new extractors into `node.ts`**
  - **Design / Approach**: Import extractComponent, extractVariables, extractAsset. Call in `runExtractors()` alongside existing extractors. Update `ExtractionResults` interface. Populate `component`, `variables`, `asset` from results instead of null stubs. Include new results in confidence min-rule and warning/omittedField aggregation.
  - **Files**: `src/normalize/node.ts`

- **2.8 Update `node.test.ts` for wiring + full suite**
  - **Design / Approach**: Extend existing node.test.ts to verify component/variables/asset populated on fixture nodes (INSTANCE nodes should have component info). Run full suite to verify no regressions. Run `mise run`.
  - **Files**: `tests/normalize/node.test.ts`, full test suite

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
| --- | --- | --- |
| `boundVariables` shape mismatch between fixture and real API | Fixture-verified + graceful null handling | open |
| NF-001 ceiling breach after populating null fields | Monitor via VT-013 after wiring (task 2.8) | open |
| Missing fixture coverage for `componentPropertyReferences`, `explicitVariableModes` | Synthetic fixture data in test files; null handling tested | open |

## 9. Decisions & Outcomes
- 2026-03-11 — Per-binding `modeId` stays null (DEC-024): node-level `explicitModes` is the only mode source in v1
- 2026-03-11 — `boundVariables` values handled as single or array form — both observed in Figma API

## 10. Findings / Research Notes
- Fixture `figma-fixture.json` has `boundVariables` inside fills (paint-level: `fills[i].boundVariables.color`) and style overrides (`styleOverrideTable[k].boundVariables.fontSize`), not at node level. Node-level `boundVariables` is a separate Figma API concept with shape `Record<field, VariableAlias | VariableAlias[]>`.
- `componentProperties` confirmed as `Record<name, { value: string, type: string }>` on instances (lines 8–12, 412–417 of fixture)
- `componentId` present on all INSTANCE nodes in fixture: `"comp:1"`, `"comp:4"`, `"comp:6"`, `"comp:8"`
- No `componentPropertyReferences` or `explicitVariableModes` in current fixture
- Schema `NormalizedVariableBindingsSchema` has per-binding `modeId: z.string().nullable()` — populate as null per DEC-024

## 11. Wrap-up Checklist
- [x] Exit criteria satisfied — all 8 tasks complete, 405 tests passing, mise run green
- [x] Verification evidence stored — commit f8360e1
- [ ] Spec/Delta/Plan updated with lessons
- [ ] Hand-off notes to next phase (if any)
