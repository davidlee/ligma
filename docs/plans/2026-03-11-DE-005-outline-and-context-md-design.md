# DE-005 Design: Outline and context.md generation

**Delta**: DE-005
**DR**: DR-005
**Date**: 2026-03-11

## Summary

Add sparse outline generation (JSON + XML) and agent briefing context.md to the pipeline. Pure projection/output — no NormalizedNode schema changes.

## Key decisions

| ID | Decision |
| --- | --- |
| DEC-021 | Outline omits hidden nodes by default; `--include-hidden` restores with `visible="false"` |
| DEC-022 | Important children sorted by role tier (interaction > content > structural > null), capped at 8 |
| DEC-023 | Implementation notes: 6 pure generators, root-level facts, capped at 5, directive language |
| DEC-024 | Manifest: normalizedNodeJson, outlineJson, outlineXml, contextMd, tokensUsedJson required |
| DEC-025 | `--include-hidden` wired end-to-end: config → orchestrate → CLI |

## New modules

- `src/schemas/outline.ts` — OutlineNode schema (uses normalized enums)
- `src/normalize/outline.ts` — `buildOutline()` returns `{ outline, hiddenNodesOmitted }`, `outlineToXml()`
- `src/output/context-md.ts` — `generateContextMd()`, section generators, note generators

## Design boundary

DE-005 is projection and output only. No changes to NormalizedNode, extractors, or inference.

## context.md intent

Agent briefing note, not documentation. Every line disambiguates implementation, prioritizes work, or prevents a mistake.

Seven sections: Source, Visual reference, Structural summary, Important children, Tokens used, Assets, Implementation notes. Empty sections omitted. Fixed order.

Authority artifacts:
- Visual reference = source of visual truth
- Normalized JSON = source of structural truth

## Outline design

- `childCount` = total structural children (pre-filter)
- XML element names from `NormalizedNodeType` enum via const record
- Attributes in stable order, XML-escaped
- `child-count` attribute in XML

## Verification

4 new test suites (VT-018 through VT-021). 3 existing suites impacted. Golden snapshot for context.md using synthetic fixture.

Full detail in DR-005.
