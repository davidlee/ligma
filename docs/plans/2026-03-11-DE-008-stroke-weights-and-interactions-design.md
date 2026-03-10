# DE-008 Design — Per-side Stroke Weights & Interaction Extraction

**Delta**: DE-008
**Date**: 2026-03-11
**Status**: approved
**Applies to**: SPEC-001, FR-006
**Resolves**: ISSUE-001, ISSUE-002

## 1. Stroke Weight — Per-side Support

### Current Behavior

`collectStrokes()` reads scalar `node.strokeWeight` and passes it uniformly
to each `NormalizedStroke`. The Figma field `individualStrokeWeights`
(`{ top, right, bottom, left }`) is ignored entirely.

A node with `individualStrokeWeights: { top: 0, right: 0, bottom: 2, left: 0 }`
produces `weight: 1` — losing the bottom-only underline.

### Target Behavior

`NormalizedStroke.weight` becomes a discriminated union matching the existing
`CornerRadius` pattern:

```ts
// schemas/normalized.ts
export const StrokeWeightSchema = z.discriminatedUnion('uniform', [
  z.object({ uniform: z.literal(true), value: z.number() }),
  z.object({
    uniform: z.literal(false),
    top: z.number(), right: z.number(), bottom: z.number(), left: z.number(),
  }),
])
export type StrokeWeight = z.infer<typeof StrokeWeightSchema>
```

`NormalizedStrokeSchema.weight` changes from `z.number().nullable()` to
`StrokeWeightSchema.nullable()`.

### Resolution Logic — `resolveStrokeWeight(node)`

New helper in `appearance.ts`:

1. Read `node.individualStrokeWeights` via `getRawRecord()`.
2. If present and has numeric `top/right/bottom/left`:
   - All four equal → `{ uniform: true, value }`
   - Otherwise → `{ uniform: false, top, right, bottom, left }`
3. Else fall back to scalar `node.strokeWeight`:
   - If present (number) → `{ uniform: true, value }`
4. Neither present → `null`

**Invariant**: `null` means "field absent". `0` is a valid weight, not null.

**Precedence**: `individualStrokeWeights` wins over scalar `strokeWeight`.

### Blast Radius

`weight` is only consumed inside `appearance.ts` and defined in
`schemas/normalized.ts`. No downstream code reads `.weight` as a bare number.

## 2. Interaction Extraction

### Current Behavior

Figma nodes carry an `interactions` array with trigger/action pairs. This data
is dropped entirely during normalization.

### Target Behavior

New extractor `extractInteractions()` in `src/normalize/interactions.ts`.
New schema types in `schemas/normalized.ts`. Wired into `normalizeNode`.

### Schema

```ts
export const InteractionTriggerSchema = z.enum([
  'hover', 'click', 'press', 'drag',
  'key-down', 'mouse-enter', 'mouse-leave',
  'mouse-up', 'mouse-down', 'after-timeout',
  'unknown',
])

export const InteractionActionKindSchema = z.enum([
  'navigate', 'change-to', 'overlay', 'swap-overlay', 'scroll-to',
  'back', 'close', 'url',
  'unknown',
])

export const NormalizedActionSchema = z.object({
  kind: InteractionActionKindSchema,
  destinationId: z.string().nullable(),
  url: z.string().nullable(),
})

export const NormalizedInteractionSchema = z.object({
  trigger: InteractionTriggerSchema,
  actions: z.array(NormalizedActionSchema),
})
```

`NormalizedNode` gains: `interactions: NormalizedInteraction[] | null`

### Trigger Mapping

| Figma `trigger.type` | Normalized |
|---|---|
| `ON_HOVER` | `hover` |
| `ON_CLICK` | `click` |
| `ON_PRESS` | `press` |
| `ON_DRAG` | `drag` |
| `ON_KEY_DOWN` | `key-down` |
| `MOUSE_ENTER` | `mouse-enter` |
| `MOUSE_LEAVE` | `mouse-leave` |
| `MOUSE_UP` | `mouse-up` |
| `MOUSE_DOWN` | `mouse-down` |
| `AFTER_TIMEOUT` | `after-timeout` |
| `ON_MEDIA_HIT`, `ON_MEDIA_END` | `unknown` + warning (unsupported v1) |
| anything else | `unknown` + warning |

### Action Extraction Logic

For each raw action:

1. If `action.type === 'BACK'` → `kind: 'back'`
2. If `action.type === 'CLOSE'` → `kind: 'close'`
3. If `action.type === 'URL'` or `action.type === 'OPEN_URL'` → `kind: 'url'`, `url: action.url`
4. If action has a recognized `navigation` field:
   - `NAVIGATE` → `'navigate'`
   - `CHANGE_TO` → `'change-to'`
   - `OVERLAY` → `'overlay'`
   - `SWAP_OVERLAY` → `'swap-overlay'`
   - `SCROLL_TO` → `'scroll-to'`
   - else → `'unknown'` + warning
   - `destinationId: action.destinationId`
5. Else → `'unknown'` + warning

Covers `SET_VARIABLE`, `SET_VARIABLE_MODE`, `CONDITIONAL`,
`UPDATE_MEDIA_RUNTIME` as explicitly unsupported v1 (normalized to `unknown`).

**Invariant**: `destinationId` is `null` for non-navigation actions
(`back`, `close`, `url`). `url` is `null` for non-URL actions.

### Lossy Normalization Boundary

This extraction is intentionally lossy. The schema covers the common
prototyping interactions (navigation, overlay, back, close, URL). Newer Figma
action families (variable mutations, conditionals, media runtime) normalize to
`unknown` with warnings. The schema is not exhaustive — future deltas can
extend coverage.

## 3. Code Impact

### Modified Files

| File | Change |
|---|---|
| `src/schemas/normalized.ts` | `StrokeWeightSchema`, interaction schemas, `NormalizedNode.interactions` |
| `src/normalize/appearance.ts` | `resolveStrokeWeight()`, update `collectStrokes()` / `normalizeStroke()` |
| `src/normalize/node.ts` | Wire `extractInteractions`, add to `ExtractionResults` |
| `tests/normalize/appearance.test.ts` | Update stroke tests for new weight shape, add per-side cases |

### Created Files

| File | Purpose |
|---|---|
| `src/normalize/interactions.ts` | `extractInteractions(node)` extractor |
| `tests/normalize/interactions.test.ts` | Interaction extraction test suite |

## 4. Verification

### Stroke Weight (VT-010 extension)

- `individualStrokeWeights: { top: 0, right: 0, bottom: 2, left: 0 }` → `{ uniform: false, ... }`
- `individualStrokeWeights: { top: 2, right: 2, bottom: 2, left: 2 }` → `{ uniform: true, value: 2 }`
- Scalar `strokeWeight: 3` only → `{ uniform: true, value: 3 }`
- Scalar `strokeWeight: 0` → `{ uniform: true, value: 0 }`
- Both present → `individualStrokeWeights` wins
- Neither present → `null`
- `individualStrokeWeights` all zeroes → `{ uniform: true, value: 0 }`
- Existing stroke tests updated for new weight shape

### Interaction Extraction (new VT)

- No `interactions` → `null`
- Empty `interactions: []` → `null`
- `ON_HOVER` → `CHANGE_TO` with `destinationId` → correct mapping
- `ON_CLICK` → `URL`/`OPEN_URL` with `url` → correct mapping
- Node-navigation action derived from `navigation` field
- `BACK` action → `{ kind: 'back', destinationId: null, url: null }`
- Multiple interactions on one node
- Multiple actions within one interaction
- Unknown trigger → `'unknown'` + warning
- Unknown action → `'unknown'` + warning
- Media trigger (`ON_MEDIA_HIT`) → `'unknown'` + warning
- `SET_VARIABLE` action → `'unknown'` + warning
- Malformed interaction entry → skipped with warning

### Acceptance Gate

- `mise run` passes (typecheck + test + lint)
- All existing tests green
- No new lint warnings (ADR-001)

## 5. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Schema extension breaks downstream consumers | low | medium | Additive; `interactions` is optional. `weight` blast radius confirmed contained. |
| Edge cases in Figma interaction raw shape | medium | low | Conservative extraction; verify against real REST fixtures. |
| Action type strings differ between REST and Plugin API | low | low | Verify raw field names against captured fixtures during implementation. |

## 6. Explicitly Unsupported (v1)

- **Triggers**: `ON_MEDIA_HIT`, `ON_MEDIA_END`
- **Actions**: `SET_VARIABLE`, `SET_VARIABLE_MODE`, `CONDITIONAL`, `UPDATE_MEDIA_RUNTIME`
- **Interaction metadata**: transition duration, easing, overlay position

These normalize to `'unknown'` with warnings. Future deltas can extend coverage.
