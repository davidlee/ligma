import { describe, expect, it } from 'vitest'

import { findRawNodeById, mergeExpansions } from '../../src/expand/merge.js'
import { FigmaNodeSchema } from '../../src/schemas/raw.js'

import type { FigmaNode } from '../../src/figma/types-raw.js'

function makeRawNode(
  id: string,
  name: string,
  children?: FigmaNode[],
): FigmaNode {
  return FigmaNodeSchema.parse({
    id,
    name,
    type: 'FRAME',
    ...(children !== undefined ? { children } : {}),
  })
}

function makeTree(): FigmaNode {
  const leaf1 = makeRawNode('3:1', 'Leaf1')
  const leaf2 = makeRawNode('3:2', 'Leaf2')
  const mid = makeRawNode('2:1', 'Mid', [leaf1, leaf2])
  const sibling = makeRawNode('2:2', 'Sibling')
  return makeRawNode('1:0', 'Root', [mid, sibling])
}

function child(node: FigmaNode, index: number): FigmaNode {
  const children = node.children ?? []
  const result = children[index]
  if (result === undefined) {
    throw new Error(`No child at index ${String(index)} on node ${node.id}`)
  }
  return result
}

describe('findRawNodeById', () => {
  it('finds root node', () => {
    const root = makeTree()
    const result = findRawNodeById(root, '1:0')
    expect(result).not.toBeNull()
    expect(result?.node.id).toBe('1:0')
    expect(result?.parent).toBeNull()
    expect(result?.childIndex).toBeNull()
  })

  it('finds nested node with correct parent and index', () => {
    const root = makeTree()
    const result = findRawNodeById(root, '3:2')
    expect(result).not.toBeNull()
    expect(result?.node.id).toBe('3:2')
    expect(result?.parent?.id).toBe('2:1')
    expect(result?.childIndex).toBe(1)
  })

  it('returns null for missing node', () => {
    const root = makeTree()
    expect(findRawNodeById(root, '99:99')).toBeNull()
  })

  it('finds node without children field', () => {
    const root = makeRawNode('1:0', 'Root')
    const result = findRawNodeById(root, '1:0')
    expect(result).not.toBeNull()
    expect(result?.node.id).toBe('1:0')
  })
})

describe('mergeExpansions (VT-032)', () => {
  it('replaces a single node immutably', () => {
    const original = makeTree()
    const expanded = makeRawNode('3:1', 'Leaf1-Expanded', [
      makeRawNode('4:1', 'DeepChild'),
    ])

    const result = mergeExpansions(original, [
      { nodeId: '3:1', expandedNode: expanded },
    ])

    expect(result.applied).toEqual(['3:1'])
    expect(result.notFound).toEqual([])

    const mid = child(result.merged, 0)
    const leaf = child(mid, 0)
    expect(leaf.name).toBe('Leaf1-Expanded')
    expect(leaf.children).toHaveLength(1)

    // Original tree untouched
    const originalLeaf = child(child(original, 0), 0)
    expect(originalLeaf.name).toBe('Leaf1')
    expect(originalLeaf.children).toBeUndefined()
  })

  it('replaces multiple nodes', () => {
    const original = makeTree()
    const expanded1 = makeRawNode('3:1', 'Leaf1-Exp')
    const expanded2 = makeRawNode('2:2', 'Sibling-Exp', [
      makeRawNode('5:1', 'NewChild'),
    ])

    const result = mergeExpansions(original, [
      { nodeId: '3:1', expandedNode: expanded1 },
      { nodeId: '2:2', expandedNode: expanded2 },
    ])

    expect(result.applied).toHaveLength(2)
    expect(result.notFound).toEqual([])
    expect(child(child(result.merged, 0), 0).name).toBe('Leaf1-Exp')
    const mergedSibling = child(result.merged, 1)
    expect(mergedSibling.name).toBe('Sibling-Exp')
    expect(mergedSibling.children).toHaveLength(1)
  })

  it('applies deepest nodes first — child before parent', () => {
    const original = makeTree()
    const expandedLeaf = makeRawNode('3:1', 'Leaf1-Deep', [
      makeRawNode('4:1', 'VeryDeep'),
    ])
    const expandedMid = makeRawNode('2:1', 'Mid-Exp', [
      makeRawNode('3:1', 'Leaf1-FromParent'),
      makeRawNode('3:2', 'Leaf2'),
    ])

    const result = mergeExpansions(original, [
      { nodeId: '3:1', expandedNode: expandedLeaf },
      { nodeId: '2:1', expandedNode: expandedMid },
    ])

    expect(result.applied).toEqual(['3:1', '2:1'])
    const mergedMid = child(result.merged, 0)
    expect(mergedMid.name).toBe('Mid-Exp')
    expect(child(mergedMid, 0).name).toBe('Leaf1-FromParent')
  })

  it('supports root replacement', () => {
    const original = makeTree()
    const expandedRoot = makeRawNode('1:0', 'Root-Exp', [
      makeRawNode('9:1', 'Completely-New'),
    ])

    const result = mergeExpansions(original, [
      { nodeId: '1:0', expandedNode: expandedRoot },
    ])

    expect(result.applied).toEqual(['1:0'])
    expect(result.merged.name).toBe('Root-Exp')
    expect(result.merged.children).toHaveLength(1)
    expect(original.name).toBe('Root')
  })

  it('preserves enriched fields on expanded node', () => {
    const original = makeTree()
    const expanded = FigmaNodeSchema.parse({
      id: '3:1',
      name: 'Leaf1',
      type: 'FRAME',
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
      children: [makeRawNode('4:1', 'Child')],
    })

    const result = mergeExpansions(original, [
      { nodeId: '3:1', expandedNode: expanded },
    ])

    const replaced = child(child(result.merged, 0), 0)
    expect(replaced).toHaveProperty('fills')
    expect(replaced.children).toHaveLength(1)
  })

  it('does not mutate original tree on any branch', () => {
    const original = makeTree()
    const originalJson = JSON.stringify(original)

    mergeExpansions(original, [
      { nodeId: '3:1', expandedNode: makeRawNode('3:1', 'Replaced') },
    ])

    expect(JSON.stringify(original)).toBe(originalJson)
  })

  it('returns empty results for empty expansions', () => {
    const original = makeTree()
    const result = mergeExpansions(original, [])
    expect(result.applied).toEqual([])
    expect(result.notFound).toEqual([])
    expect(result.merged.name).toBe('Root')
  })
})

describe('mergeExpansions soft failure (VT-033)', () => {
  it('records missing target in notFound', () => {
    const original = makeTree()
    const result = mergeExpansions(original, [
      { nodeId: '99:99', expandedNode: makeRawNode('99:99', 'Ghost') },
    ])

    expect(result.applied).toEqual([])
    expect(result.notFound).toEqual(['99:99'])
  })

  it('handles partial success — some found, some not', () => {
    const original = makeTree()
    const result = mergeExpansions(original, [
      { nodeId: '3:1', expandedNode: makeRawNode('3:1', 'Found') },
      { nodeId: '99:99', expandedNode: makeRawNode('99:99', 'Missing') },
    ])

    expect(result.applied).toEqual(['3:1'])
    expect(result.notFound).toEqual(['99:99'])
    expect(child(child(result.merged, 0), 0).name).toBe('Found')
  })
})
