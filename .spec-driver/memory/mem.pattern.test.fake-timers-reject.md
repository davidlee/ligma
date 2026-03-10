---
id: mem.pattern.test.fake-timers-reject
name: fake timers with rejected promises
kind: memory
status: active
memory_type: pattern
updated: '2026-03-10'
verified: '2026-03-10'
confidence: high
tags:
- vitest
- testing
- sharp-edge
summary: 'When testing retry/backoff with vi.useFakeTimers, use a rejectWith() helper
  returning Promise.reject() and call .catch() early on the promise to prevent unhandled
  rejection warnings.'
scope:
  globs:
    - tests/**/*.test.ts
  commands:
    - vitest
    - pnpm test
provenance:
  sources:
    - kind: code
      ref: tests/util/retry.test.ts
---

# fake timers with rejected promises

When testing async retry with `vi.useFakeTimers()`, three approaches cause unhandled rejection warnings:
1. `mockRejectedValue(error)` — creates immediately rejected promise before catch
2. `mockImplementation(() => Promise.reject(error))` — same problem
3. `mockImplementation(async () => { throw error })` — triggers `require-await` lint rule

Working pattern (used in `tests/util/retry.test.ts`):
```ts
function rejectWith(error: Error): () => Promise<string> {
  return () => Promise.reject(error)
}

// In test: catch early to prevent unhandled rejection window
const promise = withRetry(fn, opts)
const resultPromise = promise.catch((error: unknown) => error)
await vi.advanceTimersByTimeAsync(...)
const error = await resultPromise
expect(error).toBeInstanceOf(Error)
```
