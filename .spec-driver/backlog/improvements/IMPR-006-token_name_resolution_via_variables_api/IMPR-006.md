---
id: IMPR-006
name: Token name resolution via Variables API
created: '2026-03-12'
updated: '2026-03-12'
status: idea
kind: improvement
---

# Token name resolution via Variables API

## Context

Token extraction captures `boundVariables` alias IDs from the Figma REST API,
but cannot resolve human-readable names. The schema already supports nullable
`tokenName` and `collectionId` fields; context.md gracefully displays "names
unresolved" when these are null.

## Constraint

The Variables API (`GET /v1/files/:file_key/variables/local`) is required to
resolve names. This endpoint is **restricted to Enterprise org members** per
Figma's API docs. Deferred deliberately in `docs/patch-01.md`.

## Desired behaviour

- Call the Variables API to build a `tokenId → {name, collectionId}` map
- Populate `tokenName` and `collectionId` during normalization
- context.md and tokens-used.json output resolved names when available
- Graceful fallback when the API call is forbidden (non-Enterprise)

## Notes

- Infrastructure is ready — nullable fields in schema, null-check in context-md
- Changes the product boundary from "sparse node context" to partial design
  system awareness — may warrant a spec discussion
- Consider making this opt-in (flag or config) given the access restriction
