import { extractAppearance } from './appearance.js'
import { extractAsset } from './assets.js'
import { extractBounds } from './bounds.js'
import { classify } from './classify.js'
import { extractComponent } from './components.js'
import { extractLayout } from './layout.js'
import { getRawBoolean } from './raw-helpers.js'
import { extractText } from './text.js'
import { extractVariables } from './variables.js'

import type { AnalysisResult, ExtractorResult } from './raw-helpers.js'
import type { FigmaNode } from '../figma/types-raw.js'
import type { Confidence, NormalizedNode, Semantics } from '../schemas/normalized.js'

const SKIP_EXTRACTORS = new Set(['document', 'page'])
const EMPTY_RESULT: ExtractorResult<null> = {
  value: null, confidence: 'high', warnings: [], omittedFields: [],
}
const DEFAULT_SEMANTICS: Semantics = {
  likelyInteractive: false,
  likelyTextInput: false,
  likelyIcon: false,
  likelyImage: false,
  likelyMask: false,
  likelyReusableComponent: false,
}

const CONFIDENCE_ORDER: Record<Confidence, number> = {
  high: 2,
  medium: 1,
  low: 0,
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

function minConfidence(...results: AnalysisResult<unknown>[]): Confidence {
  let min: Confidence = 'high'
  for (const result of results) {
    if (CONFIDENCE_ORDER[result.confidence] < CONFIDENCE_ORDER[min]) {
      min = result.confidence
    }
  }
  return min
}

function aggregateWarnings(...results: AnalysisResult<unknown>[]): string[] {
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
  component: ExtractorResult<NormalizedNode['component']>
  variables: ExtractorResult<NormalizedNode['variables']>
  asset: ExtractorResult<NormalizedNode['asset']>
  all: ExtractorResult<unknown>[]
}

function runCoreExtractors(raw: FigmaNode): Omit<ExtractionResults, 'text' | 'all'> {
  return {
    bounds: extractBounds(raw),
    layout: extractLayout(raw),
    appearance: extractAppearance(raw),
    component: extractComponent(raw),
    variables: extractVariables(raw),
    asset: extractAsset(raw),
  }
}

function runExtractors(raw: FigmaNode, type: string): ExtractionResults {
  const skip = SKIP_EXTRACTORS.has(type)
  const core = skip
    ? { bounds: EMPTY_RESULT, layout: EMPTY_RESULT, appearance: EMPTY_RESULT, component: EMPTY_RESULT, variables: EMPTY_RESULT, asset: EMPTY_RESULT }
    : runCoreExtractors(raw)
  const text = type === 'text' ? extractText(raw) : null
  const all: ExtractorResult<unknown>[] = [
    core.bounds, core.layout, core.appearance,
    core.component, core.variables, core.asset,
  ]
  if (text !== null) {
    all.push(text)
  }
  return { ...core, text, all }
}

function buildChildContext(raw: FigmaNode, context: NormalizeContext): NormalizeContext {
  return {
    parentId: raw.id,
    depth: context.depth + 1,
    path: [...context.path, { id: raw.id, name: raw.name, type: raw.type }],
  }
}

export function normalizeNode(raw: FigmaNode, context: NormalizeContext): NormalizedNode {
  const classification = classify(raw)
  const type = classification.value
  const extracted = runExtractors(raw, type)
  const warnings = aggregateWarnings(classification, ...extracted.all)
  const confidence = minConfidence(classification, ...extracted.all)
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
    component: extracted.component.value,
    variables: extracted.variables.value,
    asset: extracted.asset.value,
    semantics: DEFAULT_SEMANTICS,
    children: (raw.children ?? []).map((child) => normalizeNode(child, childContext)),
    diagnostics: {
      sourceNodeType: raw.type,
      omittedFields: aggregateOmitted(...extracted.all),
      warnings,
      confidence,
    },
  }
}
