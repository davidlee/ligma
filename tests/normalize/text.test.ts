import { describe, expect, it } from 'vitest'

import { extractText } from '../../src/normalize/text.js'
import { FigmaNodeSchema } from '../../src/schemas/raw.js'

function makeTextNode(extra: Record<string, unknown> = {}): ReturnType<typeof FigmaNodeSchema.parse> {
  return FigmaNodeSchema.parse({
    id: '1:1', name: 'Test', type: 'TEXT',
    characters: 'Hello',
    style: { fontFamily: 'Inter', fontWeight: 400, fontSize: 16 },
    ...extra,
  })
}

describe('extractText (VT-011)', () => {
  describe('content', () => {
    it('extracts characters and length', () => {
      const result = extractText(makeTextNode())
      expect(result.value.content).toBe('Hello')
      expect(result.value.charactersLength).toBe(5)
    })

    it('handles empty text', () => {
      const result = extractText(makeTextNode({ characters: '' }))
      expect(result.value.content).toBe('')
      expect(result.value.charactersLength).toBe(0)
    })
  })

  describe('style', () => {
    it('extracts font properties', () => {
      const result = extractText(makeTextNode())
      expect(result.value.style.fontFamily).toBe('Inter')
      expect(result.value.style.fontWeight).toBe(400)
      expect(result.value.style.fontSize).toBe(16)
    })

    it('returns null for absent style properties', () => {
      const result = extractText(makeTextNode({ style: {} }))
      expect(result.value.style.fontFamily).toBeNull()
      expect(result.value.style.fontWeight).toBeNull()
      expect(result.value.style.fontSize).toBeNull()
    })
  })

  describe('lineHeight (DimensionValue)', () => {
    it('maps PIXELS → px', () => {
      const node = makeTextNode({
        style: { lineHeightUnit: 'PIXELS', lineHeightPx: 24 },
      })
      expect(extractText(node).value.style.lineHeight).toEqual({
        unit: 'px', value: 24,
      })
    })

    it('maps FONT_SIZE_% → percent', () => {
      const node = makeTextNode({
        style: { lineHeightUnit: 'FONT_SIZE_%', lineHeightPercentFontSize: 150 },
      })
      expect(extractText(node).value.style.lineHeight).toEqual({
        unit: 'percent', value: 150,
      })
    })

    it('maps INTRINSIC_% → auto with null value', () => {
      const node = makeTextNode({
        style: { lineHeightUnit: 'INTRINSIC_%' },
      })
      expect(extractText(node).value.style.lineHeight).toEqual({
        unit: 'auto', value: null,
      })
    })

    it('returns null when lineHeightUnit absent', () => {
      const result = extractText(makeTextNode({ style: {} }))
      expect(result.value.style.lineHeight).toBeNull()
    })
  })

  describe('letterSpacing', () => {
    it('normalizes as px', () => {
      const node = makeTextNode({
        style: { letterSpacing: 0.5 },
      })
      expect(extractText(node).value.style.letterSpacing).toEqual({
        unit: 'px', value: 0.5,
      })
    })

    it('returns null when absent', () => {
      const result = extractText(makeTextNode({ style: {} }))
      expect(result.value.style.letterSpacing).toBeNull()
    })
  })

  describe('textCase', () => {
    const cases: [string, string][] = [
      ['UPPER', 'upper'],
      ['LOWER', 'lower'],
      ['TITLE', 'title'],
      ['ORIGINAL', 'original'],
      ['SMALL_CAPS', 'small_caps'],
      ['SMALL_CAPS_FORCED', 'small_caps_forced'],
    ]

    for (const [input, expected] of cases) {
      it(`maps ${input} → ${expected}`, () => {
        const node = makeTextNode({ style: { textCase: input } })
        expect(extractText(node).value.style.textCase).toBe(expected)
      })
    }

    it('returns null when absent', () => {
      expect(extractText(makeTextNode({ style: {} })).value.style.textCase).toBeNull()
    })
  })

  describe('text alignment', () => {
    it('maps horizontal alignment to lowercase', () => {
      const node = makeTextNode({
        style: { textAlignHorizontal: 'CENTER' },
      })
      expect(extractText(node).value.style.textAlignHorizontal).toBe('center')
    })

    it('maps vertical alignment to lowercase', () => {
      const node = makeTextNode({
        style: { textAlignVertical: 'BOTTOM' },
      })
      expect(extractText(node).value.style.textAlignVertical).toBe('bottom')
    })
  })

  describe('color', () => {
    it('extracts from first visible fill', () => {
      const node = makeTextNode({
        fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, visible: true }],
      })
      expect(extractText(node).value.color).toBe('#000000')
    })

    it('skips invisible fills', () => {
      const node = makeTextNode({
        fills: [
          { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: false },
          { type: 'SOLID', color: { r: 0, g: 0, b: 1 }, visible: true },
        ],
      })
      expect(extractText(node).value.color).toBe('#0000ff')
    })

    it('returns null when no visible fills', () => {
      const node = makeTextNode({
        fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: false }],
      })
      expect(extractText(node).value.color).toBeNull()
    })

    it('returns null when no fills', () => {
      expect(extractText(makeTextNode()).value.color).toBeNull()
    })
  })

  describe('truncation', () => {
    it('maps ENDING → ellipsis true', () => {
      const node = makeTextNode({ textTruncation: 'ENDING', maxLines: 2 })
      expect(extractText(node).value.truncation).toEqual({
        maxLines: 2, ellipsis: true,
      })
    })

    it('returns null for DISABLED', () => {
      const node = makeTextNode({ textTruncation: 'DISABLED' })
      expect(extractText(node).value.truncation).toBeNull()
    })

    it('returns null when absent', () => {
      expect(extractText(makeTextNode()).value.truncation).toBeNull()
    })
  })

  describe('DE-003 defaults', () => {
    it('semanticKind is always "unknown"', () => {
      expect(extractText(makeTextNode()).value.semanticKind).toBe('unknown')
    })

    it('tokenRefs is always empty', () => {
      expect(extractText(makeTextNode()).value.tokenRefs).toEqual([])
    })
  })

  describe('diagnostics', () => {
    it('produces no warnings for well-formed text node', () => {
      const result = extractText(makeTextNode())
      expect(result.warnings).toEqual([])
      expect(result.omittedFields).toEqual([])
    })
  })
})
