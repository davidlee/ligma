import { describe, expect, it } from 'vitest'

import { extractLayout } from '../../src/normalize/layout.js'
import { FigmaNodeSchema } from '../../src/schemas/raw.js'

function makeNode(
  type: string,
  extra: Record<string, unknown> = {},
): ReturnType<typeof FigmaNodeSchema.parse> {
  return FigmaNodeSchema.parse({ id: '1:1', name: 'Test', type, ...extra })
}

describe('extractLayout (VT-009)', () => {
  describe('mode resolution', () => {
    it('maps HORIZONTAL → horizontal', () => {
      const result = extractLayout(makeNode('FRAME', { layoutMode: 'HORIZONTAL' }))
      expect(result.value.mode).toBe('horizontal')
    })

    it('maps VERTICAL → vertical', () => {
      const result = extractLayout(makeNode('FRAME', { layoutMode: 'VERTICAL' }))
      expect(result.value.mode).toBe('vertical')
    })

    it('maps GRID → grid', () => {
      const result = extractLayout(makeNode('FRAME', { layoutMode: 'GRID' }))
      expect(result.value.mode).toBe('grid')
    })

    it('FRAME with no layoutMode and children → absolute', () => {
      const node = makeNode('FRAME', {
        children: [{ id: '2:1', name: 'Child', type: 'RECTANGLE' }],
      })
      expect(extractLayout(node).value.mode).toBe('absolute')
    })

    it('COMPONENT with no layoutMode and children → absolute', () => {
      const node = makeNode('COMPONENT', {
        children: [{ id: '2:1', name: 'Child', type: 'RECTANGLE' }],
      })
      expect(extractLayout(node).value.mode).toBe('absolute')
    })

    it('INSTANCE with no layoutMode and children → absolute', () => {
      const node = makeNode('INSTANCE', {
        children: [{ id: '2:1', name: 'Child', type: 'RECTANGLE' }],
      })
      expect(extractLayout(node).value.mode).toBe('absolute')
    })

    it('FRAME with no children → none', () => {
      expect(extractLayout(makeNode('FRAME')).value.mode).toBe('none')
    })

    it('GROUP with children → none (not absolute)', () => {
      const node = makeNode('GROUP', {
        children: [{ id: '2:1', name: 'Child', type: 'RECTANGLE' }],
      })
      expect(extractLayout(node).value.mode).toBe('none')
    })

    it('SECTION → none', () => {
      const node = makeNode('SECTION', {
        children: [{ id: '2:1', name: 'Child', type: 'RECTANGLE' }],
      })
      expect(extractLayout(node).value.mode).toBe('none')
    })

    it('RECTANGLE → none', () => {
      expect(extractLayout(makeNode('RECTANGLE')).value.mode).toBe('none')
    })
  })

  describe('sizing', () => {
    it('prefers layoutSizingHorizontal/Vertical', () => {
      const node = makeNode('FRAME', {
        layoutMode: 'HORIZONTAL',
        layoutSizingHorizontal: 'HUG',
        layoutSizingVertical: 'FILL',
      })
      expect(extractLayout(node).value.sizing).toEqual({
        horizontal: 'hug', vertical: 'fill',
      })
    })

    it('falls back to primaryAxisSizingMode', () => {
      const node = makeNode('FRAME', {
        layoutMode: 'HORIZONTAL',
        primaryAxisSizingMode: 'AUTO',
        counterAxisSizingMode: 'FIXED',
      })
      expect(extractLayout(node).value.sizing).toEqual({
        horizontal: 'hug', vertical: 'fixed',
      })
    })

    it('defaults to fixed when absent', () => {
      const node = makeNode('FRAME')
      expect(extractLayout(node).value.sizing).toEqual({
        horizontal: 'fixed', vertical: 'fixed',
      })
    })
  })

  describe('alignment', () => {
    it('maps primaryAxisAlignItems → main', () => {
      const node = makeNode('FRAME', {
        layoutMode: 'HORIZONTAL',
        primaryAxisAlignItems: 'SPACE_BETWEEN',
      })
      expect(extractLayout(node).value.align.main).toBe('space-between')
    })

    it('maps counterAxisAlignItems with BASELINE → baseline', () => {
      const node = makeNode('FRAME', {
        layoutMode: 'HORIZONTAL',
        counterAxisAlignItems: 'BASELINE',
      })
      expect(extractLayout(node).value.align.cross).toBe('baseline')
    })

    it('defaults to unknown when absent', () => {
      const node = makeNode('FRAME')
      expect(extractLayout(node).value.align).toEqual({
        main: 'unknown', cross: 'unknown',
      })
    })
  })

  describe('padding', () => {
    it('extracts padding from auto-layout frame', () => {
      const node = makeNode('FRAME', {
        layoutMode: 'HORIZONTAL',
        paddingTop: 10, paddingRight: 20, paddingBottom: 10, paddingLeft: 20,
      })
      expect(extractLayout(node).value.padding).toEqual({
        top: 10, right: 20, bottom: 10, left: 20,
      })
    })

    it('returns null when all zero and no auto-layout', () => {
      const node = makeNode('FRAME')
      expect(extractLayout(node).value.padding).toBeNull()
    })

    it('returns zero padding for auto-layout', () => {
      const node = makeNode('FRAME', { layoutMode: 'HORIZONTAL' })
      expect(extractLayout(node).value.padding).toEqual({
        top: 0, right: 0, bottom: 0, left: 0,
      })
    })
  })

  describe('gap', () => {
    it('extracts itemSpacing for auto-layout', () => {
      const node = makeNode('FRAME', {
        layoutMode: 'HORIZONTAL', itemSpacing: 12,
      })
      expect(extractLayout(node).value.gap).toBe(12)
    })

    it('handles negative gap', () => {
      const node = makeNode('FRAME', {
        layoutMode: 'HORIZONTAL', itemSpacing: -4,
      })
      expect(extractLayout(node).value.gap).toBe(-4)
    })

    it('returns null for non-auto-layout', () => {
      expect(extractLayout(makeNode('FRAME')).value.gap).toBeNull()
    })
  })

  describe('wrap', () => {
    it('maps WRAP → true', () => {
      const node = makeNode('FRAME', { layoutWrap: 'WRAP' })
      expect(extractLayout(node).value.wrap).toBe(true)
    })

    it('maps NO_WRAP → false', () => {
      const node = makeNode('FRAME', { layoutWrap: 'NO_WRAP' })
      expect(extractLayout(node).value.wrap).toBe(false)
    })

    it('returns null when absent', () => {
      expect(extractLayout(makeNode('FRAME')).value.wrap).toBeNull()
    })

    it('adds counterAxisSpacing to omittedFields when wrap is true', () => {
      const node = makeNode('FRAME', { layoutWrap: 'WRAP' })
      expect(extractLayout(node).omittedFields).toContain('counterAxisSpacing')
    })
  })

  describe('grid', () => {
    it('populates grid subobject for grid mode', () => {
      const node = makeNode('FRAME', {
        layoutMode: 'GRID',
        gridRowCount: 3, gridColumnCount: 4,
        gridRowGap: 8, gridColumnGap: 12,
      })
      expect(extractLayout(node).value.grid).toEqual({
        rows: 3, columns: 4, rowGap: 8, columnGap: 12,
      })
    })

    it('returns null grid for non-grid mode', () => {
      const node = makeNode('FRAME', { layoutMode: 'HORIZONTAL' })
      expect(extractLayout(node).value.grid).toBeNull()
    })
  })

  describe('constraints', () => {
    it('maps constraint values', () => {
      const node = makeNode('RECTANGLE', {
        constraints: { horizontal: 'STRETCH', vertical: 'SCALE' },
      })
      expect(extractLayout(node).value.constraints).toEqual({
        horizontal: 'stretch', vertical: 'scale',
      })
    })

    it('returns null when constraints absent', () => {
      expect(extractLayout(makeNode('RECTANGLE')).value.constraints).toBeNull()
    })

    it('maps unknown constraint value with warning', () => {
      const node = makeNode('RECTANGLE', {
        constraints: { horizontal: 'NEW_VALUE', vertical: 'MIN' },
      })
      const result = extractLayout(node)
      expect(result.value.constraints?.horizontal).toBe('unknown')
      expect(result.value.constraints?.vertical).toBe('min')
      expect(result.warnings).toContain('Unknown constraint value: NEW_VALUE')
    })
  })

  describe('position', () => {
    it('extracts x/y with flow positioning', () => {
      const node = makeNode('RECTANGLE', { x: 100, y: 200 })
      expect(extractLayout(node).value.position).toEqual({
        x: 100, y: 200, positioning: 'flow',
      })
    })

    it('maps layoutPositioning ABSOLUTE', () => {
      const node = makeNode('RECTANGLE', {
        x: 50, y: 75, layoutPositioning: 'ABSOLUTE',
      })
      expect(extractLayout(node).value.position).toEqual({
        x: 50, y: 75, positioning: 'absolute',
      })
    })

    it('returns null when x/y absent', () => {
      expect(extractLayout(makeNode('RECTANGLE')).value.position).toBeNull()
    })
  })

  describe('clipsContent', () => {
    it('extracts clipsContent boolean', () => {
      const node = makeNode('FRAME', { clipsContent: true })
      expect(extractLayout(node).value.clipsContent).toBe(true)
    })

    it('returns null when absent', () => {
      expect(extractLayout(makeNode('FRAME')).value.clipsContent).toBeNull()
    })
  })
})
