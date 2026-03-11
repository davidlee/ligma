---
id: mem.fact.outline.xml-element-mapping
name: SPEC-001.FR-013 XML element name mapping
kind: memory
status: active
memory_type: fact
created: '2026-03-11'
updated: '2026-03-11'
verified: '2026-03-11'
confidence: medium
tags:
- outline
- xml
- spec-001
- sharp-edge
summary: "XML element names in outlineToXml are NOT identity-mapped for all NormalizedNodeType\
  \ values. Two exceptions per SPEC-001.FR-013: boolean-operation \u2192 boolean-op,\
  \ unknown \u2192 node. All others use the type name directly. Mapping lives in XML_ELEMENT_NAMES\
  \ Map in src/normalize/outline.ts."
---

# SPEC-001.FR-013 XML element name mapping

## Summary

## Context
