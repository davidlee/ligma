---
id: IP-004.PHASE-03
slug: 004-semantic_inference_tokens_and_assets-phase-03
name: Inference layer
created: '2026-03-11'
updated: '2026-03-11'
status: draft
kind: phase
---

```yaml supekku:phase.overview@v1
schema: supekku.phase.overview
version: 1
phase: IP-004.PHASE-03
plan: IP-004
delta: DE-004
objective: >-
  Build the inference layer (src/normalize/infer/) — inferRole, inferTextKind,
  inferSemantics, signal helpers, types. Wire into node.ts as a top-down
  post-pass (applyInferencesRecursive). VT-017 through VT-021 passing.
  mise run green.
entrance_criteria:
  - P02 complete — extractors wired, 405 tests passing
  - mise run green on current main
  - DR-004 §5.2/5.6–5.9 design stable
exit_criteria:
  - src/normalize/infer/types.ts — InferenceInput, InferenceResults, toInferenceInput()
  - src/normalize/infer/signals.ts — shared signal helpers (name match, size, child inspection)
  - src/normalize/infer/role.ts — inferRole() 13-rule priority chain + noise early-out
  - src/normalize/infer/text-kind.ts — inferTextKind() role-derived + fallback
  - src/normalize/infer/semantics.ts — inferSemantics() boolean flag derivation
  - src/normalize/infer/index.ts — applyInferences() + applyInferencesRecursive()
  - node.ts calls applyInferencesRecursive() as top-down post-pass
  - role, semantics, text.semanticKind populated on normalized output
  - Confidence updated to include inference results in min-rule
  - VT-017 (role inference) passing
  - VT-018 (text kind inference) passing
  - VT-019 (semantics inference) passing
  - VT-020 (inference composition) passing
  - VT-021 (signal helpers) passing
  - All existing tests still passing
  - mise run green
verification:
  tests:
    - VT-021 — tests/normalize/infer/signals.test.ts
    - VT-017 — tests/normalize/infer/role.test.ts
    - VT-018 — tests/normalize/infer/text-kind.test.ts
    - VT-019 — tests/normalize/infer/semantics.test.ts
    - VT-020 — tests/normalize/infer/index.test.ts
    - VT-012 — tests/normalize/node.test.ts (extended for inference wiring)
  evidence:
    - mise run output showing all tests pass
tasks:
  - id: '3.1'
    description: Define InferenceInput, InferenceResults, toInferenceInput() in types.ts
  - id: '3.2'
    description: Implement signal helpers in signals.ts + write VT-021
  - id: '3.3'
    description: Implement inferRole() 13-rule chain + write VT-017
  - id: '3.4'
    description: Implement inferTextKind() + write VT-018
  - id: '3.5'
    description: Implement inferSemantics() + write VT-019
  - id: '3.6'
    description: Implement applyInferences() composition + write VT-020
  - id: '3.7'
    description: Wire applyInferencesRecursive into node.ts / normalize index
  - id: '3.8'
    description: Extend node.test.ts for inference wiring + run full suite
risks:
  - description: InferenceInput shape drift from assembled NormalizedNode
    mitigation: toInferenceInput() enforces boundary at runtime; verify field set matches P02 output
  - description: Rule interaction produces unexpected priority conflicts
    mitigation: One test per rule + explicit priority-ordering tests in VT-017
  - description: Complexity budget (max 8) exceeded in inferRole
    mitigation: Each rule is a standalone function; inferRole orchestrates via chain iteration
  - description: Label rule sibling inspection requires access patterns not on InferenceInput
    mitigation: DR-004 §5.6 rule 6 reads sibling structural signals (name, bounds, appearance) from InferenceInput — verified shape has these fields
```

```yaml supekku:phase.tracking@v1
schema: supekku.phase.tracking
version: 1
phase: IP-004.PHASE-03
```

# Phase 03 — Inference layer

## 1. Objective
Build the complete inference layer in `src/normalize/infer/` — five modules implementing role inference (13-rule priority chain), text-kind derivation, semantic flag derivation, shared signal helpers, and the composition/wiring layer. Wire into `node.ts` as a top-down post-pass per DEC-031. All inference functions are pure, return `AnalysisResult<T>`, and operate on `InferenceInput` (not raw Figma JSON or full `NormalizedNode`).

## 2. Links & References
- **Delta**: DE-004
- **Design Revision Sections**: DR-004 §5.2 (InferenceInput), §5.6 (inferRole), §5.7 (inferTextKind), §5.8 (inferSemantics), §5.9 (confidence model), §3 (pipeline + DEC-031)
- **Specs / PRODs**: PROD-001.FR-007 (role inference), PROD-001.FR-009 (text kind), PROD-001.NF-003 (pure function heuristics)
- **Support Docs**: DE-003 design-principles.md (extractor independence); `mem.system.normalize.architecture`
- **Schemas**: `src/schemas/normalized.ts` — NormalizedRole, TextSemanticKind, Semantics, Bounds, NormalizedLayout, NormalizedAppearance, NormalizedText, NormalizedComponentInfo

## 3. Entrance Criteria
- [x] P02 complete — extractors wired, 405 tests passing (commit f8360e1)
- [x] `mise run` green on current main
- [x] DR-004 §5.2/5.6–5.9 design stable (no open questions)

## 4. Exit Criteria / Done When
- [x] `src/normalize/infer/types.ts` — `InferenceInput`, `InferenceResults`, `toInferenceInput()` implemented
- [x] `src/normalize/infer/signals.ts` — signal helpers (name matching, size checks, child inspection, has-visible-fill/stroke)
- [x] `src/normalize/infer/role.ts` — `inferRole()` with noise early-out + 13 prioritized rules
- [x] `src/normalize/infer/text-kind.ts` — `inferTextKind()` with role-derived primary path, parent context, fallback
- [x] `src/normalize/infer/semantics.ts` — `inferSemantics()` deriving 6 boolean flags
- [x] `src/normalize/infer/index.ts` — `applyInferences()` + `applyInferencesRecursive()`
- [x] `normalize/index.ts` calls `applyInferencesRecursive()` as top-down post-pass
- [x] `role`, `semantics`, `text.semanticKind` populated on normalized output
- [x] Confidence min-rule includes inference results
- [x] VT-017, VT-018, VT-019, VT-020, VT-021 all passing
- [x] All existing tests still passing (548 total)
- [x] `mise run` green

## 5. Verification
- VT-021: `tests/normalize/infer/signals.test.ts` — name matching (case-insensitive, substring, patterns), size checks (bounds thresholds, aspect ratio), child inspection (text children, icon children), has-visible-fill/stroke
- VT-017: `tests/normalize/infer/role.test.ts` — one test per rule (13), noise early-out, priority ordering, confidence bands, name reinforcement insufficient alone, null fallback
- VT-018: `tests/normalize/infer/text-kind.test.ts` — role-derived mapping (4 cases), parent role context (button), fallback heuristic (heading/caption/body/unknown), type !== 'text' → null
- VT-019: `tests/normalize/infer/semantics.test.ts` — each flag from role, likelyReusableComponent from component, likelyMask from type, confidence inheritance
- VT-020: `tests/normalize/infer/index.test.ts` — applyInferences wiring, result threading, min confidence, recursive top-down application
- VT-012: `tests/normalize/node.test.ts` — extended for inference wiring (role populated, semantics populated)
- Run: `mise run` (typecheck + test + lint)

## 6. Assumptions & STOP Conditions
- **Assumptions**:
  - `InferenceInput` field set matches what P02 extractors populate: type, name, visible, bounds, layout, appearance, text, component, hierarchy, children. `variables` and `asset` excluded per DEC-022.
  - Label rule (rule 6) can inspect siblings via parent's `children` array on `InferenceInput` — parent passes its children list. Implementation: `inferRole` receives `siblings?: readonly InferenceInput[]` or the rule function accesses parent context.
  - Button rule (rule 3) inspects direct children only (one level deep) — children are `readonly InferenceInput[]` with type/text/bounds accessible.
  - Tree mutation in-place during inference post-pass (DR-004 §3 permits this).
  - All named constants for thresholds (DR-004 §5.6) — no magic numbers.
- **STOP when**:
  - `InferenceInput` cannot be constructed from current `NormalizedNode` shape (field set mismatch)
  - Label rule requires spatial proximity (not just positional co-occurrence) — DR-004 says positional, but if tests reveal this is insufficient, escalate
  - Complexity budget forces architectural changes beyond extracting rule functions

## 7. Tasks & Progress
*(Status: `[ ]` todo, `[WIP]`, `[x]` done, `[blocked]`)*

| Status | ID | Description | Parallel? | Notes |
| --- | --- | --- | --- | --- |
| [x] | 3.1 | Define `InferenceInput`, `InferenceResults`, `toInferenceInput()` | | 65d6872 |
| [x] | 3.2 | Implement signal helpers + write VT-021 | | 65d6872 — 53 tests |
| [x] | 3.3 | Implement `inferRole()` 13-rule chain + write VT-017 | | 68b178a — 39 tests |
| [x] | 3.4 | Implement `inferTextKind()` + write VT-018 | [P] | 68b178a — 16 tests |
| [x] | 3.5 | Implement `inferSemantics()` + write VT-019 | [P] | 68b178a — 20 tests |
| [x] | 3.6 | Implement `applyInferences()` composition + write VT-020 | | 68b178a — 11 tests |
| [x] | 3.7 | Wire `applyInferencesRecursive` into normalize/index.ts | | 79645ca |
| [x] | 3.8 | Extend `node.test.ts` for inference wiring + run full suite | | 79645ca — 4 new tests, 548 total |

### Task Details

- **3.1 Define `InferenceInput`, `InferenceResults`, `toInferenceInput()`**
  - **Design / Approach**: Per DR-004 §5.2 (DEC-022). `InferenceInput` is a named recursive `Readonly` type — not `Pick<NormalizedNode>`. Fields: `type`, `name`, `visible`, `bounds`, `layout`, `appearance`, `text`, `component`, `hierarchy` (parentId, depth, childCount, path), `children: readonly InferenceInput[]`. Excludes `role`, `variables`, `asset`, `semantics`, `diagnostics`, `id`, `rotation`. `InferenceResults` = `{ role, semantics, textKind }` with `AnalysisResult` wrappers. `toInferenceInput(node)` strips excluded fields and recursively maps children.
  - **Files**: `src/normalize/infer/types.ts` (new)
  - **Testing**: Type correctness verified by compilation; `toInferenceInput` tested implicitly via VT-020.

- **3.2 Implement signal helpers + write VT-021**
  - **Design / Approach**: Per DR-004 §5.6. Pure helper functions used across rules. Candidates: `matchesName(input, patterns): boolean` (case-insensitive, checks if name contains/matches any pattern), `isSmallSquarish(bounds, maxSize, aspectRange): boolean`, `hasVisibleFill(appearance): boolean`, `hasVisibleStroke(appearance): boolean`, `hasPadding(layout): boolean`, `hasAutoLayout(layout): boolean`, `getTextContent(input): string | null` (from input.text.content), `countTextChildren(children): number`, `getShortTextChild(children): InferenceInput | null`. All pure, all take typed input not raw.
  - **Files**: `src/normalize/infer/signals.ts` (new), `tests/normalize/infer/signals.test.ts` (new)
  - **Testing**: VT-021 — each helper tested individually with edge cases.

- **3.3 Implement `inferRole()` 13-rule chain + write VT-017**
  - **Design / Approach**: Per DR-004 §5.6 (DEC-026). Each rule is a standalone pure function: `(input: InferenceInput, siblings?: readonly InferenceInput[]) => AnalysisResult<NormalizedRole> | null`. `inferRole` iterates rules in priority order, returns first non-null. Noise early-out before chain. Named threshold constants (ICON_MAX_SIZE, etc.). Label rule (6) receives siblings for co-occurrence check. Rules 5–7 type-guarded to `'text'`.
  - **Files**: `src/normalize/infer/role.ts` (new), `tests/normalize/infer/role.test.ts` (new)
  - **Testing**: VT-017 — one test per rule (13), noise early-out, priority ordering, confidence bands, name-alone insufficient for icon.
  - **Complexity note**: The orchestrator function iterates a rule array — each rule is a separate function to stay under complexity 8.

- **3.4 Implement `inferTextKind()` + write VT-018**
  - **Design / Approach**: Per DR-004 §5.7 (DEC-027). Only applies when `input.type === 'text'`. Primary: derive from role (heading→heading, body-text→body, label→label, button/icon-button→button). Parent context: null role + button parent → button. Fallback: fontSize/fontWeight/content-length heuristics. Returns `AnalysisResult<TextSemanticKind>`.
  - **Files**: `src/normalize/infer/text-kind.ts` (new), `tests/normalize/infer/text-kind.test.ts` (new)
  - **Testing**: VT-018 — role-derived (4 cases), parent context, fallback heuristic, non-text returns null.

- **3.5 Implement `inferSemantics()` + write VT-019**
  - **Design / Approach**: Per DR-004 §5.8 (DEC-028). Derives 6 boolean flags from role + type + component. No independent heuristics. likelyInteractive: role in [button, icon-button, input, navigation]. likelyTextInput: role === input. likelyIcon: role === icon. likelyImage: role === image OR type === image. likelyMask: type === mask. likelyReusableComponent: component?.isReusable === true. Confidence inherits from role result.
  - **Files**: `src/normalize/infer/semantics.ts` (new), `tests/normalize/infer/semantics.test.ts` (new)
  - **Testing**: VT-019 — each flag derivation, confidence inheritance, no-role case.

- **3.6 Implement `applyInferences()` composition + write VT-020**
  - **Design / Approach**: `applyInferences(input, siblings?, parentRole?)` calls `inferRole` → `inferTextKind(input, role, parentRole)` → `inferSemantics(input, role, component)`. Returns `InferenceResults`. `applyInferencesRecursive(node, parentRole?)` converts node to `InferenceInput`, calls `applyInferences`, mutates node in-place (role, semantics, text.semanticKind), then recurses children passing inferred role as `parentRole`. Also updates `diagnostics.confidence` to include inference result confidences in min-rule, and appends inference warnings.
  - **Files**: `src/normalize/infer/index.ts` (new), `tests/normalize/infer/index.test.ts` (new)
  - **Testing**: VT-020 — composition wiring, result threading, min confidence, recursive top-down application, parent role propagation.

- **3.7 Wire `applyInferencesRecursive` into node.ts / normalize index**
  - **Design / Approach**: Per DEC-031. `normalizeNode()` continues to build the full tree with extraction + assembly only (role=null, semantics=defaults). After the recursive tree is built, call `applyInferencesRecursive(root)` in the caller (either `node.ts` export or `normalize/index.ts`). The tree is mutated in-place. Confidence is re-derived to include inference results.
  - **Files**: `src/normalize/node.ts` or `src/normalize/index.ts`

- **3.8 Extend `node.test.ts` for inference wiring + run full suite**
  - **Design / Approach**: Add assertions that fixture nodes have expected roles (e.g., INSTANCE nodes get role from component/structural signals; text nodes get semanticKind). Verify confidence reflects inference. Run `mise run`.
  - **Files**: `tests/normalize/node.test.ts`, full test suite

## 8. Risks & Mitigations
| Risk | Mitigation | Status |
| --- | --- | --- |
| `InferenceInput` field set drift from `NormalizedNode` | `toInferenceInput()` enforces boundary; verified in 3.1 | open |
| Rule interaction produces unexpected priority conflicts | One test per rule + priority-ordering tests in VT-017 | open |
| Complexity budget (max 8) in `inferRole` | Each rule is a standalone function; chain is an array iteration | open |
| Label rule sibling inspection not achievable with `InferenceInput` shape | DR-004 §5.6 confirms sibling structural signals available via parent's children array | open |
| Existing test expectations broken by populated role/semantics | Extend assertions rather than changing fixture expectations; role=null may become non-null | open |

## 9. Decisions & Outcomes
- 2026-03-11 — Complexity budget required extracting helper functions in 3 places: `countButtonSignals` (role.ts), `isBodyTextStyle` (role.ts), `isHeadingStyle` (text-kind.ts). Design preserved; each rule remains a standalone function.
- 2026-03-11 — Wired inference in `normalize/index.ts` (not `node.ts`) — keeps `normalizeNode` focused on extraction+assembly. Existing `normalizeNode` tests unaffected.
- 2026-03-11 — `toInferenceInput()` allocates recursively for the full subtree. Accepted as boundary enforcement cost per DR-004 §5.2.

## 10. Findings / Research Notes
- `import/order`: sibling (`./`) type imports must precede parent (`../`) type imports. Caught in types.ts and signals.ts.
- `@typescript-eslint/prefer-optional-chain`: `x === null || x.y === null` patterns flagged — use `x?.y` with explicit null/undefined check instead.
- `@typescript-eslint/no-duplicate-type-constituents`: `T | null | undefined` on optional params rejected — use `T | null` since `?` already covers undefined.
- Card test for rule 11 (card) initially failed because default bounds 200×100 triggered input rule first (aspect 2.0). Fixed by using 300×250 bounds.
- Text with fontSize 14 / fontWeight 400 matches body-text rule. Parent-context tests for button need text with null fontSize to avoid self-matching.

## 11. Wrap-up Checklist
- [x] Exit criteria satisfied — all 12 criteria met, 548 tests, mise run green
- [x] Verification evidence stored — commits 65d6872, 68b178a, 79645ca
- [ ] Spec/Delta/Plan updated with lessons
- [ ] Hand-off notes to next phase (if any)
