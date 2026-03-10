import { FigmaError, FigmaRateLimitError, FigmaRenderError } from '../errors.js'
import { FigmaImagesResponseSchema } from '../schemas/raw.js'
import { withRetry } from '../util/retry.js'

import { buildImagesEndpoint } from './endpoints.js'

import type { FigmaClient } from './client.js'
import type { ImagesEndpointOptions } from './endpoints.js'

export interface FetchImageResult {
  format: 'png' | 'svg'
  buffer: Buffer
  sourceUrl: string
}

function isRetriable(error: unknown): boolean {
  if (error instanceof FigmaRateLimitError) {
    return true
  }
  if (!(error instanceof FigmaError)) {
    return false
  }
  const status = error.context?.status
  return typeof status === 'number' && status >= 500
}

function retryDecision(error: unknown): { retry: boolean; delayMs?: number } {
  if (!isRetriable(error)) {
    return { retry: false }
  }
  if (error instanceof FigmaRateLimitError && error.retryAfter !== undefined) {
    return { retry: true, delayMs: error.retryAfter * 1000 }
  }
  return { retry: true }
}

function extractImageUrl(data: unknown, nodeId: string, fileKey: string): string {
  const result = FigmaImagesResponseSchema.safeParse(data)
  if (!result.success) {
    throw new FigmaRenderError('Invalid Figma images API response', {
      context: { nodeId, fileKey },
    })
  }

  const imageUrl = result.data.images[nodeId]
  if (imageUrl === undefined || imageUrl === null) {
    throw new FigmaRenderError('Figma render returned no image URL', {
      context: { nodeId, fileKey },
    })
  }

  return imageUrl
}

async function downloadBinary(
  sourceUrl: string,
  nodeId: string,
  fileKey: string,
): Promise<Buffer> {
  const response = await fetch(sourceUrl)

  if (!response.ok) {
    throw new FigmaRenderError('Failed to download rendered image', {
      context: { nodeId, fileKey, sourceUrl, status: response.status },
    })
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function fetchImage(
  client: FigmaClient,
  fileKey: string,
  nodeId: string,
  options?: ImagesEndpointOptions,
): Promise<FetchImageResult> {
  const format = options?.format ?? 'png'
  const url = buildImagesEndpoint(fileKey, nodeId, options)

  const sourceUrl = await withRetry(
    async () => {
      const data = await client.request(url)
      return extractImageUrl(data, nodeId, fileKey)
    },
    { shouldRetry: retryDecision },
  )

  const buffer = await downloadBinary(sourceUrl, nodeId, fileKey)

  return { format, buffer, sourceUrl }
}
