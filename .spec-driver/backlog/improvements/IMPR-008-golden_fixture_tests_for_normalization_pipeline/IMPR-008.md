---
id: IMPR-008
name: Golden fixture tests for normalization pipeline
created: '2026-03-12'
updated: '2026-03-12'
status: idea
kind: improvement
---

# Golden fixture tests for normalization pipeline

## Context

The brief calls for fixture and golden tests: raw Figma JSON fixtures
representing common UI patterns (card, form, nav bar, modal, etc.) with
expected normalized JSON, outline XML, and context.md snapshots.

Current test coverage is strong at the unit level (817 tests) but lacks
end-to-end golden tests that assert normalization stability across the
full pipeline.

## Desired behaviour

- `tests/fixtures/` directory with representative raw Figma JSON samples
- Golden snapshot assertions: raw → normalized → outline → context.md
- Fixtures covering: simple card, form with inputs, table row, nav bar,
  modal, icon-only button, illustration-heavy block, component instance
  with variants, token-bound theme example
- Snapshot update workflow (`vitest -u`) for intentional changes

## Notes

- Can capture fixtures from real Figma documents via the cache
- Normalization determinism (NF-003) is already tested but golden tests
  would catch regressions in the full pipeline shape
- Consider `reduction-check.test.ts` as a starting pattern
