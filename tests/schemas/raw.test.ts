import { describe, expect, it } from 'vitest'

import {
  FigmaFileResponseSchema,
  FigmaImagesResponseSchema,
  FigmaNodeSchema,
} from '../../src/schemas/raw.js'

describe('FigmaNodeSchema', () => {
  it('validates a minimal node', () => {
    const result = FigmaNodeSchema.safeParse({
      id: '1:2',
      name: 'Frame',
      type: 'FRAME',
    })
    expect(result.success).toBe(true)
  })

  it('validates a node with children', () => {
    const result = FigmaNodeSchema.safeParse({
      id: '1:2',
      name: 'Frame',
      type: 'FRAME',
      children: [
        { id: '1:3', name: 'Text', type: 'TEXT' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('passes through unknown fields', () => {
    const result = FigmaNodeSchema.safeParse({
      id: '1:2',
      name: 'Frame',
      type: 'FRAME',
      absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveProperty('absoluteBoundingBox')
      expect(result.data).toHaveProperty('fills')
    }
  })

  it('rejects a node missing required id field', () => {
    const result = FigmaNodeSchema.safeParse({
      name: 'Frame',
      type: 'FRAME',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a node missing required name field', () => {
    const result = FigmaNodeSchema.safeParse({
      id: '1:2',
      type: 'FRAME',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a node missing required type field', () => {
    const result = FigmaNodeSchema.safeParse({
      id: '1:2',
      name: 'Frame',
    })
    expect(result.success).toBe(false)
  })

  it('validates deeply nested children', () => {
    const result = FigmaNodeSchema.safeParse({
      id: '0:0',
      name: 'Root',
      type: 'DOCUMENT',
      children: [{
        id: '1:0',
        name: 'Page',
        type: 'CANVAS',
        children: [{
          id: '1:1',
          name: 'Frame',
          type: 'FRAME',
          children: [],
        }],
      }],
    })
    expect(result.success).toBe(true)
  })
})

describe('FigmaFileResponseSchema', () => {
  const validResponse = {
    name: 'My File',
    lastModified: '2026-01-01T00:00:00Z',
    version: '123',
    document: {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
    },
  }

  it('validates a complete file response', () => {
    const result = FigmaFileResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('passes through extra top-level fields', () => {
    const result = FigmaFileResponseSchema.safeParse({
      ...validResponse,
      components: {},
      schemaVersion: 14,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveProperty('components')
    }
  })

  it('rejects response missing name', () => {
    const { name: _, ...withoutName } = validResponse
    const result = FigmaFileResponseSchema.safeParse(withoutName)
    expect(result.success).toBe(false)
  })

  it('rejects response missing document', () => {
    const { document: _, ...withoutDocument } = validResponse
    const result = FigmaFileResponseSchema.safeParse(withoutDocument)
    expect(result.success).toBe(false)
  })
})

describe('FigmaImagesResponseSchema', () => {
  it('validates a response with image URLs', () => {
    const result = FigmaImagesResponseSchema.safeParse({
      images: { '1:2': 'https://example.com/image.png' },
    })
    expect(result.success).toBe(true)
  })

  it('validates a response with null image URL (render failed)', () => {
    const result = FigmaImagesResponseSchema.safeParse({
      images: { '1:2': null },
    })
    expect(result.success).toBe(true)
  })

  it('validates a response with mixed URLs and nulls', () => {
    const result = FigmaImagesResponseSchema.safeParse({
      images: {
        '1:2': 'https://example.com/a.png',
        '1:3': null,
      },
    })
    expect(result.success).toBe(true)
  })

  it('passes through extra fields', () => {
    const result = FigmaImagesResponseSchema.safeParse({
      images: { '1:2': 'https://example.com/image.png' },
      err: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects response missing images field', () => {
    const result = FigmaImagesResponseSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
