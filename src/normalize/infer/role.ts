import {
  countTextChildren,
  getShortTextChild,
  hasAutoLayout,
  hasCornerRadius,
  hasIconChild,
  hasPadding,
  hasSiblingWithInputSignals,
  hasVisibleFill,
  hasVisibleStroke,
  isSmallSquarish,
  isThinDimension,
  isWideRectangle,
  matchesName,
} from './signals.js'

import type { InferenceInput } from './types.js'
import type { NormalizedRole } from '../../schemas/normalized.js'
import type { AnalysisResult } from '../raw-helpers.js'

// --- Thresholds (DR-004 §5.6) ---

const ICON_MAX_SIZE = 48
const ICON_ASPECT_RANGE = [0.5, 2.0] as const
const BUTTON_MAX_TEXT_LENGTH = 40
const INPUT_MIN_ASPECT_RATIO = 2.0
const HEADING_MIN_FONT_SIZE = 20
const HEADING_MIN_FONT_WEIGHT = 600
const HEADING_MAX_LENGTH = 80
const LABEL_MAX_LENGTH = 40
const BODY_MIN_LENGTH = 80
const DIVIDER_MAX_THICKNESS = 2

// --- Rule type ---

type RoleRule = (
  input: InferenceInput,
  siblings: readonly InferenceInput[],
) => AnalysisResult<NormalizedRole> | null

// --- Individual rules ---

function imageRule(input: InferenceInput): AnalysisResult<NormalizedRole> | null {
  if (input.type !== 'image') {
    return null
  }
  return { value: 'image', confidence: 'high', warnings: [] }
}

function iconRule(input: InferenceInput): AnalysisResult<NormalizedRole> | null {
  const iconTypes = new Set(['vector', 'group', 'boolean-operation', 'instance'])
  if (!iconTypes.has(input.type)) {
    return null
  }
  if (!isSmallSquarish(input.bounds, ICON_MAX_SIZE, ICON_ASPECT_RANGE)) {
    return null
  }
  if (countTextChildren(input.children) > 0) {
    return null
  }
  const nameReinforces = matchesName(input, ['icon', 'icn', 'arrow', 'chevron', 'close', 'check', 'star'])
  return {
    value: 'icon',
    confidence: nameReinforces ? 'high' : 'medium',
    warnings: [],
  }
}

function countButtonSignals(input: InferenceInput, hasText: boolean): number {
  let signals = 0
  if (hasText) {
    signals += 1
  }
  if (hasAutoLayout(input.layout)) {
    signals += 1
  }
  if (hasPadding(input.layout)) {
    signals += 1
  }
  if (hasVisibleFill(input.appearance)) {
    signals += 1
  }
  if (matchesName(input, ['button', 'btn', 'cta'])) {
    signals += 1
  }
  return signals
}

function buttonRule(input: InferenceInput): AnalysisResult<NormalizedRole> | null {
  const buttonTypes = new Set(['instance', 'component', 'frame'])
  if (!buttonTypes.has(input.type)) {
    return null
  }
  const hasText = getShortTextChild(input.children, BUTTON_MAX_TEXT_LENGTH) !== null
  const hasIcon = hasIconChild(input.children)
  if (!hasText && !hasIcon) {
    return null
  }
  const signals = countButtonSignals(input, hasText)
  if (signals < 2) {
    return null
  }
  const role: NormalizedRole = hasIcon && !hasText ? 'icon-button' : 'button'
  return {
    value: role,
    confidence: signals >= 4 ? 'high' : 'medium',
    warnings: [],
  }
}

function inputRule(input: InferenceInput): AnalysisResult<NormalizedRole> | null {
  const inputTypes = new Set(['frame', 'instance', 'component'])
  if (!inputTypes.has(input.type)) {
    return null
  }
  if (!isWideRectangle(input.bounds, INPUT_MIN_ASPECT_RATIO)) {
    return null
  }
  const hasBorderOrFill = hasVisibleFill(input.appearance) || hasVisibleStroke(input.appearance)
  if (!hasBorderOrFill) {
    return null
  }
  const nameMatches = matchesName(input, ['input', 'field', 'search', 'textfield', 'textarea'])
  return {
    value: 'input',
    confidence: nameMatches ? 'high' : 'medium',
    warnings: [],
  }
}

function headingRule(input: InferenceInput): AnalysisResult<NormalizedRole> | null {
  if (input.type !== 'text' || input.text === null) {
    return null
  }
  const { fontSize, fontWeight } = input.text.style
  if (fontSize === null || fontSize < HEADING_MIN_FONT_SIZE) {
    return null
  }
  const isHeavy = fontWeight !== null && fontWeight >= HEADING_MIN_FONT_WEIGHT
  const isShort = input.text.content.length <= HEADING_MAX_LENGTH
  if (isHeavy && isShort) {
    return { value: 'heading', confidence: 'high', warnings: [] }
  }
  return { value: 'heading', confidence: 'medium', warnings: [] }
}

function labelRule(
  input: InferenceInput,
  siblings: readonly InferenceInput[],
): AnalysisResult<NormalizedRole> | null {
  if (input.type !== 'text' || input.text === null) {
    return null
  }
  if (input.text.content.length > LABEL_MAX_LENGTH) {
    return null
  }
  if (!hasSiblingWithInputSignals(siblings, input.name)) {
    return null
  }
  return { value: 'label', confidence: 'medium', warnings: [] }
}

function isBodyTextStyle(fontWeight: number | null, fontSize: number | null): boolean {
  const isNormalWeight = fontWeight === null || (fontWeight >= 300 && fontWeight <= 500)
  const isMediumSize = fontSize !== null && fontSize >= 13 && fontSize < HEADING_MIN_FONT_SIZE
  return isNormalWeight && isMediumSize
}

function bodyTextRule(input: InferenceInput): AnalysisResult<NormalizedRole> | null {
  if (input.type !== 'text' || input.text === null) {
    return null
  }
  if (input.text.content.length > BODY_MIN_LENGTH) {
    return { value: 'body-text', confidence: 'medium', warnings: [] }
  }
  if (isBodyTextStyle(input.text.style.fontWeight, input.text.style.fontSize)) {
    return { value: 'body-text', confidence: 'medium', warnings: [] }
  }
  return null
}

function dividerRule(input: InferenceInput): AnalysisResult<NormalizedRole> | null {
  if (input.type === 'line') {
    return { value: 'divider', confidence: 'high', warnings: [] }
  }
  if (isThinDimension(input.bounds, DIVIDER_MAX_THICKNESS)) {
    return { value: 'divider', confidence: 'high', warnings: [] }
  }
  return null
}

function gridRule(input: InferenceInput): AnalysisResult<NormalizedRole> | null {
  if (input.layout === null) {
    return null
  }
  if (input.layout.mode === 'grid') {
    return { value: 'grid', confidence: 'high', warnings: [] }
  }
  if (hasAutoLayout(input.layout) && input.layout.wrap === true) {
    return { value: 'grid', confidence: 'high', warnings: [] }
  }
  return null
}

function stackRule(input: InferenceInput): AnalysisResult<NormalizedRole> | null {
  if (!hasAutoLayout(input.layout)) {
    return null
  }
  if (input.hierarchy.childCount === 0) {
    return null
  }
  if (!hasPadding(input.layout) && input.layout?.gap === null) {
    return null
  }
  return { value: 'stack', confidence: 'high', warnings: [] }
}

function cardRule(input: InferenceInput): AnalysisResult<NormalizedRole> | null {
  const cardTypes = new Set(['frame', 'instance', 'component'])
  if (!cardTypes.has(input.type)) {
    return null
  }
  if (!hasVisibleFill(input.appearance) && !hasVisibleStroke(input.appearance)) {
    return null
  }
  if (!hasCornerRadius(input.appearance)) {
    return null
  }
  if (input.hierarchy.childCount < 2) {
    return null
  }
  const childTypes = new Set(input.children.map((child) => child.type))
  if (childTypes.size < 2) {
    return null
  }
  return { value: 'card', confidence: 'medium', warnings: [] }
}

function containerRule(input: InferenceInput): AnalysisResult<NormalizedRole> | null {
  const containerTypes = new Set(['frame', 'group', 'component', 'instance'])
  if (!containerTypes.has(input.type)) {
    return null
  }
  if (input.hierarchy.childCount === 0) {
    return null
  }
  if (!hasAutoLayout(input.layout) && !hasPadding(input.layout)) {
    return null
  }
  return { value: 'container', confidence: 'high', warnings: [] }
}

// --- Rule chain ---

const RULES: readonly RoleRule[] = [
  imageRule,
  iconRule,
  buttonRule,
  inputRule,
  headingRule,
  labelRule,
  bodyTextRule,
  dividerRule,
  gridRule,
  stackRule,
  cardRule,
  containerRule,
]

// --- Noise detection ---

function isNoise(input: InferenceInput): AnalysisResult<NormalizedRole | null> | null {
  if (!input.visible) {
    return {
      value: null,
      confidence: 'high',
      warnings: ['Invisible node — no meaningful role'],
    }
  }
  if (input.bounds !== null && input.bounds.width === 0 && input.bounds.height === 0) {
    return {
      value: null,
      confidence: 'high',
      warnings: ['Zero-size node — no meaningful role'],
    }
  }
  return null
}

// --- Public API ---

export function inferRole(
  input: InferenceInput,
  siblings: readonly InferenceInput[] = [],
): AnalysisResult<NormalizedRole | null> {
  const noise = isNoise(input)
  if (noise !== null) {
    return noise
  }

  for (const rule of RULES) {
    const result = rule(input, siblings)
    if (result !== null) {
      return result
    }
  }

  return {
    value: null,
    confidence: 'low',
    warnings: ['No role rule matched'],
  }
}
