import {
  colorToHex,
  getRawArray,
  getRawRecord,
  getRawString,
  isRecord,
} from './raw-helpers.js'

import type { ExtractorResult } from './raw-helpers.js'
import type { FigmaNode } from '../figma/types-raw.js'
import type {
  CornerRadius,
  NormalizedAppearance,
  NormalizedEffect,
  NormalizedPaint,
  NormalizedStroke,
  PaintKind,
  StrokeAlign,
  StrokeWeight,
} from '../schemas/normalized.js'

const PAINT_KIND_MAP: ReadonlyMap<string, PaintKind> = new Map([
  ['SOLID', 'solid'],
  ['GRADIENT_LINEAR', 'gradient'],
  ['GRADIENT_RADIAL', 'gradient'],
  ['GRADIENT_ANGULAR', 'gradient'],
  ['GRADIENT_DIAMOND', 'gradient'],
  ['IMAGE', 'image'],
  ['VIDEO', 'video'],
])

const KNOWN_UNSUPPORTED_PAINTS = new Set(['EMOJI', 'PATTERN'])

function mapPaintKind(type: unknown, warnings: string[]): PaintKind {
  if (typeof type === 'string') {
    const mapped = PAINT_KIND_MAP.get(type)
    if (mapped !== undefined) {
      return mapped
    }
    const prefix = KNOWN_UNSUPPORTED_PAINTS.has(type) ? 'Unsupported' : 'Unknown'
    warnings.push(`${prefix} paint type: ${type}`)
  }
  return 'unknown'
}

function parseGradientStops(raw: unknown): { position: number; color: string }[] | null {
  if (!Array.isArray(raw)) {
    return null
  }
  const stops: { position: number; color: string }[] = []
  for (const stop of raw) {
    if (!isRecord(stop)) {
      continue
    }
    const position = stop.position
    const color = colorToHex(stop.color)
    if (typeof position === 'number' && color !== null) {
      stops.push({ position, color })
    }
  }
  return stops.length > 0 ? stops : null
}

function normalizePaint(raw: unknown, warnings: string[]): NormalizedPaint | null {
  if (!isRecord(raw)) {
    return null
  }
  const kind = mapPaintKind(raw.type, warnings)

  return {
    kind,
    visible: raw.visible !== false,
    color: kind === 'solid' ? colorToHex(raw.color) : null,
    opacity: typeof raw.opacity === 'number' ? raw.opacity : null,
    gradientStops: kind === 'gradient' ? parseGradientStops(raw.gradientStops) : null,
    tokenRef: null,
    imageRef: typeof raw.imageRef === 'string' ? raw.imageRef : null,
  }
}

function normalizeStroke(
  raw: unknown, weight: StrokeWeight | null, align: StrokeAlign | null, warnings: string[],
): NormalizedStroke | null {
  const paint = normalizePaint(raw, warnings)
  if (paint === null) {
    return null
  }
  return { ...paint, weight, align }
}

function mapStrokeAlign(value: string): StrokeAlign | null {
  switch (value) {
    case 'INSIDE': return 'inside'
    case 'OUTSIDE': return 'outside'
    case 'CENTER': return 'center'
    default: return null
  }
}

function areAllNumbers(values: unknown[]): values is number[] {
  return values.every((value) => typeof value === 'number')
}

function getFourNumbers(values: number[]): [number, number, number, number] | null {
  const a = values[0]
  const b = values[1]
  const c = values[2]
  const d = values[3]
  return a !== undefined && b !== undefined && c !== undefined && d !== undefined
    ? [a, b, c, d]
    : null
}

function parsePerCornerRadii(corners: unknown[]): CornerRadius | null {
  if (corners.length !== 4 || !areAllNumbers(corners)) {
    return null
  }
  const four = getFourNumbers(corners)
  if (four === null) {
    return null
  }
  const [topLeft, topRight, bottomRight, bottomLeft] = four
  if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
    return { uniform: true, radius: topLeft }
  }
  return { uniform: false, topLeft, topRight, bottomRight, bottomLeft }
}

function resolveCornerRadius(node: FigmaNode): CornerRadius | null {
  const perCorner = getRawArray(node, 'rectangleCornerRadii')
  if (perCorner.length > 0) {
    const parsed = parsePerCornerRadii(perCorner)
    if (parsed !== null) {
      return parsed
    }
  }

  const uniform = node.cornerRadius
  if (typeof uniform === 'number') {
    return { uniform: true, radius: uniform }
  }

  return null
}

function mapEffectKind(type: unknown, warnings: string[]): NormalizedEffect['kind'] {
  switch (type) {
    case 'DROP_SHADOW': return 'drop-shadow'
    case 'INNER_SHADOW': return 'inner-shadow'
    case 'LAYER_BLUR': return 'layer-blur'
    case 'BACKGROUND_BLUR': return 'background-blur'
    default: {
      const label = typeof type === 'string' ? type : 'unknown'
      const isKnownUnsupported = type === 'TEXTURE' || type === 'NOISE'
      const prefix = isKnownUnsupported ? 'Unsupported' : 'Unknown'
      warnings.push(`${prefix} effect type: ${label}`)
      return 'unknown'
    }
  }
}

function normalizeEffect(raw: unknown, warnings: string[]): NormalizedEffect | null {
  if (!isRecord(raw)) {
    return null
  }
  const kind = mapEffectKind(raw.type, warnings)
  const offset = isRecord(raw.offset)
    && typeof raw.offset.x === 'number'
    && typeof raw.offset.y === 'number'
    ? { x: raw.offset.x, y: raw.offset.y }
    : null

  return {
    kind,
    visible: raw.visible !== false,
    color: colorToHex(raw.color),
    offset,
    radius: typeof raw.radius === 'number' ? raw.radius : null,
    spread: typeof raw.spread === 'number' ? raw.spread : null,
  }
}

function resolveBlendMode(node: FigmaNode): string | null {
  const raw = getRawString(node, 'blendMode', '')
  if (raw === '' || raw === 'PASS_THROUGH') {
    return null
  }
  return raw.toLowerCase()
}

function collectFills(node: FigmaNode, warnings: string[]): NormalizedPaint[] {
  const fills: NormalizedPaint[] = []
  for (const raw of getRawArray(node, 'fills')) {
    const paint = normalizePaint(raw, warnings)
    if (paint !== null) {
      fills.push(paint)
    }
  }
  return fills
}

function parseIndividualWeights(record: Record<string, unknown>): StrokeWeight | null {
  const { top, right, bottom, left } = record
  if (
    typeof top !== 'number' || typeof right !== 'number'
    || typeof bottom !== 'number' || typeof left !== 'number'
  ) {
    return null
  }
  if (top === right && right === bottom && bottom === left) {
    return { uniform: true, value: top }
  }
  return { uniform: false, top, right, bottom, left }
}

function resolveStrokeWeight(node: FigmaNode, warnings: string[]): StrokeWeight | null {
  const individual = getRawRecord(node, 'individualStrokeWeights')
  if (individual !== undefined) {
    const parsed = parseIndividualWeights(individual)
    if (parsed !== null) {
      return parsed
    }
    warnings.push('Malformed individualStrokeWeights — falling back to scalar strokeWeight')
  }

  const scalar = node.strokeWeight
  if (typeof scalar === 'number') {
    return { uniform: true, value: scalar }
  }

  return null
}

function collectStrokes(node: FigmaNode, warnings: string[]): NormalizedStroke[] {
  const weight = resolveStrokeWeight(node, warnings)
  const align = mapStrokeAlign(getRawString(node, 'strokeAlign', ''))
  const strokes: NormalizedStroke[] = []
  for (const raw of getRawArray(node, 'strokes')) {
    const stroke = normalizeStroke(raw, weight, align, warnings)
    if (stroke !== null) {
      strokes.push(stroke)
    }
  }
  return strokes
}

function collectEffects(node: FigmaNode, warnings: string[]): NormalizedEffect[] {
  const effects: NormalizedEffect[] = []
  for (const raw of getRawArray(node, 'effects')) {
    const effect = normalizeEffect(raw, warnings)
    if (effect !== null) {
      effects.push(effect)
    }
  }
  return effects
}

export function extractAppearance(node: FigmaNode): ExtractorResult<NormalizedAppearance> {
  const warnings: string[] = []
  const nodeOpacity = node.opacity

  const value = {
    fills: collectFills(node, warnings),
    strokes: collectStrokes(node, warnings),
    cornerRadius: resolveCornerRadius(node),
    effects: collectEffects(node, warnings),
    blendMode: resolveBlendMode(node),
    opacity: typeof nodeOpacity === 'number' && nodeOpacity < 1 ? nodeOpacity : null,
  }
  return {
    value,
    confidence: warnings.length > 0 ? 'medium' as const : 'high' as const,
    warnings,
    omittedFields: [],
  }
}
