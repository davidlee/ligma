# DE-003 Core Normalization Engine — Design Summary

Canonical design: `.spec-driver/deltas/DE-003-core_normalization_engine/DR-003.md`

## Key decisions

| ID | Decision |
|---|---|
| DEC-007 | Full NormalizedNode skeleton in DE-003; DE-004 fields null |
| DEC-008 | normalize() wired into orchestrate(); writeOutput/manifest unchanged |
| DEC-009 | Diagnostics compositional from extractors; confidence downgrades on warnings |
| DEC-010 | classify() takes full FigmaNode for image/mask detection |
| DEC-011 | DimensionValue for lineHeight/letterSpacing (unitful semantics) |
| DEC-012 | Grid layout first-class with grid subobject |
| DEC-013 | Position from raw x/y, not relativeTransform |
| DEC-014 | Unsupported paints/effects → "unknown" with warnings |
| DEC-015 | Text: default style only, mixed-style deferred |
| DEC-016 | Absence semantics: null=not attempted, "unknown"=attempted+indeterminate |

## New files

- `src/schemas/normalized.ts` — Zod schemas for all types
- `src/normalize/{index,classify,bounds,layout,appearance,text,node}.ts`

## Modified files

- `src/orchestrate.ts` — adds normalizedNode to OrchestrateResult

## Verification

VT-008 through VT-013 (6 new VTs covering classify, layout, appearance, text, node composition, token reduction)
