import { describe, expect, it } from 'vitest'

import { ManifestErrorSchema, ManifestSchema } from '../../src/schemas/manifest.js'

describe('ManifestErrorSchema', () => {
  it('validates a complete error', () => {
    const result = ManifestErrorSchema.safeParse({
      type: 'FigmaRenderError',
      message: 'Render failed',
      nodeId: '0:123',
    })
    expect(result.success).toBe(true)
  })

  it('validates an error without nodeId', () => {
    const result = ManifestErrorSchema.safeParse({
      type: 'FigmaAuthError',
      message: 'Auth failed',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an error missing type', () => {
    const result = ManifestErrorSchema.safeParse({
      message: 'Auth failed',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an error missing message', () => {
    const result = ManifestErrorSchema.safeParse({
      type: 'FigmaAuthError',
    })
    expect(result.success).toBe(false)
  })
})

describe('ManifestSchema', () => {
  const validManifest = {
    source: {
      fileKey: 'abc123',
      nodeId: '0:1',
    },
    outputs: {
      rawNodeJson: 'structure/raw-node.json',
      normalizedNodeJson: 'structure/normalized-node.json',
      outlineJson: 'structure/outline.json',
      outlineXml: 'structure/outline.xml',
      contextMd: 'context.md',
      tokensUsedJson: 'tokens/tokens-used.json',
      assets: [],
    },
    errors: [],
  }

  it('validates a minimal manifest', () => {
    const result = ManifestSchema.safeParse(validManifest)
    expect(result.success).toBe(true)
  })

  it('validates a manifest with all source fields', () => {
    const result = ManifestSchema.safeParse({
      ...validManifest,
      source: {
        ...validManifest.source,
        fileName: 'My Design',
        version: '123456',
        lastModified: '2026-03-10T00:00:00Z',
      },
    })
    expect(result.success).toBe(true)
  })

  it('validates a manifest with all output fields', () => {
    const result = ManifestSchema.safeParse({
      ...validManifest,
      outputs: {
        ...validManifest.outputs,
        png: 'visual/0:1.png',
        svg: 'visual/0:1.svg',
        normalizedNodeJson: 'structure/normalized.json',
        outlineJson: 'structure/outline.json',
        outlineXml: 'structure/outline.xml',
        contextMd: 'context.md',
        tokensUsedJson: 'tokens/tokens-used.json',
        assets: ['assets/logo.png'],
      },
    })
    expect(result.success).toBe(true)
  })

  it('validates a manifest with errors', () => {
    const result = ManifestSchema.safeParse({
      ...validManifest,
      errors: [
        { type: 'FigmaRenderError', message: 'Render failed', nodeId: '0:1' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a manifest missing source.fileKey', () => {
    const result = ManifestSchema.safeParse({
      ...validManifest,
      source: { nodeId: '0:1' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects a manifest missing required output fields', () => {
    const result = ManifestSchema.safeParse({
      ...validManifest,
      outputs: { rawNodeJson: 'structure/raw-node.json', assets: [] },
    })
    expect(result.success).toBe(false)
  })

  it('rejects a manifest missing errors array', () => {
    const result = ManifestSchema.safeParse({
      source: validManifest.source,
      outputs: validManifest.outputs,
    })
    expect(result.success).toBe(false)
  })
})
