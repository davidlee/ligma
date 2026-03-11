import type { FigmaFileResponse } from '../figma/types-raw.js'

export interface NodeCacheKey {
  readonly fileKey: string
  readonly nodeId: string
  readonly depth: number
  readonly geometry: boolean
  readonly pluginData: 'none' | 'shared' | 'all'
  readonly version: string | null
}

export interface ImageCacheKey {
  readonly fileKey: string
  readonly nodeId: string
  readonly format: 'png' | 'svg'
  readonly scale: number
  readonly version: string | null
}

export interface CacheEntryMetadata {
  readonly createdAt: string
  readonly version: string | null
  readonly canonicalKey: string
  readonly sourceUrl: string | undefined
}

export interface CacheConfig {
  readonly enabled: boolean
  readonly cacheDirectory: string
}

export interface Cache {
  getNode(key: NodeCacheKey): Promise<FigmaFileResponse | null>
  setNode(key: NodeCacheKey, value: FigmaFileResponse): Promise<void>
  getImage(key: ImageCacheKey): Promise<Uint8Array | null>
  setImage(key: ImageCacheKey, value: Uint8Array, sourceUrl?: string): Promise<void>
  invalidateFile(fileKey: string): Promise<void>
  clear(): Promise<void>
}
