import { describe, expect, it } from 'vitest'

import {
  assetFileName,
  collectExportTargets,
  sanitizeName,
  toAssetListEntry,
} from '../../src/assets/collect.js'

import type { NormalizedNode } from '../../src/schemas/normalized.js'

function makeNode(overrides: Partial<NormalizedNode> = {}): NormalizedNode {
  return {
    id: '1:1',
    name: 'Test Node',
    type: 'frame',
    role: null,
    visible: true,
    bounds: null,
    rotation: null,
    hierarchy: { parentId: null, depth: 0, childCount: 0, path: [] },
    layout: null,
    appearance: null,
    text: null,
    component: null,
    variables: null,
    asset: null,
    interactions: null,
    semantics: {
      likelyInteractive: false,
      likelyTextInput: false,
      likelyIcon: false,
      likelyImage: false,
      likelyMask: false,
      likelyReusableComponent: false,
    },
    children: [],
    diagnostics: {
      sourceNodeType: 'FRAME',
      omittedFields: [],
      warnings: [],
      confidence: 'high',
    },
    ...overrides,
  }
}

function makeAssetNode(
  id: string,
  name: string,
  kind: 'bitmap' | 'svg' | 'mixed',
): NormalizedNode {
  return makeNode({
    id,
    name,
    asset: {
      kind,
      exportSuggested: true,
      reason: `test ${kind}`,
      exportNodeIds: [id],
      imageRefs: kind === 'svg' ? [] : ['img:ref'],
    },
  })
}

describe('collectExportTargets', () => {
  it('returns empty for tree with no exportable assets', () => {
    const root = makeNode({ children: [makeNode({ id: '2:1' })] })
    expect(collectExportTargets(root, 20)).toEqual([])
  })

  it('collects nodes with exportSuggested: true', () => {
    const root = makeNode({
      children: [makeAssetNode('2:1', 'Logo', 'bitmap')],
    })
    const targets = collectExportTargets(root, 20)
    expect(targets).toHaveLength(1)
    expect(targets[0]).toEqual({ nodeId: '2:1', nodeName: 'Logo', kind: 'bitmap', reason: 'test bitmap' })
  })

  it('skips nodes where exportSuggested is false', () => {
    const node = makeNode({
      id: '2:1',
      asset: {
        kind: 'bitmap',
        exportSuggested: false,
        reason: null,
        exportNodeIds: [],
        imageRefs: [],
      },
    })
    const root = makeNode({ children: [node] })
    expect(collectExportTargets(root, 20)).toEqual([])
  })

  it('prioritises bitmap (high confidence) before svg/mixed', () => {
    const root = makeNode({
      children: [
        makeAssetNode('1:1', 'Vector', 'svg'),
        makeAssetNode('2:1', 'Image', 'bitmap'),
        makeAssetNode('3:1', 'Both', 'mixed'),
      ],
    })
    const targets = collectExportTargets(root, 20)
    expect(targets.map((t) => t.kind)).toEqual(['bitmap', 'svg', 'mixed'])
  })

  it('preserves tree-walk order within same priority', () => {
    const root = makeNode({
      children: [
        makeAssetNode('1:1', 'First bitmap', 'bitmap'),
        makeNode({
          id: '2:0',
          children: [makeAssetNode('2:1', 'Nested bitmap', 'bitmap')],
        }),
        makeAssetNode('3:1', 'Last bitmap', 'bitmap'),
      ],
    })
    const targets = collectExportTargets(root, 20)
    expect(targets.map((t) => t.nodeId)).toEqual(['1:1', '2:1', '3:1'])
  })

  it('respects maxAssets cap', () => {
    const root = makeNode({
      children: [
        makeAssetNode('1:1', 'A', 'bitmap'),
        makeAssetNode('2:1', 'B', 'bitmap'),
        makeAssetNode('3:1', 'C', 'bitmap'),
      ],
    })
    const targets = collectExportTargets(root, 2)
    expect(targets).toHaveLength(2)
    expect(targets.map((t) => t.nodeId)).toEqual(['1:1', '2:1'])
  })

  it('maxAssets 0 returns empty', () => {
    const root = makeNode({
      children: [makeAssetNode('1:1', 'A', 'bitmap')],
    })
    expect(collectExportTargets(root, 0)).toEqual([])
  })

  it('collects from root node itself if exportable', () => {
    const root = makeAssetNode('1:1', 'Root asset', 'bitmap')
    const targets = collectExportTargets(root, 20)
    expect(targets).toHaveLength(1)
    expect(targets[0]?.nodeId).toBe('1:1')
  })

  it('cap applied after priority sorting — lower-priority items dropped first', () => {
    const root = makeNode({
      children: [
        makeAssetNode('1:1', 'SVG', 'svg'),
        makeAssetNode('2:1', 'Bitmap', 'bitmap'),
        makeAssetNode('3:1', 'Mixed', 'mixed'),
      ],
    })
    const targets = collectExportTargets(root, 1)
    expect(targets).toHaveLength(1)
    expect(targets[0]?.kind).toBe('bitmap')
  })
})

describe('sanitizeName', () => {
  it('lowercases and replaces non-alphanumeric with hyphens', () => {
    expect(sanitizeName('My Icon/Check')).toBe('my-icon-check')
  })

  it('collapses consecutive hyphens', () => {
    expect(sanitizeName('foo---bar')).toBe('foo-bar')
  })

  it('trims leading and trailing hyphens', () => {
    expect(sanitizeName('--hello--')).toBe('hello')
  })

  it('returns "asset" for empty string', () => {
    expect(sanitizeName('')).toBe('asset')
  })

  it('returns "asset" for string that sanitises to empty', () => {
    expect(sanitizeName('---')).toBe('asset')
  })

  it('handles unicode characters', () => {
    expect(sanitizeName('Ícön 🎨')).toBe('c-n')
  })
})

describe('toAssetListEntry', () => {
  it('maps ExportTarget to consumer-facing shape', () => {
    expect(toAssetListEntry({
      nodeId: '2:1', nodeName: 'Logo', kind: 'bitmap', reason: 'has image fills',
    })).toEqual({
      nodeId: '2:1', name: 'Logo', format: 'png', reason: 'has image fills',
    })
  })

  it('maps svg kind to svg format', () => {
    expect(toAssetListEntry({
      nodeId: '3:1', nodeName: 'Icon', kind: 'svg', reason: null,
    })).toEqual({
      nodeId: '3:1', name: 'Icon', format: 'svg', reason: null,
    })
  })

  it('maps mixed kind to png,svg format', () => {
    expect(toAssetListEntry({
      nodeId: '4:1', nodeName: 'Both', kind: 'mixed', reason: 'mixed content',
    })).toEqual({
      nodeId: '4:1', name: 'Both', format: 'png,svg', reason: 'mixed content',
    })
  })
})

describe('assetFileName', () => {
  it('produces expected filename shape', () => {
    const target = { nodeId: '12:34', nodeName: 'My Logo', kind: 'bitmap' as const, reason: null }
    expect(assetFileName(target, 'png')).toBe('my-logo-12-34.png')
  })

  it('handles node IDs with colons', () => {
    const target = { nodeId: '1292:4418', nodeName: 'Icon', kind: 'svg' as const, reason: null }
    expect(assetFileName(target, 'svg')).toBe('icon-1292-4418.svg')
  })

  it('falls back to "asset" for empty name', () => {
    const target = { nodeId: '1:1', nodeName: '', kind: 'bitmap' as const, reason: null }
    expect(assetFileName(target, 'png')).toBe('asset-1-1.png')
  })
})
