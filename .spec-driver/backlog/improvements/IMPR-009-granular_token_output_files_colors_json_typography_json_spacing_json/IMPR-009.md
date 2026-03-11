---
id: IMPR-009
name: "Granular token output files \u2014 colors.json, typography.json, spacing.json"
created: '2026-03-12'
updated: '2026-03-12'
status: idea
kind: improvement
---

# Granular token output files — colors.json, typography.json, spacing.json

## Context

The brief specifies `tokens/variables.json`, `tokens/colors.json`,
`tokens/typography.json`, `tokens/spacing.json` as separate output files.
Currently only `tokens/tokens-used.json` exists, which aggregates all
variable/style references into a single file with a `counts` summary.

## Constraint

**Variables REST API is enterprise-only.** Without it, token names and
collection IDs are unresolvable (see IMPR-006). The granular files would
be more useful with resolved names, but could still be produced from the
alias-level data already captured.

## Desired behaviour

- Split `tokens-used.json` categories into per-type files:
  - `colors.json` — color variables and style references
  - `typography.json` — font family, size, weight, line-height references
  - `spacing.json` — number variables used for padding/gap/margins
- Keep `tokens-used.json` as the unified summary
- Populate resolved names when Variables API is available (IMPR-006)

## Notes

- Depends on or complements IMPR-006 (token name resolution)
- Current `counts` field in tokens-used.json already categorizes by type
- May not be worth doing until IMPR-006 lands — alias IDs alone are low value in separate files
