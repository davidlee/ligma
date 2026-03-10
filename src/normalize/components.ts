import { getRawRecord, getRawString, isRecord } from './raw-helpers.js'

import type { ExtractorResult } from './raw-helpers.js'
import type { FigmaNode } from '../figma/types-raw.js'
import type { ComponentKind, NormalizedComponentInfo } from '../schemas/normalized.js'

const COMPONENT_TYPES: ReadonlyMap<string, ComponentKind> = new Map([
  ['INSTANCE', 'instance'],
  ['COMPONENT', 'component'],
  ['COMPONENT_SET', 'component-set'],
])

function parsePropertyValues(raw: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, entry] of Object.entries(raw)) {
    if (isRecord(entry) && typeof entry.value === 'string') {
      result[key] = entry.value
    }
  }
  return result
}

function parsePropertyReferences(raw: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      result[key] = value
    }
  }
  return result
}

function resolveComponentId(node: FigmaNode, kind: ComponentKind, warnings: string[]): string | null {
  if (kind !== 'instance') {
    return null
  }
  if (typeof node.componentId === 'string') {
    return node.componentId
  }
  warnings.push('Instance node missing componentId')
  return null
}

function resolveComponentSetId(node: FigmaNode): string | null {
  const value = getRawString(node, 'componentSetId', '')
  return value === '' ? null : value
}

export function extractComponent(node: FigmaNode): ExtractorResult<NormalizedComponentInfo | null> {
  const kind = COMPONENT_TYPES.get(node.type)
  if (kind === undefined) {
    return { value: null, confidence: 'high', warnings: [], omittedFields: [] }
  }

  const warnings: string[] = []
  const rawProperties = getRawRecord(node, 'componentProperties')
  const rawReferences = getRawRecord(node, 'componentPropertyReferences')

  const value: NormalizedComponentInfo = {
    kind,
    componentId: resolveComponentId(node, kind, warnings),
    componentName: node.name,
    componentSetId: resolveComponentSetId(node),
    propertyValues: rawProperties !== undefined ? parsePropertyValues(rawProperties) : {},
    propertyReferences: rawReferences !== undefined ? parsePropertyReferences(rawReferences) : {},
    isReusable: true,
  }

  return {
    value,
    confidence: warnings.length > 0 ? 'medium' : 'high',
    warnings,
    omittedFields: [],
  }
}
