---
id: mem.pattern.build.tsconfig-split
name: figma-fetch tsconfig split pattern
kind: memory
status: active
memory_type: pattern
created: '2026-03-10'
updated: '2026-03-10'
verified: '2026-03-10'
confidence: high
tags:
- typescript
- eslint
- build
summary: Base tsconfig.json includes src+tests (noEmit, used by eslint/IDE). tsconfig.build.json
  extends for compilation (src only, emits to dist).
scope:
  paths:
    - tsconfig.json
    - tsconfig.build.json
  globs:
    - '*.config.*'
  commands:
    - pnpm build
    - pnpm lint
    - eslint
provenance:
  sources:
    - tsconfig.json
    - tsconfig.build.json
    - eslint.config.js
---

# figma-fetch tsconfig split pattern

- `tsconfig.json`: base config, includes `src` + `tests`, `noEmit: true`. Used by eslint `projectService` and IDE.
- `tsconfig.build.json`: extends base, `rootDir: src`, `noEmit: false`, excludes tests. Used by `pnpm build`.
- `eslint.config.js`: uses `projectService: true` which auto-discovers `tsconfig.json`.
- Why: eslint typescript-eslint `projectService` requires linted files to be in a tsconfig. Tests must be included in the base tsconfig or eslint will error on them.
