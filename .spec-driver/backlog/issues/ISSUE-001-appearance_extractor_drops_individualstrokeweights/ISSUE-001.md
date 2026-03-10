---
id: ISSUE-001
name: Appearance extractor drops individualStrokeWeights
created: '2026-03-11'
updated: '2026-03-11'
status: open
kind: issue
categories: []
severity: p2
impact: user
---

# Appearance extractor drops individualStrokeWeights

## Problem

`extractAppearance()` reads `strokeWeight` (scalar) and ignores `individualStrokeWeights` (per-side object). A Figma node with `individualStrokeWeights: { top: 0, right: 0, bottom: 2, left: 0 }` is normalized as `weight: 1` — losing the bottom-only underline.

This produces incorrect CSS: `border: 1px` instead of `border-bottom: 2px`.

## Evidence

Discovered during value-prop comparison on Inlight design system (file `7RPfgv5FfSn5ywEkNW2jfR`, node `398:18336`). Filter items use bottom-only 2px strokes for selection state.

## Fix direction

- `NormalizedStroke` schema needs per-side weight support (or `NormalizedAppearance` needs a `border` object with `top/right/bottom/left` weights)
- `extractAppearance()` must read `individualStrokeWeights` when present and prefer it over `strokeWeight`
- Existing stroke tests (VT-010) need extension

## Affected files

- `src/normalize/appearance.ts`
- `src/schemas/normalized.ts` (schema extension)
- `tests/normalize/appearance.test.ts`
