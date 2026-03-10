import {
  getRawNumber,
  getRawRecord,
  getRawString,
} from './raw-helpers.js'

import type { ExtractorResult } from './raw-helpers.js'
import type { FigmaNode } from '../figma/types-raw.js'
import type {
  ConstraintMode,
  CrossAlign,
  LayoutMode,
  MainAlign,
  NormalizedGrid,
  NormalizedLayout,
  SizingMode,
} from '../schemas/normalized.js'

const CONTAINER_TYPES = new Set(['FRAME', 'COMPONENT', 'INSTANCE'])

function resolveMode(node: FigmaNode): LayoutMode {
  const raw = getRawString(node, 'layoutMode', 'NONE')
  switch (raw) {
    case 'HORIZONTAL': return 'horizontal'
    case 'VERTICAL': return 'vertical'
    case 'GRID': return 'grid'
    default: {
      const hasChildren = Array.isArray(node.children) && node.children.length > 0
      if (CONTAINER_TYPES.has(node.type) && hasChildren) {
        return 'absolute'
      }
      return 'none'
    }
  }
}

function resolveSizing(node: FigmaNode): { horizontal: SizingMode; vertical: SizingMode } {
  return {
    horizontal: mapSizing(
      getRawString(node, 'layoutSizingHorizontal', ''),
      getRawString(node, 'primaryAxisSizingMode', ''),
    ),
    vertical: mapSizing(
      getRawString(node, 'layoutSizingVertical', ''),
      getRawString(node, 'counterAxisSizingMode', ''),
    ),
  }
}

function mapSizing(preferred: string, fallback: string): SizingMode {
  const value = preferred !== '' ? preferred : fallback
  switch (value) {
    case 'FIXED': return 'fixed'
    case 'HUG': return 'hug'
    case 'FILL': return 'fill'
    case 'AUTO': return 'hug'
    default: return 'fixed'
  }
}

function resolveMainAlign(node: FigmaNode): MainAlign {
  const raw = getRawString(node, 'primaryAxisAlignItems', '')
  switch (raw) {
    case 'MIN': return 'start'
    case 'CENTER': return 'center'
    case 'MAX': return 'end'
    case 'SPACE_BETWEEN': return 'space-between'
    default: return 'unknown'
  }
}

function resolveCrossAlign(node: FigmaNode): CrossAlign {
  const raw = getRawString(node, 'counterAxisAlignItems', '')
  switch (raw) {
    case 'MIN': return 'start'
    case 'CENTER': return 'center'
    case 'MAX': return 'end'
    case 'BASELINE': return 'baseline'
    default: return 'unknown'
  }
}

export function extractLayout(node: FigmaNode): ExtractorResult<NormalizedLayout> {
  const warnings: string[] = []
  const omittedFields: string[] = []
  const mode = resolveMode(node)

  const layout = buildLayout(node, mode, warnings, omittedFields)
  return { value: layout, warnings, omittedFields }
}

function buildLayout(
  node: FigmaNode,
  mode: LayoutMode,
  warnings: string[],
  omittedFields: string[],
): NormalizedLayout {
  const hasAutoLayout = mode === 'horizontal' || mode === 'vertical' || mode === 'grid'

  return {
    mode,
    sizing: resolveSizing(node),
    align: { main: resolveMainAlign(node), cross: resolveCrossAlign(node) },
    padding: resolvePadding(node, hasAutoLayout),
    gap: hasAutoLayout ? getRawNumber(node, 'itemSpacing', 0) : null,
    wrap: resolveWrap(node, omittedFields),
    grid: mode === 'grid' ? resolveGrid(node) : null,
    constraints: resolveConstraints(node, warnings),
    position: resolvePosition(node),
    clipsContent: resolveClipsContent(node),
  }
}

function resolvePadding(
  node: FigmaNode, hasAutoLayout: boolean,
): NormalizedLayout['padding'] {
  const top = getRawNumber(node, 'paddingTop', 0)
  const right = getRawNumber(node, 'paddingRight', 0)
  const bottom = getRawNumber(node, 'paddingBottom', 0)
  const left = getRawNumber(node, 'paddingLeft', 0)

  if (!hasAutoLayout && top === 0 && right === 0 && bottom === 0 && left === 0) {
    return null
  }

  return { top, right, bottom, left }
}

function resolveWrap(
  node: FigmaNode, omittedFields: string[],
): boolean | null {
  const raw = getRawString(node, 'layoutWrap', '')
  if (raw === 'WRAP') {
    omittedFields.push('counterAxisSpacing')
    return true
  }
  if (raw === 'NO_WRAP') {
    return false
  }
  return null
}

function resolveGrid(node: FigmaNode): NormalizedGrid {
  return {
    rows: safeNullableNumber(node, 'gridRowCount'),
    columns: safeNullableNumber(node, 'gridColumnCount'),
    rowGap: safeNullableNumber(node, 'gridRowGap'),
    columnGap: safeNullableNumber(node, 'gridColumnGap'),
  }
}

function safeNullableNumber(node: FigmaNode, key: string): number | null {
  const value = node[key]
  return typeof value === 'number' ? value : null
}

function resolveConstraints(
  node: FigmaNode, warnings: string[],
): NormalizedLayout['constraints'] {
  const raw = getRawRecord(node, 'constraints')
  if (raw === undefined) {
    return null
  }

  return {
    horizontal: mapConstraint(raw.horizontal, warnings),
    vertical: mapConstraint(raw.vertical, warnings),
  }
}

function mapConstraint(value: unknown, warnings: string[]): ConstraintMode {
  switch (value) {
    case 'MIN': return 'min'
    case 'MAX': return 'max'
    case 'CENTER': return 'center'
    case 'STRETCH': return 'stretch'
    case 'SCALE': return 'scale'
    default: {
      if (typeof value === 'string' && value !== '') {
        warnings.push(`Unknown constraint value: ${value}`)
      }
      return 'unknown'
    }
  }
}

function resolvePosition(
  node: FigmaNode,
): NormalizedLayout['position'] {
  const x = node.x
  const y = node.y

  if (typeof x !== 'number' || typeof y !== 'number') {
    return null
  }

  const positioning = getRawString(node, 'layoutPositioning', 'AUTO')
  return {
    x,
    y,
    positioning: positioning === 'ABSOLUTE' ? 'absolute' : 'flow',
  }
}

function resolveClipsContent(node: FigmaNode): boolean | null {
  const value = node.clipsContent
  return typeof value === 'boolean' ? value : null
}
