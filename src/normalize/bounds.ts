import { getRawRecord, ok } from './raw-helpers.js'

import type { ExtractorResult } from './raw-helpers.js'
import type { FigmaNode } from '../figma/types-raw.js'
import type { Bounds } from '../schemas/normalized.js'

function parseBounds(raw: Record<string, unknown>): Bounds | null {
  const { x, y, width, height } = raw

  if (
    typeof x !== 'number'
    || typeof y !== 'number'
    || typeof width !== 'number'
    || typeof height !== 'number'
  ) {
    return null
  }

  return { x, y, width, height }
}

export function extractBounds(node: FigmaNode): ExtractorResult<Bounds | null> {
  const raw = getRawRecord(node, 'absoluteBoundingBox')
  if (raw === undefined) {
    return ok(null)
  }

  const bounds = parseBounds(raw)
  if (bounds === null) {
    return {
      value: null,
      warnings: ['absoluteBoundingBox present but malformed'],
      omittedFields: [],
    }
  }

  return ok(bounds)
}
