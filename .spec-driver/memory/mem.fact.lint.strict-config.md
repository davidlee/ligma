---
id: mem.fact.lint.strict-config
name: Strict eslint config per ADR-001
kind: memory
status: active
memory_type: fact
created: '2026-03-10'
updated: '2026-03-10'
verified: '2026-03-10'
confidence: high
tags:
- lint
- eslint
- adr
summary: "eslint uses strictTypeChecked + stylisticTypeChecked + import/unicorn/unused-imports
  plugins. No warn rules — error or off only (ADR-001). Tests exempt from max-lines-per-function.
  No type assertions allowed."
scope:
  paths:
    - eslint.config.js
  globs:
    - src/**/*.ts
    - tests/**/*.ts
  commands:
    - pnpm lint
    - eslint
provenance:
  sources:
    - docs/lint.md
    - .spec-driver/decisions/ADR-001-zero_tolerance_for_lint_warnings.md
    - eslint.config.js
---

# Strict eslint config per ADR-001

- [[ADR-001]]: zero warnings — every rule is `error` or `off`
- Canonical config source: `docs/lint.md`
- Key strict rules that shape coding style:
  - `consistent-type-assertions: never` — no `as` casts; use type narrowing
  - `strict-boolean-expressions` — no truthy checks on strings/numbers/nullables
  - `explicit-function-return-type` + `explicit-module-boundary-types` — all exports typed
  - `exactOptionalPropertyTypes` in tsconfig — use `T | undefined` not `T?` when assigning undefined
  - `max-lines-per-function: 80` (tests exempt)
  - `complexity: 8`, `max-depth: 3`
  - `unicorn/prevent-abbreviations` — `err` → `error`, etc. (allowList: args, env, params, props, ref, refs)
  - `import/order` with alphabetize + newlines between groups
