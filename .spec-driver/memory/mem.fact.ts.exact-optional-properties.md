---
id: mem.fact.ts.exact-optional-properties
name: exactOptionalPropertyTypes gotcha
kind: memory
status: active
memory_type: fact
updated: '2026-03-10'
verified: '2026-03-10'
confidence: high
tags:
- typescript
- strict
- sharp-edge
summary: 'With exactOptionalPropertyTypes, optional properties must include | undefined
  in their type when the assigned value may be undefined. E.g. retryAfter?: number
  | undefined, not retryAfter?: number.'
scope:
  globs:
    - src/**/*.ts
  commands:
    - tsc
    - pnpm typecheck
provenance:
  sources:
    - kind: code
      ref: src/errors.ts
    - kind: config
      ref: tsconfig.json
---

# exactOptionalPropertyTypes gotcha

When `exactOptionalPropertyTypes: true` in tsconfig, `prop?: T` means "key absent or value is exactly `T`" — NOT "`T | undefined`".

If a function returns `T | undefined` and you assign it to an optional property, you must declare the property as `prop?: T | undefined`.

Example from `src/errors.ts`:
```ts
// WRONG — TS2379 with exactOptionalPropertyTypes
interface Opts { retryAfter?: number }

// RIGHT
interface Opts { retryAfter?: number | undefined }
```

Same applies to Zod `.optional()` which produces `T | undefined` output.
