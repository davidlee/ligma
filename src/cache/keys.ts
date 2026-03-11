import { createHash } from 'node:crypto'
import { join } from 'node:path'

import type { ImageCacheKey, NodeCacheKey } from './types.js'

function toRecord(key: NodeCacheKey | ImageCacheKey): Record<string, unknown> {
  return { ...key }
}

function canonicalize(record: Record<string, unknown>): string {
  const sorted = Object.keys(record).sort()
  const entries: Record<string, unknown> = {}
  for (const k of sorted) {
    entries[k] = record[k]
  }
  return JSON.stringify(entries)
}

function hashKey(canonical: string): string {
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16)
}

export function buildCanonicalKey(key: NodeCacheKey | ImageCacheKey): string {
  return canonicalize(toRecord(key))
}

export function buildNodeKeyPath(cacheDirectory: string, key: NodeCacheKey): string {
  const hash = hashKey(canonicalize(toRecord(key)))
  return join(cacheDirectory, 'nodes', key.fileKey, key.nodeId, `${hash}.json`)
}

export function buildImageKeyPath(cacheDirectory: string, key: ImageCacheKey): string {
  const hash = hashKey(canonicalize(toRecord(key)))
  return join(cacheDirectory, 'images', key.fileKey, key.nodeId, `${hash}.${key.format}`)
}

export function buildMetadataPath(keyPath: string): string {
  const extensionIndex = keyPath.lastIndexOf('.')
  if (extensionIndex === -1) {
    return `${keyPath}.meta.json`
  }
  return `${keyPath.slice(0, extensionIndex)}.meta.json`
}
