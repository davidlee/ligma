import { describe, expect, it } from 'vitest'

import { buildOutline } from '../../src/normalize/outline.js'
import { OutlineNodeSchema } from '../../src/schemas/outline.js'

import type { NormalizedNode } from '../../src/schemas/normalized.js'

const DEFAULT_SEMANTICS = {
  likelyInteractive: false,
  likelyTextInput: false,
  likelyIcon: false,
  likelyImage: false,
  likelyMask: false,
  likelyReusableComponent: false,
} as const

const DEFAULT_DIAGNOSTICS = {
  sourceNodeType: 'FRAME',
  omittedFields: Array<string>(),
  warnings: Array<string>(),
  confidence: 'high' as const,
}

function makeNode(overrides: Partial<NormalizedNode> = {}): NormalizedNode {
  return {
    id: '1:1',
    name: 'Root',
    type: 'frame',
    role: null,
    visible: true,
    bounds: { x: 0, y: 0, width: 320, height: 240 },
    rotation: null,
    hierarchy: { parentId: null, depth: 0, childCount: 0, path: [] },
    layout: null,
    appearance: null,
    text: null,
    component: null,
    variables: null,
    asset: null,
    interactions: null,
    semantics: DEFAULT_SEMANTICS,
    children: [],
    diagnostics: DEFAULT_DIAGNOSTICS,
    ...overrides,
  }
}

function makeChild(
  id: string,
  name: string,
  overrides: Partial<NormalizedNode> = {},
): NormalizedNode {
  return makeNode({
    id,
    name,
    hierarchy: { parentId: '1:1', depth: 1, childCount: 0, path: [] },
    ...overrides,
  })
}

describe('buildOutline (VT-018)', () => {
  describe('projection correctness', () => {
    it('projects id, name, type, role, visible, bounds from root', () => {
      const node = makeNode({ role: 'card' })
      const { outline } = buildOutline(node)

      expect(outline.id).toBe('1:1')
      expect(outline.name).toBe('Root')
      expect(outline.type).toBe('frame')
      expect(outline.role).toBe('card')
      expect(outline.visible).toBe(true)
      expect(outline.bounds).toEqual({ x: 0, y: 0, width: 320, height: 240 })
    })

    it('propagates null bounds', () => {
      const node = makeNode({ bounds: null })
      const { outline } = buildOutline(node)
      expect(outline.bounds).toBeNull()
    })

    it('propagates null role', () => {
      const node = makeNode()
      const { outline } = buildOutline(node)
      expect(outline.role).toBeNull()
    })

    it('validates against OutlineNodeSchema', () => {
      const node = makeNode({
        role: 'card',
        hierarchy: { parentId: null, depth: 0, childCount: 2, path: [] },
        children: [
          makeChild('2:1', 'Title', { type: 'text' }),
          makeChild('2:2', 'Button', { type: 'instance', role: 'button' }),
        ],
      })
      const { outline } = buildOutline(node)
      const result = OutlineNodeSchema.safeParse(outline)
      expect(result.success).toBe(true)
    })
  })

  describe('childCount vs children.length', () => {
    it('childCount reflects total structural children, not filtered count', () => {
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 3, path: [] },
        children: [
          makeChild('2:1', 'Visible', { visible: true }),
          makeChild('2:2', 'Hidden', { visible: false }),
          makeChild('2:3', 'Also Visible', { visible: true }),
        ],
      })
      const { outline } = buildOutline(node)
      expect(outline.childCount).toBe(3)
      expect(outline.children).toHaveLength(2)
    })
  })

  describe('hidden node filtering', () => {
    it('omits hidden children by default', () => {
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 2, path: [] },
        children: [
          makeChild('2:1', 'Visible'),
          makeChild('2:2', 'Hidden', { visible: false }),
        ],
      })
      const { outline, hiddenNodesOmitted } = buildOutline(node)
      expect(outline.children).toHaveLength(1)
      expect(outline.children[0]).toMatchObject({ name: 'Visible' })
      expect(hiddenNodesOmitted).toBe(1)
    })

    it('filters hidden nodes recursively', () => {
      const grandchild = makeNode({
        id: '3:1',
        name: 'DeepHidden',
        visible: false,
        hierarchy: { parentId: '2:1', depth: 2, childCount: 0, path: [] },
      })
      const child = makeChild('2:1', 'Container', {
        hierarchy: { parentId: '1:1', depth: 1, childCount: 1, path: [] },
        children: [grandchild],
      })
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
        children: [child],
      })
      const { outline, hiddenNodesOmitted } = buildOutline(node)
      expect(outline.children[0]).toMatchObject({ children: [] })
      expect(hiddenNodesOmitted).toBe(1)
    })

    it('always includes root regardless of visibility', () => {
      const node = makeNode({ visible: false })
      const { outline } = buildOutline(node)
      expect(outline.id).toBe('1:1')
      expect(outline.visible).toBe(false)
    })

    it('returns zero omitted when no hidden nodes', () => {
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
        children: [makeChild('2:1', 'Visible')],
      })
      const { hiddenNodesOmitted } = buildOutline(node)
      expect(hiddenNodesOmitted).toBe(0)
    })
  })

  describe('includeHidden mode', () => {
    it('includes hidden children when includeHidden is true', () => {
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 2, path: [] },
        children: [
          makeChild('2:1', 'Visible'),
          makeChild('2:2', 'Hidden', { visible: false }),
        ],
      })
      const { outline, hiddenNodesOmitted } = buildOutline(node, { includeHidden: true })
      expect(outline.children).toHaveLength(2)
      expect(outline.children[1]).toMatchObject({ visible: false })
      expect(hiddenNodesOmitted).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('handles single node (no children)', () => {
      const node = makeNode()
      const { outline } = buildOutline(node)
      expect(outline.children).toHaveLength(0)
      expect(outline.childCount).toBe(0)
    })

    it('handles all-hidden tree', () => {
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 2, path: [] },
        children: [
          makeChild('2:1', 'H1', { visible: false }),
          makeChild('2:2', 'H2', { visible: false }),
        ],
      })
      const { outline, hiddenNodesOmitted } = buildOutline(node)
      expect(outline.children).toHaveLength(0)
      expect(hiddenNodesOmitted).toBe(2)
    })

    it('handles empty tree (root only)', () => {
      const node = makeNode()
      const { outline } = buildOutline(node)
      expect(outline.id).toBe('1:1')
      expect(outline.children).toHaveLength(0)
    })
  })

  describe('role and bounds propagation', () => {
    it('propagates role through children', () => {
      const child = makeChild('2:1', 'Button', { role: 'button' })
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
        children: [child],
      })
      const { outline } = buildOutline(node)
      expect(outline.children[0]).toMatchObject({ role: 'button' })
    })

    it('propagates bounds through children', () => {
      const child = makeChild('2:1', 'Sized', {
        bounds: { x: 10, y: 20, width: 100, height: 50 },
      })
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
        children: [child],
      })
      const { outline } = buildOutline(node)
      expect(outline.children[0]).toMatchObject({
        bounds: { x: 10, y: 20, width: 100, height: 50 },
      })
    })
  })
})
