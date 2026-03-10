import { describe, expect, it } from 'vitest'

import { TokensUsedSummarySchema } from '../../src/schemas/tokens-used.js'
import { aggregateTokensUsed } from '../../src/summary/tokens-used.js'

import type { NormalizedNode } from '../../src/schemas/normalized.js'

function makeNode(overrides: Partial<NormalizedNode> = {}): NormalizedNode {
  return {
    id: '1:1',
    name: 'TestNode',
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

describe('aggregateTokensUsed (VT-022)', () => {
  describe('empty tree', () => {
    it('returns empty summary for node with no variables', () => {
      const root = makeNode()
      const result = aggregateTokensUsed(root, 'file-key', '0:1')

      expect(result.variables).toEqual([])
      expect(result.styles).toEqual([])
      expect(result.counts).toEqual({ colors: 0, typography: 0, numbers: 0, other: 0 })
    })

    it('passes scope metadata through', () => {
      const root = makeNode()
      const result = aggregateTokensUsed(root, 'my-file', '42:99')

      expect(result.scope).toEqual({
        fileKey: 'my-file',
        rootNodeId: '42:99',
        isFullInventory: false,
      })
    })

    it('validates against TokensUsedSummarySchema', () => {
      const root = makeNode()
      const result = aggregateTokensUsed(root, 'file-key', '0:1')
      const parsed = TokensUsedSummarySchema.safeParse(result)

      expect(parsed.success).toBe(true)
    })
  })

  describe('single node with bindings', () => {
    it('collects variable bindings as token references', () => {
      const root = makeNode({
        variables: {
          bindings: [
            { field: 'fills', tokenId: 'VariableID:1', tokenName: 'primary', collectionId: 'col-1', modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.variables).toHaveLength(1)
      expect(result.variables[0]).toEqual({
        tokenId: 'VariableID:1',
        tokenName: 'primary',
        collectionId: 'col-1',
        resolvedType: 'color',
        encounteredOn: [{ nodeId: '1:1', nodeName: 'TestNode', field: 'fills' }],
      })
    })

    it('counts colors correctly', () => {
      const root = makeNode({
        variables: {
          bindings: [
            { field: 'fills', tokenId: 'V:1', tokenName: null, collectionId: null, modeId: null, resolvedType: 'color' },
            { field: 'strokes', tokenId: 'V:2', tokenName: null, collectionId: null, modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.counts.colors).toBe(2)
      expect(result.counts.numbers).toBe(0)
      expect(result.counts.other).toBe(0)
    })

    it('counts numbers correctly', () => {
      const root = makeNode({
        variables: {
          bindings: [
            { field: 'paddingLeft', tokenId: 'V:1', tokenName: null, collectionId: null, modeId: null, resolvedType: 'number' },
          ],
          explicitModes: {},
        },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.counts.numbers).toBe(1)
    })

    it('counts string/boolean/unknown as other', () => {
      const root = makeNode({
        variables: {
          bindings: [
            { field: 'characters', tokenId: 'V:1', tokenName: null, collectionId: null, modeId: null, resolvedType: 'string' },
            { field: 'visible', tokenId: 'V:2', tokenName: null, collectionId: null, modeId: null, resolvedType: 'boolean' },
            { field: 'custom', tokenId: 'V:3', tokenName: null, collectionId: null, modeId: null, resolvedType: 'unknown' },
          ],
          explicitModes: {},
        },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.counts.other).toBe(3)
    })

    it('typography is always 0', () => {
      const root = makeNode({
        variables: {
          bindings: [
            { field: 'fills', tokenId: 'V:1', tokenName: null, collectionId: null, modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.counts.typography).toBe(0)
    })
  })

  describe('tree deduplication', () => {
    it('deduplicates same tokenId across nodes', () => {
      const child = makeNode({
        id: '2:1',
        name: 'Child',
        variables: {
          bindings: [
            { field: 'fills', tokenId: 'V:1', tokenName: 'primary', collectionId: 'col-1', modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
      })
      const root = makeNode({
        variables: {
          bindings: [
            { field: 'strokes', tokenId: 'V:1', tokenName: 'primary', collectionId: 'col-1', modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
        children: [child],
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.variables).toHaveLength(1)
      expect(result.variables[0]?.encounteredOn).toHaveLength(2)
      expect(result.variables[0]?.encounteredOn).toEqual([
        { nodeId: '1:1', nodeName: 'TestNode', field: 'strokes' },
        { nodeId: '2:1', nodeName: 'Child', field: 'fills' },
      ])
    })

    it('first encounter wins for metadata', () => {
      const child = makeNode({
        id: '2:1',
        name: 'Child',
        variables: {
          bindings: [
            { field: 'fills', tokenId: 'V:1', tokenName: 'override-name', collectionId: 'col-2', modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
      })
      const root = makeNode({
        variables: {
          bindings: [
            { field: 'strokes', tokenId: 'V:1', tokenName: 'primary', collectionId: 'col-1', modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
        children: [child],
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.variables[0]?.tokenName).toBe('primary')
      expect(result.variables[0]?.collectionId).toBe('col-1')
    })
  })

  describe('resolvedType conflict resolution', () => {
    it('prefers specific type over unknown', () => {
      const child = makeNode({
        id: '2:1',
        name: 'Child',
        variables: {
          bindings: [
            { field: 'fills', tokenId: 'V:1', tokenName: null, collectionId: null, modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
      })
      const root = makeNode({
        variables: {
          bindings: [
            { field: 'custom', tokenId: 'V:1', tokenName: null, collectionId: null, modeId: null, resolvedType: 'unknown' },
          ],
          explicitModes: {},
        },
        children: [child],
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.variables[0]?.resolvedType).toBe('color')
    })

    it('prefers unknown→specific in reverse encounter order too', () => {
      const child = makeNode({
        id: '2:1',
        name: 'Child',
        variables: {
          bindings: [
            { field: 'custom', tokenId: 'V:1', tokenName: null, collectionId: null, modeId: null, resolvedType: 'unknown' },
          ],
          explicitModes: {},
        },
      })
      const root = makeNode({
        variables: {
          bindings: [
            { field: 'fills', tokenId: 'V:1', tokenName: null, collectionId: null, modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
        children: [child],
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.variables[0]?.resolvedType).toBe('color')
    })

    it('keeps first type on genuine conflict (both specific)', () => {
      const child = makeNode({
        id: '2:1',
        name: 'Child',
        variables: {
          bindings: [
            { field: 'paddingLeft', tokenId: 'V:1', tokenName: null, collectionId: null, modeId: null, resolvedType: 'number' },
          ],
          explicitModes: {},
        },
      })
      const root = makeNode({
        variables: {
          bindings: [
            { field: 'fills', tokenId: 'V:1', tokenName: null, collectionId: null, modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
        children: [child],
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      // First encounter wins
      expect(result.variables[0]?.resolvedType).toBe('color')
    })
  })

  describe('paint tokenRef supplemental', () => {
    it('collects fill tokenRef not in bindings', () => {
      const root = makeNode({
        appearance: {
          fills: [
            { kind: 'solid', visible: true, color: '#ff0000', opacity: 1, gradientStops: null, tokenRef: 'VariableID:paint-1', imageRef: null },
          ],
          strokes: [],
          cornerRadius: null,
          effects: [],
          blendMode: null,
          opacity: null,
        },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.variables).toHaveLength(1)
      expect(result.variables[0]).toEqual({
        tokenId: 'VariableID:paint-1',
        tokenName: null,
        collectionId: null,
        resolvedType: 'color',
        encounteredOn: [{ nodeId: '1:1', nodeName: 'TestNode', field: 'fills/0' }],
      })
    })

    it('collects stroke tokenRef not in bindings', () => {
      const root = makeNode({
        appearance: {
          fills: [],
          strokes: [
            { kind: 'solid', visible: true, color: '#000', opacity: 1, gradientStops: null, tokenRef: 'VariableID:stroke-1', imageRef: null, weight: { uniform: true, value: 1 }, align: 'inside' },
          ],
          cornerRadius: null,
          effects: [],
          blendMode: null,
          opacity: null,
        },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.variables).toHaveLength(1)
      expect(result.variables[0]?.tokenId).toBe('VariableID:stroke-1')
      expect(result.variables[0]?.encounteredOn[0]?.field).toBe('strokes/0')
    })

    it('skips paint tokenRef already in bindings', () => {
      const root = makeNode({
        variables: {
          bindings: [
            { field: 'fills', tokenId: 'V:1', tokenName: 'primary', collectionId: 'col-1', modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
        appearance: {
          fills: [
            { kind: 'solid', visible: true, color: '#ff0000', opacity: 1, gradientStops: null, tokenRef: 'V:1', imageRef: null },
          ],
          strokes: [],
          cornerRadius: null,
          effects: [],
          blendMode: null,
          opacity: null,
        },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      // Only one reference — from bindings, not duplicated from paint
      expect(result.variables).toHaveLength(1)
      expect(result.variables[0]?.encounteredOn).toHaveLength(1)
      expect(result.variables[0]?.encounteredOn[0]?.field).toBe('fills')
    })

    it('skips null tokenRef on paints', () => {
      const root = makeNode({
        appearance: {
          fills: [
            { kind: 'solid', visible: true, color: '#ff0000', opacity: 1, gradientStops: null, tokenRef: null, imageRef: null },
          ],
          strokes: [],
          cornerRadius: null,
          effects: [],
          blendMode: null,
          opacity: null,
        },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.variables).toHaveLength(0)
    })
  })

  describe('styles placeholder', () => {
    it('always returns empty styles array', () => {
      const root = makeNode({
        variables: {
          bindings: [
            { field: 'fills', tokenId: 'V:1', tokenName: null, collectionId: null, modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.styles).toEqual([])
    })
  })

  describe('deep tree walk', () => {
    it('collects tokens from deeply nested children', () => {
      const grandchild = makeNode({
        id: '3:1',
        name: 'Grandchild',
        variables: {
          bindings: [
            { field: 'fills', tokenId: 'V:deep', tokenName: null, collectionId: null, modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
      })
      const child = makeNode({
        id: '2:1',
        name: 'Child',
        children: [grandchild],
        hierarchy: { parentId: '1:1', depth: 1, childCount: 1, path: [] },
      })
      const root = makeNode({
        children: [child],
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.variables).toHaveLength(1)
      expect(result.variables[0]?.tokenId).toBe('V:deep')
      expect(result.variables[0]?.encounteredOn[0]?.nodeId).toBe('3:1')
    })

    it('collects multiple distinct tokens across tree', () => {
      const child1 = makeNode({
        id: '2:1',
        name: 'Child1',
        variables: {
          bindings: [
            { field: 'fills', tokenId: 'V:a', tokenName: null, collectionId: null, modeId: null, resolvedType: 'color' },
          ],
          explicitModes: {},
        },
      })
      const child2 = makeNode({
        id: '2:2',
        name: 'Child2',
        variables: {
          bindings: [
            { field: 'paddingLeft', tokenId: 'V:b', tokenName: null, collectionId: null, modeId: null, resolvedType: 'number' },
          ],
          explicitModes: {},
        },
      })
      const root = makeNode({
        children: [child1, child2],
        hierarchy: { parentId: null, depth: 0, childCount: 2, path: [] },
      })
      const result = aggregateTokensUsed(root, 'fk', '0:1')

      expect(result.variables).toHaveLength(2)
      expect(result.counts).toEqual({ colors: 1, typography: 0, numbers: 1, other: 0 })
    })
  })

  describe('schema validation', () => {
    it('validates complex result against schema', () => {
      const child = makeNode({
        id: '2:1',
        name: 'Child',
        variables: {
          bindings: [
            { field: 'fills', tokenId: 'V:1', tokenName: 'primary', collectionId: 'col-1', modeId: null, resolvedType: 'color' },
            { field: 'paddingLeft', tokenId: 'V:2', tokenName: 'spacing-md', collectionId: 'col-2', modeId: null, resolvedType: 'number' },
          ],
          explicitModes: {},
        },
        appearance: {
          fills: [
            { kind: 'solid', visible: true, color: '#ff0000', opacity: 1, gradientStops: null, tokenRef: 'V:supplemental', imageRef: null },
          ],
          strokes: [],
          cornerRadius: null,
          effects: [],
          blendMode: null,
          opacity: null,
        },
      })
      const root = makeNode({
        children: [child],
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
      })
      const result = aggregateTokensUsed(root, 'file-123', '0:42')
      const parsed = TokensUsedSummarySchema.safeParse(result)

      expect(parsed.success).toBe(true)
    })
  })
})
