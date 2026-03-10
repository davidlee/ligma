import { describe, expect, it } from 'vitest'

import { applyInferences, applyInferencesRecursive } from '../../../src/normalize/infer/index.js'

import type { InferenceInput } from '../../../src/normalize/infer/types.js'
import type { NormalizedNode, NormalizedText } from '../../../src/schemas/normalized.js'

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

function makeNode(overrides: Partial<NormalizedNode> = {}): NormalizedNode {
  return {
    id: '1:1',
    name: 'Test',
    type: 'frame',
    role: null,
    visible: true,
    bounds: { x: 0, y: 0, width: 200, height: 100 },
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

describe('applyInferences (VT-020)', () => {
  describe('composition wiring', () => {
    it('returns role, semantics, and textKind results', () => {
      const input = makeInput({ type: 'image' })
      const results = applyInferences(input, [])
      expect(results.role.value).toBe('image')
      expect(results.semantics.value.likelyImage).toBe(true)
      expect(results.textKind).toBeNull()
    })

    it('textKind populated for text nodes', () => {
      const input = makeInput({
        type: 'text',
        text: makeText('Welcome', { fontSize: 24, fontWeight: 700 }),
      })
      const results = applyInferences(input, [])
      expect(results.role.value).toBe('heading')
      expect(results.textKind?.value).toBe('heading')
    })

    it('passes parent role to textKind when no role match', () => {
      const input = makeInput({
        type: 'text',
        text: makeText('Ok', { fontSize: null, fontWeight: null }),
      })
      const results = applyInferences(input, [], 'button')
      expect(results.textKind?.value).toBe('button')
    })
  })

  describe('min confidence across results', () => {
    it('role low drags overall to low', () => {
      const input = makeInput({ type: 'shape', bounds: { x: 0, y: 0, width: 100, height: 100 } })
      const results = applyInferences(input, [])
      expect(results.role.confidence).toBe('low')
    })
  })
})

describe('applyInferencesRecursive (VT-020)', () => {
  it('mutates node role in-place', () => {
    const node = makeNode({ type: 'image' })
    applyInferencesRecursive(node)
    expect(node.role).toBe('image')
  })

  it('mutates semantics in-place', () => {
    const node = makeNode({ type: 'image' })
    applyInferencesRecursive(node)
    expect(node.semantics.likelyImage).toBe(true)
  })

  it('updates text.semanticKind', () => {
    const node = makeNode({
      type: 'text',
      text: makeText('Welcome', { fontSize: 24, fontWeight: 700 }),
    })
    applyInferencesRecursive(node)
    expect(node.text?.semanticKind).toBe('heading')
  })

  it('updates diagnostics confidence to include inference', () => {
    const node = makeNode({
      type: 'shape',
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      diagnostics: {
        sourceNodeType: 'RECTANGLE',
        omittedFields: [],
        warnings: [],
        confidence: 'high',
      },
    })
    applyInferencesRecursive(node)
    // Unmatched shape → role low → overall confidence drops to low
    expect(node.diagnostics.confidence).toBe('low')
  })

  it('recurses children top-down', () => {
    const child = makeNode({
      id: '2:1',
      type: 'text',
      text: makeText('Body text here'),
      hierarchy: { parentId: '1:1', depth: 1, childCount: 0, path: [] },
    })
    const parent = makeNode({
      type: 'frame',
      hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
      children: [child],
    })
    applyInferencesRecursive(parent)
    expect(child.role).not.toBeNull()
  })

  it('passes parent role to children for text-kind inference', () => {
    const textChild = makeNode({
      id: '2:1',
      type: 'text',
      text: makeText('Ok', { fontSize: null, fontWeight: null }),
      hierarchy: { parentId: '1:1', depth: 1, childCount: 0, path: [] },
    })
    const buttonParent = makeNode({
      type: 'frame',
      name: 'btn-submit',
      layout: {
        mode: 'horizontal',
        sizing: { horizontal: 'fixed', vertical: 'fixed' },
        align: { main: 'start', cross: 'start' },
        padding: { top: 8, right: 16, bottom: 8, left: 16 },
        gap: null,
        wrap: null,
        grid: null,
        constraints: null,
        position: null,
        clipsContent: null,
      },
      appearance: {
        fills: [{ kind: 'solid', visible: true, color: '#000', opacity: 1, gradientStops: null, tokenRef: null, imageRef: null }],
        strokes: [],
        cornerRadius: null,
        effects: [],
        blendMode: null,
        opacity: null,
      },
      hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
      children: [textChild],
    })
    applyInferencesRecursive(buttonParent)
    expect(buttonParent.role).toBe('button')
    expect(textChild.text?.semanticKind).toBe('button')
  })

  it('appends inference warnings to diagnostics', () => {
    const node = makeNode({ visible: false })
    applyInferencesRecursive(node)
    expect(node.diagnostics.warnings).toContain('Invisible node — no meaningful role')
  })
})
