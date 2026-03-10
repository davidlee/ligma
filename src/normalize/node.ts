import { extractAppearance } from './appearance.js'
import { extractBounds } from './bounds.js'
import { classify } from './classify.js'
import { extractLayout } from './layout.js'
import { getRawBoolean } from './raw-helpers.js'
import { extractText } from './text.js'

import type { ExtractorResult } from './raw-helpers.js'
import type { FigmaNode } from '../figma/types-raw.js'
import type { NormalizedNode, Semantics } from '../schemas/normalized.js'

const SKIP_EXTRACTORS = new Set(['document', 'page'])
const EMPTY_RESULT: ExtractorResult<null> = { value: null, warnings: [], omittedFields: [] }
const DEFAULT_SEMANTICS: Semantics = {
  likelyInteractive: false,
  likelyTextInput: false,
  likelyIcon: false,
  likelyImage: false,
  likelyMask: false,
  likelyReusableComponent: false,
}

export interface NormalizeContext {
  parentId: string | null
  depth: number
  path: { id: string; name: string; type: string }[]
}

function extractRotation(node: FigmaNode): number | null {
  const value = node.rotation
  if (typeof value !== 'number' || value === 0) {
    return null
  }
  return value
}

function aggregateWarnings(...results: ExtractorResult<unknown>[]): string[] {
  const warnings: string[] = []
  for (const result of results) {
    warnings.push(...result.warnings)
  }
  return warnings
}

function aggregateOmitted(...results: ExtractorResult<unknown>[]): string[] {
  const omitted: string[] = []
  for (const result of results) {
    omitted.push(...result.omittedFields)
  }
  return omitted
}

function buildHierarchy(
  raw: FigmaNode, context: NormalizeContext,
): NormalizedNode['hierarchy'] {
  return {
    parentId: context.parentId,
    depth: context.depth,
    childCount: raw.children?.length ?? 0,
    path: context.path,
  }
}

interface ExtractionResults {
  bounds: ExtractorResult<NormalizedNode['bounds']>
  layout: ExtractorResult<NormalizedNode['layout']>
  appearance: ExtractorResult<NormalizedNode['appearance']>
  text: ExtractorResult<NormalizedNode['text']> | null
  all: ExtractorResult<unknown>[]
}

function runExtractors(raw: FigmaNode, type: string): ExtractionResults {
  const skip = SKIP_EXTRACTORS.has(type)
  const bounds = skip ? EMPTY_RESULT : extractBounds(raw)
  const layout = skip ? EMPTY_RESULT : extractLayout(raw)
  const appearance = skip ? EMPTY_RESULT : extractAppearance(raw)
  const text = type === 'text' ? extractText(raw) : null
  const all: ExtractorResult<unknown>[] = text !== null
    ? [bounds, layout, appearance, text]
    : [bounds, layout, appearance]
  return { bounds, layout, appearance, text, all }
}

function buildChildContext(raw: FigmaNode, context: NormalizeContext): NormalizeContext {
  return {
    parentId: raw.id,
    depth: context.depth + 1,
    path: [...context.path, { id: raw.id, name: raw.name, type: raw.type }],
  }
}

export function normalizeNode(raw: FigmaNode, context: NormalizeContext): NormalizedNode {
  const type = classify(raw)
  const extracted = runExtractors(raw, type)
  const warnings = aggregateWarnings(...extracted.all)
  const childContext = buildChildContext(raw, context)

  return {
    id: raw.id,
    name: raw.name,
    type,
    role: null,
    visible: getRawBoolean(raw, 'visible', true),
    bounds: extracted.bounds.value,
    rotation: extractRotation(raw),
    hierarchy: buildHierarchy(raw, context),
    layout: extracted.layout.value,
    appearance: extracted.appearance.value,
    text: extracted.text?.value ?? null,
    component: null,
    variables: null,
    asset: null,
    semantics: DEFAULT_SEMANTICS,
    children: (raw.children ?? []).map((child) => normalizeNode(child, childContext)),
    diagnostics: {
      sourceNodeType: raw.type,
      omittedFields: aggregateOmitted(...extracted.all),
      warnings,
      confidence: warnings.length > 0 ? 'medium' : 'high',
    },
  }
}
