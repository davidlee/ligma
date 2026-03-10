import { getRawArray, isRecord } from './raw-helpers.js'

import type { ExtractorResult } from './raw-helpers.js'
import type { FigmaNode } from '../figma/types-raw.js'
import type { AssetKind, NormalizedAssetInfo } from '../schemas/normalized.js'

const VECTOR_TYPES = new Set(['VECTOR', 'BOOLEAN_OPERATION'])
const VECTOR_COMPLEXITY_CHILD_THRESHOLD = 3

function collectImageReferences(node: FigmaNode): string[] {
  const references: string[] = []
  for (const fill of getRawArray(node, 'fills')) {
    if (isRecord(fill) && fill.type === 'IMAGE' && typeof fill.imageRef === 'string') {
      references.push(fill.imageRef)
    }
  }
  return references
}

function hasVectorComplexity(node: FigmaNode): boolean {
  if (!VECTOR_TYPES.has(node.type)) {
    return false
  }
  const children = node.children ?? []
  if (children.length >= VECTOR_COMPLEXITY_CHILD_THRESHOLD) {
    return true
  }
  return children.some((child) => child.type === 'BOOLEAN_OPERATION')
}

export function extractAsset(node: FigmaNode): ExtractorResult<NormalizedAssetInfo | null> {
  const imageReferences = collectImageReferences(node)
  const hasImages = imageReferences.length > 0
  const isComplexVector = hasVectorComplexity(node)

  if (!hasImages && !isComplexVector) {
    return { value: null, confidence: 'high', warnings: [], omittedFields: [] }
  }

  let kind: AssetKind
  let confidence: 'high' | 'medium'
  let reason: string

  if (hasImages && isComplexVector) {
    kind = 'mixed'
    confidence = 'medium'
    reason = 'image fills and vector complexity both present'
  } else if (hasImages) {
    kind = 'bitmap'
    confidence = 'high'
    reason = 'image fill detected'
  } else {
    kind = 'svg'
    confidence = 'medium'
    reason = 'vector complexity threshold exceeded — likely export candidate'
  }

  return {
    value: {
      kind,
      exportSuggested: true,
      reason,
      exportNodeIds: [node.id],
      imageRefs: imageReferences,
    },
    confidence,
    warnings: [],
    omittedFields: [],
  }
}
