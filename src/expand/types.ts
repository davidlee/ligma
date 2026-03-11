import type { FigmaNode } from '../figma/types-raw.js'
import type { NormalizedNode } from '../schemas/normalized.js'

// --- Reason codes ---

export type ExpansionReasonCode =
  | 'depth-truncated-container'
  | 'geometry-needed'

// --- Trigger types ---

export interface ExpansionTarget {
  readonly nodeId: string
  readonly reasonCode: ExpansionReasonCode
  readonly reason: string
  readonly depth: number | null
  readonly requireGeometry: boolean
  readonly priority: number
}

export interface TriggerContext {
  readonly requestedDepth: number
  readonly fetchState: {
    readonly requestedGeometry: boolean
    readonly expandedNodeIds: ReadonlySet<string>
  }
}

export type ExpansionTrigger = (
  node: NormalizedNode,
  context: TriggerContext,
) => ExpansionTarget | null

// --- Config ---

export interface ExpansionConfig {
  readonly enabled: boolean
  readonly maxTargets: number
  readonly expansionDepth: number
}

// --- Results ---

export interface ExecutedExpansion {
  readonly nodeId: string
  readonly reasonCode: ExpansionReasonCode
  readonly allReasonCodes: readonly ExpansionReasonCode[]
  readonly reason: string
  readonly depth: number
  readonly geometry: boolean
  readonly success: boolean
  readonly fetchedFromCache: boolean
  readonly error?: string
}

export interface SkippedExpansion {
  readonly nodeId: string
  readonly reasonCode: ExpansionReasonCode
  readonly reason: string
  readonly skippedBecause:
    | 'max-targets-exceeded'
    | 'already-expanded'
    | 'deduplicated-lower-priority'
}

export interface ExpansionResult {
  readonly executed: readonly ExecutedExpansion[]
  readonly skipped: readonly SkippedExpansion[]
  readonly totalTriggered: number
  readonly totalExecuted: number
  readonly totalSkipped: number
}

// --- Merge types ---

export interface MergeInput {
  readonly nodeId: string
  readonly expandedNode: FigmaNode
}

export interface MergeResult {
  readonly merged: FigmaNode
  readonly applied: readonly string[]
  readonly notFound: readonly string[]
}
