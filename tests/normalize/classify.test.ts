import { describe, expect, it } from 'vitest'

import { classify } from '../../src/normalize/classify.js'
import { FigmaNodeSchema } from '../../src/schemas/raw.js'

function makeNode(
  type: string,
  extra: Record<string, unknown> = {},
): ReturnType<typeof FigmaNodeSchema.parse> {
  return FigmaNodeSchema.parse({
    id: '1:1',
    name: 'Test',
    type,
    ...extra,
  })
}

describe('classify (VT-008)', () => {
  describe('direct type mapping', () => {
    const cases: [string, string][] = [
      ['DOCUMENT', 'document'],
      ['CANVAS', 'page'],
      ['FRAME', 'frame'],
      ['GROUP', 'group'],
      ['COMPONENT', 'component'],
      ['COMPONENT_SET', 'variant-set'],
      ['INSTANCE', 'instance'],
      ['TEXT', 'text'],
      ['LINE', 'line'],
      ['SECTION', 'section'],
      ['RECTANGLE', 'shape'],
      ['ELLIPSE', 'shape'],
      ['POLYGON', 'shape'],
      ['STAR', 'shape'],
      ['VECTOR', 'vector'],
      ['BOOLEAN_OPERATION', 'boolean-operation'],
    ]

    for (const [figmaType, expected] of cases) {
      it(`maps ${figmaType} → "${expected}"`, () => {
        expect(classify(makeNode(figmaType))).toBe(expected)
      })
    }
  })

  describe('unmapped types', () => {
    it('returns "unknown" for unrecognised type', () => {
      expect(classify(makeNode('STICKY'))).toBe('unknown')
    })

    it('returns "unknown" for empty type string', () => {
      expect(classify(makeNode(''))).toBe('unknown')
    })
  })

  describe('mask detection (isMask override)', () => {
    it('overrides base type when isMask is true', () => {
      expect(classify(makeNode('RECTANGLE', { isMask: true }))).toBe('mask')
    })

    it('overrides even unmapped types', () => {
      expect(classify(makeNode('VECTOR', { isMask: true }))).toBe('mask')
    })

    it('does not override when isMask is false', () => {
      expect(classify(makeNode('RECTANGLE', { isMask: false }))).toBe('shape')
    })

    it('does not override when isMask is absent', () => {
      expect(classify(makeNode('RECTANGLE'))).toBe('shape')
    })
  })

  describe('image detection (IMAGE fill)', () => {
    it('classifies shape with IMAGE fill as "image"', () => {
      const node = makeNode('RECTANGLE', {
        fills: [{ type: 'IMAGE', visible: true }],
      })
      expect(classify(node)).toBe('image')
    })

    it('classifies frame with IMAGE fill as "image"', () => {
      const node = makeNode('FRAME', {
        fills: [{ type: 'IMAGE' }],
      })
      expect(classify(node)).toBe('image')
    })

    it('detects IMAGE among multiple fills', () => {
      const node = makeNode('RECTANGLE', {
        fills: [
          { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } },
          { type: 'IMAGE', visible: true },
        ],
      })
      expect(classify(node)).toBe('image')
    })

    it('does not classify as image when no IMAGE fill', () => {
      const node = makeNode('RECTANGLE', {
        fills: [{ type: 'SOLID' }],
      })
      expect(classify(node)).toBe('shape')
    })

    it('does not classify as image when fills is empty', () => {
      const node = makeNode('RECTANGLE', { fills: [] })
      expect(classify(node)).toBe('shape')
    })

    it('does not classify as image when fills is absent', () => {
      expect(classify(makeNode('RECTANGLE'))).toBe('shape')
    })

    it('presence-only: includes invisible IMAGE fills', () => {
      const node = makeNode('RECTANGLE', {
        fills: [{ type: 'IMAGE', visible: false }],
      })
      expect(classify(node)).toBe('image')
    })
  })

  describe('mask vs image precedence', () => {
    it('mask wins over image fill', () => {
      const node = makeNode('RECTANGLE', {
        isMask: true,
        fills: [{ type: 'IMAGE' }],
      })
      expect(classify(node)).toBe('mask')
    })
  })
})
