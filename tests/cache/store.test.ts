import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildImageKeyPath, buildMetadataPath, buildNodeKeyPath } from '../../src/cache/keys.js'
import { createFileCache } from '../../src/cache/store.js'

import type { Cache, ImageCacheKey, NodeCacheKey } from '../../src/cache/types.js'
import type { FigmaFileResponse } from '../../src/figma/types-raw.js'

const TEST_NODE_KEY: NodeCacheKey = {
  fileKey: 'test-file',
  nodeId: '1:2',
  depth: 2,
  geometry: false,
  pluginData: 'none',
  version: null,
}

const TEST_IMAGE_KEY: ImageCacheKey = {
  fileKey: 'test-file',
  nodeId: '1:2',
  format: 'png',
  scale: 2,
  version: null,
}

const TEST_FILE_RESPONSE: FigmaFileResponse = {
  name: 'Test File',
  lastModified: '2026-03-11T00:00:00Z',
  version: '123',
  document: {
    id: '1:2',
    name: 'TestNode',
    type: 'FRAME',
    children: [],
  },
}

let counter = 0
function makeCacheDirectory(): string {
  counter += 1
  return join(tmpdir(), `ligma-cache-test-${String(Date.now())}-${String(counter)}`)
}

describe('cache store — node operations', () => {
  let cache: Cache
  let cacheDirectory: string

  beforeEach(() => {
    cacheDirectory = makeCacheDirectory()
    cache = createFileCache({ enabled: true, cacheDirectory })
  })

  afterEach(async () => {
    await cache.clear()
  })

  it('returns null for cache miss', async () => {
    const result = await cache.getNode(TEST_NODE_KEY)
    expect(result).toBeNull()
  })

  it('round-trips a FigmaFileResponse', async () => {
    await cache.setNode(TEST_NODE_KEY, TEST_FILE_RESPONSE)
    const result = await cache.getNode(TEST_NODE_KEY)
    expect(result).toEqual(TEST_FILE_RESPONSE)
  })

  it('writes metadata sidecar alongside payload', async () => {
    await cache.setNode(TEST_NODE_KEY, TEST_FILE_RESPONSE)
    const payloadPath = buildNodeKeyPath(cacheDirectory, TEST_NODE_KEY)
    const metadataPath = buildMetadataPath(payloadPath)
    const metadataContent = await readFile(metadataPath, 'utf-8')
    const metadata: unknown = JSON.parse(metadataContent)
    expect(metadata).toHaveProperty('createdAt')
    expect(metadata).toHaveProperty('version', null)
    expect(metadata).toHaveProperty('canonicalKey')
  })

  it('returns null for invalid cached JSON', async () => {
    const payloadPath = buildNodeKeyPath(cacheDirectory, TEST_NODE_KEY)
    await mkdir(dirname(payloadPath), { recursive: true })
    await writeFile(payloadPath, '{"invalid": true}', 'utf-8')
    const result = await cache.getNode(TEST_NODE_KEY)
    expect(result).toBeNull()
  })

  it('overwrites existing entries', async () => {
    await cache.setNode(TEST_NODE_KEY, TEST_FILE_RESPONSE)
    const updated = { ...TEST_FILE_RESPONSE, name: 'Updated File' }
    await cache.setNode(TEST_NODE_KEY, updated)
    const result = await cache.getNode(TEST_NODE_KEY)
    expect(result?.name).toBe('Updated File')
  })
})

describe('cache store — image operations', () => {
  let cache: Cache
  let cacheDirectory: string

  beforeEach(() => {
    cacheDirectory = makeCacheDirectory()
    cache = createFileCache({ enabled: true, cacheDirectory })
  })

  afterEach(async () => {
    await cache.clear()
  })

  it('returns null for cache miss', async () => {
    const result = await cache.getImage(TEST_IMAGE_KEY)
    expect(result).toBeNull()
  })

  it('round-trips binary data', async () => {
    const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    await cache.setImage(TEST_IMAGE_KEY, data)
    const result = await cache.getImage(TEST_IMAGE_KEY)
    expect(result).toEqual(data)
  })

  it('writes metadata sidecar with sourceUrl', async () => {
    const data = new Uint8Array([1, 2, 3])
    await cache.setImage(TEST_IMAGE_KEY, data, 'https://example.com/image.png')
    const payloadPath = buildImageKeyPath(cacheDirectory, TEST_IMAGE_KEY)
    const metadataPath = buildMetadataPath(payloadPath)
    const metadataContent = await readFile(metadataPath, 'utf-8')
    const metadata: unknown = JSON.parse(metadataContent)
    expect(metadata).toHaveProperty('sourceUrl', 'https://example.com/image.png')
  })
})

describe('cache store — invalidation', () => {
  let cache: Cache
  let cacheDirectory: string

  beforeEach(() => {
    cacheDirectory = makeCacheDirectory()
    cache = createFileCache({ enabled: true, cacheDirectory })
  })

  afterEach(async () => {
    await cache.clear()
  })

  it('invalidateFile removes node entries for that fileKey', async () => {
    await cache.setNode(TEST_NODE_KEY, TEST_FILE_RESPONSE)
    await cache.invalidateFile('test-file')
    const result = await cache.getNode(TEST_NODE_KEY)
    expect(result).toBeNull()
  })

  it('invalidateFile removes image entries for that fileKey', async () => {
    const data = new Uint8Array([1, 2, 3])
    await cache.setImage(TEST_IMAGE_KEY, data)
    await cache.invalidateFile('test-file')
    const result = await cache.getImage(TEST_IMAGE_KEY)
    expect(result).toBeNull()
  })

  it('invalidateFile is a no-op for non-existent fileKey', async () => {
    // Should not throw
    await cache.invalidateFile('nonexistent')
  })

  it('invalidateFile does not affect other fileKeys', async () => {
    await cache.setNode(TEST_NODE_KEY, TEST_FILE_RESPONSE)
    const otherKey: NodeCacheKey = { ...TEST_NODE_KEY, fileKey: 'other-file' }
    await cache.setNode(otherKey, TEST_FILE_RESPONSE)

    await cache.invalidateFile('test-file')

    expect(await cache.getNode(TEST_NODE_KEY)).toBeNull()
    expect(await cache.getNode(otherKey)).toEqual(TEST_FILE_RESPONSE)
  })

  it('clear removes everything', async () => {
    await cache.setNode(TEST_NODE_KEY, TEST_FILE_RESPONSE)
    await cache.setImage(TEST_IMAGE_KEY, new Uint8Array([1, 2, 3]))
    await cache.clear()
    expect(await cache.getNode(TEST_NODE_KEY)).toBeNull()
    expect(await cache.getImage(TEST_IMAGE_KEY)).toBeNull()
  })

  it('clear is a no-op when cache directory does not exist', async () => {
    // Should not throw
    await cache.clear()
  })
})

describe('cache store — atomic writes', () => {
  let cache: Cache
  let cacheDirectory: string

  beforeEach(() => {
    cacheDirectory = makeCacheDirectory()
    cache = createFileCache({ enabled: true, cacheDirectory })
  })

  afterEach(async () => {
    await cache.clear()
  })

  it('does not leave temporary files after successful write', async () => {
    await cache.setNode(TEST_NODE_KEY, TEST_FILE_RESPONSE)
    const payloadPath = buildNodeKeyPath(cacheDirectory, TEST_NODE_KEY)
    const files = await readdir(dirname(payloadPath))
    const temporaryFiles = files.filter(f => f.includes('.tmp'))
    expect(temporaryFiles).toHaveLength(0)
  })
})
