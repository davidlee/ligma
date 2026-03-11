import {
  createCache,
  createNoopCache,
  fetchImageCached,
  fetchNodeCached,
} from './cache/index.js'
import { FigmaRenderError } from './errors.js'
import { mergeExpansions } from './expand/merge.js'
import {
  depthTruncatedContainer,
  evaluateExpansionTriggers,
  geometryNeeded,
} from './expand/triggers.js'
import { createAuth } from './figma/auth.js'
import { createClient } from './figma/client.js'
import { parseFigmaUrl } from './figma/url.js'
import { normalize } from './normalize/index.js'
import { buildOutline, outlineToXml } from './normalize/outline.js'
import { generateContextMd } from './output/context-md.js'
import { buildManifest } from './output/manifest.js'
import { aggregateTokensUsed } from './summary/tokens-used.js'

import type { Cache, FetchNodeCachedResult } from './cache/index.js'
import type { FetchConfig } from './config.js'
import type {
  ExecutedExpansion,
  ExpansionResult,
  ExpansionTarget,
  MergeInput,
  TriggerContext,
} from './expand/types.js'
import type { FigmaClient } from './figma/client.js'
import type { FetchImageResult } from './figma/fetch-image.js'
import type { FigmaNode } from './figma/types-raw.js'
import type { Manifest, ManifestError } from './schemas/manifest.js'
import type { NormalizedNode } from './schemas/normalized.js'
import type { OutlineNode } from './schemas/outline.js'
import type { TokensUsedSummary } from './schemas/tokens-used.js'

export interface OrchestrateResult {
  readonly manifest: Manifest
  readonly rawNode: unknown
  readonly normalizedNode: NormalizedNode
  readonly tokensUsed: TokensUsedSummary
  readonly outlineJson: OutlineNode
  readonly outlineXml: string
  readonly contextMd: string
  readonly image?: FetchImageResult | undefined
  readonly expansion: ExpansionResult | null
}

const DEFAULT_TRIGGERS = [depthTruncatedContainer, geometryNeeded]

export async function orchestrate(
  config: FetchConfig,
): Promise<OrchestrateResult> {
  const parsed = parseFigmaUrl(config.url)
  const auth = createAuth(config.token)
  const client = createClient({ auth })
  const cache = buildCache(config)

  const { rawNode, fileVersion, image, errors } = await fetchInitialData(
    client, cache, parsed.fileKey, parsed.nodeId, config,
  )

  let currentRaw = rawNode
  let normalizedNode = normalize(currentRaw)
  let expansion: ExpansionResult | null = null

  if (config.expansionEnabled) {
    const result = await runExpansionLoop(
      client, cache, parsed.fileKey, currentRaw, normalizedNode, fileVersion, config,
    )
    currentRaw = result.rawNode
    normalizedNode = result.normalizedNode
    expansion = result.expansionResult
  }

  const tokensUsed = aggregateTokensUsed(normalizedNode, parsed.fileKey, parsed.nodeId)
  const { outline, hiddenNodesOmitted } = buildOutline(normalizedNode, {
    includeHidden: config.includeHidden,
  })
  const xmlString = outlineToXml(outline)
  const imageOutputPath = image !== undefined
    ? `visual/${parsed.nodeId}.${image.format}`
    : undefined

  const manifest = buildManifest({
    source: {
      fileKey: parsed.fileKey,
      nodeId: parsed.nodeId,
      fileName: fileVersion.name,
      version: fileVersion.version,
      lastModified: fileVersion.lastModified,
    },
    outputs: {
      rawNodeJson: 'structure/raw-node.json',
      normalizedNodeJson: 'structure/normalized-node.json',
      outlineJson: 'structure/outline.json',
      outlineXml: 'structure/outline.xml',
      contextMd: 'context.md',
      tokensUsedJson: 'tokens/tokens-used.json',
      ...(config.format === 'png'
        ? { png: imageOutputPath }
        : { svg: imageOutputPath }),
      assets: [],
    },
    errors,
  })

  const contextMd = generateContextMd({
    node: normalizedNode,
    manifest,
    tokensUsed,
    outline,
    hiddenNodesOmitted,
  })

  return {
    manifest,
    rawNode: currentRaw,
    normalizedNode,
    tokensUsed,
    outlineJson: outline,
    outlineXml: xmlString,
    contextMd,
    image,
    expansion,
  }
}

// --- Helpers ---

interface FileVersion {
  readonly name: string
  readonly version: string
  readonly lastModified: string
}

interface InitialFetchResult {
  readonly rawNode: FigmaNode
  readonly fileVersion: FileVersion
  readonly image: FetchImageResult | undefined
  readonly errors: ManifestError[]
}

function buildCache(config: FetchConfig): Cache {
  if (!config.cacheEnabled) {
    return createNoopCache()
  }
  return createCache({ enabled: true, cacheDirectory: config.cacheDirectory })
}

async function fetchInitialData(
  client: FigmaClient,
  cache: Cache,
  fileKey: string,
  nodeId: string,
  config: FetchConfig,
): Promise<InitialFetchResult> {
  const [nodeResult, imageResult] = await Promise.allSettled([
    fetchNodeCached(client, cache, fileKey, nodeId, {
      depth: config.depth,
      version: null,
    }),
    fetchImageCached(client, cache, fileKey, nodeId, {
      format: config.format,
      scale: config.scale,
      version: null,
    }),
  ])

  if (nodeResult.status === 'rejected') {
    if (nodeResult.reason instanceof Error) {
      throw nodeResult.reason
    }
    throw new Error('Node fetch failed', { cause: nodeResult.reason })
  }

  const fileResponse = nodeResult.value.response
  const errors: ManifestError[] = []
  let image: FetchImageResult | undefined

  if (imageResult.status === 'fulfilled') {
    image = imageResult.value.result
  } else {
    errors.push(buildImageError(imageResult.reason, nodeId))
  }

  return {
    rawNode: fileResponse.document,
    fileVersion: {
      name: fileResponse.name,
      version: fileResponse.version,
      lastModified: fileResponse.lastModified,
    },
    image,
    errors,
  }
}

interface ExpansionLoopResult {
  readonly rawNode: FigmaNode
  readonly normalizedNode: NormalizedNode
  readonly expansionResult: ExpansionResult
}

async function runExpansionLoop(
  client: FigmaClient,
  cache: Cache,
  fileKey: string,
  rawNode: FigmaNode,
  normalizedNode: NormalizedNode,
  fileVersion: FileVersion,
  config: FetchConfig,
): Promise<ExpansionLoopResult> {
  const triggerContext: TriggerContext = {
    requestedDepth: config.depth,
    fetchState: {
      requestedGeometry: false,
      expandedNodeIds: new Set(),
    },
  }

  const evaluation = evaluateExpansionTriggers(
    normalizedNode,
    DEFAULT_TRIGGERS,
    triggerContext,
    { maxTargets: config.maxExpansionTargets },
  )

  const executed = await fetchExpansionTargets(
    client, cache, fileKey, fileVersion.version, config.expansionDepth, evaluation.targets,
  )

  const successfulMerges: MergeInput[] = []
  for (const entry of executed) {
    if (entry.success && entry.fetchedNode !== undefined) {
      successfulMerges.push({ nodeId: entry.nodeId, expandedNode: entry.fetchedNode })
    }
  }

  let finalRaw = rawNode
  let finalNormalized = normalizedNode

  if (successfulMerges.length > 0) {
    const mergeResult = mergeExpansions(rawNode, successfulMerges)
    finalRaw = mergeResult.merged
    finalNormalized = normalize(finalRaw)
  }

  const executedExpansions: ExecutedExpansion[] = executed.map((entry) => ({
    nodeId: entry.nodeId,
    reasonCode: entry.reasonCode,
    allReasonCodes: [entry.reasonCode],
    reason: entry.reason,
    depth: entry.depth,
    geometry: entry.geometry,
    success: entry.success,
    fetchedFromCache: entry.fetchedFromCache,
    ...(entry.error !== undefined ? { error: entry.error } : {}),
  }))

  return {
    rawNode: finalRaw,
    normalizedNode: finalNormalized,
    expansionResult: {
      executed: executedExpansions,
      skipped: evaluation.skipped,
      totalTriggered: evaluation.totalTriggered,
      totalExecuted: executedExpansions.length,
      totalSkipped: evaluation.skipped.length,
    },
  }
}

interface FetchedExpansion {
  readonly nodeId: string
  readonly reasonCode: ExpansionTarget['reasonCode']
  readonly reason: string
  readonly depth: number
  readonly geometry: boolean
  readonly success: boolean
  readonly fetchedFromCache: boolean
  readonly fetchedNode?: FigmaNode
  readonly error?: string
}

async function fetchExpansionTargets(
  client: FigmaClient,
  cache: Cache,
  fileKey: string,
  version: string,
  defaultDepth: number,
  targets: readonly ExpansionTarget[],
): Promise<readonly FetchedExpansion[]> {
  const results: FetchedExpansion[] = []

  for (const target of targets) {
    const depth = resolveExpansionDepth(target.depth, defaultDepth)
    results.push(
      await fetchSingleExpansion(client, cache, fileKey, version, target, depth),
    )
  }

  return results
}

function resolveExpansionDepth(targetDepth: number | null, defaultDepth: number): number {
  if (targetDepth === null) {
    return defaultDepth
  }
  return Math.max(1, Math.min(targetDepth, defaultDepth))
}

async function fetchSingleExpansion(
  client: FigmaClient,
  cache: Cache,
  fileKey: string,
  version: string,
  target: ExpansionTarget,
  depth: number,
): Promise<FetchedExpansion> {
  const base = {
    nodeId: target.nodeId,
    reasonCode: target.reasonCode,
    reason: target.reason,
    depth,
    geometry: target.requireGeometry,
  }

  let result: FetchNodeCachedResult
  try {
    result = await fetchNodeCached(client, cache, fileKey, target.nodeId, {
      depth,
      geometry: target.requireGeometry,
      version,
    })
  } catch (error) {
    return {
      ...base,
      success: false,
      fetchedFromCache: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  return {
    ...base,
    success: true,
    fetchedFromCache: result.fromCache,
    fetchedNode: result.response.document,
  }
}

function buildImageError(
  reason: unknown,
  nodeId: string,
): ManifestError {
  if (reason instanceof FigmaRenderError) {
    return {
      type: 'FigmaRenderError',
      message: reason.message,
      nodeId,
    }
  }
  const message = reason instanceof Error
    ? reason.message
    : 'Unknown image export error'
  return { type: 'ImageExportError', message, nodeId }
}
