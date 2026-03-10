import type { InferenceInput } from './types.js'
import type { NormalizedRole, TextSemanticKind } from '../../schemas/normalized.js'
import type { AnalysisResult } from '../raw-helpers.js'

const HEADING_MIN_FONT_SIZE = 20
const HEADING_MIN_FONT_WEIGHT = 600
const CAPTION_MAX_FONT_SIZE = 12

const ROLE_TO_TEXT_KIND: Partial<Record<NormalizedRole, TextSemanticKind>> = {
  'heading': 'heading',
  'body-text': 'body',
  'label': 'label',
  'button': 'button',
  'icon-button': 'button',
}

const BUTTON_ROLES = new Set<NormalizedRole>(['button', 'icon-button'])

export function inferTextKind(
  input: InferenceInput,
  role: NormalizedRole | null,
  roleConfidence: AnalysisResult<unknown>['confidence'],
  parentRole?: NormalizedRole | null,
): AnalysisResult<TextSemanticKind> | null {
  if (input.type !== 'text') {
    return null
  }

  // Primary: derive from role
  if (role !== null) {
    const kind = ROLE_TO_TEXT_KIND[role]
    if (kind !== undefined) {
      return { value: kind, confidence: roleConfidence, warnings: [] }
    }
  }

  // Parent context: text inside button-role frame
  if (parentRole !== undefined && parentRole !== null && BUTTON_ROLES.has(parentRole)) {
    return { value: 'button', confidence: 'medium', warnings: [] }
  }

  // Fallback heuristic
  return inferTextKindFallback(input)
}

function isHeadingStyle(
  fontSize: number, fontWeight: number | null,
): AnalysisResult<TextSemanticKind> | null {
  if (fontSize < HEADING_MIN_FONT_SIZE) {
    return null
  }
  const isHeavy = fontWeight !== null && fontWeight >= HEADING_MIN_FONT_WEIGHT
  return { value: 'heading', confidence: isHeavy ? 'high' : 'medium', warnings: [] }
}

function inferTextKindFallback(
  input: InferenceInput,
): AnalysisResult<TextSemanticKind> {
  if (input.text === null) {
    return { value: 'unknown', confidence: 'medium', warnings: [] }
  }

  const { fontSize, fontWeight } = input.text.style

  if (fontSize !== null) {
    const heading = isHeadingStyle(fontSize, fontWeight)
    if (heading !== null) {
      return heading
    }
    if (fontSize <= CAPTION_MAX_FONT_SIZE) {
      return { value: 'caption', confidence: 'medium', warnings: [] }
    }
  }

  if (input.text.content.length > 80) {
    return { value: 'body', confidence: 'medium', warnings: [] }
  }

  return { value: 'unknown', confidence: 'medium', warnings: [] }
}
