---
id: IMPR-004
name: CLI progress feedback (spinner/progress bar)
created: '2026-03-12'
updated: '2026-03-12'
status: idea
kind: improvement
---

# CLI progress feedback (spinner/progress bar)

## Problem

The CLI runs silently during fetch, expansion, and output phases. For large
documents or slow networks this feels like a hang — no indication of progress
or which phase is active.

## Desired behaviour

- Show a spinner or progress indicator during long-running phases (Figma API
  fetch, selective expansion refetches, asset downloads, output writing).
- Phase transitions should be visible (e.g. "Fetching document…", "Expanding
  3 targets…", "Writing artifacts…").
- Quiet/non-TTY mode should degrade gracefully (no ANSI escape codes when
  piped).

## Notes

- Consider `ora` or `cli-spinners` — lightweight, widely used.
- Progress callback or event emitter from `orchestrate` would keep the UI
  concern out of core logic.
