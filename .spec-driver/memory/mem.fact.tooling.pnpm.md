---
id: mem.fact.tooling.pnpm
name: figma-fetch uses pnpm
kind: memory
status: active
memory_type: fact
created: '2026-03-10'
updated: '2026-03-10'
verified: '2026-03-10'
confidence: high
tags:
- pnpm
- tooling
summary: Package manager is pnpm (user preference). Available via flake.nix. vitest
  for testing via pnpm scripts.
scope:
  paths:
    - package.json
    - pnpm-lock.yaml
  commands:
    - pnpm install
    - pnpm test
    - pnpm build
    - pnpm lint
provenance:
  sources:
    - package.json
    - flake.nix
---

# figma-fetch uses pnpm

- pnpm 10.x via flake.nix (user chose pnpm over bun)
- `pnpm test` → vitest run
- `pnpm build` → tsc -p tsconfig.build.json
- `pnpm lint` → eslint src/ tests/
