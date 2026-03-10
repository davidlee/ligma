---
id: mem.pattern.cli.orchestrate-write-split
name: orchestrate/writeOutput separation
kind: memory
status: active
memory_type: pattern
created: '2026-03-10'
updated: '2026-03-10'
verified: '2026-03-10'
confidence: medium
tags:
- cli
- architecture
- DEC-006
summary: orchestrate() in src/orchestrate.ts returns data only; writeOutput() in src/output/write.ts
  does I/O. CLI composes both. Library consumers skip writeOutput.
---

# orchestrate/writeOutput separation

## Summary

## Context
