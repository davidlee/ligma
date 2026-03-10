import { getRawArray, getRawBoolean, isRecord } from './raw-helpers.js'

import type { AnalysisResult } from './raw-helpers.js'
import type { FigmaNode } from '../figma/types-raw.js'
import type { NormalizedNodeType } from '../schemas/normalized.js'

const TYPE_MAP: ReadonlyMap<string, NormalizedNodeType> = new Map([
  ['DOCUMENT', 'document'],
  ['CANVAS', 'page'],
  ['FRAME', 'frame'],
  ['GROUP', 'group'],
  ['COMPONENT', 'component'],
  ['COMPONENT_SET', 'variant-set'],
  ['INSTANCE', 'instance'],
  ['TEXT', 'text'],
  ['LINE', 'line'],
  ['SECTION', 'section'],
  ['RECTANGLE', 'shape'],
  ['ELLIPSE', 'shape'],
  ['POLYGON', 'shape'],
  ['STAR', 'shape'],
  ['VECTOR', 'vector'],
  ['BOOLEAN_OPERATION', 'boolean-operation'],
])

function hasImageFill(node: FigmaNode): boolean {
  const fills = getRawArray(node, 'fills')
  return fills.some(
    (fill) => isRecord(fill) && fill.type === 'IMAGE',
  )
}

export function classify(node: FigmaNode): AnalysisResult<NormalizedNodeType> {
  let value: NormalizedNodeType

  if (getRawBoolean(node, 'isMask', false)) {
    value = 'mask'
  } else if (hasImageFill(node)) {
    value = 'image'
  } else {
    value = TYPE_MAP.get(node.type) ?? 'unknown'
  }

  return { value, confidence: 'high', warnings: [] }
}
