---
id: IMPR-005
name: "Asset export pipeline \u2014 fetch and write detected assets to disk"
created: '2026-03-12'
updated: '2026-03-12'
status: done
kind: improvement
---

# Asset export pipeline — fetch and write detected assets to disk

## Context

Asset **detection** is implemented (DE-004 FR-005) — `normalize/assets.ts`
identifies bitmap fills, complex vectors, and mixed assets. This feeds expansion
triggers and context.md documentation. But detected assets are never fetched or
written to disk.

## Current state

- `orchestrate.ts:106` hardcodes `assets: []` in the manifest
- No collection pass walks the normalized tree for `node.asset` objects
- No Figma image export calls for descendant asset node IDs
- No write handler in `output/write.ts`
- `assets/` directory is created but always empty

## Desired behaviour

- After normalization, collect all nodes where `asset.exportSuggested === true`
- Batch-fetch via Figma image export endpoint (respecting format/scale config)
- Write to `assets/` with sensible filenames (node name or ID-based)
- Populate `manifest.outputs.assets` with the written paths

## Notes

- `asset.exportNodeIds` already carries the IDs needed for the export call
- `fetchImageCached` exists for the primary render — could be generalised
- Bitmap vs SVG assets may want different export formats

## Resolution

Implemented by DE-009 (P01 + P02). Audited in AUD-007. Spec patches applied to FR-011 and FR-015.
