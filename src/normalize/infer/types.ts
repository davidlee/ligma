import type {
  Bounds,
  HierarchyEntry,
  NormalizedAppearance,
  NormalizedComponentInfo,
  NormalizedLayout,
  NormalizedNode,
  NormalizedNodeType,
  NormalizedRole,
  NormalizedText,
  Semantics,
  TextSemanticKind,
} from '../../schemas/normalized.js'
import type { AnalysisResult } from '../raw-helpers.js'

/**
 * Narrow read-only view of an assembled node for inference (DEC-022).
 *
 * Excludes write-target fields (role, variables, asset, semantics, diagnostics)
 * and extraction-only fields (id, rotation) to enforce the boundary between
 * extraction and inference at both the type level and runtime.
 */
export interface InferenceInput {
  readonly type: NormalizedNodeType
  readonly name: string
  readonly visible: boolean
  readonly bounds: Bounds | null
  readonly layout: NormalizedLayout | null
  readonly appearance: NormalizedAppearance | null
  readonly text: NormalizedText | null
  readonly component: NormalizedComponentInfo | null
  readonly hierarchy: Readonly<{
    parentId: string | null
    depth: number
    childCount: number
    path: readonly HierarchyEntry[]
  }>
  readonly children: readonly InferenceInput[]
}

export interface InferenceResults {
  role: AnalysisResult<NormalizedRole | null>
  semantics: AnalysisResult<Semantics>
  textKind: AnalysisResult<TextSemanticKind> | null
}

export function toInferenceInput(node: NormalizedNode): InferenceInput {
  return {
    type: node.type,
    name: node.name,
    visible: node.visible,
    bounds: node.bounds,
    layout: node.layout,
    appearance: node.appearance,
    text: node.text,
    component: node.component,
    hierarchy: {
      parentId: node.hierarchy.parentId,
      depth: node.hierarchy.depth,
      childCount: node.hierarchy.childCount,
      path: node.hierarchy.path,
    },
    children: node.children.map(toInferenceInput),
  }
}
