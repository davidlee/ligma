import { describe, expect, it } from 'vitest'

import { inferTextKind } from '../../../src/normalize/infer/text-kind.js'

import type { InferenceInput } from '../../../src/normalize/infer/types.js'
import type { NormalizedText } from '../../../src/schemas/normalized.js'

function makeInput(overrides: Partial<InferenceInput> = {}): InferenceInput {
  return {
    type: 'text',
    name: 'Text',
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

describe('inferTextKind (VT-018)', () => {
  describe('non-text returns null', () => {
    it('frame type returns null', () => {
      expect(inferTextKind(makeInput({ type: 'frame' }), null, 'high')).toBeNull()
    })
  })

  describe('role-derived mapping', () => {
    it('heading role → heading kind', () => {
      const result = inferTextKind(makeInput(), 'heading', 'high')
      expect(result?.value).toBe('heading')
      expect(result?.confidence).toBe('high')
    })

    it('body-text role → body kind', () => {
      expect(inferTextKind(makeInput(), 'body-text', 'medium')?.value).toBe('body')
    })

    it('label role → label kind', () => {
      expect(inferTextKind(makeInput(), 'label', 'medium')?.value).toBe('label')
    })

    it('button role → button kind', () => {
      expect(inferTextKind(makeInput(), 'button', 'high')?.value).toBe('button')
    })

    it('icon-button role → button kind', () => {
      expect(inferTextKind(makeInput(), 'icon-button', 'high')?.value).toBe('button')
    })

    it('confidence inherits from role', () => {
      const result = inferTextKind(makeInput(), 'heading', 'medium')
      expect(result?.confidence).toBe('medium')
    })
  })

  describe('parent role context', () => {
    it('null role + button parent → button kind', () => {
      const result = inferTextKind(makeInput(), null, 'low', 'button')
      expect(result?.value).toBe('button')
      expect(result?.confidence).toBe('medium')
    })

    it('null role + icon-button parent → button kind', () => {
      const result = inferTextKind(makeInput(), null, 'low', 'icon-button')
      expect(result?.value).toBe('button')
    })

    it('null role + non-button parent falls through to heuristic', () => {
      const result = inferTextKind(
        makeInput({ text: makeText('Short') }),
        null, 'low', 'container',
      )
      expect(result?.value).not.toBe('button')
    })
  })

  describe('fallback heuristic', () => {
    it('large bold text → heading/high', () => {
      const result = inferTextKind(
        makeInput({ text: makeText('Title', { fontSize: 24, fontWeight: 700 }) }),
        null, 'low',
      )
      expect(result?.value).toBe('heading')
      expect(result?.confidence).toBe('high')
    })

    it('large light text → heading/medium', () => {
      const result = inferTextKind(
        makeInput({ text: makeText('Title', { fontSize: 24, fontWeight: 300 }) }),
        null, 'low',
      )
      expect(result?.value).toBe('heading')
      expect(result?.confidence).toBe('medium')
    })

    it('small font → caption', () => {
      const result = inferTextKind(
        makeInput({ text: makeText('Note', { fontSize: 10 }) }),
        null, 'low',
      )
      expect(result?.value).toBe('caption')
    })

    it('long text → body', () => {
      const result = inferTextKind(
        makeInput({ text: makeText('A'.repeat(100)) }),
        null, 'low',
      )
      expect(result?.value).toBe('body')
    })

    it('no signals → unknown', () => {
      const result = inferTextKind(
        makeInput({ text: makeText('Short') }),
        null, 'low',
      )
      expect(result?.value).toBe('unknown')
    })

    it('null text → unknown', () => {
      const result = inferTextKind(makeInput(), null, 'low')
      expect(result?.value).toBe('unknown')
    })
  })
})
