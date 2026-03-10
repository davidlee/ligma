import { describe, expect, it } from 'vitest'

import { extractAppearance } from '../../src/normalize/appearance.js'
import { FigmaNodeSchema } from '../../src/schemas/raw.js'

function makeNode(extra: Record<string, unknown> = {}): ReturnType<typeof FigmaNodeSchema.parse> {
  return FigmaNodeSchema.parse({ id: '1:1', name: 'Test', type: 'RECTANGLE', ...extra })
}

describe('extractAppearance (VT-010)', () => {
  describe('fills', () => {
    it('normalizes solid fill with color', () => {
      const node = makeNode({
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, visible: true }],
      })
      const result = extractAppearance(node)
      expect(result.value.fills).toHaveLength(1)
      expect(result.value.fills[0]).toMatchObject({
        kind: 'solid', visible: true, color: '#ff0000',
      })
    })

    it('converts color with alpha', () => {
      const node = makeNode({
        fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 0.5 } }],
      })
      expect(extractAppearance(node).value.fills[0]?.color).toBe('#00000080')
    })

    it('normalizes gradient fill', () => {
      const node = makeNode({
        fills: [{
          type: 'GRADIENT_LINEAR',
          gradientStops: [
            { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
            { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
          ],
        }],
      })
      const fill = extractAppearance(node).value.fills[0]
      expect(fill?.kind).toBe('gradient')
      expect(fill?.gradientStops).toHaveLength(2)
    })

    it('normalizes image fill with imageRef', () => {
      const node = makeNode({
        fills: [{ type: 'IMAGE', imageRef: 'abc123' }],
      })
      const fill = extractAppearance(node).value.fills[0]
      expect(fill?.kind).toBe('image')
      expect(fill?.imageRef).toBe('abc123')
    })

    it('normalizes video fill', () => {
      const node = makeNode({
        fills: [{ type: 'VIDEO' }],
      })
      expect(extractAppearance(node).value.fills[0]?.kind).toBe('video')
    })

    it('warns on EMOJI paint type', () => {
      const node = makeNode({ fills: [{ type: 'EMOJI' }] })
      const result = extractAppearance(node)
      expect(result.value.fills[0]?.kind).toBe('unknown')
      expect(result.warnings).toContain('Unsupported paint type: EMOJI')
    })

    it('warns on PATTERN paint type', () => {
      const node = makeNode({ fills: [{ type: 'PATTERN' }] })
      const result = extractAppearance(node)
      expect(result.warnings).toContain('Unsupported paint type: PATTERN')
    })

    it('extracts per-paint opacity', () => {
      const node = makeNode({
        fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.5 }],
      })
      expect(extractAppearance(node).value.fills[0]?.opacity).toBe(0.5)
    })

    it('returns empty fills when absent', () => {
      expect(extractAppearance(makeNode()).value.fills).toEqual([])
    })

    it('fill visibility defaults to true', () => {
      const node = makeNode({ fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] })
      expect(extractAppearance(node).value.fills[0]?.visible).toBe(true)
    })

    it('respects visible: false', () => {
      const node = makeNode({
        fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: false }],
      })
      expect(extractAppearance(node).value.fills[0]?.visible).toBe(false)
    })
  })

  describe('strokes', () => {
    it('normalizes stroke with weight and align', () => {
      const node = makeNode({
        strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
        strokeWeight: 2,
        strokeAlign: 'INSIDE',
      })
      const stroke = extractAppearance(node).value.strokes[0]
      expect(stroke?.kind).toBe('solid')
      expect(stroke?.weight).toBe(2)
      expect(stroke?.align).toBe('inside')
    })

    it('returns null weight when strokeWeight is 0', () => {
      const node = makeNode({
        strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
        strokeWeight: 0,
      })
      expect(extractAppearance(node).value.strokes[0]?.weight).toBeNull()
    })
  })

  describe('corner radius', () => {
    it('extracts uniform corner radius', () => {
      const node = makeNode({ cornerRadius: 8 })
      expect(extractAppearance(node).value.cornerRadius).toEqual({
        uniform: true, radius: 8,
      })
    })

    it('extracts per-corner radii', () => {
      const node = makeNode({ rectangleCornerRadii: [4, 8, 12, 16] })
      expect(extractAppearance(node).value.cornerRadius).toEqual({
        uniform: false, topLeft: 4, topRight: 8, bottomRight: 12, bottomLeft: 16,
      })
    })

    it('detects uniform from rectangleCornerRadii', () => {
      const node = makeNode({ rectangleCornerRadii: [10, 10, 10, 10] })
      expect(extractAppearance(node).value.cornerRadius).toEqual({
        uniform: true, radius: 10,
      })
    })

    it('returns null when no corner radius', () => {
      expect(extractAppearance(makeNode()).value.cornerRadius).toBeNull()
    })
  })

  describe('effects', () => {
    it('normalizes drop shadow', () => {
      const node = makeNode({
        effects: [{
          type: 'DROP_SHADOW', visible: true,
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          offset: { x: 0, y: 4 }, radius: 8, spread: 0,
        }],
      })
      const effect = extractAppearance(node).value.effects[0]
      expect(effect?.kind).toBe('drop-shadow')
      expect(effect?.offset).toEqual({ x: 0, y: 4 })
      expect(effect?.radius).toBe(8)
    })

    it('normalizes inner shadow', () => {
      const node = makeNode({
        effects: [{ type: 'INNER_SHADOW', color: { r: 0, g: 0, b: 0 } }],
      })
      expect(extractAppearance(node).value.effects[0]?.kind).toBe('inner-shadow')
    })

    it('normalizes layer blur', () => {
      const node = makeNode({
        effects: [{ type: 'LAYER_BLUR', radius: 4 }],
      })
      const effect = extractAppearance(node).value.effects[0]
      expect(effect?.kind).toBe('layer-blur')
      expect(effect?.radius).toBe(4)
    })

    it('normalizes background blur', () => {
      const node = makeNode({
        effects: [{ type: 'BACKGROUND_BLUR', radius: 10 }],
      })
      expect(extractAppearance(node).value.effects[0]?.kind).toBe('background-blur')
    })

    it('warns on TEXTURE effect', () => {
      const node = makeNode({ effects: [{ type: 'TEXTURE' }] })
      const result = extractAppearance(node)
      expect(result.value.effects[0]?.kind).toBe('unknown')
      expect(result.warnings).toContain('Unsupported effect type: TEXTURE')
    })

    it('warns on NOISE effect', () => {
      const node = makeNode({ effects: [{ type: 'NOISE' }] })
      const result = extractAppearance(node)
      expect(result.warnings).toContain('Unsupported effect type: NOISE')
    })
  })

  describe('blendMode', () => {
    it('passes through lowercase', () => {
      const node = makeNode({ blendMode: 'MULTIPLY' })
      expect(extractAppearance(node).value.blendMode).toBe('multiply')
    })

    it('returns null for PASS_THROUGH', () => {
      const node = makeNode({ blendMode: 'PASS_THROUGH' })
      expect(extractAppearance(node).value.blendMode).toBeNull()
    })

    it('preserves NORMAL as "normal"', () => {
      const node = makeNode({ blendMode: 'NORMAL' })
      expect(extractAppearance(node).value.blendMode).toBe('normal')
    })

    it('returns null when absent', () => {
      expect(extractAppearance(makeNode()).value.blendMode).toBeNull()
    })
  })

  describe('node-level opacity', () => {
    it('extracts opacity < 1', () => {
      const node = makeNode({ opacity: 0.5 })
      expect(extractAppearance(node).value.opacity).toBe(0.5)
    })

    it('returns null for opacity 1 (default)', () => {
      const node = makeNode({ opacity: 1 })
      expect(extractAppearance(node).value.opacity).toBeNull()
    })

    it('returns null when absent', () => {
      expect(extractAppearance(makeNode()).value.opacity).toBeNull()
    })
  })
})
