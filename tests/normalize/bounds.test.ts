import { describe, expect, it } from 'vitest'

import { extractBounds } from '../../src/normalize/bounds.js'
import { FigmaNodeSchema } from '../../src/schemas/raw.js'

function makeNode(extra: Record<string, unknown> = {}): ReturnType<typeof FigmaNodeSchema.parse> {
  return FigmaNodeSchema.parse({
    id: '1:1',
    name: 'Test',
    type: 'FRAME',
    ...extra,
  })
}

describe('extractBounds', () => {
  it('extracts bounds from absoluteBoundingBox', () => {
    const node = makeNode({
      absoluteBoundingBox: { x: 10, y: 20, width: 300, height: 150 },
    })
    const result = extractBounds(node)
    expect(result.value).toEqual({ x: 10, y: 20, width: 300, height: 150 })
    expect(result.warnings).toEqual([])
    expect(result.omittedFields).toEqual([])
  })

  it('returns null when absoluteBoundingBox is absent', () => {
    const node = makeNode()
    const result = extractBounds(node)
    expect(result.value).toBeNull()
    expect(result.warnings).toEqual([])
  })

  it('handles zero-size bounds', () => {
    const node = makeNode({
      absoluteBoundingBox: { x: 0, y: 0, width: 0, height: 0 },
    })
    const result = extractBounds(node)
    expect(result.value).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  it('handles negative coordinates', () => {
    const node = makeNode({
      absoluteBoundingBox: { x: -50, y: -100, width: 200, height: 300 },
    })
    const result = extractBounds(node)
    expect(result.value).toEqual({ x: -50, y: -100, width: 200, height: 300 })
  })

  it('returns null with warning for malformed bounds (missing field)', () => {
    const node = makeNode({
      absoluteBoundingBox: { x: 10, y: 20, width: 300 },
    })
    const result = extractBounds(node)
    expect(result.value).toBeNull()
    expect(result.warnings).toContain('absoluteBoundingBox present but malformed')
  })

  it('returns null with warning for non-numeric values', () => {
    const node = makeNode({
      absoluteBoundingBox: { x: 'bad', y: 20, width: 300, height: 150 },
    })
    const result = extractBounds(node)
    expect(result.value).toBeNull()
    expect(result.warnings).toHaveLength(1)
  })

  it('returns null when absoluteBoundingBox is not an object', () => {
    const node = makeNode({ absoluteBoundingBox: 'not-an-object' })
    const result = extractBounds(node)
    expect(result.value).toBeNull()
    expect(result.warnings).toEqual([])
  })
})
