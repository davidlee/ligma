---
id: mem.fact.spec-driver.registry-no-prune
name: spec-driver sync does not prune stale requirements
kind: memory
status: active
memory_type: fact
updated: '2026-03-10'
verified: '2026-03-10'
confidence: high
tags:
- spec-driver
- gotcha
summary: spec-driver sync --force does NOT remove requirements deleted from spec markdown.
  Must manually edit .spec-driver/registry/requirements.yaml.
scope:
  paths:
  - .spec-driver/registry/requirements.yaml
  commands:
  - spec-driver sync
provenance:
  sources:
  - kind: observation
    ref: DE-001 session - SPEC-001.NF-005 persisted after removal from spec
---

# spec-driver sync does not prune stale requirements

If you remove a requirement (e.g., `- **NF-005**: ...`) from a spec markdown file, `spec-driver sync` and `spec-driver sync --force` will NOT remove the corresponding entry from `.spec-driver/registry/requirements.yaml`.

Fix: manually delete the stale entry from the YAML file.
