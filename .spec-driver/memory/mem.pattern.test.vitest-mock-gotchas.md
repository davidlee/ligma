---
id: mem.pattern.test.vitest-mock-gotchas
name: Vitest mock patterns under strict eslint
kind: memory
status: active
memory_type: pattern
created: '2026-03-11'
updated: '2026-03-11'
verified: '2026-03-11'
confidence: high
tags:
- vitest
- testing
- sharp-edge
summary: Buffer/Uint8Array equality, Response single-read, unbound-method workarounds
scope:
  globs:
    - tests/**/*.ts
  commands:
    - pnpm vitest
    - mise run test
provenance:
  sources:
    - kind: code
      ref: tests/cache/index.test.ts
    - kind: code
      ref: tests/cache/store.test.ts
---

# Vitest mock patterns under strict eslint

## 1. Buffer vs Uint8Array equality

`fs.readFile` returns `Buffer`. `expect(buffer).toEqual(uint8Array)` fails because Buffer and Uint8Array are not structurally equal in vitest.

Fix at source: convert in the module under test:
```ts
const buffer = await readFile(filePath)
return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
```

## 2. Response body is single-read

`fetchMock.mockResolvedValue(response)` returns the same Response object. `response.text()` can only be called once — subsequent calls throw "Body has already been read."

Fix: use `mockImplementation` to create a fresh Response per call:
```ts
fetchMock.mockImplementation(() =>
  Promise.resolve(jsonResponse(data))
)
```

See also [[mem.pattern.test.fake-timers-reject]] for another mock timing gotcha.

## 3. unbound-method with object mocks

`@typescript-eslint/unbound-method` blocks `expect(cache.setNode).toHaveBeenCalled()` when `setNode` is an object method (not arrow function).

Workaround: use call counters instead of `vi.fn` on object methods:
```ts
const counters = { setNodeCalls: 0 }
return {
  setNode(key, value) {
    counters.setNodeCalls += 1
    // ...
  },
  get setNodeCalls() { return counters.setNodeCalls },
}
```

Then assert with `expect(cache.setNodeCalls).toBe(1)`.

Alternative: use `vi.fn` only on the mock client's `request` property (which is accessed directly as a function, not as an object method), and track other mocks with counters.
