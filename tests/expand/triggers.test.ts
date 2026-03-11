import { describe, expect, it } from 'vitest'

import {
  depthTruncatedContainer,
  evaluateExpansionTriggers,
  geometryNeeded,
} from '../../src/expand/triggers.js'

import type { TriggerContext } from '../../src/expand/types.js'
import type { NormalizedNode } from '../../src/schemas/normalized.js'

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

function makeContext(overrides: Partial<TriggerContext> = {}): TriggerContext {
  return {
    requestedDepth: 2,
    fetchState: {
      requestedGeometry: false,
      expandedNodeIds: new Set(),
    },
    ...overrides,
  }
}

describe('depthTruncatedContainer (VT-029)', () => {
  it('fires for frame at depth boundary with no children', () => {
    const node = makeNode({
      hierarchy: { parentId: '0:1', depth: 2, childCount: 0, path: [] },
      type: 'frame',
    })
    const context = makeContext({ requestedDepth: 2 })

    const result = depthTruncatedContainer(node, context)

    expect(result).not.toBeNull()
    expect(result?.reasonCode).toBe('depth-truncated-container')
    expect(result?.priority).toBe(2)
    expect(result?.depth).toBeNull()
    expect(result?.requireGeometry).toBe(false)
  })

  it('assigns priority 1 for instance type', () => {
    const node = makeNode({
      hierarchy: { parentId: '0:1', depth: 2, childCount: 0, path: [] },
      type: 'instance',
    })
    const result = depthTruncatedContainer(node, makeContext({ requestedDepth: 2 }))

    expect(result).not.toBeNull()
    expect(result?.priority).toBe(1)
    expect(result?.reason).toContain('component instance')
  })

  it('assigns priority 1 for component type', () => {
    const node = makeNode({
      hierarchy: { parentId: '0:1', depth: 2, childCount: 0, path: [] },
      type: 'component',
    })
    const result = depthTruncatedContainer(node, makeContext({ requestedDepth: 2 }))

    expect(result?.priority).toBe(1)
  })

  it('fires for all container types', () => {
    const containerTypes = ['frame', 'group', 'component', 'instance', 'variant-set', 'section'] as const
    const context = makeContext({ requestedDepth: 3 })

    for (const type of containerTypes) {
      const node = makeNode({
        hierarchy: { parentId: '0:1', depth: 3, childCount: 0, path: [] },
        type,
      })
      const result = depthTruncatedContainer(node, context)
      expect(result).not.toBeNull()
    }
  })

  it('does not fire for non-container types', () => {
    const nonContainerTypes = ['text', 'shape', 'vector', 'image', 'line', 'boolean-operation', 'mask', 'unknown'] as const
    const context = makeContext({ requestedDepth: 2 })

    for (const type of nonContainerTypes) {
      const node = makeNode({
        hierarchy: { parentId: '0:1', depth: 2, childCount: 0, path: [] },
        type,
      })
      expect(depthTruncatedContainer(node, context)).toBeNull()
    }
  })

  it('does not fire when depth is below boundary', () => {
    const node = makeNode({
      hierarchy: { parentId: '0:1', depth: 1, childCount: 0, path: [] },
      type: 'frame',
    })
    expect(depthTruncatedContainer(node, makeContext({ requestedDepth: 2 }))).toBeNull()
  })

  it('does not fire when children are present', () => {
    const node = makeNode({
      hierarchy: { parentId: '0:1', depth: 2, childCount: 1, path: [] },
      type: 'frame',
      children: [makeNode({ id: '2:1' })],
    })
    expect(depthTruncatedContainer(node, makeContext({ requestedDepth: 2 }))).toBeNull()
  })

  it('includes node name in reason', () => {
    const node = makeNode({
      name: 'Card Header',
      hierarchy: { parentId: '0:1', depth: 2, childCount: 0, path: [] },
      type: 'frame',
    })
    const result = depthTruncatedContainer(node, makeContext({ requestedDepth: 2 }))
    expect(result?.reason).toContain('Card Header')
  })
})

describe('geometryNeeded (VT-030)', () => {
  it('fires for export-worthy vector without geometry', () => {
    const node = makeNode({
      type: 'vector',
      asset: {
        kind: 'svg',
        exportSuggested: true,
        reason: null,
        exportNodeIds: [],
        imageRefs: [],
      },
    })
    const result = geometryNeeded(node, makeContext())

    expect(result).not.toBeNull()
    expect(result?.reasonCode).toBe('geometry-needed')
    expect(result?.priority).toBe(3)
    expect(result?.requireGeometry).toBe(true)
    expect(result?.depth).toBeNull()
  })

  it('fires for icon-role vector without geometry', () => {
    const node = makeNode({
      type: 'vector',
      role: 'icon',
    })
    const result = geometryNeeded(node, makeContext())
    expect(result).not.toBeNull()
    expect(result?.reasonCode).toBe('geometry-needed')
  })

  it('fires for boolean-operation with exportSuggested', () => {
    const node = makeNode({
      type: 'boolean-operation',
      asset: {
        kind: 'svg',
        exportSuggested: true,
        reason: null,
        exportNodeIds: [],
        imageRefs: [],
      },
    })
    expect(geometryNeeded(node, makeContext())).not.toBeNull()
  })

  it('does not fire when geometry already requested', () => {
    const node = makeNode({
      type: 'vector',
      asset: {
        kind: 'svg',
        exportSuggested: true,
        reason: null,
        exportNodeIds: [],
        imageRefs: [],
      },
    })
    const context = makeContext({
      fetchState: { requestedGeometry: true, expandedNodeIds: new Set() },
    })
    expect(geometryNeeded(node, context)).toBeNull()
  })

  it('does not fire for non-vector types', () => {
    const node = makeNode({
      type: 'frame',
      asset: {
        kind: 'svg',
        exportSuggested: true,
        reason: null,
        exportNodeIds: [],
        imageRefs: [],
      },
    })
    expect(geometryNeeded(node, makeContext())).toBeNull()
  })

  it('does not fire when neither exportSuggested nor icon role', () => {
    const node = makeNode({ type: 'vector' })
    expect(geometryNeeded(node, makeContext())).toBeNull()
  })

  it('includes node name in reason', () => {
    const node = makeNode({
      name: 'Arrow Icon',
      type: 'vector',
      role: 'icon',
    })
    const result = geometryNeeded(node, makeContext())
    expect(result?.reason).toContain('Arrow Icon')
  })
})

describe('evaluateExpansionTriggers (VT-031)', () => {
  it('returns empty result for tree with no triggers', () => {
    const root = makeNode({ id: '1:0' })
    const context = makeContext()
    const result = evaluateExpansionTriggers(root, [depthTruncatedContainer], context, { maxTargets: 10 })

    expect(result.targets).toEqual([])
    expect(result.skipped).toEqual([])
    expect(result.totalTriggered).toBe(0)
  })

  it('collects targets from depth-first walk', () => {
    const leaf1 = makeNode({
      id: '3:1',
      name: 'Leaf1',
      type: 'frame',
      hierarchy: { parentId: '2:1', depth: 2, childCount: 0, path: [] },
    })
    const leaf2 = makeNode({
      id: '3:2',
      name: 'Leaf2',
      type: 'instance',
      hierarchy: { parentId: '2:1', depth: 2, childCount: 0, path: [] },
    })
    const mid = makeNode({
      id: '2:1',
      hierarchy: { parentId: '1:0', depth: 1, childCount: 2, path: [] },
      children: [leaf1, leaf2],
    })
    const root = makeNode({
      id: '1:0',
      hierarchy: { parentId: null, depth: 0, childCount: 1, path: [] },
      children: [mid],
    })

    const result = evaluateExpansionTriggers(
      root,
      [depthTruncatedContainer],
      makeContext({ requestedDepth: 2 }),
      { maxTargets: 10 },
    )

    expect(result.targets).toHaveLength(2)
    expect(result.totalTriggered).toBe(2)
  })

  it('deduplicates by nodeId — merges priority, geometry, depth', () => {
    // Two triggers that both fire for the same node
    const node = makeNode({
      id: '2:1',
      type: 'vector',
      role: 'icon',
      hierarchy: { parentId: '1:0', depth: 2, childCount: 0, path: [] },
    })
    const root = makeNode({
      id: '1:0',
      children: [node],
    })

    const result = evaluateExpansionTriggers(
      root,
      [depthTruncatedContainer, geometryNeeded],
      makeContext({ requestedDepth: 2 }),
      { maxTargets: 10 },
    )

    // vector is not a container type, so only geometryNeeded fires
    expect(result.targets).toHaveLength(1)
    expect(result.targets[0]?.reasonCode).toBe('geometry-needed')
  })

  it('merges duplicate nodeId targets correctly', () => {
    // Custom triggers that both fire for the same node
    const triggerA = (node: NormalizedNode): ReturnType<typeof depthTruncatedContainer> => {
      if (node.id !== '2:1') {
        return null
      }
      return {
        nodeId: '2:1',
        reasonCode: 'depth-truncated-container',
        reason: 'trigger A',
        depth: 3,
        requireGeometry: false,
        priority: 5,
      }
    }
    const triggerB = (node: NormalizedNode): ReturnType<typeof depthTruncatedContainer> => {
      if (node.id !== '2:1') {
        return null
      }
      return {
        nodeId: '2:1',
        reasonCode: 'geometry-needed',
        reason: 'trigger B',
        depth: null,
        requireGeometry: true,
        priority: 2,
      }
    }

    const root = makeNode({
      id: '1:0',
      children: [makeNode({ id: '2:1' })],
    })

    const result = evaluateExpansionTriggers(
      root,
      [triggerA, triggerB],
      makeContext(),
      { maxTargets: 10 },
    )

    expect(result.targets).toHaveLength(1)
    const target = result.targets[0]
    expect(target?.priority).toBe(2) // lowest priority wins
    expect(target?.requireGeometry).toBe(true) // OR geometry
    expect(target?.depth).toBe(3) // max non-null depth
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0]?.skippedBecause).toBe('deduplicated-lower-priority')
  })

  it('filters already-expanded nodeIds', () => {
    const node = makeNode({
      id: '2:1',
      type: 'frame',
      hierarchy: { parentId: '1:0', depth: 2, childCount: 0, path: [] },
    })
    const root = makeNode({ id: '1:0', children: [node] })

    const context = makeContext({
      requestedDepth: 2,
      fetchState: { requestedGeometry: false, expandedNodeIds: new Set(['2:1']) },
    })

    const result = evaluateExpansionTriggers(
      root,
      [depthTruncatedContainer],
      context,
      { maxTargets: 10 },
    )

    expect(result.targets).toEqual([])
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0]?.skippedBecause).toBe('already-expanded')
  })

  it('sorts by priority — stable with discovery order tiebreak', () => {
    const low = makeNode({
      id: '2:1',
      name: 'LowPri',
      type: 'frame',
      hierarchy: { parentId: '1:0', depth: 2, childCount: 0, path: [] },
    })
    const high = makeNode({
      id: '2:2',
      name: 'HighPri',
      type: 'instance',
      hierarchy: { parentId: '1:0', depth: 2, childCount: 0, path: [] },
    })
    const root = makeNode({
      id: '1:0',
      children: [low, high],
    })

    const result = evaluateExpansionTriggers(
      root,
      [depthTruncatedContainer],
      makeContext({ requestedDepth: 2 }),
      { maxTargets: 10 },
    )

    // instance (priority 1) before frame (priority 2)
    expect(result.targets[0]?.nodeId).toBe('2:2')
    expect(result.targets[1]?.nodeId).toBe('2:1')
  })

  it('caps at maxTargets and records skipped', () => {
    const children = Array.from({ length: 5 }, (_, index) =>
      makeNode({
        id: `2:${String(index)}`,
        name: `Child${String(index)}`,
        type: 'frame',
        hierarchy: { parentId: '1:0', depth: 2, childCount: 0, path: [] },
      }),
    )
    const root = makeNode({ id: '1:0', children })

    const result = evaluateExpansionTriggers(
      root,
      [depthTruncatedContainer],
      makeContext({ requestedDepth: 2 }),
      { maxTargets: 2 },
    )

    expect(result.targets).toHaveLength(2)
    expect(result.skipped).toHaveLength(3)
    for (const skipped of result.skipped) {
      expect(skipped.skippedBecause).toBe('max-targets-exceeded')
    }
    expect(result.totalTriggered).toBe(5)
  })

  it('discovery order tiebreak — same priority preserves walk order', () => {
    const first = makeNode({
      id: '2:1',
      name: 'First',
      type: 'frame',
      hierarchy: { parentId: '1:0', depth: 2, childCount: 0, path: [] },
    })
    const second = makeNode({
      id: '2:2',
      name: 'Second',
      type: 'frame',
      hierarchy: { parentId: '1:0', depth: 2, childCount: 0, path: [] },
    })
    const root = makeNode({ id: '1:0', children: [first, second] })

    const result = evaluateExpansionTriggers(
      root,
      [depthTruncatedContainer],
      makeContext({ requestedDepth: 2 }),
      { maxTargets: 10 },
    )

    // Both priority 2, discovery order preserved
    expect(result.targets[0]?.nodeId).toBe('2:1')
    expect(result.targets[1]?.nodeId).toBe('2:2')
  })
})
