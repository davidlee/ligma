import { describe, expect, it } from 'vitest'

import { buildOutline, outlineToXml } from '../../src/normalize/outline.js'

import type { NormalizedNode } from '../../src/schemas/normalized.js'
import type { OutlineNode } from '../../src/schemas/outline.js'

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

function makeOutlineNode(overrides: Partial<OutlineNode> = {}): OutlineNode {
  return {
    id: '1:1',
    name: 'Root',
    type: 'frame',
    role: null,
    visible: true,
    bounds: { x: 0, y: 0, width: 320, height: 240 },
    childCount: 0,
    children: [],
    ...overrides,
  }
}

describe('outlineToXml (VT-019)', () => {
  describe('element naming', () => {
    it('uses type as element name', () => {
      const outline = makeOutlineNode({ type: 'frame' })
      expect(outlineToXml(outline)).toMatch(/^<frame /)
    })

    it('maps all node types to element names', () => {
      const types = [
        'document', 'page', 'frame', 'group', 'component', 'instance',
        'variant-set', 'text', 'shape', 'vector', 'image', 'line',
        'boolean-operation', 'mask', 'section', 'unknown',
      ] as const
      for (const type of types) {
        const outline = makeOutlineNode({ type })
        const xml = outlineToXml(outline)
        expect(xml).toMatch(new RegExp(`^<${type} `))
      }
    })
  })

  describe('attribute order', () => {
    it('uses stable order: id, name, role, w, h, child-count', () => {
      const outline = makeOutlineNode({
        id: '10:20',
        name: 'Card',
        role: 'card',
        bounds: { x: 0, y: 0, width: 200, height: 100 },
        childCount: 3,
      })
      const xml = outlineToXml(outline)
      const attributeRegex = /id="[^"]*"\s+name="[^"]*"\s+role="[^"]*"\s+w="[^"]*"\s+h="[^"]*"\s+child-count="[^"]*"/
      expect(xml).toMatch(attributeRegex)
    })

    it('omits role when null', () => {
      const outline = makeOutlineNode({ role: null })
      const xml = outlineToXml(outline)
      expect(xml).not.toContain('role=')
    })

    it('omits w and h when bounds is null', () => {
      const outline = makeOutlineNode({ bounds: null })
      const xml = outlineToXml(outline)
      expect(xml).not.toContain('w=')
      expect(xml).not.toContain('h=')
    })
  })

  describe('attribute escaping', () => {
    it('escapes ampersands in name', () => {
      const outline = makeOutlineNode({ name: 'A & B' })
      const xml = outlineToXml(outline)
      expect(xml).toContain('name="A &amp; B"')
    })

    it('escapes quotes in name', () => {
      const outline = makeOutlineNode({ name: 'Say "hello"' })
      const xml = outlineToXml(outline)
      expect(xml).toContain('name="Say &quot;hello&quot;"')
    })

    it('escapes angle brackets in name', () => {
      const outline = makeOutlineNode({ name: '<script>alert</script>' })
      const xml = outlineToXml(outline)
      expect(xml).toContain('name="&lt;script&gt;alert&lt;/script&gt;"')
    })

    it('handles adversarial names with mixed special chars', () => {
      const outline = makeOutlineNode({ name: 'A&B<C>"D' })
      const xml = outlineToXml(outline)
      expect(xml).toContain('name="A&amp;B&lt;C&gt;&quot;D"')
    })
  })

  describe('self-closing leaves', () => {
    it('uses self-closing tag for leaf nodes', () => {
      const outline = makeOutlineNode({ children: [] })
      const xml = outlineToXml(outline)
      expect(xml).toMatch(/ \/>$/)
      expect(xml).not.toContain('</frame>')
    })
  })

  describe('indentation', () => {
    it('uses 2-space indentation for nested nodes', () => {
      const outline = makeOutlineNode({
        childCount: 1,
        children: [
          makeOutlineNode({ id: '2:1', name: 'Child', type: 'text' }),
        ],
      })
      const xml = outlineToXml(outline)
      const lines = xml.split('\n')
      expect(lines).toHaveLength(3)
      expect(lines[1]).toMatch(/^ {2}<text /)
    })

    it('indents deeply nested nodes correctly', () => {
      const outline = makeOutlineNode({
        childCount: 1,
        children: [
          makeOutlineNode({
            id: '2:1',
            name: 'Mid',
            childCount: 1,
            children: [
              makeOutlineNode({ id: '3:1', name: 'Deep', type: 'text' }),
            ],
          }),
        ],
      })
      const xml = outlineToXml(outline)
      const lines = xml.split('\n')
      expect(lines[2]).toMatch(/^ {4}<text /)
    })
  })

  describe('child-count attribute', () => {
    it('includes child-count for all nodes', () => {
      const outline = makeOutlineNode({ childCount: 5 })
      const xml = outlineToXml(outline)
      expect(xml).toContain('child-count="5"')
    })

    it('shows child-count=0 for leaves', () => {
      const outline = makeOutlineNode({ childCount: 0 })
      const xml = outlineToXml(outline)
      expect(xml).toContain('child-count="0"')
    })
  })

  describe('visible attribute', () => {
    it('omits visible attribute for visible nodes', () => {
      const outline = makeOutlineNode({ visible: true })
      const xml = outlineToXml(outline)
      expect(xml).not.toContain('visible=')
    })

    it('includes visible="false" for hidden nodes', () => {
      const outline = makeOutlineNode({ visible: false })
      const xml = outlineToXml(outline)
      expect(xml).toContain('visible="false"')
    })
  })

  describe('integration', () => {
    it('produces expected XML for a small tree', () => {
      const node = makeNode({
        id: '123:456',
        name: 'Login Card',
        role: 'card',
        hierarchy: { parentId: null, depth: 0, childCount: 2, path: [] },
        children: [
          makeNode({
            id: '123:457',
            name: 'Title',
            type: 'text',
            role: 'heading',
            bounds: null,
            hierarchy: { parentId: '123:456', depth: 1, childCount: 0, path: [] },
          }),
          makeNode({
            id: '123:458',
            name: 'Submit',
            type: 'instance',
            role: 'button',
            bounds: { x: 0, y: 0, width: 280, height: 44 },
            hierarchy: { parentId: '123:456', depth: 1, childCount: 0, path: [] },
          }),
        ],
      })
      const { outline } = buildOutline(node)
      const xml = outlineToXml(outline)

      expect(xml).toBe(
        '<frame id="123:456" name="Login Card" role="card" w="320" h="240" child-count="2">\n'
        + '  <text id="123:457" name="Title" role="heading" child-count="0" />\n'
        + '  <instance id="123:458" name="Submit" role="button" w="280" h="44" child-count="0" />\n'
        + '</frame>',
      )
    })
  })
})
