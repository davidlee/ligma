---
id: IMPR-007
name: "CLI convenience flags \u2014 --include-geometry, --include-svg, --include-assets,\
  \ --debug"
created: '2026-03-12'
updated: '2026-03-12'
status: idea
kind: improvement
---

# CLI convenience flags — --include-geometry, --include-svg, --include-assets, --debug

## Context

The brief specifies several CLI flags not yet implemented. These are convenience
toggles, not core pipeline changes.

## Flags

- `--include-geometry` — pass `geometry=paths` to the Figma nodes endpoint. Enables vector path data for SVG-worthy nodes. Currently not wired.
- `--include-svg` — fetch SVG render alongside PNG. Would add a second image export call. Currently format is either/or via `--format`.
- `--include-assets` — opt-in toggle for asset export (currently always runs). Brief implies opt-in; current behavior is always-on with `--max-assets 0` as the off switch. May be fine as-is.
- `--debug` — emit `logs/fetch-metadata.json` with timing, cache hits, API call details. The `logs/` subdir is already created but empty.

## Notes

- `--include-assets` may not be needed given `--max-assets 0` already disables. Worth a decision.
- `--include-geometry` and `--include-svg` affect `FetchConfig` and the fetch pipeline.
- `--debug` is mostly an output concern — collect metadata during fetch, write at end.
