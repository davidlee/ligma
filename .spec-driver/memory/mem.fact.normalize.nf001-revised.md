---
id: mem.fact.normalize.nf001-revised
name: 'NF-001 revised: representation efficiency not size reduction'
kind: memory
status: active
memory_type: fact
updated: '2026-03-11'
verified: '2026-03-11'
confidence: high
tags:
  - normalization
  - nf-001
  - re-002
  - sharp-edge
summary: >-
  NF-001 was revised by RE-002. Original >50% size reduction target was
  empirically unreachable. New metric: fixed field set smaller than raw +
  total size ≤2.0x raw.
scope:
  globs:
    - src/normalize/**
    - tests/normalize/**
  paths:
    - .spec-driver/product/PROD-001/PROD-001.md
    - .spec-driver/tech/SPEC-001/SPEC-001.md
provenance:
  sources:
    - RE-002
    - PROD-001.NF-001
    - SPEC-001.NF-001
---

# NF-001 revised: representation efficiency not size reduction

- [[RE-002]] revised [[PROD-001]].NF-001 and [[SPEC-001]].NF-001
- Original target ">50% size reduction" was set before schema design and was empirically unreachable
- Real data (37-node frame): normalized output ~28% *larger* due to intentional structural metadata (hierarchy paths, diagnostics, semantic flags, DE-004 null placeholders)
- **New two-part metric**:
  1. Schema simplification — normalized nodes expose a fixed 17-field top-level set, smaller than typical raw nodes (25-40+ fields)
  2. Size ceiling — `JSON.stringify` length ≤2.0x raw input on representative fixtures
- Semantic clarity and implementation utility take precedence over raw byte reduction
- VT-013 tests both parts
- Future hardening candidate: "median ratio across representative fixtures ≤1.5x" once DE-004 fills null placeholders
