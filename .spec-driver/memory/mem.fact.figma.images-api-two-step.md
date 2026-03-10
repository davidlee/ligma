---
id: mem.fact.figma.images-api-two-step
name: Figma Images API is two-step
kind: memory
status: active
memory_type: fact
updated: '2026-03-10'
verified: '2026-03-10'
confidence: high
tags:
- figma
- api
- gotcha
summary: 'Figma Images API returns presigned URLs, not binary data. fetch-image must
  be two HTTP calls: render request then download.'
scope:
  globs:
  - src/figma/fetch-image*
  - src/figma/client*
provenance:
  sources:
  - kind: doc
    ref: https://developers.figma.com/docs/rest-api/file-endpoints/
  - kind: review
    ref: DE-002 adversarial review (session 1)
---

# Figma Images API is two-step

`GET /v1/images/:key?ids=:nodeId&format=png&scale=2` returns JSON:
```json
{ "images": { "nodeId": "https://presigned-url..." } }
```

The client must then download the image from the presigned URL. Two independent failure points:
1. Render request fails (API error, rate limit, node not found)
2. Download fails (URL expired, network error, invalid image)

`FigmaRenderError` should cover both. `fetch-image.ts` must encapsulate both steps.
