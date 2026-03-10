import { describe, expect, it } from 'vitest'

import { extractAsset } from '../../src/normalize/assets.js'
import { FigmaNodeSchema } from '../../src/schemas/raw.js'

function makeNode(extra: Record<string, unknown> = {}): ReturnType<typeof FigmaNodeSchema.parse> {
  return FigmaNodeSchema.parse({ id: '1:1', name: 'Test', type: 'RECTANGLE', ...extra })
}

describe('extractAsset (VT-016)', () => {
  describe('no asset signals', () => {
    it('returns null for plain frame', () => {
      const result = extractAsset(makeNode({ type: 'FRAME' }))
      expect(result.value).toBeNull()
      expect(result.confidence).toBe('high')
    })

    it('returns null for text node', () => {
      expect(extractAsset(makeNode({ type: 'TEXT' })).value).toBeNull()
    })

    it('returns null for name-only match without structural signals', () => {
      const node = makeNode({ type: 'FRAME', name: 'icon/check' })
      expect(extractAsset(node).value).toBeNull()
    })
  })

  describe('image fill → bitmap', () => {
    it('detects bitmap from image fill with imageRef', () => {
      const node = makeNode({
        fills: [{ type: 'IMAGE', imageRef: 'img:abc' }],
      })
      const result = extractAsset(node)
      expect(result.value).toMatchObject({
        kind: 'bitmap',
        exportSuggested: true,
        imageRefs: ['img:abc'],
      })
      expect(result.confidence).toBe('high')
      expect(result.value?.reason).toBeTruthy()
    })

    it('collects multiple imageRefs', () => {
      const node = makeNode({
        fills: [
          { type: 'IMAGE', imageRef: 'img:1' },
          { type: 'IMAGE', imageRef: 'img:2' },
        ],
      })
      expect(extractAsset(node).value?.imageRefs).toEqual(['img:1', 'img:2'])
    })

    it('ignores fills without imageRef', () => {
      const node = makeNode({
        fills: [{ type: 'IMAGE' }],
      })
      expect(extractAsset(node).value).toBeNull()
    })
  })

  describe('vector complexity → svg', () => {
    it('detects svg from BOOLEAN_OPERATION with ≥3 children', () => {
      const node = makeNode({
        type: 'BOOLEAN_OPERATION',
        children: [
          { id: 'c1', name: 'a', type: 'VECTOR' },
          { id: 'c2', name: 'b', type: 'VECTOR' },
          { id: 'c3', name: 'c', type: 'VECTOR' },
        ],
      })
      const result = extractAsset(node)
      expect(result.value).toMatchObject({
        kind: 'svg',
        exportSuggested: true,
      })
      expect(result.confidence).toBe('medium')
      expect(result.value?.reason).toContain('vector complexity')
    })

    it('detects svg from nested boolean operations', () => {
      const node = makeNode({
        type: 'BOOLEAN_OPERATION',
        children: [
          { id: 'c1', name: 'a', type: 'BOOLEAN_OPERATION', children: [] },
          { id: 'c2', name: 'b', type: 'VECTOR' },
        ],
      })
      const result = extractAsset(node)
      expect(result.value?.kind).toBe('svg')
    })

    it('does not trigger for simple VECTOR without complexity', () => {
      const node = makeNode({ type: 'VECTOR' })
      expect(extractAsset(node).value).toBeNull()
    })

    it('does not trigger for BOOLEAN_OPERATION with <3 children and no nesting', () => {
      const node = makeNode({
        type: 'BOOLEAN_OPERATION',
        children: [
          { id: 'c1', name: 'a', type: 'VECTOR' },
          { id: 'c2', name: 'b', type: 'VECTOR' },
        ],
      })
      expect(extractAsset(node).value).toBeNull()
    })
  })

  describe('mixed', () => {
    it('returns mixed when both image fills and vector complexity', () => {
      const node = makeNode({
        type: 'BOOLEAN_OPERATION',
        fills: [{ type: 'IMAGE', imageRef: 'img:1' }],
        children: [
          { id: 'c1', name: 'a', type: 'VECTOR' },
          { id: 'c2', name: 'b', type: 'VECTOR' },
          { id: 'c3', name: 'c', type: 'VECTOR' },
        ],
      })
      const result = extractAsset(node)
      expect(result.value?.kind).toBe('mixed')
    })
  })

  describe('exportSuggested', () => {
    it('includes reason string', () => {
      const node = makeNode({
        fills: [{ type: 'IMAGE', imageRef: 'img:1' }],
      })
      expect(extractAsset(node).value?.exportSuggested).toBe(true)
      expect(typeof extractAsset(node).value?.reason).toBe('string')
    })
  })

  describe('exportNodeIds', () => {
    it('contains the node id when asset detected', () => {
      const node = makeNode({
        fills: [{ type: 'IMAGE', imageRef: 'img:1' }],
      })
      expect(extractAsset(node).value?.exportNodeIds).toEqual(['1:1'])
    })
  })

  describe('omittedFields', () => {
    it('is empty for asset extraction', () => {
      const node = makeNode({
        fills: [{ type: 'IMAGE', imageRef: 'img:1' }],
      })
      expect(extractAsset(node).omittedFields).toEqual([])
    })
  })
})
