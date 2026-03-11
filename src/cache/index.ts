import { fetchImage } from '../figma/fetch-image.js'
import { fetchNode } from '../figma/fetch-node.js'

import { createFileCache } from './store.js'

import type {
  Cache,
  CacheConfig,
  ImageCacheKey,
  NodeCacheKey,
} from './types.js'
import type { FigmaClient } from '../figma/client.js'
import type { NodesEndpointOptions } from '../figma/endpoints.js'
import type { FetchImageResult } from '../figma/fetch-image.js'
import type { FigmaFileResponse } from '../figma/types-raw.js'

export type { Cache, CacheConfig } from './types.js'

export function createCache(config: CacheConfig): Cache {
  return createFileCache(config)
}

export function createNoopCache(): Cache {
  return {
    getNode: () => Promise.resolve(null),
    setNode: () => Promise.resolve(),
    getImage: () => Promise.resolve(null),
    setImage: () => Promise.resolve(),
    invalidateFile: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }
}

export interface FetchNodeCachedOptions extends NodesEndpointOptions {
  readonly version: string | null
}

export interface FetchNodeCachedResult {
  readonly response: FigmaFileResponse
  readonly fromCache: boolean
}

export async function fetchNodeCached(
  client: FigmaClient,
  cache: Pick<Cache, 'getNode' | 'setNode'>,
  fileKey: string,
  nodeId: string,
  options: FetchNodeCachedOptions,
): Promise<FetchNodeCachedResult> {
  const cacheKey: NodeCacheKey = {
    fileKey,
    nodeId,
    depth: options.depth ?? 2,
    geometry: options.geometry ?? false,
    pluginData: 'none',
    version: options.version,
  }

  const cached = await cache.getNode(cacheKey)
  if (cached !== null) {
    return { response: cached, fromCache: true }
  }

  const response = await fetchNode(client, fileKey, nodeId, options)
  await cache.setNode(cacheKey, response)
  return { response, fromCache: false }
}

export interface FetchImageCachedOptions {
  readonly format?: 'png' | 'svg'
  readonly scale?: number
  readonly version: string | null
}

export interface FetchImageCachedResult {
  readonly result: FetchImageResult
  readonly fromCache: boolean
}

export async function fetchImageCached(
  client: FigmaClient,
  cache: Pick<Cache, 'getImage' | 'setImage'>,
  fileKey: string,
  nodeId: string,
  options: FetchImageCachedOptions,
): Promise<FetchImageCachedResult> {
  const format = options.format ?? 'png'
  const scale = options.scale ?? 2

  const cacheKey: ImageCacheKey = {
    fileKey,
    nodeId,
    format,
    scale,
    version: options.version,
  }

  const cached = await cache.getImage(cacheKey)
  if (cached !== null) {
    const result: FetchImageResult = {
      format,
      buffer: Buffer.from(cached),
      sourceUrl: '',
    }
    return { result, fromCache: true }
  }

  const result = await fetchImage(client, fileKey, nodeId, { format, scale })
  await cache.setImage(cacheKey, new Uint8Array(result.buffer), result.sourceUrl)
  return { result, fromCache: false }
}
