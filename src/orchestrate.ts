import { FigmaRenderError } from './errors.js'
import { createAuth } from './figma/auth.js'
import { createClient } from './figma/client.js'
import { fetchImage } from './figma/fetch-image.js'
import { fetchNode } from './figma/fetch-node.js'
import { parseFigmaUrl } from './figma/url.js'
import { buildManifest } from './output/manifest.js'

import type { FetchConfig } from './config.js'
import type { FetchImageResult } from './figma/fetch-image.js'
import type { Manifest, ManifestError } from './schemas/manifest.js'

export interface OrchestrateResult {
  readonly manifest: Manifest
  readonly rawNode: unknown
  readonly image?: FetchImageResult | undefined
}

/**
 * Orchestrates a complete Figma fetch: parse URL, authenticate, fetch node
 * and image in parallel, build manifest. Returns data only — no I/O.
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
      ...(config.format === 'png'
        ? { png: imageOutputPath }
        : { svg: imageOutputPath }),
      assets: [],
    },
    errors,
  })

  return { manifest, rawNode: fileResponse.document, image }
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
