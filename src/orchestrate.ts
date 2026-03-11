import { FigmaRenderError } from './errors.js'
import { createAuth } from './figma/auth.js'
import { createClient } from './figma/client.js'
import { fetchImage } from './figma/fetch-image.js'
import { fetchNode } from './figma/fetch-node.js'
import { parseFigmaUrl } from './figma/url.js'
import { normalize } from './normalize/index.js'
import { buildOutline, outlineToXml } from './normalize/outline.js'
import { generateContextMd } from './output/context-md.js'
import { buildManifest } from './output/manifest.js'
import { aggregateTokensUsed } from './summary/tokens-used.js'

import type { FetchConfig } from './config.js'
import type { FetchImageResult } from './figma/fetch-image.js'
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
}

/**
 * Orchestrates a complete Figma fetch: parse URL, authenticate, fetch node
 * and image in parallel, normalize, generate outline + context.md, build
 * manifest. Returns data only — no I/O.
 *
 * Image failure is non-fatal (recorded in manifest errors).
 * Node failure is fatal (throws).
 */
export async function orchestrate(
  config: FetchConfig,
): Promise<OrchestrateResult> {
  const parsed = parseFigmaUrl(config.url)
  const auth = createAuth(config.token)
  const client = createClient({ auth })

  const [nodeResult, imageResult] = await Promise.allSettled([
    fetchNode(client, parsed.fileKey, parsed.nodeId, { depth: config.depth }),
    fetchImage(client, parsed.fileKey, parsed.nodeId, {
      format: config.format,
      scale: config.scale,
    }),
  ])

  if (nodeResult.status === 'rejected') {
    if (nodeResult.reason instanceof Error) {
      throw nodeResult.reason
    }
    throw new Error('Node fetch failed', { cause: nodeResult.reason })
  }

  const fileResponse = nodeResult.value
  const errors: ManifestError[] = []
  let image: FetchImageResult | undefined

  if (imageResult.status === 'fulfilled') {
    image = imageResult.value
  } else {
    errors.push(buildImageError(imageResult.reason, parsed.nodeId))
  }

  const imageOutputPath = image !== undefined
    ? `visual/${parsed.nodeId}.${image.format}`
    : undefined

  const normalizedNode = normalize(fileResponse.document)
  const tokensUsed = aggregateTokensUsed(normalizedNode, parsed.fileKey, parsed.nodeId)

  const { outline, hiddenNodesOmitted } = buildOutline(normalizedNode, {
    includeHidden: config.includeHidden,
  })
  const xmlString = outlineToXml(outline)

  const manifest = buildManifest({
    source: {
      fileKey: parsed.fileKey,
      nodeId: parsed.nodeId,
      fileName: fileResponse.name,
      version: fileResponse.version,
      lastModified: fileResponse.lastModified,
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
    rawNode: fileResponse.document,
    normalizedNode,
    tokensUsed,
    outlineJson: outline,
    outlineXml: xmlString,
    contextMd,
    image,
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
