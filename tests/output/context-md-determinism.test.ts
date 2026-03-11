import { describe, expect, it } from 'vitest'

import { buildOutline, outlineToXml } from '../../src/normalize/outline.js'
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

/**
 * Build a representative tree that exercises all context.md sections:
 * - roles across tiers (heading, image, container)
 * - token references (resolved + unresolved)
 * - assets with exportSuggested
 * - hidden nodes
 * - component info
 * - interactions
 * - auto-layout
 * - deep nesting (>3 levels)
 */
function makeRepresentativeTree(): NormalizedNode {
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

  const component: NormalizedComponentInfo = {
    kind: 'instance',
    componentId: 'c1',
    componentName: 'Card/Default',
    componentSetId: null,
    propertyValues: {},
    propertyReferences: {},
    isReusable: true,
  }

  const interaction: NormalizedInteraction = {
    trigger: 'click',
    actions: [{ kind: 'navigate', destinationId: '10:1', url: null }],
  }

  const assetInfo: NormalizedAssetInfo = {
    kind: 'svg',
    exportSuggested: true,
    reason: null,
    exportNodeIds: [],
    imageRefs: [],
  }

  const deep = makeNode({
    id: '5:1',
    name: 'Deep Leaf',
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
    hierarchy: { parentId: '2:5', depth: 2, childCount: 1, path: [] },
    children: [mid2],
  })

  return makeNode({
    role: 'card',
    layout,
    component,
    hierarchy: { parentId: null, depth: 0, childCount: 6, path: [] },
    children: [
      makeChild('2:1', 'Title', { type: 'text', role: 'heading' }),
      makeChild('2:2', 'Email Field', { type: 'instance', role: 'input' }),
      makeChild('2:3', 'Logo', { asset: assetInfo, role: 'image' }),
      makeChild('2:4', 'Submit', {
        type: 'instance',
        role: 'button',
        interactions: [interaction],
      }),
      makeChild('2:5', 'Container', {
        role: 'container',
        hierarchy: { parentId: '42:1067', depth: 1, childCount: 1, path: [] },
        children: [mid],
      }),
      makeChild('2:6', 'Hidden Helper', { visible: false }),
    ],
  })
}

function makeManifest(): Manifest {
  return {
    source: {
      fileKey: 'abc123',
      nodeId: '42:1067',
      fileName: 'Mobile App v2',
      version: '3847291',
    },
    outputs: {
      rawNodeJson: 'structure/raw-node.json',
      normalizedNodeJson: 'structure/normalized-node.json',
      outlineJson: 'structure/outline.json',
      outlineXml: 'structure/outline.xml',
      contextMd: 'context.md',
      tokensUsedJson: 'tokens/tokens-used.json',
      png: 'visual/42:1067.png',
      assets: Array<string>(),
    },
    errors: [],
  }
}

function makeTokensUsed(): TokensUsedSummary {
  const ref = (id: string, name: string | null): TokenReference => ({
    tokenId: id,
    tokenName: name,
    collectionId: null,
    resolvedType: 'color',
    encounteredOn: [],
  })

  return {
    scope: { fileKey: 'abc123', rootNodeId: '42:1067', isFullInventory: false as const },
    variables: [
      ref('t1', 'color.bg.surface'),
      ref('t2', 'color.text.primary'),
      ref('t3', 'spacing.24'),
    ],
    styles: [],
    counts: { colors: 2, typography: 0, numbers: 1, other: 0 },
  }
}

function makeFullInput(): ContextMdInput {
  const node = makeRepresentativeTree()
  const { outline, hiddenNodesOmitted } = buildOutline(node)
  return {
    node,
    manifest: makeManifest(),
    tokensUsed: makeTokensUsed(),
    outline,
    hiddenNodesOmitted,
  }
}

// --- Tests ---

describe('determinism (VT-021)', () => {
  it('generateContextMd produces identical output on consecutive calls', () => {
    const input = makeFullInput()
    const first = generateContextMd(input)
    const second = generateContextMd(input)
    expect(first).toBe(second)
  })

  it('buildOutline produces identical output on consecutive calls', () => {
    const node = makeRepresentativeTree()
    const first = buildOutline(node)
    const second = buildOutline(node)
    expect(first).toStrictEqual(second)
  })

  it('outlineToXml produces identical output on consecutive calls', () => {
    const node = makeRepresentativeTree()
    const { outline } = buildOutline(node)
    const first = outlineToXml(outline)
    const second = outlineToXml(outline)
    expect(first).toBe(second)
  })

  it('full pipeline: buildOutline + outlineToXml + generateContextMd is deterministic', () => {
    const node = makeRepresentativeTree()
    const manifest = makeManifest()
    const tokensUsed = makeTokensUsed()

    function run(): { outlineJson: string; outlineXml: string; contextMd: string } {
      const { outline, hiddenNodesOmitted } = buildOutline(node)
      const xml = outlineToXml(outline)
      const md = generateContextMd({ node, manifest, tokensUsed, outline, hiddenNodesOmitted })
      return { outlineJson: JSON.stringify(outline), outlineXml: xml, contextMd: md }
    }

    const first = run()
    const second = run()

    expect(first.outlineJson).toBe(second.outlineJson)
    expect(first.outlineXml).toBe(second.outlineXml)
    expect(first.contextMd).toBe(second.contextMd)
  })

  it('buildOutline with includeHidden is also deterministic', () => {
    const node = makeRepresentativeTree()
    const first = buildOutline(node, { includeHidden: true })
    const second = buildOutline(node, { includeHidden: true })
    expect(first).toStrictEqual(second)
  })
})
