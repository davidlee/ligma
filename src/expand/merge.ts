import type { MergeInput, MergeResult } from './types.js'
import type { FigmaNode } from '../figma/types-raw.js'

interface NodeLocation {
  readonly node: FigmaNode
  readonly parent: FigmaNode | null
  readonly childIndex: number | null
}

function getChildren(node: FigmaNode): readonly FigmaNode[] {
  return node.children ?? []
}

function childAt(children: readonly FigmaNode[], index: number): FigmaNode | undefined {
  return children[index]
}

/**
 * Find a node by ID in the raw tree. Returns the node, its parent,
 * and its index within the parent's children array.
 */
export function findRawNodeById(
  root: FigmaNode,
  targetId: string,
): NodeLocation | null {
  if (root.id === targetId) {
    return { node: root, parent: null, childIndex: null }
  }
  return searchChildren(root, targetId)
}

function searchChildren(
  parent: FigmaNode,
  targetId: string,
): NodeLocation | null {
  const children = getChildren(parent)

  for (let index = 0; index < children.length; index++) {
    const current = childAt(children, index)
    if (current === undefined) {
      continue
    }
    if (current.id === targetId) {
      return { node: current, parent, childIndex: index }
    }
    const found = searchChildren(current, targetId)
    if (found !== null) {
      return found
    }
  }
  return null
}

function nodeDepthInTree(
  root: FigmaNode,
  targetId: string,
  currentDepth = 0,
): number | null {
  if (root.id === targetId) {
    return currentDepth
  }
  for (const current of getChildren(root)) {
    const depth = nodeDepthInTree(current, targetId, currentDepth + 1)
    if (depth !== null) {
      return depth
    }
  }
  return null
}

function cloneWithChildren(node: FigmaNode, children: FigmaNode[]): FigmaNode {
  return { ...node, children }
}

function replaceChildAt(
  children: readonly FigmaNode[],
  index: number,
  replacement: FigmaNode,
): FigmaNode[] {
  return children.map((existing, position) => (position === index ? replacement : existing))
}

/**
 * Immutably replace a node at a given path in the tree.
 * Path-clones along modified branches; untouched branches remain shared.
 */
function replaceNode(
  root: FigmaNode,
  targetId: string,
  replacement: FigmaNode,
): FigmaNode | null {
  if (root.id === targetId) {
    return replacement
  }

  const children = getChildren(root)

  for (let index = 0; index < children.length; index++) {
    const current = childAt(children, index)
    if (current === undefined) {
      continue
    }
    if (current.id === targetId) {
      return cloneWithChildren(root, replaceChildAt(children, index, replacement))
    }
    const replaced = replaceNode(current, targetId, replacement)
    if (replaced !== null) {
      return cloneWithChildren(root, replaceChildAt(children, index, replaced))
    }
  }
  return null
}

/**
 * Merge expanded nodes into the raw tree.
 *
 * Rules (DR-006 §7):
 * - Whole-node replacement
 * - Immutable path-cloning; original tree untouched
 * - Deepest nodes first (children before parents)
 * - Soft failure: missing targets recorded in notFound
 */
export function mergeExpansions(
  root: FigmaNode,
  expansions: readonly MergeInput[],
): MergeResult {
  if (expansions.length === 0) {
    return { merged: root, applied: [], notFound: [] }
  }

  const sorted = [...expansions].sort((a, b) => {
    const depthA = nodeDepthInTree(root, a.nodeId) ?? -1
    const depthB = nodeDepthInTree(root, b.nodeId) ?? -1
    return depthB - depthA
  })

  const applied: string[] = []
  const notFound: string[] = []
  let current = root

  for (const expansion of sorted) {
    const replaced = replaceNode(current, expansion.nodeId, expansion.expandedNode)
    if (replaced !== null) {
      current = replaced
      applied.push(expansion.nodeId)
    } else {
      notFound.push(expansion.nodeId)
    }
  }

  return { merged: current, applied, notFound }
}
