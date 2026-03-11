---
id: mem.thread.project.conventions
name: Project conventions and context
kind: memory
status: active
memory_type: thread
created: '2026-03-11'
updated: '2026-03-11'
verified: '2026-03-11'
confidence: high
tags:
- project-context
- conventions
summary: Extractor pattern, schema conventions, quality gate, test helpers, contracts,
  completed deltas
scope:
  globs:
    - src/**/*.ts
    - tests/**/*.ts
---

# Project conventions and context

## Extractor Pattern
- Each extraction concern gets its own file in `src/normalize/` (e.g. `appearance.ts`, `interactions.ts`)
- Extractors return `ExtractorResult<T>` from `raw-helpers.ts`
- Wired into `node.ts` via `runCoreExtractors` → `ExtractionResults` → `normalizeNode` return
- Document/page nodes skip all extractors (SKIP_EXTRACTORS set)
- `getRawRecord`, `getRawArray`, `getRawString` etc. from `raw-helpers.ts` for safe passthrough access
- Complexity limit: eslint max 8. Extract helpers to stay under.

## Schema Conventions
- Zod schemas in `src/schemas/normalized.ts`, types inferred via `z.infer`
- Discriminated unions for per-side vs uniform (see `CornerRadius`, `StrokeWeight`)
- Null means "field absent", never "field is zero/empty"
- `NormalizedNode` has both a `z.lazy` schema and an explicit interface (recursive type)

## Quality Gate
- `mise run` = typecheck + test + lint ([[ADR-002]])
- Zero lint warnings, all rules are error or off ([[ADR-001]])
- `NORMALIZED_TOP_LEVEL_FIELDS` constant in `tests/normalize/node.test.ts` must be updated when adding fields to `NormalizedNode`

## Test Helpers
- `makeNode()` helpers in test files build `NormalizedNode` with defaults — must include all required fields
- `FigmaNodeSchema.parse()` used in extractor tests to build raw nodes (passthrough schema)

## Contracts
- `spec-driver sync --contracts` regenerates `.contracts/` from source
- New extractor files get auto-discovered; schema changes auto-detected as "changed"

## Completed Work
- DE-004: semantic inference, tokens, assets (AUD-003, RE-005)
- DE-008: per-side stroke weights + interaction extraction (AUD-004, FR-018 added)
