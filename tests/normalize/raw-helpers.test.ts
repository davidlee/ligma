import { describe, expect, it } from 'vitest'

import {
  getRawArray,
  getRawBoolean,
  getRawNumber,
  getRawProperty,
  getRawRecord,
  getRawString,
  isRecord,
  ok,
} from '../../src/normalize/raw-helpers.js'
import { FigmaNodeSchema } from '../../src/schemas/raw.js'

function makeNode(extra: Record<string, unknown> = {}): ReturnType<typeof FigmaNodeSchema.parse> {
  return FigmaNodeSchema.parse({
    id: '1:1',
    name: 'Test',
    type: 'FRAME',
    ...extra,
  })
}

describe('getRawProperty', () => {
  it('returns the value when present', () => {
    const node = makeNode({ opacity: 0.5 })
    expect(getRawProperty(node, 'opacity')).toBe(0.5)
  })

  it('returns undefined when key is absent', () => {
    const node = makeNode()
    expect(getRawProperty(node, 'opacity')).toBeUndefined()
  })

  it('returns null when value is explicitly null', () => {
    const node = makeNode({ rotation: null })
    expect(getRawProperty(node, 'rotation')).toBeNull()
  })
})

describe('getRawString', () => {
  it('returns string value when present', () => {
    const node = makeNode({ layoutMode: 'HORIZONTAL' })
    expect(getRawString(node, 'layoutMode', 'NONE')).toBe('HORIZONTAL')
  })

  it('returns default when absent', () => {
    const node = makeNode()
    expect(getRawString(node, 'layoutMode', 'NONE')).toBe('NONE')
  })

  it('returns default when value is not a string', () => {
    const node = makeNode({ layoutMode: 42 })
    expect(getRawString(node, 'layoutMode', 'NONE')).toBe('NONE')
  })
})

describe('getRawNumber', () => {
  it('returns number value when present', () => {
    const node = makeNode({ opacity: 0.8 })
    expect(getRawNumber(node, 'opacity', 1)).toBe(0.8)
  })

  it('returns default when absent', () => {
    const node = makeNode()
    expect(getRawNumber(node, 'opacity', 1)).toBe(1)
  })
})

describe('getRawBoolean', () => {
  it('returns boolean value when present', () => {
    const node = makeNode({ visible: false })
    expect(getRawBoolean(node, 'visible', true)).toBe(false)
  })

  it('returns default when absent', () => {
    const node = makeNode()
    expect(getRawBoolean(node, 'visible', true)).toBe(true)
  })
})

describe('getRawArray', () => {
  it('returns array when present', () => {
    const fills = [{ type: 'SOLID' }]
    const node = makeNode({ fills })
    expect(getRawArray(node, 'fills')).toEqual(fills)
  })

  it('returns empty array when absent', () => {
    const node = makeNode()
    expect(getRawArray(node, 'fills')).toEqual([])
  })

  it('returns empty array when value is not an array', () => {
    const node = makeNode({ fills: 'not-an-array' })
    expect(getRawArray(node, 'fills')).toEqual([])
  })
})

describe('getRawRecord', () => {
  it('returns record when present', () => {
    const box = { x: 0, y: 0, width: 100, height: 50 }
    const node = makeNode({ absoluteBoundingBox: box })
    expect(getRawRecord(node, 'absoluteBoundingBox')).toEqual(box)
  })

  it('returns undefined when absent', () => {
    const node = makeNode()
    expect(getRawRecord(node, 'absoluteBoundingBox')).toBeUndefined()
  })

  it('returns undefined for non-object values', () => {
    const node = makeNode({ absoluteBoundingBox: 42 })
    expect(getRawRecord(node, 'absoluteBoundingBox')).toBeUndefined()
  })

  it('returns undefined for arrays', () => {
    const node = makeNode({ absoluteBoundingBox: [1, 2, 3] })
    expect(getRawRecord(node, 'absoluteBoundingBox')).toBeUndefined()
  })
})

describe('isRecord', () => {
  it('returns true for plain objects', () => {
    expect(isRecord({ a: 1 })).toBe(true)
  })

  it('returns false for null', () => {
    expect(isRecord(null)).toBe(false)
  })

  it('returns false for arrays', () => {
    expect(isRecord([1, 2])).toBe(false)
  })

  it('returns false for primitives', () => {
    expect(isRecord('string')).toBe(false)
    expect(isRecord(42)).toBe(false)
  })
})

describe('ok', () => {
  it('wraps a value with empty warnings and omittedFields', () => {
    expect(ok(42)).toEqual({
      value: 42,
      warnings: [],
      omittedFields: [],
    })
  })
})
