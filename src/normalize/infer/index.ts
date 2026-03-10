import { inferRole } from './role.js'
import { inferSemantics } from './semantics.js'
import { inferTextKind } from './text-kind.js'
import { toInferenceInput } from './types.js'

import type { InferenceInput, InferenceResults } from './types.js'
import type { Confidence, NormalizedNode, NormalizedRole } from '../../schemas/normalized.js'

const CONFIDENCE_ORDER: Record<Confidence, number> = {
  high: 2,
  medium: 1,
  low: 0,
}

function minConfidence(a: Confidence, b: Confidence): Confidence {
  return CONFIDENCE_ORDER[a] <= CONFIDENCE_ORDER[b] ? a : b
}

export function applyInferences(
  input: InferenceInput,
  siblings: readonly InferenceInput[],
  parentRole?: NormalizedRole | null,
): InferenceResults {
  const role = inferRole(input, siblings)
  const textKind = inferTextKind(input, role.value, role.confidence, parentRole)
  const semantics = inferSemantics(input, role.value, role.confidence, input.component)
  return { role, semantics, textKind }
}

function applyResultsToNode(node: NormalizedNode, results: InferenceResults): void {
  node.role = results.role.value
  node.semantics = results.semantics.value
  if (node.text !== null && results.textKind !== null) {
    node.text.semanticKind = results.textKind.value
  }

  node.diagnostics.warnings.push(...results.role.warnings)
  node.diagnostics.warnings.push(...results.semantics.warnings)
  if (results.textKind !== null) {
    node.diagnostics.warnings.push(...results.textKind.warnings)
  }

  let inferenceConfidence = results.role.confidence
  inferenceConfidence = minConfidence(inferenceConfidence, results.semantics.confidence)
  if (results.textKind !== null) {
    inferenceConfidence = minConfidence(inferenceConfidence, results.textKind.confidence)
  }
  node.diagnostics.confidence = minConfidence(
    node.diagnostics.confidence, inferenceConfidence,
  )
}

function inferRecursive(
  node: NormalizedNode,
  siblingInputs: readonly InferenceInput[],
  parentRole?: NormalizedRole | null,
): void {
  const input = toInferenceInput(node)
  const results = applyInferences(input, siblingInputs, parentRole)
  applyResultsToNode(node, results)

  const childSiblingInputs = node.children.map(toInferenceInput)
  for (const child of node.children) {
    inferRecursive(child, childSiblingInputs, results.role.value)
  }
}

export function applyInferencesRecursive(
  node: NormalizedNode,
  parentRole?: NormalizedRole | null,
): void {
  inferRecursive(node, [], parentRole)
}
