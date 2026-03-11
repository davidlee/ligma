@.spec-driver/agents/boot.md

## project

name: ligma
desc: cli alternative to figma MCP
initial brief: `docs/brief.md`

## code - quality gates

```
mise lint
mise run typecheck
mise run quickcheck # typecheck + lint
mise run test
mise run check # pre-commit: typecheck, test, lint
mise run contracts # regenerate spec-driver contracts
```

IMPORTANT: after completing edits to each file, run quickeck.

## toolchain

```
spec-driver
mise
pnpm
vitest
eslint
prettier
```

## Memory

Don't use claude native memories; use spec-driver's.
- `/capturing-memory`
- `/retrieving-memory`
- Project thread: `.spec-driver/memory/mem.thread.project.conventions.md`
