import { describe, expect, it } from 'vitest'

import { NormalizationError } from '../../src/errors.js'
import { normalize } from '../../src/normalize/index.js'
import { normalizeNode } from '../../src/normalize/node.js'
import { FigmaNodeSchema } from '../../src/schemas/raw.js'

import type { NormalizeContext } from '../../src/normalize/node.js'

function makeNode(
  type: string,
  extra: Record<string, unknown> = {},
): ReturnType<typeof FigmaNodeSchema.parse> {
  return FigmaNodeSchema.parse({ id: '1:1', name: 'Test', type, ...extra })
}

const ROOT_CONTEXT: NormalizeContext = { parentId: null, depth: 0, path: [] }

describe('normalizeNode (VT-012)', () => {
  describe('basic node properties', () => {
    it('preserves id, name, type', () => {
      const node = normalizeNode(makeNode('FRAME'), ROOT_CONTEXT)
      expect(node.id).toBe('1:1')
      expect(node.name).toBe('Test')
      expect(node.type).toBe('frame')
    })

    it('role is null in DE-003', () => {
      expect(normalizeNode(makeNode('FRAME'), ROOT_CONTEXT).role).toBeNull()
    })

    it('visible defaults to true', () => {
      expect(normalizeNode(makeNode('FRAME'), ROOT_CONTEXT).visible).toBe(true)
    })

    it('visible false when explicitly set', () => {
      const node = normalizeNode(makeNode('FRAME', { visible: false }), ROOT_CONTEXT)
      expect(node.visible).toBe(false)
    })

    it('rotation null when absent', () => {
      expect(normalizeNode(makeNode('FRAME'), ROOT_CONTEXT).rotation).toBeNull()
    })

    it('rotation null when zero', () => {
      const node = normalizeNode(makeNode('FRAME', { rotation: 0 }), ROOT_CONTEXT)
      expect(node.rotation).toBeNull()
    })

    it('rotation extracted when non-zero', () => {
      const node = normalizeNode(makeNode('FRAME', { rotation: 45 }), ROOT_CONTEXT)
      expect(node.rotation).toBe(45)
    })
  })

  describe('hierarchy', () => {
    it('root node has parentId null, depth 0, empty path', () => {
      const node = normalizeNode(makeNode('FRAME'), ROOT_CONTEXT)
      expect(node.hierarchy).toEqual({
        parentId: null, depth: 0, childCount: 0, path: [],
      })
    })

    it('child has correct parentId and depth', () => {
      const raw = makeNode('FRAME', {
        children: [{ id: '2:1', name: 'Child', type: 'RECTANGLE' }],
      })
      const node = normalizeNode(raw, ROOT_CONTEXT)
      const child = node.children[0]
      expect(child).toBeDefined()
      expect(child?.hierarchy.parentId).toBe('1:1')
      expect(child?.hierarchy.depth).toBe(1)
    })

    it('path contains ancestor breadcrumbs (current node excluded)', () => {
      const raw = makeNode('FRAME', {
        children: [{
          id: '2:1', name: 'Inner', type: 'GROUP',
          children: [{ id: '3:1', name: 'Leaf', type: 'RECTANGLE' }],
        }],
      })
      const node = normalizeNode(raw, ROOT_CONTEXT)
      const leaf = node.children[0]?.children[0]
      expect(leaf?.hierarchy.path).toEqual([
        { id: '1:1', name: 'Test', type: 'FRAME' },
        { id: '2:1', name: 'Inner', type: 'GROUP' },
      ])
    })

    it('childCount reflects raw children length', () => {
      const raw = makeNode('FRAME', {
        children: [
          { id: '2:1', name: 'A', type: 'RECTANGLE' },
          { id: '2:2', name: 'B', type: 'RECTANGLE' },
        ],
      })
      expect(normalizeNode(raw, ROOT_CONTEXT).hierarchy.childCount).toBe(2)
    })
  })

  describe('recursive normalization', () => {
    it('normalizes children recursively', () => {
      const raw = makeNode('FRAME', {
        children: [
          { id: '2:1', name: 'Text', type: 'TEXT', characters: 'Hello', style: {} },
          { id: '2:2', name: 'Rect', type: 'RECTANGLE' },
        ],
      })
      const node = normalizeNode(raw, ROOT_CONTEXT)
      expect(node.children).toHaveLength(2)
      expect(node.children[0]?.type).toBe('text')
      expect(node.children[1]?.type).toBe('shape')
    })

    it('handles deeply nested trees', () => {
      const raw = makeNode('FRAME', {
        children: [{
          id: '2:1', name: 'L1', type: 'FRAME',
          children: [{
            id: '3:1', name: 'L2', type: 'GROUP',
            children: [{ id: '4:1', name: 'L3', type: 'RECTANGLE' }],
          }],
        }],
      })
      const node = normalizeNode(raw, ROOT_CONTEXT)
      const deepest = node.children[0]?.children[0]?.children[0]
      expect(deepest?.hierarchy.depth).toBe(3)
    })
  })

  describe('DEC-018: DOCUMENT/CANVAS skip extractors', () => {
    it('DOCUMENT has null layout, appearance, bounds', () => {
      const node = normalizeNode(makeNode('DOCUMENT'), ROOT_CONTEXT)
      expect(node.layout).toBeNull()
      expect(node.appearance).toBeNull()
      expect(node.bounds).toBeNull()
    })

    it('CANVAS has null layout, appearance, bounds', () => {
      const node = normalizeNode(makeNode('CANVAS'), ROOT_CONTEXT)
      expect(node.layout).toBeNull()
      expect(node.appearance).toBeNull()
      expect(node.bounds).toBeNull()
    })

    it('FRAME has populated layout and appearance', () => {
      const node = normalizeNode(makeNode('FRAME'), ROOT_CONTEXT)
      expect(node.layout).not.toBeNull()
      expect(node.appearance).not.toBeNull()
    })
  })

  describe('diagnostics', () => {
    it('high confidence when no warnings', () => {
      const node = normalizeNode(makeNode('FRAME'), ROOT_CONTEXT)
      expect(node.diagnostics.confidence).toBe('high')
      expect(node.diagnostics.warnings).toEqual([])
    })

    it('medium confidence when extractor produces warnings', () => {
      const raw = makeNode('FRAME', {
        effects: [{ type: 'TEXTURE' }],
      })
      const node = normalizeNode(raw, ROOT_CONTEXT)
      expect(node.diagnostics.confidence).toBe('medium')
      expect(node.diagnostics.warnings.length).toBeGreaterThan(0)
    })

    it('records sourceNodeType from raw', () => {
      const node = normalizeNode(makeNode('RECTANGLE'), ROOT_CONTEXT)
      expect(node.diagnostics.sourceNodeType).toBe('RECTANGLE')
    })

    it('aggregates omittedFields across extractors', () => {
      const raw = makeNode('FRAME', { layoutWrap: 'WRAP' })
      const node = normalizeNode(raw, ROOT_CONTEXT)
      expect(node.diagnostics.omittedFields).toContain('counterAxisSpacing')
    })
  })

  describe('DE-004 extractor wiring', () => {
    it('component populated for COMPONENT type', () => {
      const node = normalizeNode(makeNode('COMPONENT'), ROOT_CONTEXT)
      expect(node.component).toMatchObject({ kind: 'component', isReusable: true })
    })

    it('component null for non-component type', () => {
      expect(normalizeNode(makeNode('FRAME'), ROOT_CONTEXT).component).toBeNull()
    })

    it('variables null when no boundVariables', () => {
      expect(normalizeNode(makeNode('FRAME'), ROOT_CONTEXT).variables).toBeNull()
    })

    it('asset null when no asset signals', () => {
      expect(normalizeNode(makeNode('FRAME'), ROOT_CONTEXT).asset).toBeNull()
    })

    it('semantics are all false', () => {
      const node = normalizeNode(makeNode('FRAME'), ROOT_CONTEXT)
      expect(node.semantics).toEqual({
        likelyInteractive: false,
        likelyTextInput: false,
        likelyIcon: false,
        likelyImage: false,
        likelyMask: false,
        likelyReusableComponent: false,
      })
    })
  })
})

describe('normalize() entry point', () => {
  it('creates root context and normalizes', () => {
    const raw = FigmaNodeSchema.parse({
      id: '0:1', name: 'Root', type: 'DOCUMENT',
      children: [{ id: '1:1', name: 'Page', type: 'CANVAS' }],
    })
    const result = normalize(raw)
    expect(result.type).toBe('document')
    expect(result.hierarchy.depth).toBe(0)
    expect(result.hierarchy.parentId).toBeNull()
    expect(result.children[0]?.type).toBe('page')
  })

  it('throws NormalizationError for malformed root', () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- intentionally malformed input for error path test
    const raw = { id: 42, name: null, type: undefined } as never
    expect(() => normalize(raw)).toThrow(NormalizationError)
  })
})

describe('inference wiring via normalize()', () => {
  it('image node gets image role and likelyImage semantic', () => {
    const raw = FigmaNodeSchema.parse({
      id: '0:1', name: 'Photo', type: 'RECTANGLE',
      fills: [{ type: 'IMAGE', visible: true, imageRef: 'img:1' }],
    })
    const result = normalize(raw)
    expect(result.role).toBe('image')
    expect(result.semantics.likelyImage).toBe(true)
  })

  it('text node heading gets semanticKind heading', () => {
    const raw = FigmaNodeSchema.parse({
      id: '0:1', name: 'Title', type: 'TEXT',
      characters: 'Welcome',
      style: { fontFamily: 'Inter', fontWeight: 700, fontSize: 24 },
    })
    const result = normalize(raw)
    expect(result.role).toBe('heading')
    expect(result.text?.semanticKind).toBe('heading')
  })

  it('line type gets divider role', () => {
    const raw = FigmaNodeSchema.parse({
      id: '0:1', name: 'Separator', type: 'LINE',
    })
    const result = normalize(raw)
    expect(result.role).toBe('divider')
  })

  it('confidence reflects inference results', () => {
    const raw = FigmaNodeSchema.parse({
      id: '0:1', name: 'Mystery', type: 'RECTANGLE',
      absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
    })
    const result = normalize(raw)
    // Unmatched shape → role null/low → confidence includes low
    expect(result.diagnostics.confidence).toBe('low')
  })
})

describe('representation efficiency (VT-013, RE-002)', () => {
  const NORMALIZED_TOP_LEVEL_FIELDS = 18 // fixed schema surface (DE-008: +interactions)

  const raw = FigmaNodeSchema.parse({
    id: '0:1', name: 'Frame', type: 'FRAME',
    absoluteBoundingBox: { x: 0, y: 0, width: 375, height: 812 },
    absoluteRenderBounds: { x: -4, y: -4, width: 383, height: 820 },
    relativeTransform: [[1, 0, 0], [0, 1, 0]],
    size: { x: 375, y: 812 },
    clipsContent: true,
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'HUG',
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'FIXED',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16,
    itemSpacing: 12,
    fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, blendMode: 'NORMAL' }],
    strokes: [],
    strokeWeight: 1,
    strokeAlign: 'INSIDE',
    effects: [],
    blendMode: 'PASS_THROUGH',
    opacity: 1,
    cornerRadius: 0,
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
    exportSettings: [],
    layoutGrids: [],
    backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
    prototypeDevice: { type: 'NONE', rotation: 'NONE' },
    children: [
      {
        id: '1:1', name: 'Header', type: 'TEXT',
        characters: 'Welcome',
        style: {
          fontFamily: 'Inter', fontWeight: 700, fontSize: 24,
          lineHeightUnit: 'PIXELS', lineHeightPx: 32,
          letterSpacing: 0, textCase: 'ORIGINAL',
          textAlignHorizontal: 'LEFT', textAlignVertical: 'TOP',
        },
        fills: [{ type: 'SOLID', visible: true, color: { r: 0, g: 0, b: 0, a: 1 } }],
        strokes: [], effects: [],
        absoluteBoundingBox: { x: 16, y: 16, width: 343, height: 32 },
        absoluteRenderBounds: { x: 16, y: 16, width: 343, height: 32 },
        constraints: { horizontal: 'MIN', vertical: 'MIN' },
        characterStyleOverrides: [],
        styleOverrideTable: {},
      },
      {
        id: '1:2', name: 'Card', type: 'FRAME',
        layoutMode: 'VERTICAL',
        layoutSizingHorizontal: 'FILL',
        layoutSizingVertical: 'HUG',
        primaryAxisSizingMode: 'AUTO',
        counterAxisSizingMode: 'FIXED',
        primaryAxisAlignItems: 'MIN',
        counterAxisAlignItems: 'MIN',
        paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 12,
        itemSpacing: 8,
        fills: [{ type: 'SOLID', visible: true, color: { r: 0.96, g: 0.96, b: 0.96, a: 1 } }],
        strokes: [],
        effects: [{ type: 'DROP_SHADOW', visible: true, color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0 }],
        cornerRadius: 8,
        rectangleCornerRadii: [8, 8, 8, 8],
        blendMode: 'PASS_THROUGH',
        opacity: 1,
        absoluteBoundingBox: { x: 16, y: 60, width: 343, height: 100 },
        absoluteRenderBounds: { x: 12, y: 58, width: 351, height: 108 },
        constraints: { horizontal: 'MIN', vertical: 'MIN' },
        clipsContent: true,
        children: [
          {
            id: '2:1', name: 'Body', type: 'TEXT',
            characters: 'This is the card body content that describes something.',
            style: {
              fontFamily: 'Inter', fontWeight: 400, fontSize: 14,
              lineHeightUnit: 'FONT_SIZE_%', lineHeightPercentFontSize: 150,
              letterSpacing: 0.2, textCase: 'ORIGINAL',
              textAlignHorizontal: 'LEFT', textAlignVertical: 'TOP',
            },
            fills: [{ type: 'SOLID', visible: true, color: { r: 0.2, g: 0.2, b: 0.2, a: 1 } }],
            strokes: [], effects: [],
            absoluteBoundingBox: { x: 28, y: 72, width: 319, height: 42 },
            absoluteRenderBounds: { x: 28, y: 72, width: 319, height: 42 },
            constraints: { horizontal: 'MIN', vertical: 'MIN' },
          },
        ],
      },
    ],
  })

  it('normalized schema has a fixed, smaller top-level field set than raw', () => {
    const normalized = normalize(raw)
    const normalizedKeys = Object.keys(normalized)
    const rawKeys = Object.keys(raw)

    // Fixed schema surface — normalized field count is constant
    expect(normalizedKeys).toHaveLength(NORMALIZED_TOP_LEVEL_FIELDS)
    // Raw nodes typically carry more top-level properties
    expect(rawKeys.length).toBeGreaterThan(normalizedKeys.length)
  })

  it('normalized output size does not exceed 2.0x raw input size', () => {
    const rawSize = JSON.stringify(raw).length
    const normalized = normalize(raw)
    const normalizedSize = JSON.stringify(normalized).length
    const ratio = normalizedSize / rawSize

    expect(ratio).toBeLessThanOrEqual(2.0)
  })
})
