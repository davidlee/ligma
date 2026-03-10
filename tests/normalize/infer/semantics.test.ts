import { describe, expect, it } from 'vitest'

import { inferSemantics } from '../../../src/normalize/infer/semantics.js'

import type { InferenceInput } from '../../../src/normalize/infer/types.js'
import type { NormalizedComponentInfo } from '../../../src/schemas/normalized.js'

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

function makeComponent(
  overrides: Partial<NormalizedComponentInfo> = {},
): NormalizedComponentInfo {
  return {
    kind: 'instance',
    componentId: 'comp:1',
    componentName: 'Button',
    componentSetId: null,
    propertyValues: {},
    propertyReferences: {},
    isReusable: true,
    ...overrides,
  }
}

describe('inferSemantics (VT-019)', () => {
  describe('likelyInteractive', () => {
    it('true for button role', () => {
      expect(inferSemantics(makeInput(), 'button', 'high', null).value.likelyInteractive).toBe(true)
    })

    it('true for icon-button role', () => {
      expect(inferSemantics(makeInput(), 'icon-button', 'high', null).value.likelyInteractive).toBe(true)
    })

    it('true for input role', () => {
      expect(inferSemantics(makeInput(), 'input', 'high', null).value.likelyInteractive).toBe(true)
    })

    it('true for navigation role', () => {
      expect(inferSemantics(makeInput(), 'navigation', 'high', null).value.likelyInteractive).toBe(true)
    })

    it('false for container role', () => {
      expect(inferSemantics(makeInput(), 'container', 'high', null).value.likelyInteractive).toBe(false)
    })

    it('false for null role', () => {
      expect(inferSemantics(makeInput(), null, 'low', null).value.likelyInteractive).toBe(false)
    })
  })

  describe('likelyTextInput', () => {
    it('true for input role', () => {
      expect(inferSemantics(makeInput(), 'input', 'high', null).value.likelyTextInput).toBe(true)
    })

    it('false for button role', () => {
      expect(inferSemantics(makeInput(), 'button', 'high', null).value.likelyTextInput).toBe(false)
    })
  })

  describe('likelyIcon', () => {
    it('true for icon role', () => {
      expect(inferSemantics(makeInput(), 'icon', 'high', null).value.likelyIcon).toBe(true)
    })

    it('false for image role', () => {
      expect(inferSemantics(makeInput(), 'image', 'high', null).value.likelyIcon).toBe(false)
    })
  })

  describe('likelyImage', () => {
    it('true for image role', () => {
      expect(inferSemantics(makeInput(), 'image', 'high', null).value.likelyImage).toBe(true)
    })

    it('true for image type regardless of role', () => {
      expect(inferSemantics(makeInput({ type: 'image' }), null, 'low', null).value.likelyImage).toBe(true)
    })

    it('false for non-image type and role', () => {
      expect(inferSemantics(makeInput(), 'container', 'high', null).value.likelyImage).toBe(false)
    })
  })

  describe('likelyMask', () => {
    it('true for mask type', () => {
      expect(inferSemantics(makeInput({ type: 'mask' }), null, 'low', null).value.likelyMask).toBe(true)
    })

    it('false for non-mask type', () => {
      expect(inferSemantics(makeInput(), null, 'low', null).value.likelyMask).toBe(false)
    })
  })

  describe('likelyReusableComponent', () => {
    it('true when component is reusable', () => {
      const result = inferSemantics(makeInput(), null, 'low', makeComponent())
      expect(result.value.likelyReusableComponent).toBe(true)
    })

    it('false when component is not reusable', () => {
      const result = inferSemantics(makeInput(), null, 'low', makeComponent({ isReusable: false }))
      expect(result.value.likelyReusableComponent).toBe(false)
    })

    it('false when no component', () => {
      expect(inferSemantics(makeInput(), null, 'low', null).value.likelyReusableComponent).toBe(false)
    })
  })

  describe('confidence', () => {
    it('inherits from role confidence', () => {
      expect(inferSemantics(makeInput(), 'button', 'medium', null).confidence).toBe('medium')
    })

    it('low when no role', () => {
      expect(inferSemantics(makeInput(), null, 'low', null).confidence).toBe('low')
    })
  })
})
