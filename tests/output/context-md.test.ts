import { describe, expect, it } from 'vitest'

import { buildOutline } from '../../src/normalize/outline.js'
import { generateContextMd } from '../../src/output/context-md.js'

import type { ContextMdInput } from '../../src/output/context-md.js'
import type { Manifest } from '../../src/schemas/manifest.js'
import type {
  NormalizedAssetInfo,
  NormalizedComponentInfo,
  NormalizedInteraction,
  NormalizedLayout,
  NormalizedNode,
} from '../../src/schemas/normalized.js'
import type { TokenReference, TokensUsedSummary } from '../../src/schemas/tokens-used.js'

// --- Test helpers ---

const DEFAULT_SEMANTICS = {
  likelyInteractive: false,
  likelyTextInput: false,
  likelyIcon: false,
  likelyImage: false,
  likelyMask: false,
  likelyReusableComponent: false,
}

const DEFAULT_DIAGNOSTICS = {
  sourceNodeType: 'FRAME',
  omittedFields: Array<string>(),
  warnings: Array<string>(),
  confidence: 'high' as const,
}

function makeNode(overrides: Partial<NormalizedNode> = {}): NormalizedNode {
  return {
    id: '42:1067',
    name: 'Root Frame',
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
    hierarchy: { parentId: '42:1067', depth: 1, childCount: 0, path: [] },
    ...overrides,
  })
}

const BASE_OUTPUTS = {
  rawNodeJson: 'structure/raw-node.json',
  normalizedNodeJson: 'structure/normalized-node.json',
  outlineJson: 'structure/outline.json',
  outlineXml: 'structure/outline.xml',
  contextMd: 'context.md',
  tokensUsedJson: 'tokens/tokens-used.json',
  assets: Array<string>(),
}

function makeManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    source: {
      fileKey: 'abc123',
      nodeId: '42:1067',
      fileName: 'Mobile App v2',
      version: '3847291',
    },
    outputs: {
      ...BASE_OUTPUTS,
      png: 'visual/42:1067.png',
    },
    errors: [],
    ...overrides,
  }
}

function makeManifestNoImage(): Manifest {
  return {
    source: {
      fileKey: 'abc123',
      nodeId: '42:1067',
      fileName: 'Mobile App v2',
      version: '3847291',
    },
    outputs: { ...BASE_OUTPUTS },
    errors: [],
  }
}

function makeTokensUsed(overrides: Partial<TokensUsedSummary> = {}): TokensUsedSummary {
  return {
    scope: { fileKey: 'abc123', rootNodeId: '42:1067', isFullInventory: false as const },
    variables: [],
    styles: [],
    counts: { colors: 0, typography: 0, numbers: 0, other: 0 },
    ...overrides,
  }
}

function makeInput(overrides: Partial<ContextMdInput> = {}): ContextMdInput {
  const node = overrides.node ?? makeNode()
  const { outline, hiddenNodesOmitted } = buildOutline(node)
  return {
    node,
    manifest: overrides.manifest ?? makeManifest(),
    tokensUsed: overrides.tokensUsed ?? makeTokensUsed(),
    outline: overrides.outline ?? outline,
    hiddenNodesOmitted: overrides.hiddenNodesOmitted ?? hiddenNodesOmitted,
  }
}

// --- Tests ---

describe('generateContextMd (VT-020)', () => {
  describe('source section', () => {
    it('includes file key and node ID', () => {
      const md = generateContextMd(makeInput())
      expect(md).toContain('## Source')
      expect(md).toContain('- File key: abc123')
      expect(md).toContain('- Node ID: 42:1067')
    })

    it('includes file name and version when present', () => {
      const md = generateContextMd(makeInput())
      expect(md).toContain('- File name: Mobile App v2')
      expect(md).toContain('- Version: 3847291')
    })

    it('omits file name when absent', () => {
      const manifest = makeManifest({
        source: { fileKey: 'abc123', nodeId: '42:1067', version: '3847291' },
      })
      const md = generateContextMd(makeInput({ manifest }))
      expect(md).not.toContain('- File name:')
    })
  })

  describe('visual reference section', () => {
    it('includes visual reference when png present', () => {
      const md = generateContextMd(makeInput())
      expect(md).toContain('## Visual reference')
      expect(md).toContain('Use ./visual/42:1067.png as the visual source of truth.')
    })

    it('omits visual reference when no image', () => {
      const md = generateContextMd(makeInput({ manifest: makeManifestNoImage() }))
      expect(md).not.toContain('## Visual reference')
    })
  })

  describe('structural summary section', () => {
    it('includes root type and size', () => {
      const md = generateContextMd(makeInput())
      expect(md).toContain('## Structural summary')
      expect(md).toContain('- Root: frame')
      expect(md).toContain('- Size: 320\u00D7240')
    })

    it('includes role when present', () => {
      const node = makeNode({ role: 'card' })
      const md = generateContextMd(makeInput({ node }))
      expect(md).toContain('- Root: frame, role card')
    })

    it('includes layout line when auto-layout', () => {
      const layout: NormalizedLayout = {
        mode: 'vertical',
        sizing: { horizontal: 'fill', vertical: 'hug' },
        align: { main: 'start', cross: 'start' },
        padding: { top: 24, right: 24, bottom: 24, left: 24 },
        gap: 16,
        wrap: null,
        grid: null,
        constraints: null,
        position: null,
        clipsContent: null,
      }
      const node = makeNode({ layout })
      const md = generateContextMd(makeInput({ node }))
      expect(md).toContain('- Layout: vertical auto-layout, gap 16, padding 24/24/24/24')
    })

    it('omits layout when mode is none', () => {
      const layout: NormalizedLayout = {
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
      }
      const node = makeNode({ layout })
      const md = generateContextMd(makeInput({ node }))
      expect(md).not.toContain('- Layout:')
    })

    it('includes children breakdown when children exist', () => {
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 3, path: [] },
        children: [
          makeChild('2:1', 'V1'),
          makeChild('2:2', 'V2'),
          makeChild('2:3', 'H1', { visible: false }),
        ],
      })
      const md = generateContextMd(makeInput({ node }))
      expect(md).toContain('- Children: 3 total, 2 shown in outline, 1 hidden')
    })
  })

  describe('important children section (DEC-022)', () => {
    it('lists visible children sorted by role tier', () => {
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 3, path: [] },
        children: [
          makeChild('2:1', 'Container', { role: 'container' }),
          makeChild('2:2', 'Title', { role: 'heading' }),
          makeChild('2:3', 'Logo', { role: 'image' }),
        ],
      })
      const md = generateContextMd(makeInput({ node }))
      expect(md).toContain('## Important children')
      const lines = md.split('\n')
      const childLines = lines.filter(l => /^\d+\./.test(l))
      expect(childLines[0]).toContain('Title (heading)')
      expect(childLines[1]).toContain('Logo (image)')
      expect(childLines[2]).toContain('Container (container)')
    })

    it('uses document order as tie-breaker within same tier', () => {
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 2, path: [] },
        children: [
          makeChild('2:1', 'First Button', { role: 'button' }),
          makeChild('2:2', 'Second Button', { role: 'button' }),
        ],
      })
      const md = generateContextMd(makeInput({ node }))
      const lines = md.split('\n').filter(l => /^\d+\./.test(l))
      expect(lines[0]).toContain('First Button')
      expect(lines[1]).toContain('Second Button')
    })

    it('caps at 8 and shows remainder', () => {
      const children = Array.from({ length: 10 }, (_, index) =>
        makeChild(`2:${String(index)}`, `Child ${String(index)}`),
      )
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 10, path: [] },
        children,
      })
      const md = generateContextMd(makeInput({ node }))
      const numbered = md.split('\n').filter(l => /^\d+\./.test(l))
      expect(numbered).toHaveLength(8)
      expect(md).toContain('\u2026 and 2 more children')
    })

    it('uses type as label when role is null', () => {
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
        children: [makeChild('2:1', 'Plain', { role: null, type: 'group' })],
      })
      const md = generateContextMd(makeInput({ node }))
      expect(md).toContain('Plain (group)')
    })

    it('omits section when no visible children', () => {
      const md = generateContextMd(makeInput())
      expect(md).not.toContain('## Important children')
    })

    it('excludes hidden children from importance list', () => {
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 2, path: [] },
        children: [
          makeChild('2:1', 'Visible', { role: 'button' }),
          makeChild('2:2', 'Hidden', { visible: false, role: 'heading' }),
        ],
      })
      const md = generateContextMd(makeInput({ node }))
      expect(md).not.toContain('Hidden')
    })
  })

  describe('tokens used section', () => {
    it('lists resolved token names', () => {
      const tokensUsed = makeTokensUsed({
        variables: [
          makeTokenReference('t1', 'color.bg.surface'),
          makeTokenReference('t2', 'spacing.24'),
        ],
      })
      const md = generateContextMd(makeInput({ tokensUsed }))
      expect(md).toContain('## Tokens used')
      expect(md).toContain('- color.bg.surface')
      expect(md).toContain('- spacing.24')
    })

    it('shows unresolved fallback with type skew', () => {
      const tokensUsed = makeTokensUsed({
        variables: [
          makeTokenReference('t1', null),
          makeTokenReference('t2', null),
        ],
        counts: { colors: 2, typography: 0, numbers: 0, other: 0 },
      })
      const md = generateContextMd(makeInput({ tokensUsed }))
      expect(md).toContain('2 token references detected (names unresolved; mostly color)')
    })

    it('omits section when no tokens', () => {
      const md = generateContextMd(makeInput())
      expect(md).not.toContain('## Tokens used')
    })

    it('caps at 15 and shows remainder', () => {
      const variables = Array.from({ length: 18 }, (_, index) =>
        makeTokenReference(`t${String(index)}`, `token.${String(index)}`),
      )
      const tokensUsed = makeTokensUsed({ variables })
      const md = generateContextMd(makeInput({ tokensUsed }))
      const tokenLines = md.split('\n').filter(l => l.startsWith('- token.'))
      expect(tokenLines).toHaveLength(15)
      expect(md).toContain('\u2026 and 3 more')
    })
  })

  describe('assets section', () => {
    it('lists exportable assets', () => {
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
        children: [
          makeChild('2:1', 'logo', {
            asset: makeAssetInfo({ exportSuggested: true, kind: 'svg' }),
          }),
        ],
      })
      const md = generateContextMd(makeInput({ node }))
      expect(md).toContain('## Assets')
      expect(md).toContain('- logo (svg, suggested export)')
    })

    it('omits section when no exportable assets', () => {
      const md = generateContextMd(makeInput())
      expect(md).not.toContain('## Assets')
    })

    it('does not invent filenames in asset listing', () => {
      const manifest = makeManifestNoImage()
      const node = makeNode({
        hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
        children: [
          makeChild('2:1', 'hero', {
            asset: makeAssetInfo({ exportSuggested: true, kind: 'bitmap' }),
          }),
        ],
      })
      const md = generateContextMd(makeInput({ node, manifest }))
      const assetsSection = md.split('## Assets')[1]?.split('##')[0] ?? ''
      expect(assetsSection).not.toMatch(/\.(png|jpg|svg|webp)/i)
      expect(assetsSection).toContain('hero (bitmap, suggested export)')
    })
  })

  describe('implementation notes (DEC-023)', () => {
    describe('layoutNote', () => {
      it('fires when root has auto-layout', () => {
        const layout: NormalizedLayout = {
          mode: 'vertical',
          sizing: { horizontal: 'fill', vertical: 'hug' },
          align: { main: 'start', cross: 'start' },
          padding: null,
          gap: 16,
          wrap: null,
          grid: null,
          constraints: null,
          position: null,
          clipsContent: null,
        }
        const node = makeNode({ layout })
        const md = generateContextMd(makeInput({ node }))
        expect(md).toContain('Prefer vertical stack layout; root uses auto-layout with 16px gap')
      })

      it('does not fire when layout mode is none', () => {
        const layout: NormalizedLayout = {
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
        }
        const node = makeNode({ layout })
        const md = generateContextMd(makeInput({ node }))
        expect(md).not.toContain('stack layout')
      })
    })

    describe('componentNote', () => {
      it('fires when root has component info', () => {
        const component: NormalizedComponentInfo = {
          kind: 'instance',
          componentId: 'c1',
          componentName: 'Button/Primary',
          componentSetId: null,
          propertyValues: {},
          propertyReferences: {},
          isReusable: true,
        }
        const node = makeNode({ component })
        const md = generateContextMd(makeInput({ node }))
        expect(md).toContain('Root is a instance (Button/Primary); treat as reusable')
      })
    })

    describe('complexityNote', () => {
      it('fires when nesting exceeds 3 levels', () => {
        const deep = makeNode({
          id: '4:1',
          name: 'Deep',
          hierarchy: { parentId: '3:1', depth: 4, childCount: 0, path: [] },
        })
        const mid = makeNode({
          id: '3:1',
          name: 'Mid',
          hierarchy: { parentId: '2:1', depth: 3, childCount: 1, path: [] },
          children: [deep],
        })
        const child = makeChild('2:1', 'Child', {
          hierarchy: { parentId: '42:1067', depth: 1, childCount: 1, path: [] },
          children: [mid],
        })
        const node = makeNode({
          hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
          children: [child],
        })
        const md = generateContextMd(makeInput({ node }))
        expect(md).toContain('4 levels deep')
        expect(md).toContain('implement incrementally')
      })

      it('does not fire for shallow trees', () => {
        const node = makeNode({
          hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
          children: [makeChild('2:1', 'Child')],
        })
        const md = generateContextMd(makeInput({ node }))
        expect(md).not.toContain('implement incrementally')
      })
    })

    describe('assetNote', () => {
      it('fires when descendants have exportSuggested', () => {
        const node = makeNode({
          hierarchy: { parentId: null, depth: 0, childCount: 2, path: [] },
          children: [
            makeChild('2:1', 'icon1', {
              asset: makeAssetInfo({ exportSuggested: true }),
            }),
            makeChild('2:2', 'icon2', {
              asset: makeAssetInfo({ exportSuggested: true }),
            }),
          ],
        })
        const md = generateContextMd(makeInput({ node }))
        expect(md).toContain('2 nodes suggested for asset export')
      })
    })

    describe('interactionNote', () => {
      it('fires when descendants have interactions', () => {
        const interaction: NormalizedInteraction = {
          trigger: 'click',
          actions: [{ kind: 'navigate', destinationId: '10:1', url: null }],
        }
        const node = makeNode({
          hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
          children: [
            makeChild('2:1', 'Button', { interactions: [interaction] }),
          ],
        })
        const md = generateContextMd(makeInput({ node }))
        expect(md).toContain('Contains 1 interactive element; ensure event handlers are wired')
      })
    })

    describe('truncationNote', () => {
      it('fires when hiddenNodesOmitted > 0', () => {
        const md = generateContextMd(makeInput({ hiddenNodesOmitted: 5 }))
        expect(md).toContain('Outline omits 5 hidden nodes; normalized JSON retains the full tree')
      })

      it('does not fire when no hidden nodes omitted', () => {
        const md = generateContextMd(makeInput({ hiddenNodesOmitted: 0 }))
        expect(md).not.toContain('Outline omits')
      })
    })

    it('caps notes at 5', () => {
      // Build a node that triggers all 6 generators
      const interaction: NormalizedInteraction = {
        trigger: 'click',
        actions: [{ kind: 'navigate', destinationId: '10:1', url: null }],
      }
      const layout: NormalizedLayout = {
        mode: 'vertical',
        sizing: { horizontal: 'fill', vertical: 'hug' },
        align: { main: 'start', cross: 'start' },
        padding: null,
        gap: 16,
        wrap: null,
        grid: null,
        constraints: null,
        position: null,
        clipsContent: null,
      }
      const component: NormalizedComponentInfo = {
        kind: 'instance',
        componentId: 'c1',
        componentName: 'Card',
        componentSetId: null,
        propertyValues: {},
        propertyReferences: {},
        isReusable: true,
      }
      // Deep nesting for complexity
      const deep = makeNode({
        id: '5:1',
        name: 'Deep',
        hierarchy: { parentId: '4:1', depth: 4, childCount: 0, path: [] },
      })
      const mid2 = makeNode({
        id: '4:1',
        name: 'Mid2',
        hierarchy: { parentId: '3:1', depth: 3, childCount: 1, path: [] },
        children: [deep],
      })
      const mid = makeNode({
        id: '3:1',
        name: 'Mid',
        hierarchy: { parentId: '2:1', depth: 2, childCount: 1, path: [] },
        children: [mid2],
      })
      const node = makeNode({
        layout,
        component,
        hierarchy: { parentId: null, depth: 0, childCount: 2, path: [] },
        children: [
          makeChild('2:1', 'InteractiveAsset', {
            interactions: [interaction],
            asset: makeAssetInfo({ exportSuggested: true }),
            hierarchy: { parentId: '42:1067', depth: 1, childCount: 1, path: [] },
            children: [mid],
          }),
          makeChild('2:2', 'Plain'),
        ],
      })
      const md = generateContextMd(makeInput({ node, hiddenNodesOmitted: 3 }))
      const noteLines = md
        .split('\n')
        .filter(l => l.startsWith('- ') && md.indexOf(l) > md.indexOf('## Implementation notes'))
      // At most 5 notes
      expect(noteLines.length).toBeLessThanOrEqual(5)
    })
  })

  describe('conservative language', () => {
    it('does not use "must" or "always" in implementation notes', () => {
      const layout: NormalizedLayout = {
        mode: 'vertical',
        sizing: { horizontal: 'fill', vertical: 'hug' },
        align: { main: 'start', cross: 'start' },
        padding: null,
        gap: 16,
        wrap: null,
        grid: null,
        constraints: null,
        position: null,
        clipsContent: null,
      }
      const node = makeNode({ layout })
      const md = generateContextMd(makeInput({ node }))
      const notesSection = md.split('## Implementation notes')[1] ?? ''
      expect(notesSection).not.toMatch(/\bmust\b/i)
      expect(notesSection).not.toMatch(/\balways\b/i)
    })
  })

  describe('section omission', () => {
    it('omits empty sections entirely', () => {
      const md = generateContextMd(makeInput({ manifest: makeManifestNoImage() }))
      expect(md).not.toContain('## Visual reference')
      expect(md).not.toContain('## Tokens used')
      expect(md).not.toContain('## Assets')
      expect(md).not.toContain('## Important children')
      expect(md).not.toContain('## Implementation notes')
    })
  })

  describe('golden snapshot', () => {
    it('produces expected output for representative tree', () => {
      const layout: NormalizedLayout = {
        mode: 'vertical',
        sizing: { horizontal: 'fill', vertical: 'hug' },
        align: { main: 'start', cross: 'start' },
        padding: { top: 24, right: 24, bottom: 24, left: 24 },
        gap: 16,
        wrap: null,
        grid: null,
        constraints: null,
        position: null,
        clipsContent: null,
      }
      const node = makeNode({
        role: 'card',
        layout,
        hierarchy: { parentId: null, depth: 0, childCount: 3, path: [] },
        children: [
          makeChild('2:1', 'Title', {
            type: 'text',
            role: 'heading',
          }),
          makeChild('2:2', 'Email Field', {
            type: 'instance',
            role: 'input',
          }),
          makeChild('2:3', 'Submit', {
            type: 'instance',
            role: 'button',
          }),
        ],
      })
      const tokensUsed = makeTokensUsed({
        variables: [
          makeTokenReference('t1', 'color.bg.surface'),
          makeTokenReference('t2', 'color.text.primary'),
        ],
      })
      const md = generateContextMd(makeInput({ node, tokensUsed }))

      expect(md).toContain('## Source')
      expect(md).toContain('## Visual reference')
      expect(md).toContain('## Structural summary')
      expect(md).toContain('- Root: frame, role card')
      expect(md).toContain('- Layout: vertical auto-layout, gap 16, padding 24/24/24/24')
      expect(md).toContain('- Children: 3 total, 3 shown in outline, 0 hidden')
      expect(md).toContain('## Important children')
      expect(md).toContain('1. Title (heading)')
      expect(md).toContain('2. Email Field (input)')
      expect(md).toContain('3. Submit (button)')
      expect(md).toContain('## Tokens used')
      expect(md).toContain('- color.bg.surface')
      expect(md).toContain('## Implementation notes')
      expect(md).toContain('Prefer vertical stack layout')
    })
  })
})

// --- Helpers ---

function makeTokenReference(
  tokenId: string,
  tokenName: string | null,
): TokenReference {
  return {
    tokenId,
    tokenName,
    collectionId: null,
    resolvedType: 'color',
    encounteredOn: [],
  }
}

function makeAssetInfo(
  overrides: Partial<NormalizedAssetInfo> = {},
): NormalizedAssetInfo {
  return {
    kind: 'svg',
    exportSuggested: false,
    reason: null,
    exportNodeIds: [],
    imageRefs: [],
    ...overrides,
  }
}
