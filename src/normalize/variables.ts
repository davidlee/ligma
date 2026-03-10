import { getRawRecord, isRecord } from './raw-helpers.js'

import type { ExtractorResult } from './raw-helpers.js'
import type { FigmaNode } from '../figma/types-raw.js'
import type { NormalizedVariableBindings } from '../schemas/normalized.js'

type ResolvedType = NormalizedVariableBindings['bindings'][number]['resolvedType']
type Binding = NormalizedVariableBindings['bindings'][number]

const COLOR_FIELDS = new Set(['fills', 'strokes', 'fill', 'stroke'])

const NUMBER_FIELDS = new Set([
  'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
  'itemSpacing', 'counterAxisSpacing',
  'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
  'cornerRadius', 'strokeWeight',
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'opacity',
])

const STRING_FIELDS = new Set(['characters', 'fontFamily'])
const BOOLEAN_FIELDS = new Set(['visible'])

function inferResolvedType(field: string): ResolvedType {
  if (COLOR_FIELDS.has(field)) {
    return 'color'
  }
  if (NUMBER_FIELDS.has(field)) {
    return 'number'
  }
  if (STRING_FIELDS.has(field)) {
    return 'string'
  }
  if (BOOLEAN_FIELDS.has(field)) {
    return 'boolean'
  }
  return 'unknown'
}

interface VariableAlias {
  id: string
}

function isVariableAlias(value: unknown): value is VariableAlias {
  return isRecord(value) && typeof value.id === 'string'
}

function makeBinding(field: string, alias: VariableAlias, resolvedType: ResolvedType): Binding {
  return {
    field, tokenId: alias.id, tokenName: null,
    collectionId: null, modeId: null, resolvedType,
  }
}

function parseBindingsForField(
  field: string, entry: unknown, resolvedType: ResolvedType, warnings: string[],
): Binding[] {
  if (Array.isArray(entry)) {
    return parseArrayBindings(field, entry, resolvedType, warnings)
  }
  if (isVariableAlias(entry)) {
    return [makeBinding(field, entry, resolvedType)]
  }
  return []
}

function parseArrayBindings(
  field: string, entries: unknown[], resolvedType: ResolvedType, warnings: string[],
): Binding[] {
  const bindings: Binding[] = []
  for (const alias of entries) {
    if (isVariableAlias(alias)) {
      bindings.push(makeBinding(field, alias, resolvedType))
    } else {
      warnings.push(`Skipping malformed variable alias in ${field}`)
    }
  }
  return bindings
}

function parseExplicitModes(node: FigmaNode): Record<string, string> {
  const raw = getRawRecord(node, 'explicitVariableModes')
  if (raw === undefined) {
    return {}
  }
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      result[key] = value
    }
  }
  return result
}

export function extractVariables(node: FigmaNode): ExtractorResult<NormalizedVariableBindings | null> {
  const rawBound = getRawRecord(node, 'boundVariables')
  if (rawBound === undefined || Object.keys(rawBound).length === 0) {
    return { value: null, confidence: 'high', warnings: [], omittedFields: [] }
  }

  const warnings: string[] = []
  const bindings: Binding[] = []
  let hasUnknown = false

  for (const [field, entry] of Object.entries(rawBound)) {
    const resolvedType = inferResolvedType(field)
    if (resolvedType === 'unknown') {
      hasUnknown = true
    }
    bindings.push(...parseBindingsForField(field, entry, resolvedType, warnings))
  }

  if (bindings.length === 0) {
    return { value: null, confidence: 'high', warnings, omittedFields: [] }
  }

  const confidence = hasUnknown || warnings.length > 0 ? 'medium' : 'high'

  return {
    value: { bindings, explicitModes: parseExplicitModes(node) },
    confidence,
    warnings,
    omittedFields: [],
  }
}
