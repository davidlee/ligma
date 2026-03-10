---
id: ISSUE-002
name: Interactions (hover/click prototyping) not extracted
created: '2026-03-11'
updated: '2026-03-11'
status: resolved
kind: issue
categories: []
severity: p3
impact: user
---

# Interactions (hover/click prototyping) not extracted

## Problem

Figma nodes carry an `interactions` array with trigger/action pairs (e.g. `ON_HOVER` → `CHANGE_TO`). This data is dropped entirely during normalization — not extracted, not represented in the schema.

While not required for static layout, interactions signal hover states, click targets, and variant transitions — useful implementation context for interactive components.

## Evidence

Discovered during value-prop comparison on Inlight design system (file `7RPfgv5FfSn5ywEkNW2jfR`, node `398:18336`). Filter items have `ON_HOVER → CHANGE_TO` interactions defining hover state transitions.

## Fix direction

- New extraction concern: `extractInteractions(raw)` or extend existing extractor
- Schema extension: `NormalizedNode.interactions` or similar
- Scope decision needed: which interaction types are worth extracting (hover, click, scroll, etc.)
- Lower priority than ISSUE-001 — static layout fidelity matters more than prototyping metadata

## Affected files

- `src/normalize/` (new extractor or extension)
- `src/schemas/normalized.ts` (schema extension)
