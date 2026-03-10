import { FigmaError, FigmaNotFoundError, FigmaRateLimitError } from '../errors.js'
import { FigmaNodesResponseSchema } from '../schemas/raw.js'
import { withRetry } from '../util/retry.js'

import { buildNodesEndpoint } from './endpoints.js'

import type { FigmaClient } from './client.js'
import type { NodesEndpointOptions } from './endpoints.js'
import type { FigmaFileResponse } from './types-raw.js'

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

function extractFileResponse(
  data: unknown,
  nodeId: string,
  fileKey: string,
): FigmaFileResponse {
  const parsed = FigmaNodesResponseSchema.safeParse(data)

  if (!parsed.success) {
    throw new FigmaError('Invalid Figma API response', {
      context: { nodeId, fileKey, zodErrors: parsed.error.issues },
    })
  }

  const nodeEntry = parsed.data.nodes[nodeId]
  if (nodeEntry === undefined) {
    throw new FigmaNotFoundError('Node not found in response', {
      context: { nodeId, fileKey },
    })
  }

  return {
    name: parsed.data.name,
    lastModified: parsed.data.lastModified,
    version: parsed.data.version,
    document: nodeEntry.document,
  }
}

export async function fetchNode(
  client: FigmaClient,
  fileKey: string,
  nodeId: string,
  options?: NodesEndpointOptions,
): Promise<FigmaFileResponse> {
  const url = buildNodesEndpoint(fileKey, nodeId, options)

  return await withRetry(
    async () => {
      const data = await client.request(url)
      return extractFileResponse(data, nodeId, fileKey)
    },
    { shouldRetry: retryDecision },
  )
}
