import { describe, expect, it } from 'vitest'

import { extractVariables } from '../../src/normalize/variables.js'
import { FigmaNodeSchema } from '../../src/schemas/raw.js'

function makeNode(extra: Record<string, unknown> = {}): ReturnType<typeof FigmaNodeSchema.parse> {
  return FigmaNodeSchema.parse({ id: '1:1', name: 'Test', type: 'RECTANGLE', ...extra })
}

describe('extractVariables (VT-015)', () => {
  describe('no bindings', () => {
    it('returns null when boundVariables absent', () => {
      const result = extractVariables(makeNode())
      expect(result.value).toBeNull()
      expect(result.confidence).toBe('high')
    })

    it('returns null when boundVariables is empty object', () => {
      const result = extractVariables(makeNode({ boundVariables: {} }))
      expect(result.value).toBeNull()
    })
  })

  describe('single bindings', () => {
    it('extracts a single color binding', () => {
      const node = makeNode({
        boundVariables: {
          'fills': [{ type: 'VARIABLE_ALIAS', id: 'VariableID:abc/123' }],
        },
      })
      const result = extractVariables(node)
      expect(result.value?.bindings).toHaveLength(1)
      expect(result.value?.bindings[0]).toMatchObject({
        field: 'fills',
        tokenId: 'VariableID:abc/123',
        tokenName: null,
        collectionId: null,
        modeId: null,
        resolvedType: 'color',
      })
      expect(result.confidence).toBe('high')
    })

    it('extracts a scalar binding (non-array)', () => {
      const node = makeNode({
        boundVariables: {
          itemSpacing: { type: 'VARIABLE_ALIAS', id: 'VariableID:spacing/1' },
        },
      })
      const result = extractVariables(node)
      expect(result.value?.bindings).toHaveLength(1)
      expect(result.value?.bindings[0]).toMatchObject({
        field: 'itemSpacing',
        tokenId: 'VariableID:spacing/1',
        resolvedType: 'number',
      })
    })
  })

  describe('resolvedType inference from field path', () => {
    it.each([
      ['fills', 'color'],
      ['strokes', 'color'],
      ['paddingLeft', 'number'],
      ['paddingRight', 'number'],
      ['paddingTop', 'number'],
      ['paddingBottom', 'number'],
      ['itemSpacing', 'number'],
      ['counterAxisSpacing', 'number'],
      ['topLeftRadius', 'number'],
      ['width', 'number'],
      ['height', 'number'],
      ['visible', 'boolean'],
      ['characters', 'string'],
      ['somethingUnknown', 'unknown'],
    ] as const)('field "%s" → resolvedType "%s"', (field, expectedType) => {
      const node = makeNode({
        boundVariables: {
          [field]: { type: 'VARIABLE_ALIAS', id: 'VariableID:test/1' },
        },
      })
      const result = extractVariables(node)
      expect(result.value?.bindings[0]?.resolvedType).toBe(expectedType)
    })

    it('uses medium confidence when resolvedType falls back to unknown', () => {
      const node = makeNode({
        boundVariables: {
          weirdField: { type: 'VARIABLE_ALIAS', id: 'VariableID:x/1' },
        },
      })
      const result = extractVariables(node)
      expect(result.confidence).toBe('medium')
    })
  })

  describe('multiple bindings', () => {
    it('extracts multiple fields', () => {
      const node = makeNode({
        boundVariables: {
          fills: [{ type: 'VARIABLE_ALIAS', id: 'VariableID:color/1' }],
          paddingLeft: { type: 'VARIABLE_ALIAS', id: 'VariableID:spacing/1' },
          paddingRight: { type: 'VARIABLE_ALIAS', id: 'VariableID:spacing/1' },
        },
      })
      const result = extractVariables(node)
      expect(result.value?.bindings).toHaveLength(3)
    })

    it('handles multiple aliases in an array field', () => {
      const node = makeNode({
        boundVariables: {
          fills: [
            { type: 'VARIABLE_ALIAS', id: 'VariableID:color/1' },
            { type: 'VARIABLE_ALIAS', id: 'VariableID:color/2' },
          ],
        },
      })
      const result = extractVariables(node)
      expect(result.value?.bindings).toHaveLength(2)
      expect(result.value?.bindings[0]?.field).toBe('fills')
      expect(result.value?.bindings[1]?.field).toBe('fills')
    })
  })

  describe('explicitModes', () => {
    it('extracts explicitVariableModes at node level', () => {
      const node = makeNode({
        boundVariables: {
          fills: [{ type: 'VARIABLE_ALIAS', id: 'VariableID:x/1' }],
        },
        explicitVariableModes: {
          'collection:1': 'mode:dark',
          'collection:2': 'mode:compact',
        },
      })
      const result = extractVariables(node)
      expect(result.value?.explicitModes).toEqual({
        'collection:1': 'mode:dark',
        'collection:2': 'mode:compact',
      })
    })

    it('defaults explicitModes to empty when absent', () => {
      const node = makeNode({
        boundVariables: {
          fills: [{ type: 'VARIABLE_ALIAS', id: 'VariableID:x/1' }],
        },
      })
      expect(extractVariables(node).value?.explicitModes).toEqual({})
    })
  })

  describe('malformed data', () => {
    it('skips entries with missing id', () => {
      const node = makeNode({
        boundVariables: {
          fills: [{ type: 'VARIABLE_ALIAS' }],
        },
      })
      const result = extractVariables(node)
      expect(result.value).toBeNull()
      expect(result.warnings).toContainEqual(expect.stringContaining('malformed'))
    })

    it('skips entries with non-object values', () => {
      const node = makeNode({
        boundVariables: {
          fills: 'not-an-object',
        },
      })
      const result = extractVariables(node)
      expect(result.value).toBeNull()
    })

    it('warns on malformed array entries', () => {
      const node = makeNode({
        boundVariables: {
          fills: [
            { type: 'VARIABLE_ALIAS', id: 'VariableID:good/1' },
            { type: 'VARIABLE_ALIAS' }, // missing id
          ],
        },
      })
      const result = extractVariables(node)
      expect(result.value?.bindings).toHaveLength(1)
      expect(result.warnings).toHaveLength(1)
    })
  })

  describe('omittedFields', () => {
    it('is empty for variable extraction', () => {
      const node = makeNode({
        boundVariables: {
          fills: [{ type: 'VARIABLE_ALIAS', id: 'VariableID:x/1' }],
        },
      })
      expect(extractVariables(node).omittedFields).toEqual([])
    })
  })
})
