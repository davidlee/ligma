import type {
  ExpansionTarget,
  ExpansionTrigger,
  SkippedExpansion,
  TriggerContext,
} from './types.js'
import type { NormalizedNode, NormalizedNodeType } from '../schemas/normalized.js'

const CONTAINER_TYPES: ReadonlySet<NormalizedNodeType> = new Set([
  'frame', 'group', 'component', 'instance', 'variant-set', 'section',
])

const HIGH_PRIORITY_TYPES: ReadonlySet<NormalizedNodeType> = new Set([
  'instance', 'component',
])

const GEOMETRY_TYPES: ReadonlySet<NormalizedNodeType> = new Set([
  'vector', 'boolean-operation',
])

/**
 * Fires when a container-type node at the depth boundary has no children,
 * indicating the API truncated its subtree. (DR-006 §6 + §11)
 */
export function depthTruncatedContainer(
  node: NormalizedNode,
  context: TriggerContext,
): ExpansionTarget | null {
  if (node.hierarchy.depth !== context.requestedDepth) {
    return null
  }
  if (node.children.length > 0) {
    return null
  }
  if (!CONTAINER_TYPES.has(node.type)) {
    return null
  }

  const isHighPriority = HIGH_PRIORITY_TYPES.has(node.type)
  const label = isHighPriority ? 'component instance' : 'container'

  return {
    nodeId: node.id,
    reasonCode: 'depth-truncated-container',
    reason: `depth-truncated ${label}: ${node.name}`,
    depth: null,
    requireGeometry: false,
    priority: isHighPriority ? 1 : 2,
  }
}

/**
 * Fires when a vector/boolean-operation node would benefit from geometry data
 * for export, but geometry wasn't requested in the initial fetch. (DR-006 §6)
 */
export function geometryNeeded(
  node: NormalizedNode,
  context: TriggerContext,
): ExpansionTarget | null {
  if (context.fetchState.requestedGeometry) {
    return null
  }
  if (!GEOMETRY_TYPES.has(node.type)) {
    return null
  }

  const exportSuggested = node.asset?.exportSuggested === true
  const isIcon = node.role === 'icon'

  if (!exportSuggested && !isIcon) {
    return null
  }

  return {
    nodeId: node.id,
    reasonCode: 'geometry-needed',
    reason: `geometry data needed for export: ${node.name}`,
    depth: null,
    requireGeometry: true,
    priority: 3,
  }
}

// --- Evaluation pipeline ---

interface MergedTarget {
  readonly nodeId: string
  reasonCode: ExpansionTarget['reasonCode']
  reason: string
  depth: number | null
  requireGeometry: boolean
  priority: number
  discoveryOrder: number
  allReasonCodes: ExpansionTarget['reasonCode'][]
}

interface EvaluationConfig {
  readonly maxTargets: number
}

interface EvaluationResult {
  readonly targets: readonly ExpansionTarget[]
  readonly skipped: readonly SkippedExpansion[]
  readonly totalTriggered: number
}

function walkDepthFirst(
  node: NormalizedNode,
  visitor: (node: NormalizedNode) => void,
): void {
  visitor(node)
  for (const childNode of node.children) {
    walkDepthFirst(childNode, visitor)
  }
}

function mergeIntoTarget(existing: MergedTarget, incoming: ExpansionTarget): void {
  if (incoming.priority < existing.priority) {
    existing.priority = incoming.priority
    existing.reasonCode = incoming.reasonCode
    existing.reason = incoming.reason
  }
  existing.requireGeometry = existing.requireGeometry || incoming.requireGeometry
  if (incoming.depth !== null) {
    existing.depth = existing.depth !== null
      ? Math.max(existing.depth, incoming.depth)
      : incoming.depth
  }
  existing.allReasonCodes.push(incoming.reasonCode)
}

interface CollectionResult {
  readonly targetsByNodeId: Map<string, MergedTarget>
  readonly skipped: SkippedExpansion[]
  readonly totalTriggered: number
}

function collectTriggerResults(
  root: NormalizedNode,
  triggers: readonly ExpansionTrigger[],
  context: TriggerContext,
): CollectionResult {
  const targetsByNodeId = new Map<string, MergedTarget>()
  const skipped: SkippedExpansion[] = []
  let discoveryCounter = 0
  let totalTriggered = 0

  walkDepthFirst(root, (node) => {
    for (const trigger of triggers) {
      const target = trigger(node, context)
      if (target === null) {
        continue
      }
      totalTriggered++

      const existing = targetsByNodeId.get(target.nodeId)
      if (existing !== undefined) {
        skipped.push({
          nodeId: target.nodeId,
          reasonCode: target.reasonCode,
          reason: target.reason,
          skippedBecause: 'deduplicated-lower-priority',
        })
        mergeIntoTarget(existing, target)
      } else {
        targetsByNodeId.set(target.nodeId, {
          nodeId: target.nodeId,
          reasonCode: target.reasonCode,
          reason: target.reason,
          depth: target.depth,
          requireGeometry: target.requireGeometry,
          priority: target.priority,
          discoveryOrder: discoveryCounter++,
          allReasonCodes: [target.reasonCode],
        })
      }
    }
  })

  return { targetsByNodeId, skipped, totalTriggered }
}

function filterAlreadyExpanded(
  targetsByNodeId: Map<string, MergedTarget>,
  expandedNodeIds: ReadonlySet<string>,
  skipped: SkippedExpansion[],
): void {
  for (const [nodeId, target] of targetsByNodeId) {
    if (expandedNodeIds.has(nodeId)) {
      targetsByNodeId.delete(nodeId)
      skipped.push({
        nodeId: target.nodeId,
        reasonCode: target.reasonCode,
        reason: target.reason,
        skippedBecause: 'already-expanded',
      })
    }
  }
}

function toExpansionTarget(merged: MergedTarget): ExpansionTarget {
  return {
    nodeId: merged.nodeId,
    reasonCode: merged.reasonCode,
    reason: merged.reason,
    depth: merged.depth,
    requireGeometry: merged.requireGeometry,
    priority: merged.priority,
  }
}

/**
 * Walk the normalized tree, run all triggers per node, deduplicate by nodeId,
 * filter already-expanded, sort by priority, and cap at maxTargets.
 * (DR-006 §6 evaluateExpansionTriggers)
 */
export function evaluateExpansionTriggers(
  root: NormalizedNode,
  triggers: readonly ExpansionTrigger[],
  context: TriggerContext,
  config: EvaluationConfig,
): EvaluationResult {
  const { targetsByNodeId, skipped, totalTriggered } =
    collectTriggerResults(root, triggers, context)

  filterAlreadyExpanded(targetsByNodeId, context.fetchState.expandedNodeIds, skipped)

  const sorted = [...targetsByNodeId.values()].sort((a, b) => {
    const priorityDiff = a.priority - b.priority
    return priorityDiff !== 0 ? priorityDiff : a.discoveryOrder - b.discoveryOrder
  })

  const targets: ExpansionTarget[] = []
  for (let index = 0; index < sorted.length; index++) {
    const merged = sorted[index]
    if (merged === undefined) {
      continue
    }
    if (index >= config.maxTargets) {
      skipped.push({
        nodeId: merged.nodeId,
        reasonCode: merged.reasonCode,
        reason: merged.reason,
        skippedBecause: 'max-targets-exceeded',
      })
    } else {
      targets.push(toExpansionTarget(merged))
    }
  }

  return { targets, skipped, totalTriggered }
}
