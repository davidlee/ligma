import { describe, expect, it } from 'vitest'

import { inferRole } from '../../../src/normalize/infer/role.js'

import type { InferenceInput } from '../../../src/normalize/infer/types.js'
import type { NormalizedText } from '../../../src/schemas/normalized.js'

function makeInput(overrides: Partial<InferenceInput> = {}): InferenceInput {
  return {
    type: 'frame',
    name: 'Test',
    visible: true,
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    layout: null,
    appearance: null,
    text: null,
    component: null,
    hierarchy: { parentId: null, depth: 0, childCount: 0, path: [] },
    children: [],
    ...overrides,
  }
}

function makeText(
  content: string,
  style: Partial<NormalizedText['style']> = {},
): NormalizedText {
  return {
    content,
    charactersLength: content.length,
    style: {
      fontFamily: 'Inter',
      fontWeight: 400,
      fontSize: 14,
      lineHeight: null,
      letterSpacing: null,
      textCase: null,
      textAlignHorizontal: null,
      textAlignVertical: null,
      ...style,
    },
    color: null,
    tokenRefs: [],
    semanticKind: 'unknown',
    truncation: null,
  }
}

function makeAppearance(
  overrides: Partial<InferenceInput['appearance']> = {},
): NonNullable<InferenceInput['appearance']> {
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

function makeLayout(
  overrides: Partial<NonNullable<InferenceInput['layout']>> = {},
): NonNullable<InferenceInput['layout']> {
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

const VISIBLE_FILL = {
  kind: 'solid' as const,
  visible: true,
  color: '#000',
  opacity: 1,
  gradientStops: null,
  tokenRef: null,
  imageRef: null,
}

describe('inferRole (VT-017)', () => {
  describe('noise early-out', () => {
    it('invisible node returns null with high confidence', () => {
      const result = inferRole(makeInput({ visible: false }))
      expect(result.value).toBeNull()
      expect(result.confidence).toBe('high')
      expect(result.warnings).toContain('Invisible node — no meaningful role')
    })

    it('zero-size node returns null with high confidence', () => {
      const result = inferRole(makeInput({
        bounds: { x: 0, y: 0, width: 0, height: 0 },
      }))
      expect(result.value).toBeNull()
      expect(result.confidence).toBe('high')
    })
  })

  describe('rule 1: image', () => {
    it('image type returns image role', () => {
      const result = inferRole(makeInput({ type: 'image' }))
      expect(result.value).toBe('image')
      expect(result.confidence).toBe('high')
    })

    it('non-image type does not match', () => {
      const result = inferRole(makeInput({ type: 'frame' }))
      expect(result.value).not.toBe('image')
    })
  })

  describe('rule 2: icon', () => {
    it('small square vector returns icon', () => {
      const result = inferRole(makeInput({
        type: 'vector',
        bounds: { x: 0, y: 0, width: 24, height: 24 },
      }))
      expect(result.value).toBe('icon')
    })

    it('name reinforcement gives high confidence', () => {
      const result = inferRole(makeInput({
        type: 'vector',
        name: 'icon/arrow',
        bounds: { x: 0, y: 0, width: 24, height: 24 },
      }))
      expect(result.value).toBe('icon')
      expect(result.confidence).toBe('high')
    })

    it('without name reinforcement gives medium confidence', () => {
      const result = inferRole(makeInput({
        type: 'vector',
        name: 'Shape',
        bounds: { x: 0, y: 0, width: 24, height: 24 },
      }))
      expect(result.value).toBe('icon')
      expect(result.confidence).toBe('medium')
    })

    it('too large does not match', () => {
      const result = inferRole(makeInput({
        type: 'vector',
        bounds: { x: 0, y: 0, width: 64, height: 64 },
      }))
      expect(result.value).not.toBe('icon')
    })

    it('name alone is insufficient (hard rule)', () => {
      const result = inferRole(makeInput({
        type: 'vector',
        name: 'icon/big-illustration',
        bounds: { x: 0, y: 0, width: 200, height: 200 },
      }))
      expect(result.value).not.toBe('icon')
    })

    it('with text children does not match', () => {
      const result = inferRole(makeInput({
        type: 'group',
        bounds: { x: 0, y: 0, width: 24, height: 24 },
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
        children: [makeInput({ type: 'text' })],
      }))
      expect(result.value).not.toBe('icon')
    })
  })

  describe('rule 3: button', () => {
    it('frame with short text, auto-layout, padding, fill returns button', () => {
      const result = inferRole(makeInput({
        type: 'frame',
        layout: makeLayout({
          mode: 'horizontal',
          padding: { top: 8, right: 16, bottom: 8, left: 16 },
        }),
        appearance: makeAppearance({ fills: [VISIBLE_FILL] }),
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
        children: [makeInput({
          type: 'text',
          text: makeText('Submit'),
        })],
      }))
      expect(result.value).toBe('button')
      expect(result.confidence).toBe('high')
    })

    it('icon without text returns icon-button', () => {
      const result = inferRole(makeInput({
        type: 'frame',
        name: 'btn-close',
        layout: makeLayout({
          mode: 'horizontal',
          padding: { top: 8, right: 8, bottom: 8, left: 8 },
        }),
        appearance: makeAppearance({ fills: [VISIBLE_FILL] }),
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
        children: [makeInput({ type: 'vector', bounds: { x: 0, y: 0, width: 16, height: 16 } })],
      }))
      expect(result.value).toBe('icon-button')
    })

    it('fewer than 2 signals does not match', () => {
      const result = inferRole(makeInput({
        type: 'frame',
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
        children: [makeInput({ type: 'text', text: makeText('Ok') })],
      }))
      expect(result.value).not.toBe('button')
    })
  })

  describe('rule 4: input', () => {
    it('wide frame with fill and input name returns input/high', () => {
      const result = inferRole(makeInput({
        type: 'frame',
        name: 'TextInput',
        bounds: { x: 0, y: 0, width: 300, height: 40 },
        appearance: makeAppearance({ fills: [VISIBLE_FILL] }),
      }))
      expect(result.value).toBe('input')
      expect(result.confidence).toBe('high')
    })

    it('wide frame with stroke but no input name returns input/medium', () => {
      const result = inferRole(makeInput({
        type: 'frame',
        name: 'Box',
        bounds: { x: 0, y: 0, width: 300, height: 40 },
        appearance: makeAppearance({
          strokes: [{ ...VISIBLE_FILL, weight: 1, align: 'inside' }],
        }),
      }))
      expect(result.value).toBe('input')
      expect(result.confidence).toBe('medium')
    })

    it('square frame does not match', () => {
      const result = inferRole(makeInput({
        type: 'frame',
        name: 'TextInput',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        appearance: makeAppearance({ fills: [VISIBLE_FILL] }),
      }))
      expect(result.value).not.toBe('input')
    })
  })

  describe('rule 5: heading', () => {
    it('large bold short text returns heading/high', () => {
      const result = inferRole(makeInput({
        type: 'text',
        text: makeText('Welcome', { fontSize: 24, fontWeight: 700 }),
      }))
      expect(result.value).toBe('heading')
      expect(result.confidence).toBe('high')
    })

    it('large but light text returns heading/medium', () => {
      const result = inferRole(makeInput({
        type: 'text',
        text: makeText('Welcome', { fontSize: 24, fontWeight: 300 }),
      }))
      expect(result.value).toBe('heading')
      expect(result.confidence).toBe('medium')
    })

    it('small text does not match', () => {
      const result = inferRole(makeInput({
        type: 'text',
        text: makeText('Hello', { fontSize: 14, fontWeight: 700 }),
      }))
      expect(result.value).not.toBe('heading')
    })
  })

  describe('rule 6: label', () => {
    it('short text next to input-like sibling returns label', () => {
      const label = makeInput({
        type: 'text',
        name: 'Email',
        text: makeText('Email'),
      })
      const inputSibling = makeInput({
        name: 'EmailInput',
        bounds: { x: 0, y: 0, width: 300, height: 40 },
      })
      const result = inferRole(label, [label, inputSibling])
      expect(result.value).toBe('label')
      expect(result.confidence).toBe('medium')
    })

    it('long text does not match label', () => {
      const label = makeInput({
        type: 'text',
        name: 'Description',
        text: makeText('A'.repeat(50)),
      })
      const inputSibling = makeInput({ name: 'TextInput' })
      const result = inferRole(label, [label, inputSibling])
      expect(result.value).not.toBe('label')
    })

    it('without input-like sibling does not match', () => {
      const label = makeInput({
        type: 'text',
        name: 'Title',
        text: makeText('Title'),
      })
      const result = inferRole(label, [label, makeInput({ name: 'Icon' })])
      expect(result.value).not.toBe('label')
    })
  })

  describe('rule 7: body-text', () => {
    it('long text returns body-text', () => {
      const result = inferRole(makeInput({
        type: 'text',
        text: makeText('A'.repeat(100)),
      }))
      expect(result.value).toBe('body-text')
      expect(result.confidence).toBe('medium')
    })

    it('normal weight medium size returns body-text', () => {
      const result = inferRole(makeInput({
        type: 'text',
        text: makeText('Short text here', { fontWeight: 400, fontSize: 14 }),
      }))
      expect(result.value).toBe('body-text')
    })
  })

  describe('rule 8: divider', () => {
    it('line type returns divider', () => {
      const result = inferRole(makeInput({ type: 'line' }))
      expect(result.value).toBe('divider')
      expect(result.confidence).toBe('high')
    })

    it('thin frame returns divider', () => {
      const result = inferRole(makeInput({
        bounds: { x: 0, y: 0, width: 300, height: 1 },
      }))
      expect(result.value).toBe('divider')
    })
  })

  describe('rule 9: grid', () => {
    it('grid layout mode returns grid', () => {
      const result = inferRole(makeInput({
        layout: makeLayout({ mode: 'grid' }),
      }))
      expect(result.value).toBe('grid')
      expect(result.confidence).toBe('high')
    })

    it('auto-layout with wrap returns grid', () => {
      const result = inferRole(makeInput({
        layout: makeLayout({ mode: 'horizontal', wrap: true }),
      }))
      expect(result.value).toBe('grid')
    })
  })

  describe('rule 10: stack', () => {
    it('auto-layout with children and gap returns stack', () => {
      const result = inferRole(makeInput({
        layout: makeLayout({ mode: 'vertical', gap: 8 }),
        hierarchy: { parentId: null, depth: 0, childCount: 2, path: [] },
        children: [makeInput(), makeInput()],
      }))
      expect(result.value).toBe('stack')
      expect(result.confidence).toBe('high')
    })

    it('auto-layout with children and padding returns stack', () => {
      const result = inferRole(makeInput({
        layout: makeLayout({
          mode: 'horizontal',
          padding: { top: 8, right: 8, bottom: 8, left: 8 },
        }),
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
        children: [makeInput()],
      }))
      expect(result.value).toBe('stack')
    })

    it('no children does not match', () => {
      const result = inferRole(makeInput({
        layout: makeLayout({ mode: 'vertical', gap: 8 }),
        hierarchy: { parentId: null, depth: 0, childCount: 0, path: [] },
      }))
      expect(result.value).not.toBe('stack')
    })
  })

  describe('rule 11: card', () => {
    it('frame with fill, corner radius, mixed children returns card', () => {
      const result = inferRole(makeInput({
        type: 'frame',
        bounds: { x: 0, y: 0, width: 300, height: 250 },
        appearance: makeAppearance({
          fills: [VISIBLE_FILL],
          cornerRadius: { uniform: true, radius: 8 },
        }),
        hierarchy: { parentId: null, depth: 0, childCount: 2, path: [] },
        children: [
          makeInput({ type: 'text' }),
          makeInput({ type: 'frame' }),
        ],
      }))
      expect(result.value).toBe('card')
      expect(result.confidence).toBe('medium')
    })

    it('single child type does not match', () => {
      const result = inferRole(makeInput({
        type: 'frame',
        appearance: makeAppearance({
          fills: [VISIBLE_FILL],
          cornerRadius: { uniform: true, radius: 8 },
        }),
        hierarchy: { parentId: null, depth: 0, childCount: 2, path: [] },
        children: [makeInput({ type: 'text' }), makeInput({ type: 'text' })],
      }))
      expect(result.value).not.toBe('card')
    })
  })

  describe('rule 12: container', () => {
    it('frame with children and layout returns container', () => {
      const result = inferRole(makeInput({
        type: 'frame',
        layout: makeLayout({ mode: 'vertical' }),
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
        children: [makeInput()],
      }))
      expect(result.value).toBe('container')
      expect(result.confidence).toBe('high')
    })

    it('no children does not match', () => {
      const result = inferRole(makeInput({
        type: 'frame',
        layout: makeLayout({ mode: 'vertical' }),
        hierarchy: { parentId: null, depth: 0, childCount: 0, path: [] },
      }))
      expect(result.value).not.toBe('container')
    })
  })

  describe('rule 13: fallback', () => {
    it('unmatched node returns null with low confidence', () => {
      const result = inferRole(makeInput({
        type: 'shape',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      }))
      expect(result.value).toBeNull()
      expect(result.confidence).toBe('low')
      expect(result.warnings).toContain('No role rule matched')
    })
  })

  describe('priority ordering', () => {
    it('image takes priority over icon (small image)', () => {
      const result = inferRole(makeInput({
        type: 'image',
        bounds: { x: 0, y: 0, width: 24, height: 24 },
      }))
      expect(result.value).toBe('image')
    })

    it('icon takes priority over button (small instance)', () => {
      const result = inferRole(makeInput({
        type: 'instance',
        bounds: { x: 0, y: 0, width: 24, height: 24 },
      }))
      expect(result.value).toBe('icon')
    })

    it('divider takes priority over grid (thin with grid layout)', () => {
      const result = inferRole(makeInput({
        bounds: { x: 0, y: 0, width: 300, height: 1 },
        layout: makeLayout({ mode: 'grid' }),
      }))
      expect(result.value).toBe('divider')
    })
  })
})
