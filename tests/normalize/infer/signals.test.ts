import { describe, expect, it } from 'vitest'

import {
  countTextChildren,
  getShortTextChild,
  hasAutoLayout,
  hasCornerRadius,
  hasIconChild,
  hasPadding,
  hasSiblingWithInputSignals,
  hasVisibleFill,
  hasVisibleStroke,
  isSmallSquarish,
  isThinDimension,
  isWideRectangle,
  matchesName,
} from '../../../src/normalize/infer/signals.js'

import type { InferenceInput } from '../../../src/normalize/infer/types.js'
import type { Bounds, NormalizedAppearance, NormalizedLayout } from '../../../src/schemas/normalized.js'

function makeInput(overrides: Partial<InferenceInput> = {}): InferenceInput {
  return {
    type: 'frame',
    name: 'Test',
    visible: true,
    bounds: null,
    layout: null,
    appearance: null,
    text: null,
    component: null,
    hierarchy: { parentId: null, depth: 0, childCount: 0, path: [] },
    children: [],
    ...overrides,
  }
}

function makeBounds(width: number, height: number): Bounds {
  return { x: 0, y: 0, width, height }
}

function makeAppearance(overrides: Partial<NormalizedAppearance> = {}): NormalizedAppearance {
  return {
    fills: [],
    strokes: [],
    cornerRadius: null,
    effects: [],
    blendMode: null,
    opacity: null,
    ...overrides,
  }
}

function makeLayout(overrides: Partial<NormalizedLayout> = {}): NormalizedLayout {
  return {
    mode: 'none',
    sizing: { horizontal: 'fixed', vertical: 'fixed' },
    align: { main: 'start', cross: 'start' },
    padding: null,
    gap: null,
    wrap: null,
    grid: null,
    constraints: null,
    position: null,
    clipsContent: null,
    ...overrides,
  }
}

describe('signal helpers (VT-021)', () => {
  describe('matchesName', () => {
    it('matches case-insensitively', () => {
      expect(matchesName(makeInput({ name: 'MyButton' }), ['button'])).toBe(true)
    })

    it('matches substring', () => {
      expect(matchesName(makeInput({ name: 'icon/arrow-left' }), ['icon'])).toBe(true)
    })

    it('returns false when no pattern matches', () => {
      expect(matchesName(makeInput({ name: 'Header' }), ['button', 'input'])).toBe(false)
    })

    it('matches any of multiple patterns', () => {
      expect(matchesName(makeInput({ name: 'search-field' }), ['input', 'field'])).toBe(true)
    })

    it('returns false for empty patterns', () => {
      expect(matchesName(makeInput({ name: 'anything' }), [])).toBe(false)
    })
  })

  describe('isSmallSquarish', () => {
    it('true for small square bounds', () => {
      expect(isSmallSquarish(makeBounds(24, 24), 48, [0.5, 2.0])).toBe(true)
    })

    it('false when too large', () => {
      expect(isSmallSquarish(makeBounds(64, 64), 48, [0.5, 2.0])).toBe(false)
    })

    it('false when aspect ratio out of range', () => {
      expect(isSmallSquarish(makeBounds(10, 40), 48, [0.5, 2.0])).toBe(false)
    })

    it('false for null bounds', () => {
      expect(isSmallSquarish(null, 48, [0.5, 2.0])).toBe(false)
    })

    it('false for zero height', () => {
      expect(isSmallSquarish(makeBounds(24, 0), 48, [0.5, 2.0])).toBe(false)
    })

    it('true at boundary (exactly maxSize)', () => {
      expect(isSmallSquarish(makeBounds(48, 48), 48, [0.5, 2.0])).toBe(true)
    })
  })

  describe('isWideRectangle', () => {
    it('true when aspect ratio exceeds threshold', () => {
      expect(isWideRectangle(makeBounds(200, 40), 2.0)).toBe(true)
    })

    it('false when too square', () => {
      expect(isWideRectangle(makeBounds(100, 80), 2.0)).toBe(false)
    })

    it('false for null bounds', () => {
      expect(isWideRectangle(null, 2.0)).toBe(false)
    })

    it('false for zero height', () => {
      expect(isWideRectangle(makeBounds(100, 0), 2.0)).toBe(false)
    })
  })

  describe('isThinDimension', () => {
    it('true when width is thin', () => {
      expect(isThinDimension(makeBounds(1, 200), 2)).toBe(true)
    })

    it('true when height is thin', () => {
      expect(isThinDimension(makeBounds(200, 2), 2)).toBe(true)
    })

    it('false when both dimensions exceed threshold', () => {
      expect(isThinDimension(makeBounds(100, 50), 2)).toBe(false)
    })

    it('false for null bounds', () => {
      expect(isThinDimension(null, 2)).toBe(false)
    })
  })

  describe('hasVisibleFill', () => {
    it('true with visible fill', () => {
      const appearance = makeAppearance({
        fills: [{ kind: 'solid', visible: true, color: '#000', opacity: 1, gradientStops: null, tokenRef: null, imageRef: null }],
      })
      expect(hasVisibleFill(appearance)).toBe(true)
    })

    it('false with invisible fill', () => {
      const appearance = makeAppearance({
        fills: [{ kind: 'solid', visible: false, color: '#000', opacity: 1, gradientStops: null, tokenRef: null, imageRef: null }],
      })
      expect(hasVisibleFill(appearance)).toBe(false)
    })

    it('false with no fills', () => {
      expect(hasVisibleFill(makeAppearance())).toBe(false)
    })

    it('false for null appearance', () => {
      expect(hasVisibleFill(null)).toBe(false)
    })
  })

  describe('hasVisibleStroke', () => {
    it('true with visible stroke', () => {
      const appearance = makeAppearance({
        strokes: [{ kind: 'solid', visible: true, color: '#000', opacity: 1, gradientStops: null, tokenRef: null, imageRef: null, weight: 1, align: 'inside' }],
      })
      expect(hasVisibleStroke(appearance)).toBe(true)
    })

    it('false for null appearance', () => {
      expect(hasVisibleStroke(null)).toBe(false)
    })
  })

  describe('hasCornerRadius', () => {
    it('true with uniform positive radius', () => {
      const appearance = makeAppearance({
        cornerRadius: { uniform: true, radius: 8 },
      })
      expect(hasCornerRadius(appearance)).toBe(true)
    })

    it('false with uniform zero radius', () => {
      const appearance = makeAppearance({
        cornerRadius: { uniform: true, radius: 0 },
      })
      expect(hasCornerRadius(appearance)).toBe(false)
    })

    it('true with non-uniform positive radius', () => {
      const appearance = makeAppearance({
        cornerRadius: { uniform: false, topLeft: 8, topRight: 0, bottomRight: 0, bottomLeft: 0 },
      })
      expect(hasCornerRadius(appearance)).toBe(true)
    })

    it('false for null appearance', () => {
      expect(hasCornerRadius(null)).toBe(false)
    })

    it('false for null cornerRadius', () => {
      expect(hasCornerRadius(makeAppearance())).toBe(false)
    })
  })

  describe('hasAutoLayout', () => {
    it('true for horizontal', () => {
      expect(hasAutoLayout(makeLayout({ mode: 'horizontal' }))).toBe(true)
    })

    it('true for vertical', () => {
      expect(hasAutoLayout(makeLayout({ mode: 'vertical' }))).toBe(true)
    })

    it('false for none', () => {
      expect(hasAutoLayout(makeLayout({ mode: 'none' }))).toBe(false)
    })

    it('false for grid', () => {
      expect(hasAutoLayout(makeLayout({ mode: 'grid' }))).toBe(false)
    })

    it('false for null layout', () => {
      expect(hasAutoLayout(null)).toBe(false)
    })
  })

  describe('hasPadding', () => {
    it('true when any padding > 0', () => {
      expect(hasPadding(makeLayout({ padding: { top: 8, right: 0, bottom: 0, left: 0 } }))).toBe(true)
    })

    it('false when all padding zero', () => {
      expect(hasPadding(makeLayout({ padding: { top: 0, right: 0, bottom: 0, left: 0 } }))).toBe(false)
    })

    it('false for null padding', () => {
      expect(hasPadding(makeLayout({ padding: null }))).toBe(false)
    })

    it('false for null layout', () => {
      expect(hasPadding(null)).toBe(false)
    })
  })

  describe('countTextChildren', () => {
    it('counts text-type children', () => {
      const children = [
        makeInput({ type: 'text' }),
        makeInput({ type: 'frame' }),
        makeInput({ type: 'text' }),
      ]
      expect(countTextChildren(children)).toBe(2)
    })

    it('returns 0 for no children', () => {
      expect(countTextChildren([])).toBe(0)
    })
  })

  describe('getShortTextChild', () => {
    it('returns first short text child', () => {
      const textChild = makeInput({
        type: 'text',
        name: 'Label',
        text: {
          content: 'Submit',
          charactersLength: 6,
          style: { fontFamily: null, fontWeight: null, fontSize: null, lineHeight: null, letterSpacing: null, textCase: null, textAlignHorizontal: null, textAlignVertical: null },
          color: null,
          tokenRefs: [],
          semanticKind: 'unknown',
          truncation: null,
        },
      })
      const children = [makeInput({ type: 'frame' }), textChild]
      expect(getShortTextChild(children, 40)).toBe(textChild)
    })

    it('returns null when text exceeds maxLength', () => {
      const longText = makeInput({
        type: 'text',
        text: {
          content: 'A'.repeat(50),
          charactersLength: 50,
          style: { fontFamily: null, fontWeight: null, fontSize: null, lineHeight: null, letterSpacing: null, textCase: null, textAlignHorizontal: null, textAlignVertical: null },
          color: null,
          tokenRefs: [],
          semanticKind: 'unknown',
          truncation: null,
        },
      })
      expect(getShortTextChild([longText], 40)).toBeNull()
    })

    it('returns null when no text children', () => {
      expect(getShortTextChild([makeInput()], 40)).toBeNull()
    })
  })

  describe('hasIconChild', () => {
    it('true with vector child', () => {
      expect(hasIconChild([makeInput({ type: 'vector' })])).toBe(true)
    })

    it('true with boolean-operation child', () => {
      expect(hasIconChild([makeInput({ type: 'boolean-operation' })])).toBe(true)
    })

    it('true with image child', () => {
      expect(hasIconChild([makeInput({ type: 'image' })])).toBe(true)
    })

    it('false with only frame/text children', () => {
      expect(hasIconChild([makeInput({ type: 'frame' }), makeInput({ type: 'text' })])).toBe(false)
    })

    it('false for empty children', () => {
      expect(hasIconChild([])).toBe(false)
    })
  })

  describe('hasSiblingWithInputSignals', () => {
    it('true when sibling has input-suggestive name', () => {
      const siblings = [
        makeInput({ name: 'Label' }),
        makeInput({ name: 'TextInput' }),
      ]
      expect(hasSiblingWithInputSignals(siblings, 'Label')).toBe(true)
    })

    it('true when sibling is wide rectangle with fill', () => {
      const siblings = [
        makeInput({ name: 'Label' }),
        makeInput({
          name: 'Box',
          bounds: makeBounds(300, 40),
          appearance: makeAppearance({
            strokes: [{ kind: 'solid', visible: true, color: '#ccc', opacity: 1, gradientStops: null, tokenRef: null, imageRef: null, weight: 1, align: 'inside' }],
          }),
        }),
      ]
      expect(hasSiblingWithInputSignals(siblings, 'Label')).toBe(true)
    })

    it('skips self', () => {
      const siblings = [makeInput({ name: 'TextInput' })]
      expect(hasSiblingWithInputSignals(siblings, 'TextInput')).toBe(false)
    })

    it('false when no siblings have input signals', () => {
      const siblings = [
        makeInput({ name: 'Label' }),
        makeInput({ name: 'Icon' }),
      ]
      expect(hasSiblingWithInputSignals(siblings, 'Label')).toBe(false)
    })
  })
})
