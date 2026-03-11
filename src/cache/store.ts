import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { FigmaFileResponseSchema } from '../schemas/raw.js'

import {
  buildCanonicalKey,
  buildImageKeyPath,
  buildMetadataPath,
  buildNodeKeyPath,
} from './keys.js'

import type {
  Cache,
  CacheConfig,
  CacheEntryMetadata,
  ImageCacheKey,
  NodeCacheKey,
} from './types.js'
import type { FigmaFileResponse } from '../figma/types-raw.js'

async function ensureParentDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
}

async function readJsonSafe(filePath: string): Promise<unknown> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

async function readBinarySafe(filePath: string): Promise<Uint8Array | null> {
  try {
    const buffer = await readFile(filePath)
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  } catch {
    return null
  }
}

function buildMetadata(
  key: NodeCacheKey | ImageCacheKey,
  sourceUrl: string | undefined,
): CacheEntryMetadata {
  return {
    createdAt: new Date().toISOString(),
    version: key.version,
    canonicalKey: buildCanonicalKey(key),
    sourceUrl,
  }
}

async function atomicWriteFile(
  filePath: string,
  content: string | Uint8Array,
): Promise<void> {
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`
  await ensureParentDirectory(filePath)
  if (typeof content === 'string') {
    await writeFile(temporaryPath, content, 'utf-8')
  } else {
    await writeFile(temporaryPath, content)
  }
  await rename(temporaryPath, filePath)
}

async function writeWithMetadata(
  filePath: string,
  content: string | Uint8Array,
  metadata: CacheEntryMetadata,
): Promise<void> {
  await atomicWriteFile(filePath, content)
  const metadataPath = buildMetadataPath(filePath)
  await atomicWriteFile(metadataPath, JSON.stringify(metadata, null, 2))
}

async function removeSafe(path: string): Promise<void> {
  try {
    await rm(path, { recursive: true })
  } catch {
    // Directory/file doesn't exist — no-op
  }
}

export function createFileCache(config: CacheConfig): Cache {
  return {
    async getNode(key: NodeCacheKey): Promise<FigmaFileResponse | null> {
      const filePath = buildNodeKeyPath(config.cacheDirectory, key)
      const data = await readJsonSafe(filePath)
      if (data === null) {
        return null
      }
      const parsed = FigmaFileResponseSchema.safeParse(data)
      return parsed.success ? parsed.data : null
    },

    async setNode(key: NodeCacheKey, value: FigmaFileResponse): Promise<void> {
      const filePath = buildNodeKeyPath(config.cacheDirectory, key)
      const metadata = buildMetadata(key, undefined)
      await writeWithMetadata(filePath, JSON.stringify(value), metadata)
    },

    async getImage(key: ImageCacheKey): Promise<Uint8Array | null> {
      const filePath = buildImageKeyPath(config.cacheDirectory, key)
      return await readBinarySafe(filePath)
    },

    async setImage(
      key: ImageCacheKey,
      value: Uint8Array,
      sourceUrl?: string,
    ): Promise<void> {
      const filePath = buildImageKeyPath(config.cacheDirectory, key)
      const metadata = buildMetadata(key, sourceUrl)
      await writeWithMetadata(filePath, value, metadata)
    },

    async invalidateFile(fileKey: string): Promise<void> {
      await removeSafe(join(config.cacheDirectory, 'nodes', fileKey))
      await removeSafe(join(config.cacheDirectory, 'images', fileKey))
    },

    async clear(): Promise<void> {
      await removeSafe(config.cacheDirectory)
    },
  }
}
