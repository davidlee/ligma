import { describe, expect, it } from 'vitest'

import { buildManifest } from '../../src/output/manifest.js'
import { ManifestSchema } from '../../src/schemas/manifest.js'

import type { ManifestInput } from '../../src/output/manifest.js'

const REQUIRED_OUTPUTS = {
  rawNodeJson: 'structure/raw-node.json',
  normalizedNodeJson: 'structure/normalized-node.json',
  outlineJson: 'structure/outline.json',
  outlineXml: 'structure/outline.xml',
  contextMd: 'context.md',
  tokensUsedJson: 'tokens/tokens-used.json',
}

describe('buildManifest', () => {
  const minimalInput: ManifestInput = {
    source: {
      fileKey: 'abc123',
      nodeId: '0:1',
    },
    outputs: {
      ...REQUIRED_OUTPUTS,
      assets: [],
    },
    errors: [],
  }

  it('produces a valid manifest from minimal input', () => {
    const manifest = buildManifest(minimalInput)
    const result = ManifestSchema.safeParse(manifest)
    expect(result.success).toBe(true)
  })

  it('populates source fields correctly', () => {
    const manifest = buildManifest(minimalInput)
    expect(manifest.source.fileKey).toBe('abc123')
    expect(manifest.source.nodeId).toBe('0:1')
  })

  it('includes optional source fields when present', () => {
    const manifest = buildManifest({
      ...minimalInput,
      source: {
        ...minimalInput.source,
        fileName: 'My Design',
        version: '456',
        lastModified: '2026-03-10T00:00:00Z',
      },
    })
    expect(manifest.source.fileName).toBe('My Design')
    expect(manifest.source.version).toBe('456')
    expect(manifest.source.lastModified).toBe('2026-03-10T00:00:00Z')
  })

  it('omits optional source fields when absent', () => {
    const manifest = buildManifest(minimalInput)
    expect(Object.keys(manifest.source)).toEqual(['fileKey', 'nodeId'])
  })

  it('includes all six required output paths', () => {
    const manifest = buildManifest(minimalInput)
    expect(manifest.outputs.rawNodeJson).toBe('structure/raw-node.json')
    expect(manifest.outputs.normalizedNodeJson).toBe('structure/normalized-node.json')
    expect(manifest.outputs.outlineJson).toBe('structure/outline.json')
    expect(manifest.outputs.outlineXml).toBe('structure/outline.xml')
    expect(manifest.outputs.contextMd).toBe('context.md')
    expect(manifest.outputs.tokensUsedJson).toBe('tokens/tokens-used.json')
  })

  it('includes png output when present', () => {
    const manifest = buildManifest({
      ...minimalInput,
      outputs: {
        ...minimalInput.outputs,
        png: 'visual/0:1.png',
      },
    })
    expect(manifest.outputs.png).toBe('visual/0:1.png')
  })

  it('includes svg output when present', () => {
    const manifest = buildManifest({
      ...minimalInput,
      outputs: {
        ...minimalInput.outputs,
        svg: 'visual/0:1.svg',
      },
    })
    expect(manifest.outputs.svg).toBe('visual/0:1.svg')
  })

  it('omits png and svg when absent', () => {
    const manifest = buildManifest(minimalInput)
    expect(manifest.outputs.png).toBeUndefined()
    expect(manifest.outputs.svg).toBeUndefined()
  })

  it('copies errors array', () => {
    const errors = [
      { type: 'FigmaRenderError', message: 'Render failed', nodeId: '0:1' },
      { type: 'FigmaAuthError', message: 'Auth failed' },
    ]
    const manifest = buildManifest({ ...minimalInput, errors })
    expect(manifest.errors).toEqual(errors)
    expect(manifest.errors).not.toBe(errors)
  })

  it('copies assets array', () => {
    const assets = ['assets/logo.png']
    const manifest = buildManifest({
      ...minimalInput,
      outputs: { ...minimalInput.outputs, assets },
    })
    expect(manifest.outputs.assets).toEqual(assets)
    expect(manifest.outputs.assets).not.toBe(assets)
  })

  it('validates against ManifestSchema with all fields', () => {
    const manifest = buildManifest({
      source: {
        fileKey: 'abc123',
        nodeId: '0:1',
        fileName: 'Design',
        version: '789',
        lastModified: '2026-03-10T00:00:00Z',
      },
      outputs: {
        ...REQUIRED_OUTPUTS,
        png: 'visual/0:1.png',
        assets: ['assets/icon.svg'],
      },
      errors: [{ type: 'FigmaRenderError', message: 'SVG failed' }],
    })
    const result = ManifestSchema.safeParse(manifest)
    expect(result.success).toBe(true)
  })
})
