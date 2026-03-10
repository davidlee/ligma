import type { InferenceInput } from './types.js'
import type { NormalizedComponentInfo, NormalizedRole, Semantics } from '../../schemas/normalized.js'
import type { AnalysisResult } from '../raw-helpers.js'

const INTERACTIVE_ROLES = new Set<NormalizedRole>([
  'button', 'icon-button', 'input', 'navigation',
])

export function inferSemantics(
  input: InferenceInput,
  role: NormalizedRole | null,
  roleConfidence: AnalysisResult<unknown>['confidence'],
  component: NormalizedComponentInfo | null,
): AnalysisResult<Semantics> {
  return {
    value: {
      likelyInteractive: role !== null && INTERACTIVE_ROLES.has(role),
      likelyTextInput: role === 'input',
      likelyIcon: role === 'icon',
      likelyImage: role === 'image' || input.type === 'image',
      likelyMask: input.type === 'mask',
      likelyReusableComponent: component?.isReusable === true,
    },
    confidence: roleConfidence,
    warnings: [],
  }
}
