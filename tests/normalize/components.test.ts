import { describe, expect, it } from 'vitest'

import { extractComponent } from '../../src/normalize/components.js'
import { FigmaNodeSchema } from '../../src/schemas/raw.js'

function makeNode(extra: Record<string, unknown> = {}): ReturnType<typeof FigmaNodeSchema.parse> {
  return FigmaNodeSchema.parse({ id: '1:1', name: 'Test', type: 'RECTANGLE', ...extra })
}

describe('extractComponent (VT-014)', () => {
  describe('non-component types', () => {
    it('returns null for RECTANGLE', () => {
      const result = extractComponent(makeNode({ type: 'RECTANGLE' }))
      expect(result.value).toBeNull()
      expect(result.confidence).toBe('high')
    })

    it('returns null for FRAME', () => {
      const result = extractComponent(makeNode({ type: 'FRAME' }))
      expect(result.value).toBeNull()
    })

    it('returns null for TEXT', () => {
      const result = extractComponent(makeNode({ type: 'TEXT' }))
      expect(result.value).toBeNull()
    })
  })

  describe('INSTANCE', () => {
    it('extracts instance with componentId and propertyValues', () => {
      const node = makeNode({
        type: 'INSTANCE',
        componentId: 'comp:1',
        componentProperties: {
          Breakpoint: { value: 'Desktop', type: 'VARIANT' },
          Size: { value: 'Large', type: 'VARIANT' },
        },
      })
      const result = extractComponent(node)
      expect(result.value).toMatchObject({
        kind: 'instance',
        componentId: 'comp:1',
        componentName: 'Test',
        propertyValues: { Breakpoint: 'Desktop', Size: 'Large' },
        isReusable: true,
      })
      expect(result.confidence).toBe('high')
    })

    it('extracts componentSetId when present', () => {
      const node = makeNode({
        type: 'INSTANCE',
        componentId: 'comp:2',
        componentSetId: 'set:1',
      })
      const result = extractComponent(node)
      expect(result.value?.componentSetId).toBe('set:1')
    })

    it('extracts componentPropertyReferences', () => {
      const node = makeNode({
        type: 'INSTANCE',
        componentId: 'comp:3',
        componentPropertyReferences: {
          'characters#4:0': 'Label Text',
          'visible#5:0': 'Show Icon',
        },
      })
      const result = extractComponent(node)
      expect(result.value?.propertyReferences).toEqual({
        'characters#4:0': 'Label Text',
        'visible#5:0': 'Show Icon',
      })
    })

    it('warns with medium confidence when componentId is missing', () => {
      const node = makeNode({ type: 'INSTANCE' })
      const result = extractComponent(node)
      expect(result.value?.kind).toBe('instance')
      expect(result.value?.componentId).toBeNull()
      expect(result.confidence).toBe('medium')
      expect(result.warnings).toContainEqual(expect.stringContaining('componentId'))
    })

    it('defaults propertyValues to empty when componentProperties absent', () => {
      const node = makeNode({ type: 'INSTANCE', componentId: 'comp:4' })
      const result = extractComponent(node)
      expect(result.value?.propertyValues).toEqual({})
    })

    it('defaults propertyReferences to empty when absent', () => {
      const node = makeNode({ type: 'INSTANCE', componentId: 'comp:5' })
      const result = extractComponent(node)
      expect(result.value?.propertyReferences).toEqual({})
    })
  })

  describe('COMPONENT', () => {
    it('extracts component definition', () => {
      const node = makeNode({ type: 'COMPONENT', name: 'Button' })
      const result = extractComponent(node)
      expect(result.value).toMatchObject({
        kind: 'component',
        componentId: null,
        componentName: 'Button',
        propertyValues: {},
        propertyReferences: {},
        isReusable: true,
      })
      expect(result.confidence).toBe('high')
    })

    it('extracts componentSetId on variant member', () => {
      const node = makeNode({
        type: 'COMPONENT',
        name: 'Button/Primary',
        componentSetId: 'set:1',
      })
      expect(extractComponent(node).value?.componentSetId).toBe('set:1')
    })
  })

  describe('COMPONENT_SET', () => {
    it('extracts component set', () => {
      const node = makeNode({ type: 'COMPONENT_SET', name: 'Button' })
      const result = extractComponent(node)
      expect(result.value).toMatchObject({
        kind: 'component-set',
        componentId: null,
        componentName: 'Button',
        componentSetId: null,
        propertyValues: {},
        propertyReferences: {},
        isReusable: true,
      })
      expect(result.confidence).toBe('high')
    })
  })

  describe('isReusable', () => {
    it('is true for all component types', () => {
      for (const type of ['INSTANCE', 'COMPONENT', 'COMPONENT_SET']) {
        const node = makeNode({
          type,
          ...(type === 'INSTANCE' ? { componentId: 'comp:x' } : {}),
        })
        expect(extractComponent(node).value?.isReusable).toBe(true)
      }
    })
  })

  describe('omittedFields', () => {
    it('is empty for component extraction', () => {
      const node = makeNode({ type: 'INSTANCE', componentId: 'comp:1' })
      expect(extractComponent(node).omittedFields).toEqual([])
    })
  })
})
