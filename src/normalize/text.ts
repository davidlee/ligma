import {
  colorToHex,
  getRawArray,
  getRawRecord,
  getRawString,
  isRecord,
} from './raw-helpers.js'

import type { ExtractorResult } from './raw-helpers.js'
import type { FigmaNode } from '../figma/types-raw.js'
import type { DimensionValue, NormalizedText } from '../schemas/normalized.js'

function resolveLineHeight(style: Record<string, unknown>): DimensionValue | null {
  const unit = style.lineHeightUnit
  switch (unit) {
    case 'PIXELS': {
      const value = style.lineHeightPx
      return { unit: 'px', value: typeof value === 'number' ? value : null }
    }
    case 'FONT_SIZE_%': {
      const value = style.lineHeightPercentFontSize
      return { unit: 'percent', value: typeof value === 'number' ? value : null }
    }
    case 'INTRINSIC_%':
      return { unit: 'auto', value: null }
    default:
      return null
  }
}

function resolveLetterSpacing(style: Record<string, unknown>): DimensionValue | null {
  const value = style.letterSpacing
  if (typeof value !== 'number') {
    return null
  }
  return { unit: 'px', value }
}

function resolveTextColor(node: FigmaNode): string | null {
  const fills = getRawArray(node, 'fills')
  for (const fill of fills) {
    if (isRecord(fill) && fill.visible !== false) {
      const hex = colorToHex(fill.color)
      if (hex !== null) {
        return hex
      }
    }
  }
  return null
}

function resolveTruncation(
  node: FigmaNode,
): NormalizedText['truncation'] {
  const truncation = getRawString(node, 'textTruncation', '')
  if (truncation !== 'ENDING') {
    return null
  }
  const maxLines = node.maxLines
  return {
    maxLines: typeof maxLines === 'number' ? maxLines : null,
    ellipsis: true,
  }
}

function toLowerOrNull(value: string): string | null {
  return value !== '' ? value.toLowerCase() : null
}

export function extractText(node: FigmaNode): ExtractorResult<NormalizedText> {
  const content = getRawString(node, 'characters', '')
  const style = getRawRecord(node, 'style') ?? {}

  return {
    value: {
      content,
      charactersLength: content.length,
      style: {
        fontFamily: typeof style.fontFamily === 'string' ? style.fontFamily : null,
        fontWeight: typeof style.fontWeight === 'number' ? style.fontWeight : null,
        fontSize: typeof style.fontSize === 'number' ? style.fontSize : null,
        lineHeight: resolveLineHeight(style),
        letterSpacing: resolveLetterSpacing(style),
        textCase: toLowerOrNull(typeof style.textCase === 'string' ? style.textCase : ''),
        textAlignHorizontal: toLowerOrNull(
          typeof style.textAlignHorizontal === 'string' ? style.textAlignHorizontal : '',
        ),
        textAlignVertical: toLowerOrNull(
          typeof style.textAlignVertical === 'string' ? style.textAlignVertical : '',
        ),
      },
      color: resolveTextColor(node),
      tokenRefs: [],
      semanticKind: 'unknown',
      truncation: resolveTruncation(node),
    },
    confidence: 'high',
    warnings: [],
    omittedFields: [],
  }
}
