import type { InferenceInput } from './types.js'
import type { Bounds, NormalizedAppearance, NormalizedLayout } from '../../schemas/normalized.js'

// --- Name matching ---

export function matchesName(
  input: InferenceInput, patterns: readonly string[],
): boolean {
  const lower = input.name.toLowerCase()
  return patterns.some((pattern) => lower.includes(pattern))
}

// --- Size / geometry ---

export function isSmallSquarish(
  bounds: Bounds | null, maxSize: number, aspectRange: readonly [number, number],
): boolean {
  if (bounds === null) {
    return false
  }
  if (bounds.width > maxSize || bounds.height > maxSize) {
    return false
  }
  if (bounds.height === 0) {
    return false
  }
  const aspect = bounds.width / bounds.height
  return aspect >= aspectRange[0] && aspect <= aspectRange[1]
}

export function isWideRectangle(
  bounds: Bounds | null, minAspectRatio: number,
): boolean {
  if (bounds === null) {
    return false
  }
  if (bounds.height === 0) {
    return false
  }
  return bounds.width / bounds.height >= minAspectRatio
}

export function isThinDimension(
  bounds: Bounds | null, maxThickness: number,
): boolean {
  if (bounds === null) {
    return false
  }
  return bounds.width <= maxThickness || bounds.height <= maxThickness
}

// --- Appearance ---

export function hasVisibleFill(appearance: NormalizedAppearance | null): boolean {
  if (appearance === null) {
    return false
  }
  return appearance.fills.some((fill) => fill.visible)
}

export function hasVisibleStroke(appearance: NormalizedAppearance | null): boolean {
  if (appearance === null) {
    return false
  }
  return appearance.strokes.some((stroke) => stroke.visible)
}

export function hasCornerRadius(appearance: NormalizedAppearance | null): boolean {
  if (appearance === null) {
    return false
  }
  if (appearance.cornerRadius === null) {
    return false
  }
  if (appearance.cornerRadius.uniform) {
    return appearance.cornerRadius.radius > 0
  }
  return (
    appearance.cornerRadius.topLeft > 0
    || appearance.cornerRadius.topRight > 0
    || appearance.cornerRadius.bottomRight > 0
    || appearance.cornerRadius.bottomLeft > 0
  )
}

// --- Layout ---

export function hasAutoLayout(layout: NormalizedLayout | null): boolean {
  if (layout === null) {
    return false
  }
  return layout.mode === 'horizontal' || layout.mode === 'vertical'
}

export function hasPadding(layout: NormalizedLayout | null): boolean {
  const padding = layout?.padding
  if (padding === undefined || padding === null) {
    return false
  }
  return padding.top > 0 || padding.right > 0 || padding.bottom > 0 || padding.left > 0
}

// --- Child inspection (one level deep only) ---

export function countTextChildren(
  children: readonly InferenceInput[],
): number {
  return children.filter((child) => child.type === 'text').length
}

export function getShortTextChild(
  children: readonly InferenceInput[], maxLength: number,
): InferenceInput | null {
  for (const child of children) {
    if (child.type === 'text' && child.text !== null && child.text.content.length <= maxLength) {
      return child
    }
  }
  return null
}

export function hasIconChild(children: readonly InferenceInput[]): boolean {
  const iconTypes = new Set(['vector', 'boolean-operation', 'image'])
  return children.some((child) => iconTypes.has(child.type))
}

// --- Sibling inspection ---

export function hasSiblingWithInputSignals(
  siblings: readonly InferenceInput[],
  selfName: string,
): boolean {
  const inputPatterns = ['input', 'field', 'search', 'textfield', 'textarea']
  for (const sibling of siblings) {
    if (sibling.name === selfName) {
      continue
    }
    if (matchesName(sibling, inputPatterns)) {
      return true
    }
    if (isWideRectangle(sibling.bounds, 2.0)) {
      if (hasVisibleFill(sibling.appearance) || hasVisibleStroke(sibling.appearance)) {
        return true
      }
    }
  }
  return false
}
